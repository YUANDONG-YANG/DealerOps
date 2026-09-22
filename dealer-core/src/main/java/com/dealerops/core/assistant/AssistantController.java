package com.dealerops.core.assistant;

import com.dealerops.core.assistant.dto.AskRequest;
import com.dealerops.core.assistant.dto.AskResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/assistant")
public class AssistantController {

  private final AssistantService assistantService;

  public AssistantController(AssistantService assistantService) {
    this.assistantService = assistantService;
  }

  @PostMapping("/ask")
  public AskResponse ask(@Valid @RequestBody AskRequest body) {
    return assistantService.ask(body);
  }
}
