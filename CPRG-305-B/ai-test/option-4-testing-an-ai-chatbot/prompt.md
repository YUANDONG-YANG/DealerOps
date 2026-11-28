Design a test suite for the DealerOps in-dealership assistant. Do not execute the tests. Do not start MySQL, DealerOps.Core, DealerOps.AiService, DealerOps.Gateway, or the React app. Do not call a model API. Do not invent pass/fail actual results.

The suite will be marked as "Testing an AI Chatbot." Cover four qualities: accuracy, consistency, handling of unclear questions, and compliance with instructions. Put functional cases and instruction-compliance cases in separate sections.

Ground every functional case in `design/10-Web-AI-Assistant.md`. That document is the primary behavior source. It states:

- Dealer users ask one question and get a short explanation plus links into this dealership's resources. Example questions: "Which Toyota vehicles are in stock here," "Which Toyota vehicles are in stock?," "Show sold Toyota vehicles," and "Why can this vehicle not be listed."
- Platform administrators do not have this page.
- Queries are this dealership only.
- Phone, email, and home address are not sent to the model.
- Classroom retrieval supports make, VIN, and customer-name keywords and those simple stock questions. It returns up to five matches. Those matches are examples, not inventory or customer totals. It is not a general natural-language database query engine.
- The browser reaches core through the gateway. Core recognizes the JWT and `dealer_id`.
- Core uses ordinary queries to find at most five of this dealership's vehicles, customer IDs, and advertisement statuses.
- Core calls ai-service, which calls the GitHub assistant component. Core then verifies that any IDs returned by the model are among those five and drops invented paths.
- The conversation must not change vehicles, customers, or check results.
- One question and answer completes synchronously. There is no queue, no vector store, and no complex multi-turn storage. A three-turn cap, if kept, only limits what may be sent. Per-user turns are not retained in memory, because the next model call sends the question plus the retrieved resources only, and the history must not grow for the life of the process. The conversation is not persisted to business tables.
- If the model is down, show only the retrieval list and state "Smart explanation is temporarily unavailable."

Also apply these instruction rules, even though they are not sentences in `design/10-Web-AI-Assistant.md`:

- LEAD-09, from `design/21-Feature-Extensions.md`: lead notes and lead data are never sent to AI. This version of the assistant does not read leads.
- Cross-tenant non-leak: one dealer's data is not revealed to another dealer's user. `design/10-Web-AI-Assistant.md` states the query scope as this dealership only.
- Service boundaries from `AGENTS.md`: the browser talks only to dealer-gateway. It must not call DealerOps.Core or DealerOps.AiService directly. DealerOps.AiService must not access the application database.

Use only instruction-compliance rules the sources above actually state. If a rule is missing, write that the expected result is not specified. Do not invent HTTP status codes, JSON fields, button names, routes, or fixed sentences that those sources do not contain.

Where you know a later design document or the Playwright assistant specs disagree with `design/10-Web-AI-Assistant.md`, keep the design/10 result as the primary expected result and add a second line labeled Conflict. Do not collapse the disagreement into one result.

Each case must have:

- a case ID
- a requirement ID (use LEAD-09 where that rule applies; for design/10 rules, cite the document and the rule in a short stable label)
- a precondition
- a stimulus
- an expected observable result
- an actual result of "Not executed"

Use two dealerships in the preconditions when isolation matters. Use obvious fixture values, never real secrets or credentials. For payload rules, name the inspection point: the public answer the user sees, or the request core sends to the model. Say which one the case uses.

Separate the cases into:

1. Functional accuracy, grounded in design/10.
2. Consistency.
3. Unclear or out-of-scope questions.
4. Instruction compliance, with hard checks for LEAD-09, cross-tenant isolation, contact fields not sent to the model, no writes, identifier filtering, no retained history, the browser/gateway boundary, and AiService having no application-database access.

End with a list of behaviors you refused to invent because the cited sources do not state them.
