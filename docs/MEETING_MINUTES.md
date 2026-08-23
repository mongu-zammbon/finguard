# FinGuard AI-DLC 자문 회의록

일시: 2026-08-23 (로컬 실행 회의)

초기 자문은 4인으로 진행했다. 현재 구현·운영·검증 실행은 `Codex + kiro-cli opsfield + grok` 3인으로 진행하고, Claude Bedrock 내용은 완료된 금융 도메인 검토 기록으로 유지한다.

## 참석 및 호출 상태

| 역할 | 호출 경로 | 상태 | 기여 |
|---|---|---|---|
| Codex | 현재 세션 | 완료 | 제품 정의, 구현, 통합 의사결정 |
| kiro-cli opsfield | `kiro-cli chat --agent opsfield` | 완료 | MVP 범위, 데모 성공조건, 운영 리스크 |
| claude-bedrock | 맥미니 `/Users/seok/.local/bin/claude-bedrock` | 완료 | AWS SSO → gateway token 경로로 금융 도메인 리뷰 수신 |
| grok | `grok -p` | 완료 | 경쟁 대안 공격, 차별화, 데모 실패 조건 |

Claude 의견은 로컬 `omx ask claude`가 아니라 맥미니의 Bedrock 래퍼를 통해 수신했다. AWS SSO 자격증명은 유효했고, 래퍼의 `get-gateway-token.sh`도 정상적으로 토큰을 반환했다. 래퍼가 PATH에 등록되지 않은 상태였으므로 절대경로를 사용했다.

실행 경로:

```bash
ssh macmini '/opt/homebrew/bin/aws sso login --profile claude-code'
ssh macmini '/Users/seok/.local/bin/claude-bedrock -p "..." --no-session-persistence --output-format text --permission-mode plan --model sonnet'
```

## 합의된 제품 문장

**FinGuard는 송금·인증·링크 클릭 직전에 붙여넣는 금융 대화문을 한 번 끊고, 위험 라벨·근거·안전한 다음 행동만 주는 로컬 게이트다.**

## 핵심 이견: 첫 wedge

| 에이전트 | 추천 wedge | 근거 |
|---|---|---|
| kiro-cli opsfield | 보이스피싱·기관 사칭·안전계좌 이체 | 금융 현안성이 강하고 데모의 위험 행동 중단 장면이 분명함 |
| claude-bedrock | 중고거래 사기 대화 + 결제·링크 클릭 전 확인 | 붙여넣기 습관이 이미 있고, 긴급성·개인정보 마찰이 상대적으로 낮아 초기 행동 실험이 쉬움 |
| grok | 보이스피싱/스미싱의 “행동 직전 30초” | 금융사 사후 탐지·검색·키워드 경고와 다른 접점이 명확함 |

### 의장 결론

오늘 데모는 **보이스피싱/기관 사칭**으로 진행한다. 단, 서비스 의사결정 슬라이드에 **중고거래 사기**를 명시적인 2차 wedge 후보로 올려 팀 투표를 받는다. 이는 금융 현안 임팩트와 초기 사용성 가설이 충돌하는 지점이며, 실제 공개 데이터·사용자 행동 실험으로 결정한다.

## 합의

1. 첫 MVP는 보이스피싱·기관 사칭·안전계좌 이체·원격제어 요청에 집중한다.
2. 입력 → 라벨 → 증거 → 다음 행동의 4단계 UX를 90초 안에 보여준다.
3. `LOW_RISK_NOT_PROOF`와 `ABSTAIN`은 핵심 차별화이자 신뢰 장치다.
4. 실제 송금·로그인·URL fetch·금융기관 연동은 데모에서 하지 않는다.
5. 로컬-only 실행은 데이터 유출 방지와 심사 현장 재현성을 동시에 제공한다.

## 반대/보류

- 룰 기반만으로 최종 우승 성능을 주장하지 않는다. 공개 사례 평가셋과 모델 비교가 다음 단계다.
- 개인 사용자와 상담원 중 첫 타깃은 오늘 팀 투표로 확정한다.
- 보이스피싱과 중고거래 사기 중 첫 wedge는 오늘 팀 투표 후 고정한다.
- Claude Bedrock은 오탐률, 붙여넣기 이탈률, 설명가능성 행동전환을 우선 검증하라고 제안했다.
- 공식 대회의 수치형 평가 가중치는 공식 페이지에서 확인되지 않았으므로 숫자를 만들어 PPT에 넣지 않는다.

## 즉시 실행 항목

| 우선순위 | 항목 | 담당 |
|---|---|---|
| P0 | 로컬 데모 6개 시나리오와 5초 이내 결과 검증 | Codex |
| P0 | 개인정보 마스킹·로그 비노출 점검 | opsfield |
| P1 | 공개 사례 평가셋 및 라벨 정의 | grok + 팀 |
| P1 | 경쟁 대안 비교와 첫 사용자 인터뷰 질문 | grok + 팀 |
