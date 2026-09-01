# AI Risk Manager — Agents & Developer Rules

## Core Operational Directives

All AI agents and developers working on the AI Risk Manager codebase MUST adhere strictly to the following 20 rules:

1. **Read `PROJECT_SPEC.md` before making changes.** Always align implementation details with the project specification.
2. **Inspect existing code before modifying anything.** Thoroughly research the current implementation and patterns before writing new code.
3. **Implement only the requested phase.** Do not jump ahead into future milestones or unprompted features.
4. **Do not rewrite working code unnecessarily.** Refactor only when specifically requested or strictly necessary for the current task.
5. **Do not modify unrelated files.** Keep pull requests and diffs tightly focused on the specific feature or bug fix.
6. **Do not add unnecessary dependencies.** Keep dependencies lean and justified. Use standard library or existing packages whenever possible.
7. **Do not change the architecture without explicit instruction.** Maintain the approved multi-tier architecture (React -> Express -> MongoDB / FastAPI / LLM).
8. **Never hardcode secrets.** All credentials, secrets, tokens, and keys must reside in `.env` files or secure environment variables.
9. **Use environment variables.** Reference configurations through structured config modules in all services.
10. **Never expose backend secrets to React.** Frontend code must not contain secret keys or sensitive configuration. No `VITE_` variables with private credentials.
11. **React communicates with Express only.** The frontend must never directly call FastAPI endpoints or external LLM APIs.
12. **Express communicates with FastAPI.** The Express gateway is the single orchestrator for invoking ML model predictions.
13. **ML metrics must come from real held-out test data.** Evaluate models on proper test splits; report authentic evaluation metrics (ROC-AUC, Precision, Recall, F1, Log Loss).
14. **Never fabricate metrics.** Never hardcode fake evaluation metrics or synthetic benchmark achievements.
15. **Prevent data leakage.** Keep training and test sets strictly separated, avoiding target leakage and post-event feature pollution.
16. **LLM responses must use verified evidence only.** Chargeback rebuttals drafted by LLM must be strictly grounded on attached and verified evidence to eliminate hallucinations.
17. **Final chargeback responses require human approval.** Enforce human-in-the-loop sign-off (`REVIEWER` or `ADMIN`) before marking responses as ready for submission.
18. **Add validation and error handling.** Use schema validation (Pydantic for Python, Mongoose/Joi/express-validator for Node.js) and robust error handling across all layers.
19. **Maintain clean modular code.** Follow separation of concerns across controllers, services, models, routes, and components.
20. **After implementation, run tests/build checks and report results.** Validate that tests pass and the application builds cleanly before completing a task.
