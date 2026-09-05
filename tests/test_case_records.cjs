"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");
const Records = require("../web/case-records.js");

const DATE = "2026-08-18T10:00:00+09:00";
const API = [
  "createCase", "demoEvidence", "addEvidence", "reviewFact",
  "setEvidenceIncluded", "getIssues", "getSignals", "buildReport",
];

function evidence(overrides = {}) {
  return {
    title: "직접 입력한 자료", kind: "document", occurredAt: DATE,
    source: "사용자 메모", text: "확인할 원문 한 줄", ...overrides,
  };
}

function sampleCase(kind = "frozen") {
  return Records.demoEvidence(kind).reduce(Records.addEvidence, Records.createCase(kind));
}

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function koreanError(action) {
  assert.throws(action, (error) => error instanceof Error && /[가-힣]/u.test(error.message));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function pairedCase(orderText, transferText) {
  let record = Records.createCase("frozen");
  record = Records.addEvidence(record, evidence({ kind: "order", text: orderText }));
  return Records.addEvidence(record, evidence({ kind: "transfer", text: transferText }));
}

test("CommonJS and the classic global expose exactly the eight contracted functions", () => {
  assert.deepEqual(Object.keys(Records).sort(), [...API].sort());
  assert.equal(globalThis.FinGuardRecords, Records);
  API.forEach((name) => assert.equal(typeof Records[name], "function"));
});

test("classic script runs without Node or a DOM and uses native randomUUID", () => {
  const source = readFileSync(require.resolve("../web/case-records.js"), "utf8");
  const context = vm.createContext({ crypto: { randomUUID: () => "native-uuid" } });
  vm.runInContext(source, context);
  assert.equal(context.FinGuardRecords.createCase("shield").id, "native-uuid");
  assert.deepEqual(Object.keys(context.FinGuardRecords).sort(), [...API].sort());
});

test("local ID fallback stays unique even within the same clock tick", () => {
  const source = readFileSync(require.resolve("../web/case-records.js"), "utf8");
  const context = vm.createContext({});
  vm.runInContext("Date.now = () => 1; Math.random = () => 0;", context);
  vm.runInContext(source, context);
  const ids = Array.from({ length: 100 }, () => context.FinGuardRecords.createCase("frozen").id);
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((id) => assert.match(id, /^[A-Za-z0-9_-]+$/));
});

test("createCase has the exact initial shape and independent arrays and IDs", () => {
  const first = Records.createCase("frozen");
  const second = Records.createCase("shield");
  assert.deepEqual(Object.keys(first).sort(), [
    "version", "id", "kind", "title", "createdAt", "updatedAt", "evidence", "facts", "history",
  ].sort());
  assert.equal(first.version, 1);
  assert.equal(first.title, "지급정지 소명 준비 자료");
  assert.equal(second.title, "상담 준비 자료");
  assert.notEqual(first.id, second.id);
  assert.equal(first.createdAt, first.updatedAt);
  assert.ok(Number.isFinite(Date.parse(first.createdAt)));
  for (const key of ["evidence", "facts", "history"]) {
    assert.deepEqual(first[key], []);
    assert.notEqual(first[key], second[key]);
  }
  for (const kind of [undefined, null, "FROZEN", "", "other", {}, 1]) {
    koreanError(() => Records.createCase(kind));
    koreanError(() => Records.demoEvidence(kind));
  }
});

test("demo evidence is fresh, explicitly synthetic, and suitable for each case kind", () => {
  const frozen = Records.demoEvidence("frozen");
  const shield = Records.demoEvidence("shield");
  assert.deepEqual(frozen.map((item) => item.kind), ["order", "transfer", "message"]);
  assert.deepEqual(shield.map((item) => item.kind), ["contact", "contact", "contact"]);
  for (const item of [...frozen, ...shield]) {
    assert.deepEqual(Object.keys(item).sort(), ["title", "kind", "occurredAt", "source", "text"].sort());
    assert.match(item.title, /합성/);
    assert.ok(Number.isFinite(Date.parse(item.occurredAt)));
    assert.doesNotMatch(JSON.stringify(item), /01[016789]-\d{3,4}-\d{4}|\b\d{3,6}-\d{2,6}-\d{4,8}\b|https?:\/\//);
  }
  const ids = frozen.map((item) => item.text.match(/주문\s*ID\s*[:：]\s*(\S+)/i)?.[1]);
  assert.equal(new Set(ids).size, 1);
  assert.match(ids[0], /SYNTHETIC|DEMO/);
  assert.match(frozen[0].text.replaceAll(",", ""), /명시금액\s*:\s*300000/);
  assert.match(frozen[1].text.replaceAll(",", ""), /명시금액\s*:\s*330000/);
  assert.doesNotMatch(JSON.stringify(shield), /지급정지|계좌.*정지|이체확인/);
  const shieldText = shield.map((item) => item.text).join("\n");
  assert.match(shieldText, /반복/);
  assert.match(shieldText, /가족|직장/);
  assert.match(shieldText, /가만두지|해치|협박/);
  frozen[0].text = "바뀐 데모";
  shield.pop();
  assert.notEqual(Records.demoEvidence("frozen")[0].text, "바뀐 데모");
  assert.equal(Records.demoEvidence("shield").length, 3);
});

test("separate sample cases cannot review each other's facts or share evidence state", () => {
  const first = sampleCase();
  const second = sampleCase();
  const ids = [first.id, ...first.evidence.map((item) => item.id), ...first.facts.map((item) => item.id)];
  for (const id of [second.id, ...second.evidence.map((item) => item.id), ...second.facts.map((item) => item.id)]) {
    assert.ok(!ids.includes(id));
  }
  koreanError(() => Records.reviewFact(first, second.facts[0].id, { text: "수정", status: "confirmed", note: "" }));
  Records.setEvidenceIncluded(first, first.evidence[0].id, false);
  assert.ok(second.evidence.every((item) => item.included));
});

test("addEvidence preserves original text and organizes only nonempty source lines", () => {
  const original = freeze(Records.createCase("frozen"));
  const text = "  첫 줄 <b>원문</b>  \r\n\r\n둘째 줄\r   \n셋째 줄";
  const input = freeze(evidence({ text, included: false, id: "caller-id" }));
  const result = Records.addEvidence(original, input);
  assert.notEqual(result, original);
  assert.equal(original.evidence.length, 0);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0].text, text);
  assert.equal(result.evidence[0].included, true);
  assert.notEqual(result.evidence[0].id, "caller-id");
  assert.ok(Object.isFrozen(result.evidence[0]));
  assert.deepEqual(result.facts.map((item) => item.quote), ["  첫 줄 <b>원문</b>  ", "둘째 줄", "셋째 줄"]);
  for (const fact of result.facts) {
    assert.equal(fact.evidenceId, result.evidence[0].id);
    assert.equal(fact.text, fact.quote.trim());
    assert.equal(fact.status, "unreviewed");
    assert.equal(fact.note, "");
    assert.equal(fact.included, true);
    assert.equal(fact.reviewedAt, null);
  }
  assert.deepEqual(result.history, []);
  assert.ok(Date.parse(result.updatedAt) >= Date.parse(original.updatedAt));
});

test("reviewFact keeps originals, captures independent before/after history, and never deletes", () => {
  const initial = freeze(Records.addEvidence(Records.createCase("frozen"), evidence({ text: "원래 문장\n두 번째 문장" })));
  const fact = initial.facts[0];
  const first = Records.reviewFact(initial, fact.id, { text: "사용자 확인 문장", status: "confirmed", note: "대화 원문과 대조" });
  assert.equal(initial.facts[0].text, "원래 문장");
  assert.equal(initial.history.length, 0);
  assert.equal(first.facts[0].quote, fact.quote);
  assert.deepEqual(first.evidence, initial.evidence);
  assert.notEqual(first.evidence[0], initial.evidence[0]);
  assert.notEqual(first.facts[1], initial.facts[1]);
  assert.ok(Number.isFinite(Date.parse(first.facts[0].reviewedAt)));
  assert.equal(first.updatedAt, first.facts[0].reviewedAt);
  assert.equal(first.history[0].factId, fact.id);
  assert.equal(first.history[0].evidenceId, fact.evidenceId);
  assert.equal(first.history[0].before.text, "원래 문장");
  assert.equal(first.history[0].before.status, "unreviewed");
  assert.equal(first.history[0].before.reviewedAt, null);
  assert.equal(first.history[0].after.text, "사용자 확인 문장");
  assert.equal(first.history[0].after.note, "대화 원문과 대조");
  freeze(first);
  const second = Records.reviewFact(first, fact.id, { text: "다시 확인할 문장", status: "needs_review", note: "후속 메모" });
  assert.notEqual(second.history[0], first.history[0]);
  assert.notEqual(second.history[0].after, first.history[0].after);
  assert.equal(second.history[1].before.text, "사용자 확인 문장");
  assert.equal(second.history[1].after.status, "needs_review");
  const third = Records.reviewFact(second, fact.id, { text: "검토 보류", status: "unreviewed" });
  assert.equal(third.facts[0].note, "후속 메모");
  assert.ok(Number.isFinite(Date.parse(third.facts[0].reviewedAt)));
  assert.equal(third.history.length, 3);
  assert.equal(third.facts.length, initial.facts.length);
  assert.deepEqual(third.evidence, initial.evidence);
});

test("invalid evidence inputs throw Korean errors without changing the caller", () => {
  const record = freeze(sampleCase());
  const snapshot = JSON.stringify(record);
  const invalid = [
    null, [], {}, evidence({ title: "" }), evidence({ title: "x".repeat(101) }),
    evidence({ title: 1 }), evidence({ source: " " }), evidence({ source: "x".repeat(101) }),
    evidence({ source: null }), evidence({ text: "\n \t" }), evidence({ text: "x".repeat(8001) }),
    evidence({ text: {} }), evidence({ kind: "script" }), evidence({ kind: "ORDER" }),
  ];
  for (const input of invalid) {
    koreanError(() => Records.addEvidence(record, input));
    assert.equal(JSON.stringify(record), snapshot);
  }
});

test("evidence limits allow exactly 50 entries and the specified inclusive text bounds", () => {
  let record = Records.createCase("shield");
  for (let index = 0; index < 50; index += 1) {
    record = Records.addEvidence(record, evidence({ kind: "contact", title: "x".repeat(100), source: "s".repeat(100), text: "t".repeat(index === 0 ? 8000 : 1) }));
  }
  const snapshot = JSON.stringify(record);
  koreanError(() => Records.addEvidence(record, evidence()));
  assert.equal(JSON.stringify(record), snapshot);
  assert.equal(record.evidence.length, 50);
  const reviewed = Records.reviewFact(record, record.facts[0].id, { text: "x".repeat(8000), status: "confirmed", note: "n".repeat(1000) });
  assert.equal(reviewed.facts[0].text.length, 8000);
  for (const kind of ["message", "order", "transfer", "contact", "document"]) {
    assert.equal(Records.addEvidence(Records.createCase("shield"), evidence({ kind })).evidence[0].kind, kind);
  }
});

test("timestamps must be nonempty strings with a valid parse", () => {
  const record = freeze(Records.createCase("frozen"));
  for (const occurredAt of ["", "  ", "not-a-date", "2026-13-01T10:00", "2026-01-01T25:00", null, undefined, 0, new Date()]) {
    koreanError(() => Records.addEvidence(record, evidence({ occurredAt })));
  }
  for (const occurredAt of [DATE, "2026-08-18T10:00", "2026-08-18T01:00:00.000Z"]) {
    assert.equal(Records.addEvidence(record, evidence({ occurredAt })).evidence[0].occurredAt, occurredAt);
  }
  assert.deepEqual(record.evidence, []);
});

test("invalid reviews and inclusion changes leave all evidence, facts and history untouched", () => {
  const record = freeze(sampleCase());
  const snapshot = JSON.stringify(record);
  const valid = { text: "편집 문장", status: "confirmed", note: "메모" };
  for (const patch of [null, [], {}, { ...valid, text: " " }, { ...valid, text: 2 }, { ...valid, text: "x".repeat(8001) }, { ...valid, status: "approved" }, { ...valid, note: null }, { ...valid, note: "n".repeat(1001) }]) {
    koreanError(() => Records.reviewFact(record, record.facts[0].id, patch));
  }
  koreanError(() => Records.reviewFact(record, "missing", valid));
  koreanError(() => Records.setEvidenceIncluded(record, "missing", false));
  for (const included of ["false", 0, null, undefined]) {
    koreanError(() => Records.setEvidenceIncluded(record, record.evidence[0].id, included));
  }
  assert.equal(JSON.stringify(record), snapshot);
});

test("getIssues compares labeled source amounts and remains independent of fact edits", () => {
  const record = freeze(sampleCase());
  const issues = Records.getIssues(record);
  assert.equal(issues.length, 1);
  assert.match(issues[0].title, /금액.*불일치|금액.*상충/);
  assert.match(issues[0].detail.replaceAll(",", ""), /300000/);
  assert.match(issues[0].detail.replaceAll(",", ""), /330000/);
  assert.deepEqual(issues[0].evidenceIds, record.evidence.slice(0, 2).map((item) => item.id));
  assert.deepEqual(Object.keys(issues[0]).sort(), ["id", "title", "detail", "evidenceIds"].sort());
  const amountFact = record.facts.find((item) => item.quote.includes("명시금액"));
  const edited = Records.reviewFact(record, amountFact.id, { text: "명시금액: 330000원", status: "confirmed", note: "편집 문장은 원문을 바꾸지 않음" });
  assert.deepEqual(Records.getIssues(edited), issues);
});

const noConflictCases = [
  ["different explicit order IDs", "주문 ID: SYNTHETIC-A\n명시금액: 300000원", "주문 ID: SYNTHETIC-B\n명시금액: 330000원"],
  ["missing amount in one source", "주문 ID: SYNTHETIC-A\n명시금액: 300000원", "주문 ID: SYNTHETIC-A\n금액 미기재"],
  ["no amounts in either source", "주문 ID: SYNTHETIC-A\n합성 주문", "주문 ID: SYNTHETIC-A\n합성 이체"],
  ["unlabeled numbers and incidental fees", "주문 ID: SYNTHETIC-A\n300000원", "주문 ID: SYNTHETIC-A\n330000원\n수수료 100원"],
  ["missing explicit order ID", "명시금액: 300000원", "명시금액: 330000원"],
  ["equal amounts with grouping separators", "주문번호: SYNTHETIC-A\n명시금액: 300,000원", "주문 ID: SYNTHETIC-A\n명시금액: 300000원"],
  ["ambiguous multiple order IDs", "주문 ID: SYNTHETIC-A\n주문 ID: SYNTHETIC-B\n명시금액: 300000원", "주문 ID: SYNTHETIC-A\n명시금액: 330000원"],
  ["ambiguous multiple labeled amounts", "주문 ID: SYNTHETIC-A\n명시금액: 300000원\n명시금액: 330000원", "주문 ID: SYNTHETIC-A\n명시금액: 330000원"],
  ["malformed amount separators", "주문 ID: SYNTHETIC-A\n명시금액: 30,00원", "주문 ID: SYNTHETIC-A\n명시금액: 330000원"],
];

for (const [name, order, transfer] of noConflictCases) {
  test(`amount comparison does not overflag ${name}`, () => {
    assert.deepEqual(Records.getIssues(pairedCase(order, transfer)), []);
  });
}

test("missing source issues are distinct from conflicts and respect case kind", () => {
  const frozenIssues = Records.getIssues(Records.createCase("frozen"));
  assert.equal(frozenIssues.length, 2);
  for (const issue of frozenIssues) {
    assert.match(issue.title, /자료.*부족|자료.*없/);
    assert.deepEqual(issue.evidenceIds, []);
    assert.doesNotMatch(issue.title, /불일치|상충/);
  }
  const shieldIssues = Records.getIssues(Records.createCase("shield"));
  assert.equal(shieldIssues.length, 1);
  assert.match(shieldIssues[0].title, /연락/);
  assert.doesNotMatch(JSON.stringify(shieldIssues), /이체|주문|지급정지/);
  assert.deepEqual(Records.getIssues(sampleCase("shield")), []);
});

test("inclusion is reversible, preserves records, and filters facts, source, history and issue leaks", () => {
  let record = pairedCase("주문 ID: SYNTHETIC-A\n명시금액: 300000원", "주문 ID: SYNTHETIC-A\n명시금액: 330000원\nSECRET-ORIGINAL");
  const hidden = record.evidence[1];
  const hiddenFact = record.facts.find((item) => item.quote === "SECRET-ORIGINAL");
  record = Records.reviewFact(record, hiddenFact.id, { text: "SECRET-OLD-EDIT", status: "confirmed", note: "SECRET-OLD-NOTE" });
  record = Records.reviewFact(record, hiddenFact.id, { text: "SECRET-NEW-EDIT", status: "needs_review", note: "SECRET-NEW-NOTE" });
  record = { ...record, evidence: record.evidence.map((item) => item.id === hidden.id ? { ...item, title: "SECRET-TITLE", source: "SECRET-SOURCE" } : item) };
  freeze(record);
  const selected = Records.setEvidenceIncluded(record, hidden.id, false);
  assert.notEqual(selected, record);
  assert.equal(record.evidence[1].included, true);
  assert.equal(selected.evidence.length, record.evidence.length);
  assert.deepEqual(selected.facts, record.facts);
  assert.deepEqual(selected.history, record.history);
  const html = Records.buildReport(selected);
  for (const secret of ["SECRET-", hidden.id, hiddenFact.id, ...record.history.map((item) => item.id), "330000", "330,000"]) {
    assert.ok(!html.includes(secret), `excluded information leaked: ${secret}`);
  }
  assert.ok(Records.getIssues(selected).every((item) => !item.evidenceIds.includes(hidden.id)));
  assert.ok(!JSON.stringify(Records.getIssues(selected)).includes("330000"));
  const restored = Records.setEvidenceIncluded(selected, hidden.id, true);
  assert.deepEqual(restored.evidence, record.evidence);
  assert.match(Records.buildReport(restored), /SECRET-ORIGINAL/);
  assert.notEqual(Records.setEvidenceIncluded(restored, hidden.id, true), restored);
});

test("reports contain current edits, original quotes, internal anchors, separate review groups and audit history", () => {
  let record = Records.addEvidence(Records.createCase("frozen"), evidence({ title: "합성 원문", text: "원문 보존 문장\n미검토 문장\n재확인 원문" }));
  record = Records.reviewFact(record, record.facts[0].id, { text: "현재 확인한 문장", status: "confirmed", note: "사용자 검토 메모" });
  record = Records.reviewFact(record, record.facts[2].id, { text: "추가 확인 문장", status: "needs_review", note: "답변 대기" });
  const html = Records.buildReport(freeze(record));
  for (const value of ["지급정지 소명 준비 자료", "현재 확인한 문장", "원문 보존 문장", "미검토 문장", "추가 확인 문장", "사용자 검토 메모", record.id, record.createdAt, record.updatedAt]) {
    assert.ok(html.includes(value), `report missing ${value}`);
  }
  assert.match(html, /<html[^>]*lang="ko"/);
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /@media print/);
  assert.match(html, /PDF로 저장/);
  assert.match(html, /합성 데모/);
  assert.match(html, /로컬|브라우저/);
  assert.match(html, /공식.*서식.*아니/);
  assert.match(html, /법적.*(?:판단|결론).*아닙니다/);
  assert.match(html, /줄.*정리|줄.*나눈/);
  assert.match(html, /변경 이력/);
  assert.match(html, /<table/);
  const confirmed = html.match(/<section id="confirmed-facts">([\s\S]*?)<\/section>/)?.[1];
  const pending = html.match(/<section id="pending-facts">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(confirmed?.includes("현재 확인한 문장"));
  assert.ok(!confirmed.includes("미검토 문장"));
  assert.ok(pending?.includes("미검토 문장"));
  assert.ok(pending.includes("추가 확인 문장"));
  assert.ok(!pending.includes("현재 확인한 문장"));
  for (const item of record.evidence) {
    assert.ok(html.includes(`id="evidence-${item.id}"`));
    assert.ok(html.includes(`href="#evidence-${item.id}"`));
  }
  assert.doesNotMatch(html, /<script\b|<link\b|<iframe\b|<img\b|@import|url\(/i);
  assert.doesNotMatch(html, /AI_EXTRACTED|모델 정확도|0\.96/);
});

test("report HTML escapes hostile content throughout and encodes dynamic anchor attributes", () => {
  const hostile = '<img src=x onerror="alert(1)">&\'<script>alert(2)</script></style>&lt;b&gt;';
  let record = Records.addEvidence(Records.createCase("shield"), evidence({ kind: "contact", title: hostile, source: hostile, text: hostile }));
  record = Records.reviewFact(record, record.facts[0].id, { text: `이전 ${hostile}`, status: "confirmed", note: `이전 메모 ${hostile}` });
  record = Records.reviewFact(record, record.facts[0].id, { text: `현재 ${hostile}`, status: "needs_review", note: `현재 메모 ${hostile}` });
  const hostileId = 'id" onfocus="alert(3)\'><svg/onload=alert(4)> &';
  record = {
    ...record, id: hostile, title: hostile,
    evidence: record.evidence.map((item) => ({ ...item, id: hostileId })),
    facts: record.facts.map((item) => ({ ...item, id: hostile, evidenceId: hostileId })),
    history: record.history.map((item, index) => ({ ...item, id: `${hostile}${index}`, factId: hostile, evidenceId: hostileId })),
  };
  const html = Records.buildReport(record);
  assert.ok(!html.includes(hostile));
  assert.ok(!html.includes(hostileId));
  assert.ok(html.includes(escapeHtml(hostile)));
  assert.ok(html.includes(`현재 ${escapeHtml(hostile)}`));
  assert.ok(html.includes(`이전 메모 ${escapeHtml(hostile)}`));
  const anchor = `evidence-${encodeURIComponent(hostileId)}`;
  assert.ok(html.includes(`id="${escapeHtml(anchor)}"`));
  assert.ok(html.includes(`href="#${escapeHtml(encodeURIComponent(anchor))}"`));
  assert.doesNotMatch(html, /<(script|img|svg|iframe|object|embed)\b/i);
  for (const [tag] of html.matchAll(/<[^>]+>/g)) {
    assert.doesNotMatch(tag, /\son\w+\s*=/i);
  }
  for (const [, href] of html.matchAll(/href="([^"]*)"/g)) {
    assert.ok(href.startsWith("#evidence-"));
  }
  assert.ok(html.includes("&amp;lt;b&amp;gt;"));
});

test("report fragments resolve to the matching target for encoded evidence IDs", () => {
  let record = Records.addEvidence(Records.createCase("shield"), evidence({ kind: "contact" }));
  const evidenceId = "합성 자료/100%";
  record = {
    ...record,
    evidence: record.evidence.map((item) => ({ ...item, id: evidenceId })),
    facts: record.facts.map((fact) => ({ ...fact, evidenceId })),
  };
  const html = Records.buildReport(record);
  const targets = new Set(Array.from(html.matchAll(/id="(evidence-[^"]*)"/g), (match) => match[1]));
  for (const [, href] of html.matchAll(/href="([^"]*)"/g)) {
    assert.ok(targets.has(decodeURIComponent(href.slice(1))), "decoded fragment must match an actual target ID");
  }
});

test("a report with no selected evidence rejects instead of producing an empty pack", () => {
  koreanError(() => Records.buildReport(Records.createCase("frozen")));
  let record = sampleCase("shield");
  for (const item of record.evidence) record = Records.setEvidenceIncluded(record, item.id, false);
  koreanError(() => Records.buildReport(record));
});

test("SHIELD export is counseling material with contact hints and no required transfer or freeze scenario", () => {
  const record = sampleCase("shield");
  const html = Records.buildReport(record);
  assert.match(html, /상담 준비 자료/);
  assert.doesNotMatch(html, /지급정지|주문 자료|이체 자료/);
  for (const signal of Records.getSignals(record.evidence)) {
    assert.ok(html.includes(escapeHtml(signal.quote)));
  }
  const hidden = Records.setEvidenceIncluded(record, record.evidence[2].id, false);
  assert.ok(!Records.buildReport(hidden).includes(escapeHtml(record.evidence[2].text)));
});

test("signals quote exact original substrings with neutral family, workplace, threat and repeat hints", () => {
  const text = "가족과 직장에 연락한 적은 없다고 함.\n반복 연락을 받았다고 메모함.\n원문: 가만두지 않겠다.";
  const item = evidence({ kind: "contact", text });
  const signals = Records.getSignals(freeze(item));
  assert.equal(signals.length, 4);
  assert.deepEqual(Records.getSignals([item]), signals);
  for (const signal of signals) {
    assert.deepEqual(Object.keys(signal).sort(), ["label", "quote", "detail"].sort());
    assert.ok(signal.quote.length > 0);
    assert.ok(text.includes(signal.quote));
    assert.match(signal.detail, /표현|문구|원문/);
    assert.doesNotMatch(signal.detail, /불법입니다|위법입니다|신고하세요|변호사|형사처벌/);
  }
  assert.ok(signals.some((item) => item.label.includes("가족")));
  assert.ok(signals.some((item) => item.label.includes("직장")));
  assert.ok(signals.some((item) => item.label.includes("위협")));
  assert.ok(signals.some((item) => item.label.includes("반복")));
  assert.deepEqual(Records.getSignals(evidence({ text: "오늘 받은 안내문을 보관함." })), []);
  assert.deepEqual(Records.getSignals([]), []);
  for (const invalid of [null, "가족", {}, [null], [{ text: 1 }]]) koreanError(() => Records.getSignals(invalid));
});

test("malformed records fail with Korean errors at the public boundary", () => {
  const record = sampleCase();
  const malformed = [
    null, {}, [], { ...record, version: 2 }, { ...record, kind: "other" },
    { ...record, createdAt: "bad" }, { ...record, updatedAt: "" },
    { ...record, evidence: null }, { ...record, facts: null }, { ...record, history: null },
    { ...record, evidence: [null] },
    { ...record, evidence: record.evidence.map((item) => ({ ...item, included: "false" })) },
    { ...record, facts: record.facts.map((item) => ({ ...item, evidenceId: "missing" })) },
    { ...record, facts: record.facts.map((item) => ({ ...item, quote: "원문에 없는 인용" })) },
    { ...record, facts: record.facts.map((item) => ({ ...item, status: "approved" })) },
    { ...record, history: [null] },
  ];
  for (const invalid of malformed) {
    koreanError(() => Records.addEvidence(invalid, evidence()));
    koreanError(() => Records.reviewFact(invalid, record.facts[0].id, { text: "편집", status: "confirmed", note: "" }));
    koreanError(() => Records.setEvidenceIncluded(invalid, record.evidence[0].id, false));
    koreanError(() => Records.getIssues(invalid));
    koreanError(() => Records.buildReport(invalid));
  }
});

test("audit entries cannot misattribute an excluded source to an included fact", () => {
  let record = sampleCase();
  record = Records.reviewFact(record, record.facts[0].id, { text: "검토 결과", status: "confirmed", note: "메모" });
  const invalid = { ...record, history: record.history.map((item) => ({ ...item, evidenceId: record.evidence[1].id })) };
  koreanError(() => Records.buildReport(invalid));
});
