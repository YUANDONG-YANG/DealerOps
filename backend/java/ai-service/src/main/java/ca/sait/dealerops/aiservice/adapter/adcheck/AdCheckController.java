package ca.sait.dealerops.aiservice.adapter.adcheck;

import ca.sait.dealerops.aiservice.adapter.adcheck.AdCheckDtos.AdCheckInternalRequest;
import ca.sait.dealerops.aiservice.adapter.adcheck.AdCheckDtos.AdCheckOkResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/v1")
public class AdCheckController {

  private final AdCheckAdapter adapter;

  public AdCheckController(AdCheckAdapter adapter) {
    this.adapter = adapter;
  }

  @PostMapping("/ad-check")
  public AdCheckOkResponse adCheck(@RequestBody AdCheckInternalRequest body) {
    return adapter.run(body);
  }
}
