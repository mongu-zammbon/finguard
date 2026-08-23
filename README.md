# FinGuard

FinGuard는 문자·스크린샷·결제 링크를 공유하는 순간, 송금·인증·링크 클릭 직전의 위험 신호를 끊어 보여주는 로컬 웹 데모입니다.

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

오늘 회의의 기본 화면은 발표 모드입니다.

- 발표용 스크롤 프레젠테이션: [http://127.0.0.1:8765/pitch](http://127.0.0.1:8765/pitch)
- 실제 서비스 thin slice: [http://127.0.0.1:8765/](http://127.0.0.1:8765/)

발표 모드에서 `90초 데모 시작`을 누르면 기관 사칭, 입력 공격, 원격제어, 투자, 중고거래, 낮은 위험/비증명 케이스가 순서대로 재생됩니다. 서비스 화면에서는 진입 경로를 먼저 보여준 뒤 중고거래 케이스를 누르면 `결제 링크` 경로가 자동 선택됩니다. 마지막에는 팀원이 가져온 아이디어 이름을 입력해 같은 기준으로 비교할 수 있습니다. 상세 대본은 [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md)에 있습니다.

## AI-DLC 자문 호출 — Claude Bedrock

Claude 의견은 로컬 `claude.ai` 세션이 아니라 맥미니의 Bedrock 래퍼로 호출합니다. 맥미니에서 AWS SSO를 먼저 갱신한 뒤, 로컬 터미널에서 절대경로를 지정합니다.

```bash
ssh macmini '/opt/homebrew/bin/aws sso login --profile claude-code'
ssh macmini '/Users/seok/.local/bin/claude-bedrock -p "PROMPT" --no-session-persistence --output-format text --permission-mode plan --model sonnet'
```

`/Users/seok/.local/bin/claude-bedrock`은 맥미니에 있는 파일이며, 로컬 `/opt/homebrew/bin/claude`와 다릅니다. 실제 호출 기록과 wedge 논의는 [`docs/MEETING_MINUTES.md`](docs/MEETING_MINUTES.md), 회의용 서비스 판단 자료는 [`docs/MEETING_BRIEF.md`](docs/MEETING_BRIEF.md)에 있습니다.

## 검증

```bash
python3 -m unittest discover -s tests -v
python3 -m compileall -q app
```

## 범위와 제한

- 현재 분석기는 설명 가능한 규칙 기반 데모 엔진입니다. 운영 금융 판단이나 사기 확정이 아닙니다.
- 입력 텍스트를 저장하지 않으며, 서버 로그에는 붙여 넣은 본문을 기록하지 않습니다.
- URL을 열거나 계좌·기관 API에 연결하지 않습니다.
- 개인정보가 포함된 원문은 회의 화면에 공유하지 말고, 테스트 데이터로 대체합니다.
- 공식 대회 정보는 [DAKER 2026 Finance AI Challenge](https://daker.ai/public/hackathons/2026-finance-ai-challenge)를 기준으로 확인합니다.

## 구조

```text
app/analyzer.py          deterministic rules + stable result contract
app/server.py            stdlib HTTP API and static file server
web/index.html           direct service thin slice
web/pitch.html           scrollable meeting presentation mode
web/                     meeting demo UI and presentation assets
tests/                   unittest contract and behavior tests
docs/                    product, API, safety, and meeting materials
```
