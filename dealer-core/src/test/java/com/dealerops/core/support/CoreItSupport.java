package com.dealerops.core.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.dealer.AppUserEntity;
import com.dealerops.core.dealer.AppUserRepository;
import com.dealerops.core.dealer.DealerEntity;
import com.dealerops.core.dealer.DealerRepository;
import com.dealerops.core.dealer.MembershipEntity;
import com.dealerops.core.dealer.MembershipRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public abstract class CoreItSupport {

  @Autowired protected MockMvc mockMvc;
  @Autowired protected ObjectMapper objectMapper;
  @Autowired protected DealerRepository dealerRepository;
  @Autowired protected MembershipRepository membershipRepository;
  @Autowired protected AppUserRepository appUserRepository;

  protected Long dealerAId;
  protected Long dealerBId;

  @BeforeEach
  void seedDemoDealerships() {
    DealerEntity prairie = new DealerEntity();
    prairie.setLegalName(AdFixtures.PRAIRIE_NAME);
    prairie.setContactPhone(AdFixtures.PRAIRIE_PHONE);
    prairie.setContactEmail(AdFixtures.PRAIRIE_EMAIL);
    prairie.setContactAddress(AdFixtures.PRAIRIE_ADDRESS);
    prairie.setActive(true);
    dealerAId = dealerRepository.save(prairie).getId();

    DealerEntity foothills = new DealerEntity();
    foothills.setLegalName("Foothills Motors Ltd.");
    foothills.setContactPhone("403-555-0200");
    foothills.setContactEmail("desk@foothills.example");
    foothills.setContactAddress("200 2 Ave SW, Calgary");
    foothills.setActive(true);
    dealerBId = dealerRepository.save(foothills).getId();

    bind(dealerAId, TestTokens.STAFF_A_OID, "Staff A");
    bind(dealerBId, TestTokens.STAFF_B_OID, "Staff B");
  }

  protected void bind(Long dealerId, String oid, String displayName) {
    MembershipEntity membership = new MembershipEntity();
    membership.setDealerId(dealerId);
    membership.setEntraOid(oid);
    membership.setActive(true);
    membership.setCreatedBy(TestTokens.ADMIN_OID);
    membershipRepository.save(membership);

    AppUserEntity user = new AppUserEntity();
    user.setEntraTenantId(TestTokens.TID);
    user.setEntraOid(oid);
    user.setDisplayName(displayName);
    user.setRole(AppRole.DEALER_USER);
    user.setDealerId(dealerId);
    user.setActive(true);
    appUserRepository.save(user);
  }

  protected MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder request, String token) {
    return request.header("Authorization", "Bearer " + token).accept(MediaType.APPLICATION_JSON);
  }

  protected JsonNode json(MvcResult result) throws Exception {
    String body = result.getResponse().getContentAsString();
    return body == null || body.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(body);
  }

  protected String errorCode(MvcResult result) throws Exception {
    JsonNode node = json(result);
    if (node.has("code")) {
      return node.get("code").asText();
    }
    if (node.has("error") && node.get("error").has("code")) {
      return node.get("error").get("code").asText();
    }
    return "";
  }

  protected MockHttpServletRequestBuilder getMe(String token) {
    return authed(get("/api/v1/me"), token);
  }

  protected MockHttpServletRequestBuilder getVehicles(String token) {
    return authed(get("/api/v1/vehicles"), token);
  }

  protected MockHttpServletRequestBuilder postJson(String url, String token, String body) {
    return authed(post(url).contentType(MediaType.APPLICATION_JSON).content(body), token);
  }

  protected boolean bodyHasBusinessLeak(String body) {
    if (body == null) {
      return false;
    }
    String lower = body.toLowerCase();
    return lower.contains("\"vin\"")
        || lower.contains("purchasecost")
        || lower.contains("purchase_cost")
        || lower.contains("homeaddress")
        || lower.contains("403-555-0199");
  }
}
