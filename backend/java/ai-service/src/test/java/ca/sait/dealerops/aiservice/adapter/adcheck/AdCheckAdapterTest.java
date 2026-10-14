package ca.sait.dealerops.aiservice.adapter.adcheck;

import static org.assertj.core.api.Assertions.assertThat;

import ca.sait.dealerops.aiservice.adapter.adcheck.AdCheckDtos.AiNote;
import java.util.List;
import org.junit.jupiter.api.Test;

/** PROTOCOL B.2: notes may be []; blank model text is success with no notes. */
class AdCheckAdapterTest {

  @Test
  void blankContentIsEmptyNotesNotFailure() {
    List<AiNote> notes = AdCheckAdapter.notesFrom("");
    assertThat(notes).isEmpty();
  }

  @Test
  void nullContentIsEmptyNotes() {
    assertThat(AdCheckAdapter.notesFrom(null)).isEmpty();
  }

  @Test
  void whitespaceOnlyIsEmptyNotes() {
    assertThat(AdCheckAdapter.notesFrom("  \n  \n")).isEmpty();
  }

  @Test
  void linesBecomeMessages() {
    assertThat(AdCheckAdapter.notesFrom("One claim.\n\nTwo."))
        .extracting(AiNote::message)
        .containsExactly("One claim.", "Two.");
  }
}
