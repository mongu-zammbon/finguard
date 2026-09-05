# FinGuard

FinGuard는 금융사고 전후의 흩어진 자료를 증거와 공식 다음 행동으로 연결하는 로컬 웹 데모입니다. MVP의 중심은 계좌가 막힌 후 거래·대화·문서를 묶어 소명팩을 준비하는 FROZEN이며, 행동 직전(BEFORE)과 송금 직후(AFTER), 불법 추심 대응(SHIELD)이 같은 기록 흐름으로 연결됩니다.

첫 사용자 가설은 금융 사기 문자를 받은 사람과 대신 확인하는 가족·보호자입니다. 서비스 화면에서 다음 세 진입 경로를 고를 수 있습니다.

- `공유받은 문자`: SMS·메신저에서 FinGuard로 공유받은 상황
- `스크린샷`: 이미지는 로컬 미리보기만 하고, 데모에서는 OCR 결과 텍스트를 분석
- `결제 링크`: 외부 URL을 열지 않고 링크가 포함된 메시지 문맥만 분석

붙여넣기는 세 경로의 텍스트 fallback이며, 결과는 다음을 반환합니다.

- `DANGER`: 송금·인증·링크 클릭을 즉시 중단하고 공식 채널에서 확인
- `INJECTION`: 입력 안의 시스템 우회·비밀정보 요구 지시문 격리
- `CAUTION`: 추가 행동 전 발신자와 요청을 독립적으로 확인
- `LOW_RISK_NOT_PROOF`: 현재 신호는 낮지만 안전하다고 증명하지 않음
- `ABSTAIN`: 판단을 보류하고 사람이 확인

## 로컬 실행

Python 3.12 이상만 필요합니다. 외부 패키지와 외부 네트워크 호출은 사용하지 않습니다.

```bash
cd finguard
python3 -m app.server --port 8765
```

브라우저에서 [http://127.0.0.1:8765](http://127.0.0.1:8765)를 엽니다.

## Render 공개 배포

저장소 루트의 [`render.yaml`](render.yaml)이 공개 웹 서비스 설정의 기준입니다. Render에서 GitHub 저장소 `mongu-zammbon/finguard`, 브랜치 `main`을 선택해 Blueprint로 생성하거나, 수동 생성 화면에 아래 값을 입력합니다.

- Build Command: `python3 -m compileall -q app`
- Start Command: `python3 -m app.server --host 0.0.0.0 --port $PORT`
- Health Check Path: `/healthz`
- 외부 환경변수: 없음

배포 후 `/healthz`, `/readyz`, `/`, `/pitch`를 차례로 확인합니다. Render 기본 파일 시스템은 영구 사건 저장소로 사용하지 않으므로, 현재 MVP는 원문을 서버에 보관하지 않는 설계를 유지합니다. 실제 계정별 저장·복원과 삭제를 운영 기능으로 추가하려면 인증, 영구 DB, 보존기간 정책을 별도로 연결해야 합니다.

서비스 제안서를 읽을 때는 발표 모드를 사용합니다.

- 서비스 제안용 스크롤 프레젠테이션: [http://127.0.0.1:8765/pitch](http://127.0.0.1:8765/pitch)
- 실제 서비스 thin slice: [http://127.0.0.1:8765/](http://127.0.0.1:8765/)

발표 모드에서 `90초 데모 시작`을 누르면 기관 사칭, 입력 공격, 원격제어, 투자, 중고거래, 낮은 위험/비증명 케이스가 순서대로 재생됩니다. 서비스 화면에서는 진입 경로를 먼저 보여준 뒤 중고거래 케이스를 누르면 `결제 링크` 경로가 자동 선택됩니다. 마지막에는 다른 아이디어 이름을 입력해 같은 기준으로 비교할 수 있습니다. 상세 대본은 [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md)에 있습니다.

## 서비스 흐름

- `#before`: 행동 직전 메시지를 빠르게 확인하고 송금·인증·링크 클릭을 보류
- `#after`: 송금 직후 72시간 동안 지급정지·공식 확인·증거 보존 순서 안내
- FROZEN 소명 시작: `#s00` 체험 시작 → `#g01` 메시지 입력 → `#g02` 결과 확인 → `#g03` 보관 동의 → `#c01` 사건 안내 → `#workspace` 사건 워크스페이스. C01–C08에서 원본·사실·거래·이슈·타임라인·보고서·자료 보완을 확인
- `#shield`: 불법 추심 연락을 안전 확보·기록·공식 상담 준비로 연결

FROZEN과 SHIELD는 합성 텍스트 자료를 실제로 추가·확인·수정하고, 선택한 자료로 HTML을 내려받는 브라우저 내 MVP입니다. 기존 FROZEN 사건 화면은 ‘기존 화면 예시 보기’로 보존했습니다. BEFORE·AFTER의 기존 진입 화면과 홈의 문구·배치는 유지합니다. 어느 서비스도 실제 송금이나 신고를 실행하지 않습니다.

### 이번 작업: 원문에서 내려받기까지

- 현재 확인 주소: [http://127.0.0.1:8876/#home](http://127.0.0.1:8876/#home), 실행: `python3 -m app.server --port 8876`
- FROZEN: 시작 안내 → 메시지 점검 → 자료 정리 범위 동의 → 사건 안내 → 자료 추가 / 원문 확인 / 거래 연결 / 소명팩
- SHIELD: `#shield` 안내에서 바로 `#shield-workspace/s02` 연락 입력. 8개 메뉴는 순서대로 완료하는 절차가 아니라 선택형 업무입니다.
- 입력: 합성 텍스트 또는 UTF-8 TXT(64KB 이하, 내용 8,000자 이하). 이미지/PDF OCR은 지원하지 않습니다.
- 원문은 그대로 두고, 문장별 확인 상태·사용자 수정·메모·변경 전후 이력을 별도로 기록합니다. 문장 구분은 AI 사실 추출이 아닙니다.
- FROZEN 비교는 명시된 같은 주문 ID의 주문/입금 금액에 한정합니다. 모호한 자료를 자동 일치·불일치로 확정하지 않습니다.
- 보고서는 선택한 원문과 관련 확인 내용·이력만 포함합니다. HTML 다운로드와 브라우저 인쇄의 ‘PDF로 저장’을 지원하며 자동 기관 전송은 하지 않습니다.
- 새 Gate 사건은 이전 사건과 자동 합쳐지지 않습니다. 같은 탭의 ‘개요 → 다른 사건’에서 이전 원문·이력·작성 중 내용을 다시 선택할 수 있습니다(최대 10개).

**보관 범위:** 서버·localStorage·sessionStorage에 사건을 보관하지 않습니다. 탭을 새로고침하거나 닫으면 작업과 사건 목록이 사라집니다. HTML은 선택한 내용의 보고서이며, 재편집 가능한 전체 사건 백업은 아닙니다. 다운로드 후에도 종료 경고를 유지합니다. ‘24시간 후 삭제’나 ‘접수 완료’를 실제 동작으로 약속하지 않습니다.

## AI-DLC 자문 호출 — Claude Bedrock

Claude 의견은 로컬 `claude.ai` 세션이 아니라 맥미니의 Bedrock 래퍼로 호출합니다. 맥미니에서 AWS SSO를 먼저 갱신한 뒤, 로컬 터미널에서 절대경로를 지정합니다.

```bash
ssh macmini '/opt/homebrew/bin/aws sso login --profile claude-code'
ssh macmini '/Users/seok/.local/bin/claude-bedrock -p "PROMPT" --no-session-persistence --output-format text --permission-mode plan --model sonnet'
```

`/Users/seok/.local/bin/claude-bedrock`은 맥미니에 있는 파일이며, 로컬 `/opt/homebrew/bin/claude`와 다릅니다. 실제 호출 기록과 wedge 논의는 [`docs/MEETING_MINUTES.md`](docs/MEETING_MINUTES.md), 서비스 제안 브리프는 [`docs/MEETING_BRIEF.md`](docs/MEETING_BRIEF.md)에 있습니다.

## 검증

```bash
python3 -m unittest discover -s tests -v
python3 -m compileall -q app
node --test tests/test_case_records.cjs tests/test_case_workspace.cjs
```

브라우저 검증은 전용 새 Playwright CLI 세션에서 `run-code --filename tests/browser_case_workspace.js`를 실행하고, 같은 세션에서 `run-code --filename tests/browser_case_edgecases.js`를 이어서 실행합니다. 합성자료 입력·수정·원문 보존·부분 내보내기·SHIELD 메뉴·TXT 오류·사건 분리·PDF 출력·320–1440px 가로 넘침을 점검합니다. Node는 테스트에만 필요하며 서비스 실행 의존성은 추가하지 않았습니다.

## 범위와 제한

- 현재 분석기는 설명 가능한 규칙 기반 데모 엔진입니다. 운영 금융 판단이나 사기 확정이 아닙니다.
- 입력 텍스트를 저장하지 않으며, 서버 로그에는 붙여 넣은 본문을 기록하지 않습니다.
- URL을 열거나 계좌·기관 API에 연결하지 않습니다.
- 개인정보가 포함된 원문은 공유 화면에 넣지 말고, 테스트 데이터로 대체합니다.
- 공식 대회 정보는 [DAKER 2026 Finance AI Challenge](https://daker.ai/public/hackathons/2026-finance-ai-challenge)를 기준으로 확인합니다.

## 구조

```text
app/analyzer.py          deterministic rules + stable result contract
app/server.py            stdlib HTTP API and static file server
web/index.html           direct service thin slice
web/pitch.html           scrollable service proposal mode
web/                     service demo UI and presentation assets
tests/                   unittest contract and behavior tests
docs/                    product, API, safety, and validation materials
```
