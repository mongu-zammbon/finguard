# FinGuard 발표 모드·데모 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오늘 회의에서 보여줄 수 있는 스크롤형 HTML 발표 모드와 서비스 수준의 데모 경험을 추가하고, Google Slides를 같은 메시지로 보강한다.

**Architecture:** 기존 Python 표준 라이브러리 HTTP 서버를 유지한다. `/pitch`는 정적 HTML/CSS/JavaScript로 구성하고, `/v1/demo-cases`와 `/v1/analyze`를 재사용한다. 발표 모드와 일반 데모는 같은 분석 계약을 사용하므로 화면만 확장하고 분석 결과의 출처는 바꾸지 않는다.

**Tech Stack:** Python 3.12+, `http.server`, HTML/CSS/vanilla JavaScript, 기존 `unittest`, Playwright 브라우저 검증, Google Slides native batch update.

**Spec:** `docs/superpowers/specs/2026-08-23-pitch-demo-design.md`

## Global Constraints

- Python 3.12 이상을 요구한다.
- 외부 Python/JavaScript 런타임 의존성을 추가하지 않는다.
- 입력 원문을 서버 로그·브라우저 저장소·파일에 저장하지 않는다.
- 외부 URL을 fetch하지 않는다.
- 현재 `/`의 API 계약과 기존 테스트를 깨지 않는다.
- 최종 대회용 AI 성능으로 가장하지 않고 `rules-v0.1-demo`를 명시한다.

---

### Task 1: Demo scenario contract

**Files:**
- Modify: `app/server.py`
- Test: `tests/test_server_contract.py`
- Modify: `docs/API.md`

**Interfaces:**
- Consumes: existing `analyze_text()` and `DEMO_CASES`.
- Produces: six stable case objects with `id`, `label`, `title`, and `text`.

- [x] **Step 1: Write failing contract tests**

Add assertions that the case IDs contain `danger-transfer`, `danger-remote`, `danger-investment`, `danger-marketplace`, `prompt-injection`, and `low-risk-not-proof`, and that every object has the four required string fields.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `python3 -m unittest tests.test_server_contract.ServerContractTests.test_demo_cases_cover_the_meeting_story -v`

Expected: FAIL because the current server has only four cases.

- [x] **Step 3: Normalize the six cases**

Keep the current danger-transfer and prompt-injection text. Rename the existing `caution-remote` case to `danger-remote`, rename `abstain` to `low-risk-not-proof`, and add investment and marketplace cases with safe, synthetic Korean text. Ensure every declared `label` matches `analyze_text()` output by testing each case through the analyzer before committing.

- [x] **Step 4: Run focused and full tests**

Run: `python3 -m unittest tests.test_server_contract -v` and `python3 -m unittest discover -s tests -v`.

Expected: PASS.

- [x] **Step 5: Update API documentation**

Document the six case IDs and state that `label` is an expected demo result, not a production fraud verdict.

### Task 2: Presentation mode route and structure

**Files:**
- Modify: `app/server.py`
- Create: `web/pitch.html`
- Create: `web/pitch.css`
- Create: `web/pitch.js`
- Test: `tests/test_server_contract.py`

**Interfaces:**
- Consumes: `GET /v1/demo-cases`, `POST /v1/analyze`.
- Produces: `GET /pitch`, `/pitch.css`, and `/pitch.js`.

- [x] **Step 1: Add route contract tests**

Add a small handler-level or static contract test that `WEB_ROOT` contains `pitch.html`, `pitch.css`, and `pitch.js`, and that the server route allow-list includes `/pitch`.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `python3 -m unittest tests.test_server_contract.ServerContractTests.test_pitch_assets_are_available -v`.

Expected: FAIL because the assets do not exist yet.

- [x] **Step 3: Implement the HTML narrative**

Create eight sections: thesis, moment, service, live demo, trust, competition, expansion, decision. Use real Korean copy from the service brief. Provide skip links, a `<main>`, one `<h1>`, ordered `<h2>` sections, and buttons with visible labels.

- [x] **Step 4: Implement the presentation CSS**

Use the existing dark navy/acid-lime visual language. Use a full-width scroll narrative, a calm data grid for the flow, a red danger accent only for the danger result, and a fixed progress rail that remains readable without relying on color alone. Add responsive breakpoints for 320px, 768px, and 1024px widths and `prefers-reduced-motion` support.

- [x] **Step 5: Implement pitch JavaScript**

Fetch demo cases, render case buttons with `textContent`, call the existing analyze endpoint, render result cards, support `Space` to run the six-case sequence and `Escape` to stop it, and show a non-empty server-error state. Do not use `innerHTML` for user or server-provided text.

- [x] **Step 6: Run route tests and static checks**

Run: `python3 -m unittest discover -s tests -v` and `python3 -m compileall -q app`.

Expected: PASS.

### Task 3: Strengthen the existing service demo

**Files:**
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: browser runtime via Playwright

**Interfaces:**
- Consumes: existing `/v1/demo-cases` and `/v1/analyze` contract.
- Produces: clearer demo-case grouping, result action checklist, and a link to `/pitch`.

- [x] **Step 1: Add the UI entry point**

Add an accessible “발표 모드 열기” link in the existing header and a service positioning line near the empty result state.

- [x] **Step 2: Add the action checklist**

Render the safe action as a visually distinct checklist with explicit “하지 말 것” and “지금 할 것” labels. Preserve the existing text-safe rendering.

- [x] **Step 3: Add a runtime demo shortcut**

Add a visible `/pitch` presentation-mode entry point; keep the manual analyze flow unchanged.

- [x] **Step 4: Browser verification**

Start `./run_demo.sh`, open `/`, click danger, injection, and low-risk cases, confirm result text, then open `/pitch`. Confirm no console errors or warnings.

### Task 4: Local presentation QA and meeting docs

**Files:**
- Modify: `README.md`
- Modify: `docs/DEMO_SCRIPT.md`
- Modify: `docs/MEETING_BRIEF.md`

- [x] **Step 1: Add run instructions**

Document `/pitch` as the primary meeting flow and Google Slides as the fallback.

- [x] **Step 2: Rewrite the demo script**

Use the new six cases and include the transition from live result to the wedge decision. Keep the total path within 90 seconds before the open discussion.

- [x] **Step 3: Run a clean smoke test**

Verify `healthz`, `readyz`, `demo-cases`, `/`, and `/pitch` with `curl`; verify no raw text appears in server logs.

### Task 5: Update Google Slides

**Files / artifact:** existing native presentation `1HRpPsrHFQXwUm2GhxH7e5ynGiGrWfYEpNoWhdtgmL54`

- [x] **Step 1: Add service-focused slides**

Append “현재 MVP는 무엇을 증명하는가?” and “MVP → 우승용 서비스” after the decision slide. Keep technical implementation details out of the main story.

- [x] **Step 2: Preserve source boundary**

Keep the official DAKER page in the existing source note and mark the prototype/production boundary. The two new slides contain strategy and implementation direction only, with no new external numeric claim requiring a source note.

- [x] **Step 3: Render and inspect all slides**

Refresh thumbnails, inspect the new slides and neighboring slides for clipping/overlap, and verify the outline contains the new story.

### Checkpoint: Meeting-ready

- [x] `python3 -m unittest discover -s tests -v` passes.
- [x] `/pitch` and `/` render at desktop and mobile widths.
- [x] Playwright console has zero errors/warnings after the complete demo flow.
- [x] Google Slides outline and thumbnails are clean.
- [x] README has one copy-paste launch command.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Demo looks like a keyword toy | High | Make evidence, safe action, abstain, and expansion path visible; label current engine honestly. |
| Six synthetic cases do not prove model quality | High | State they are meeting cases and add an evaluation-set workstream after today’s wedge decision. |
| Presentation becomes too technical | Medium | Keep architecture to one service expansion slide; put implementation details in GitHub docs. |
| Auto-play distracts from discussion | Low | Make it opt-in, keyboard accessible, and stoppable with Escape. |
