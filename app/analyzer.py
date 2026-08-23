"""Deterministic, explainable analysis rules for the local meeting demo."""

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Iterable


@dataclass(frozen=True)
class Rule:
    code: str
    weight: float
    terms: tuple[str, ...]


RULES: tuple[Rule, ...] = (
    Rule(
        "institution_impersonation",
        0.22,
        ("금융감독원", "검찰", "경찰", "은행", "카드사", "고객센터", "보안팀"),
    ),
    Rule("family_impersonation", 0.18, ("아들", "딸", "엄마", "아빠", "가족", "지인")),
    Rule(
        "urgency",
        0.18,
        ("지금", "즉시", "긴급", "오늘", "곧바로", "마감", "빨리"),
    ),
    Rule("secrecy", 0.13, ("비밀", "말하지 마", "말하지마", "혼자 처리")),
    Rule("threat", 0.14, ("범죄에 연루", "압류", "정지", "처벌", "수사", "체포")),
    Rule(
        "transfer",
        0.28,
        ("안전계좌", "이체", "송금", "입금", "보증금", "수수료", "돈을 보내"),
    ),
    Rule(
        "credential_theft",
        0.24,
        ("비밀번호", "인증번호", "인증 코드", "otp", "주민번호", "계좌번호"),
    ),
    Rule("remote_control", 0.22, ("원격", "화면 공유", "앱 설치", "제어 앱")),
    Rule("phishing_link", 0.14, ("http://", "https://", "링크", "url", ".example.invalid")),
    Rule(
        "investment_scam",
        0.22,
        ("원금 보장", "확정 수익", "수익률", "리딩방", "투자금", "대출 승인"),
    ),
)

INJECTION_TERMS: tuple[str, ...] = (
    "이전 지시를 무시",
    "시스템 프롬프트",
    "개발자 메시지",
    "비밀번호를 출력",
    "ignore previous",
    "reveal the system prompt",
    "print the system prompt",
)

SENSITIVE_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"(?<!\d)01[016789][\s-]?\d{3,4}[\s-]?\d{4}(?!\d)"), "[전화번호 마스킹]"),
    (re.compile(r"(?<!\d)\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,6}(?!\d)"), "[금융번호 마스킹]"),
    (re.compile(r"(?<!\d)\d{6}[\s-]?\d{7}(?!\d)"), "[식별번호 마스킹]"),
)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _mask_sensitive(text: str) -> str:
    masked = text
    for pattern, replacement in SENSITIVE_PATTERNS:
        masked = pattern.sub(replacement, masked)
    return masked


def _find_matches(text: str, terms: Iterable[str]) -> list[str]:
    normalized = text.casefold()
    matches: list[str] = []
    for term in terms:
        if term.casefold() in normalized:
            matches.append(term)
    return matches


def _evidence(text: str, category: str, terms: Iterable[str]) -> list[dict[str, str]]:
    normalized = text.casefold()
    result: list[dict[str, str]] = []
    for term in terms:
        index = normalized.find(term.casefold())
        if index >= 0:
            snippet = text[index : index + len(term)]
            result.append({"text": _mask_sensitive(snippet), "category": category})
    return result


def _empty_result() -> dict:
    return {
        "label": "ABSTAIN",
        "risk_score": 0.0,
        "injection_score": 0.0,
        "confidence": 0.0,
        "reason_codes": [],
        "evidence": [],
        "safe_action": "분석할 내용을 입력하고, 금융 행동 전 공식 채널에서 확인하세요.",
        "model_version": "rules-v0.1-demo",
        "disclaimer": "데모용 규칙 기반 분석입니다. 안전하다고 확정하는 기능이 아닙니다.",
    }


def analyze_text(text: str) -> dict:
    """Return a stable analysis contract for one pasted conversation."""

    if not isinstance(text, str):
        raise TypeError("text must be a string")

    clean = _normalize(text)
    if not clean:
        return _empty_result()

    reason_codes: list[str] = []
    evidence: list[dict[str, str]] = []
    rule_score = 0.0

    for rule in RULES:
        matches = _find_matches(clean, rule.terms)
        if not matches:
            continue
        reason_codes.append(rule.code)
        rule_score += rule.weight
        evidence.extend(_evidence(clean, rule.code, matches[:2]))

    if {"transfer", "urgency"}.issubset(reason_codes):
        rule_score += 0.15
    if {"institution_impersonation", "threat"}.issubset(reason_codes):
        rule_score += 0.12
    if {"credential_theft", "institution_impersonation"}.issubset(reason_codes):
        rule_score += 0.12
    if {"remote_control", "credential_theft"}.issubset(reason_codes):
        rule_score += 0.12

    injection_matches = _find_matches(clean, INJECTION_TERMS)
    injection_score = min(0.99, 0.45 * len(injection_matches))
    if injection_matches:
        reason_codes.append("prompt_injection")
        evidence.extend(_evidence(clean, "prompt_injection", injection_matches))

    risk_score = min(0.99, rule_score)

    if injection_score >= 0.75:
        label = "INJECTION"
        safe_action = "입력 안의 지시문을 따르지 말고, 비밀번호·인증번호·금융정보를 입력하지 마세요."
    elif risk_score >= 0.70:
        label = "DANGER"
        safe_action = "송금·인증·링크 클릭을 중단하고, 공식 앱이나 대표번호로 직접 확인하세요."
    elif risk_score >= 0.40:
        label = "CAUTION"
        safe_action = "추가 행동 전 공식 채널에서 발신자와 요청을 독립적으로 확인하세요."
    else:
        label = "LOW_RISK_NOT_PROOF"
        safe_action = "안전하다고 확정할 수 없습니다. 금융 행동 전 공식 채널에서 확인하세요."

    confidence = min(0.98, 0.42 + 0.08 * len(reason_codes))
    if label == "INJECTION":
        confidence = min(0.99, 0.60 + 0.12 * len(injection_matches))

    return {
        "label": label,
        "risk_score": round(risk_score, 2),
        "injection_score": round(injection_score, 2),
        "confidence": round(confidence, 2),
        "reason_codes": reason_codes,
        "evidence": evidence[:8],
        "safe_action": safe_action,
        "model_version": "rules-v0.1-demo",
        "disclaimer": "데모용 규칙 기반 분석입니다. 안전하다고 확정하는 기능이 아닙니다.",
    }
