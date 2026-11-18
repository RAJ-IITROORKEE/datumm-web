# Phase packet — Wave 6b: answer draft streaming and measured timing (N5)

| Field | Value |
| --- | --- |
| Status | approved 19 Nov 2026. User: "do n5". Decision: **stream a draft, replaced by the checked answer**. |
| Plans | PLAN.md N5; [harness decision](harness-decision-2026-11-17.md) :31 and :63 (the forced `finish_answer` tool and validation block streaming; N5 fixes it in place); [desktop comparison](desktop-harness-comparison-2026-11-17.md) :52 (stream text, buffer tool calls until complete, fail on `length`) |
| Repos | `datumm-orchestrator/apps/domain-api` and `datumm-web` |
| Workers | Two Sonnet subagents (effort high), in parallel against the contract below. **A** works on the backend only, **B** on the web only. The main agent reviews, runs gates, tests in the browser, releases and measures. |

## 1. Today (checked 19 Nov)

- **Model calls:** `budget.invoke_tracked` calls `runnable.ainvoke` (`budget.py:500`), so nothing is streamed. The answer is the `answer` argument of the `finish_answer` tool call (`agent_workflow.py:1122`). It is checked and may be rewritten at :2853–2961, then saved as `data.answer` and an `answer` event.
- **Backend to web:** the SSE route `GET /v2/tasks/{id}/events?after=N` (`task_api.py:255`) re-reads Mongo every 0.3 s and ends with a `snapshot` frame.
- **Web to browser:** the web route (`src/lib/agui/adapter.mjs`) relays it as AG-UI. The answer goes out as **one** `TEXT_MESSAGE_CONTENT` after the snapshot (:91–95).
- **Timing:** per-call `durationMs` only; no time to first token anywhere.
- **Deployment:** one uvicorn worker and one ECS task, so the API and the agent loop share a process (`main.py:112`).

## 2. Contract

### A — backend

1. **Streaming model calls.** `invoke_tracked` gains streaming. It uses `runnable.astream(request)` and merges chunks into the same final `AIMessage` (`chunk + chunk`), so every caller still gets the same message, tool calls and usage.
   - It records `firstTokenMs` (time from the request to the first chunk with any content or tool-call delta) next to `durationMs` on the usage receipt and on `model_call_telemetry`.
   - A `finish_reason` of `length` still fails as today.
   - The setting `answer_streaming_enabled: bool = True` controls it. When off, the code uses `ainvoke` exactly as now and records no `firstTokenMs`.
2. **Answer draft.** While a streamed call's tool-call delta belongs to `finish_answer`, an incremental JSON string reader takes only the `answer` field's characters, handling escapes and arguments in any order. It ignores every other argument and all non-`finish_answer` tool calls.
   - The draft text goes into an **in-process** buffer keyed by run id (`answer_drafts.py`): `{text, seq, updatedAt}`, capped at 3,000 characters like the answer itself. It is never written to Mongo.
   - The buffer is cleared when the answer event is saved, or when the run ends, fails or is cancelled.
   - Mark it `ponytail:` single-process only (one uvicorn worker, one task). With more workers, move it to a capped Mongo or Redis channel.
3. **SSE.** While a draft exists for the task's active run, the events route also yields non-persisted frames `{"stage":"answer_draft","text":"<full draft so far>","seq":n}`. These are sent only when the text has changed, at most every 150 ms (drop to a 0.15 s loop while a draft is active, and keep 0.3 s otherwise).
   - They carry **no** event cursor, so a reconnect never replays them.
   - After the `answer` event, no draft frame is sent.
   - The draft is owner-scoped like the rest of the stream.
4. **Traces and run steps.**
   - `traces.py` adds `firstTokenMs` per call, plus p50 and p95 `firstTokenMs` beside the duration percentiles.
   - It adds a phase `firstTokenMs`: run created to the first token of the first call.
   - `run_steps.py` shows a model node's `firstTokenMs` when present.
   - The reasoning clock keeps using `durationMs`, unchanged.
5. **Tests (with a fake streaming model):**
   - Merged chunks equal the `ainvoke` result: content, tool calls, usage.
   - `firstTokenMs` is recorded and is at most `durationMs`.
   - The draft reader handles split escapes, unicode, `answer` placed after other arguments, and other tools ignored.
   - The buffer clears on answer, failure and cancel.
   - SSE emits draft frames without a cursor and stops after the answer.
   - The setting off means `ainvoke` and no drafts.
   - A `length` finish still fails.

### B — web

1. **Adapter** (`src/lib/agui/adapter.mjs`). On backend `answer_draft` frames it emits `TEXT_MESSAGE_START` once, with the same message id the final answer will use, then `TEXT_MESSAGE_CONTENT` deltas.
   - A delta is the new suffix when the draft extends the previous text.
   - If a draft does not extend the previous one (rare), it sends nothing further until the final answer.
   - **On the final answer**, if the checked answer starts with what was streamed, it sends the remaining suffix and then `TEXT_MESSAGE_END`. Otherwise it emits a `CUSTOM` event `datumm.answer.replace` with the full checked answer before `TEXT_MESSAGE_END`. The client then replaces the text.
   - With no drafts at all, behaviour is exactly today's.
2. **Client** (`src/lib/agui-chat-transport.ts`, the chat message rendering). While the message is streaming it is marked as a draft: it gets a muted style and a small "Writing…" label, has `aria-busy="true"`, and its updates are not read out token by token. The final answer is announced once, when complete.
   - On `datumm.answer.replace`, the text is replaced with the checked answer.
   - The draft never shows tool arguments, reasoning or anything except the answer field.
3. **Admin traces and Run steps:** show "first word" times, `firstTokenMs` and p50/p95, where the backend provides them.
4. **Tests:** pure functions for suffix and replace in a small `src/lib/agui/answer-draft.mjs` (+ `.d.mts` + test); adapter tests with recorded frames for extend, replace and no-draft; and the dev replay (`/api/dev/agui-replay`) gains a fixture with draft frames, so the browser shows a live draft in development.

## 3. Honesty rules kept

- The draft is labelled as a draft, and the saved answer is always the checked one.
- Docs claim token streaming only after it is measured live in this wave, with numbers and a date.
- `HANDOFF.md:61–63` and the AG-UI docs are updated only after the live measurement.

## 4. Out of scope

- Streaming tool output or reasoning.
- Streaming specialist or critic calls (they use their own call path).
- More than one worker.

## 5. Risks

- **The draft differs from the checked answer:** covered by the replace event, and measured (how often a replace happens) in the live check.
- **Event-loop load:** small, since there is one buffer per run and frames at most every 150 ms.
- **CloudFront or Vercel buffering:** both SSE hops already set `X-Accel-Buffering: no`. The live check measures the time to the first draft frame in the browser.

## 6. Gates and checks

- **Backend:** pytest, `lat check`, all 9 packaged image checks.
- **Web:** typecheck, `npm test`, build, `lat check`.
- **Live,** in a new test chat:
  - ask a plain question (no plan) and a design question;
  - watch the draft appear in the browser, and record the times from send to first draft text and to the final answer;
  - check the admin trace for `firstTokenMs` p50 and p95;
  - no console errors;
  - with `ANSWER_STREAMING_ENABLED=false` (not set in prod), local tests show today's behaviour.

## 7. Rollback

Revert the commits. Set `ANSWER_STREAMING_ENABLED=false` to go back to `ainvoke`; this needs a stack parameter change.

## 8. Result

| Item | Outcome |
| --- | --- |
| Build | **Backend `3dc1d1d`:** `invoke_tracked` streams (`astream`, merged into the same `AIMessage`, with streamed usage and cost kept through `TrackedChatOpenAI`), records `firstTokenMs`, and feeds the `finish_answer` answer field through `answer_drafts.AnswerReader` into an in-process buffer. The SSE route sends cursorless `answer_draft` frames, at most every 0.15 s, until the answer event. A draft is cleared at the start of each model call, so a rejected finish never stays on screen. Traces and run steps show first-token times. **Web `7261f99`:** drafts become text deltas on the final message id; the checked answer continues the draft or replaces it (`datumm.answer.replace`); the muted "Writing…" draft is `aria-busy` and not announced per token; admin and run-step first-word times; and a paced dev replay. |
| Gates | **Backend:** pytest 946 + 26 subtests; all 9 packaged image checks; `lat check`. **Web:** typecheck, 1005/1005, build, `lat check`. Dev replay seen in the browser: drafts grow word by word, and the replace case swaps in the checked answer. A stale long-running dev server had first served the old adapter; restarting it fixed that. |
| Live, 19 Nov | **Backend `3dc1d1d` live at 20:33Z on 18 Nov.** Rehearsal 36,929 documents, 0 tracebacks; the change set touched only Service and Task. Web `7261f99` deployed; smoke passed. **Live site, new test chat:** first draft words in the browser 13.7 s after send, then 5 draft updates over 0.65 s, then the checked answer. No console errors. Model calls: 1,892 ms total with the first token at 1,692 ms, and 9,095 ms total with the first token at 8,451 ms. **Localhost against the live backend:** first draft 19.1 s, 4 updates over 0.28 s; calls 2,132/1,941, 6,825/6,225 and 7,641/7,095 ms (total/first). |
| Finding | With today's reasoning model, about 90 % of each call is silent thinking before the first token, and the answer text is written in under a second at the end. Streaming works, but the visible gain is small; time to the first word is dominated by reasoning effort and the number of calls (2 to 3 per plain question). The next real speed lever is the model and effort routing (the JEV track), not transport. |
| Not verified | A draft that the checks rejected, live (covered by tests); the replace path live (the checked answers matched the drafts); `ANSWER_STREAMING_ENABLED=false` on hosted. |
