# API 계약

기본 주소: `http://127.0.0.1:8765`

## `GET /healthz`

프로세스 상태를 확인한다.

```json
{"status":"ok","service":"finguard-demo"}
```

## `GET /readyz`

분석 엔진 로딩 상태를 확인한다.

```json
{"status":"ready","model_version":"rules-v0.1-demo"}
```

## `GET /v1/demo-cases`

검증용 사전 입력 케이스를 반환한다.

```json
{
  "cases": [
    {"id":"danger-transfer","label":"DANGER","title":"기관 사칭 + 안전계좌 이체","text":"..."},
    {"id":"prompt-injection","label":"INJECTION","title":"분석기를 흔드는 지시문","text":"..."},
    {"id":"danger-remote","label":"DANGER","title":"원격제어 앱 설치 요청","text":"..."},
    {"id":"danger-investment","label":"DANGER","title":"원금 보장 투자 제안","text":"..."},
    {"id":"danger-marketplace","label":"CAUTION","title":"중고거래 안전결제 링크","text":"..."},
    {"id":"low-risk-not-proof","label":"LOW_RISK_NOT_PROOF","title":"일반 공지처럼 보이는 메시지","text":"..."}
  ]
}
```

케이스의 `label`은 발표용 기대 라벨이며, 운영 환경의 정답 또는 모델 성능 지표가 아니다. `text`는 합성 데모 입력이고 저장하지 않는다.

## `GET /pitch`, `/pitch.css`, `/pitch.js`

서비스 제안용 정적 발표 모드다. 외부 자산을 불러오지 않으며, 제안 화면의 라이브 데모는 위 `GET /v1/demo-cases`와 `POST /v1/analyze`만 사용한다. `90초 데모 시작`은 브라우저 안에서 케이스를 순서대로 선택할 뿐, 송금·로그인·URL 방문을 수행하지 않는다.

### 브라우저 진입 경로 계약

일반 서비스 화면은 `share`, `screenshot`, `link` 세 UI 모드를 제공한다. 이 값은 현재 브라우저 상태이며 서버 API에 전송하지 않는다.

| 모드 | 의미 | 서버로 보내는 값 |
|---|---|---|
| `share` | SMS·메신저에서 공유받은 메시지 | 사용자가 확인한 텍스트만 `/v1/analyze`로 전송 |
| `screenshot` | 로컬 스크린샷을 확인하는 경로 | 이미지 업로드 없음; OCR 결과 텍스트만 전송 |
| `link` | 결제 링크가 든 메시지 | URL fetch 없이 메시지 텍스트만 전송 |

현재 API는 `text` 하나만 받는다. 향후 실제 모바일 공유 확장 시에도 원문 저장·외부 URL fetch를 기본값으로 추가하지 않는다.

## `POST /v1/analyze`

### Request

`Content-Type: application/json`

```json
{"text":"금융감독원입니다. 지금 안전계좌로 이체하세요."}
```

제약:

- JSON object만 허용
- `text`는 non-empty string
- 최대 12,000자
- 요청 본문 최대 256 KiB

### Response

```json
{
  "text_length": 30,
  "analysis": {
    "label": "DANGER",
    "risk_score": 0.99,
    "injection_score": 0.0,
    "confidence": 0.66,
    "reason_codes": ["institution_impersonation", "urgency", "transfer"],
    "evidence": [{"text":"금융감독원","category":"institution_impersonation"}],
    "safe_action":"송금·인증·링크 클릭을 중단하고, 공식 앱이나 대표번호로 직접 확인하세요.",
    "model_version":"rules-v0.1-demo",
    "disclaimer":"데모용 규칙 기반 분석입니다. 안전하다고 확정하는 기능이 아닙니다."
  }
}
```

### Error

```json
{"error":"invalid_request","detail":"text must not be empty"}
```

입력 본문은 서버 로그에 기록하지 않는다. 서버는 기본적으로 `127.0.0.1`에만 바인딩한다.
