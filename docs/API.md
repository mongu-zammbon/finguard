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

회의용 사전 입력 케이스를 반환한다.

```json
{"cases":[{"id":"danger-transfer","label":"DANGER","title":"기관 사칭 + 안전계좌 이체","text":"..."}]}
```

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
