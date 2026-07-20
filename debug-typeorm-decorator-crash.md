# Debug Session: typeorm-decorator-crash
- **Status**: [OPEN]
- **Issue**: `npm run dev` crashes the backend at startup with `TypeError: Cannot read properties of undefined (reading 'constructor')` inside `PrimaryGeneratedColumn` when `nodemon` launches the API through TypeScript runtime transpilation.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: `.dbg/trae-debug-log-typeorm-decorator-crash.ndjson`

## Reproduction Steps
1. Run `npm run dev` from the project root.
2. Observe the frontend start successfully.
3. Observe the backend crash during decorator evaluation before the server finishes startup.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | `tsx` transpiles property decorators incorrectly in this workspace, causing `undefined` decorator targets. | High | Low | Confirmed |
| B | The backend dev runner uses the wrong module/runtime config relative to `api/tsconfig.json`. | High | Low | Confirmed |
| C | A dependency mismatch among `typeorm`, `reflect-metadata`, `typescript`, or Node 22 causes runtime incompatibility. | Medium | Medium | Inconclusive |
| D | The issue is entity-agnostic and reproducible with a minimal decorated class, proving infra/runtime failure rather than relation logic. | High | Low | Confirmed |
| E | Earlier circular-import edits are incidental noise and not the root cause of the current crash. | Medium | Low | Confirmed |

## Log Evidence
- User stack trace shows `PrimaryGeneratedColumn` crashing during decorator evaluation while the backend is launched through `tsx`.
- `.dbg/trae-debug-log-typeorm-decorator-crash.ndjson:2` shows the instrumented backend executor is `ts-node --project api/tsconfig.json api/server.ts`.
- `.dbg/trae-debug-log-typeorm-decorator-crash.ndjson:3` shows the minimal decorated entity fails under `tsx` with exit code `1`.
- `.dbg/trae-debug-log-typeorm-decorator-crash.ndjson:4` shows the same compiled JavaScript succeeds under plain `node` with exit code `0`.
- Current `ts-node` reproduction fails earlier with `TS1361` because `GradeLevel` is imported via `import type` but used in `@ManyToOne(() => GradeLevel, ...)`.

## Verification Conclusion
- Root cause of the original crash is runtime transpilation under `tsx`, not the entity model itself.
- Current dev-server failure is additionally blocked by an invalid type-only import introduced during prior edits.
- Post-fix verification with `ts-node --project api/tsconfig.json api/server.ts` reaches backend startup successfully.
- Full `npm run dev` verification now starts both the backend and Vite; the only remaining runtime warnings are unrelated SMTP configuration notices.
