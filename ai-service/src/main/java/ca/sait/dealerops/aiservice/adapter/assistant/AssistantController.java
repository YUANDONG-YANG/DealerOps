package ca.sait.dealerops.aiservice.adapter.assistant;

import ca.sait.dealerops.aiservice.adapter.assistant.AssistantDtos.AssistantInternalRequest;
import ca.sait.dealerops.aiservice.adapter.assistant.AssistantDtos.AssistantOkResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/v1")
public class AssistantController {

  private final AssistantAdapter adapter;

  public AssistantController(AssistantAdapter adapter) {
    this.adapter = adapter;
  }

  @PostMapping("/assistant")
  public AssistantOkResponse assistant(@RequestBody AssistantInternalRequest body) {
    return adapter.run(body);
  }
}
