# Option 4 — Testing an AI Chatbot

Course option from `CPRG-305-B/ai-test.md` for the DealerOps in-dealership assistant.

| File | Role |
| --- | --- |
| `prompt.md` | The exact prompt used to design the tests |
| `ai-response.md` | The raw AI answer: the designed test suite |
| `reflection.md` | Comparison with the design and the Playwright assistant specs, written before the run |
| `actual-results.md` | The executed run: actual results per case, fixture corrections, and findings |

`ai-test.md` does not require a filename. The three parts are these three files.

`ai-response.md` and `reflection.md` are the designed suite and the reading-only review: at that
stage no service had been started and every actual result read "Not executed".

**The suite was afterwards executed.** `actual-results.md` holds the run: the private end-to-end
stack and `DealerOps.AiService` were started, roughly thirty questions were asked through the
gateway, and both inspection points the suite defines — the public answer and the model payload —
were captured. Two of the three fixture VINs turned out to be impossible to create, one compliance
expectation turned out to be true of links but not of answer text, and two conflicts the reflection
could not settle were resolved by observation. No language model was invoked, because no provider key
was available; `actual-results.md` §5 states exactly which qualities that leaves uncovered.
