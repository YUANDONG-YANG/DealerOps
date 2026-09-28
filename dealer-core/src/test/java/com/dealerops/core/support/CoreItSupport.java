package com.dealerops.core.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

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
import org.junit.jupiter.api.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

@Tag("it")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MysqlFlywayTestConfig.class)
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
    foothills.setContactAddress("200 Foothills Ave");
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

    AppUserEntity user =
        appUserRepository.findByEntraTenantIdAndEntraOid(TestTokens.TID, oid).orElseGet(AppUserEntity::new);
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

  protected long createVehicle(String token, String vin) throws Exception {
    String body =
        """
        {"make":"Toyota","model":"Camry","modelYear":2020,"vin":"%s","source":"AUCTION","purchaseCost":12000,"addedOn":"2020-03-01","conditionCode":"AS_IS"}
        """
            .formatted(vin);
    MvcResult result =
        mockMvc
            .perform(authed(post("/api/v1/vehicles").contentType(MediaType.APPLICATION_JSON).content(body), token))
            .andReturn();
    if (result.getResponse().getStatus() != 201) {
      throw new IllegalStateException("create vehicle failed: " + result.getResponse().getContentAsString());
    }
    return json(result).path("id").asLong();
  }

  protected long createCustomer(String token, String name) throws Exception {
    String body =
        """
        {"name":"%s","email":"%s@prairie.example","phone":"403-555-0199","homeAddress":"9 Hidden Rd"}
        """
            .formatted(name, name.toLowerCase().replace(" ", ""));
    MvcResult result =
        mockMvc
            .perform(authed(post("/api/v1/customers").contentType(MediaType.APPLICATION_JSON).content(body), token))
            .andReturn();
    if (result.getResponse().getStatus() != 201) {
      throw new IllegalStateException("create customer failed: " + result.getResponse().getContentAsString());
    }
    return json(result).path("id").asLong();
  }

  protected MvcResult linkVehicle(String token, long customerId, long vehicleId) throws Exception {
    return mockMvc
        .perform(authed(put("/api/v1/customers/" + customerId + "/vehicles/" + vehicleId), token))
        .andReturn();
  }

  protected MvcResult sellVehicle(String token, long vehicleId, int version, String soldOn, String soldPrice)
      throws Exception {
    String body =
        "{\"soldOn\":\"" + soldOn + "\",\"soldPrice\":" + soldPrice + ",\"version\":" + version + "}";
    return mockMvc
        .perform(
            authed(
                post("/api/v1/vehicles/" + vehicleId + "/sell").contentType(MediaType.APPLICATION_JSON).content(body),
                token))
        .andReturn();
  }

  protected MvcResult patchVehicleMake(String token, long vehicleId, int version, String make, String vin)
      throws Exception {
    String body =
        """
        {"version":%d,"make":"%s","model":"Camry","modelYear":2020,"vin":"%s","source":"AUCTION","purchaseCost":12000,"addedOn":"2020-03-01","conditionCode":"AS_IS"}
        """
            .formatted(version, make, vin);
    return mockMvc
        .perform(
            authed(patch("/api/v1/vehicles/" + vehicleId).contentType(MediaType.APPLICATION_JSON).content(body), token))
        .andReturn();
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
