(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FinGuardRecords = api;
})(globalThis, function (root) {
  "use strict";

  const TITLES = { frozen: "지급정지 소명 준비 자료", shield: "상담 준비 자료" };
  const KINDS = ["message", "order", "transfer", "contact", "document"];
  const KIND_LABELS = { message: "메시지", order: "주문", transfer: "이체", contact: "연락", document: "문서" };
  const STATUSES = { confirmed: "확인됨 (사용자 표시)", needs_review: "재검토 필요", unreviewed: "미검토" };
  let sequence = 0;

  function newId() {
    if (root.crypto && typeof root.crypto.randomUUID === "function") return root.crypto.randomUUID();
    sequence += 1;
    let random;
    if (root.crypto && typeof root.crypto.getRandomValues === "function") {
      random = Array.from(root.crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    } else {
      random = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
    // Local identifiers only; the counter also separates IDs in the same clock tick.
    return `local-${Date.now().toString(36)}-${sequence.toString(36)}-${random}`;
  }

  function checkObject(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 형식을 확인해 주세요.`);
  }

  function checkText(value, limit, label, allowEmpty = false) {
    if (typeof value !== "string" || value.length > limit || (!allowEmpty && !value.trim())) {
      throw new Error(`${label}은(는) ${allowEmpty ? "" : "빈 내용 없이 "}${limit}자 이내의 글자로 입력해 주세요.`);
    }
  }

  function checkDate(value, label) {
    if (typeof value !== "string" || !value.trim() || !Number.isFinite(Date.parse(value))) {
      throw new Error(`${label}에 올바른 날짜와 시간을 입력해 주세요.`);
    }
  }

  function checkKind(kind) {
    if (kind !== "frozen" && kind !== "shield") throw new Error("사건 종류는 소명 준비 또는 상담 준비로 선택해 주세요.");
  }

  function checkEvidence(input) {
    checkObject(input, "자료");
    checkText(input.title, 100, "자료 제목");
    checkText(input.source, 100, "자료 출처");
    checkText(input.text, 8000, "자료 원문");
    if (!KINDS.includes(input.kind)) throw new Error("자료 종류는 메시지·주문·이체·연락·문서 중에서 선택해 주세요.");
    checkDate(input.occurredAt, "자료 발생 시각");
  }

  function checkReview(value) {
    checkObject(value, "사실 검토");
    checkText(value.text, 8000, "사실 정리문");
    checkText(value.note, 1000, "검토 메모", true);
    if (!["confirmed", "needs_review", "unreviewed"].includes(value.status)) {
      throw new Error("검토 상태는 확인됨·재검토 필요·미검토 중에서 선택해 주세요.");
    }
    if (value.reviewedAt !== null) checkDate(value.reviewedAt, "검토 시각");
  }

  // Validate saved/caller-owned records at the boundary as well as new inputs.
  function checkRecord(record) {
    checkObject(record, "사건 기록");
    if (record.version !== 1) throw new Error("지원하지 않는 사건 기록 버전입니다.");
    checkKind(record.kind);
    checkText(record.id, 200, "사건 ID");
    checkText(record.title, 100, "사건 제목");
    checkDate(record.createdAt, "사건 생성 시각");
    checkDate(record.updatedAt, "사건 수정 시각");
    if (!Array.isArray(record.evidence) || !Array.isArray(record.facts) || !Array.isArray(record.history)) {
      throw new Error("자료·사실·변경 이력 목록을 확인해 주세요.");
    }
    if (record.evidence.length > 50) throw new Error("자료는 사건당 최대 50개까지 추가할 수 있습니다.");
    const sources = new Map();
    for (const item of record.evidence) {
      checkEvidence(item);
      checkText(item.id, 200, "자료 ID");
      if (sources.has(item.id)) throw new Error("중복된 자료 ID가 있습니다.");
      if (typeof item.included !== "boolean") throw new Error("자료 포함 여부를 확인해 주세요.");
      sources.set(item.id, new Set(item.text.split(/\r\n|\r|\n/)));
    }
    const facts = new Map();
    for (const fact of record.facts) {
      checkReview(fact);
      checkText(fact.id, 200, "사실 ID");
      checkText(fact.evidenceId, 200, "사실의 자료 ID");
      checkText(fact.quote, 8000, "원문 인용");
      if (facts.has(fact.id)) throw new Error("중복된 사실 ID가 있습니다.");
      if (!sources.get(fact.evidenceId)?.has(fact.quote)) throw new Error("사실의 인용문과 연결된 원문 자료를 확인해 주세요.");
      if (typeof fact.included !== "boolean") throw new Error("사실 포함 여부를 확인해 주세요.");
      facts.set(fact.id, fact);
    }
    for (const entry of record.history) {
      checkObject(entry, "변경 이력");
      checkText(entry.id, 200, "변경 이력 ID");
      checkDate(entry.at, "변경 시각");
      const fact = facts.get(entry.factId);
      if (!fact || fact.evidenceId !== entry.evidenceId) throw new Error("변경 이력에 연결된 사실과 자료를 확인해 주세요.");
      checkReview(entry.before);
      checkReview(entry.after);
    }
  }

  function copyRecord(record) {
    return {
      ...record,
      updatedAt: new Date().toISOString(),
      evidence: record.evidence.map((item) => Object.freeze({ ...item })),
      facts: record.facts.map((fact) => ({ ...fact })),
      history: record.history.map((entry) => ({ ...entry, before: { ...entry.before }, after: { ...entry.after } })),
    };
  }

  function createCase(kind) {
    checkKind(kind);
    const now = new Date().toISOString();
    return { version: 1, id: newId(), kind, title: TITLES[kind], createdAt: now, updatedAt: now, evidence: [], facts: [], history: [] };
  }

  function demoEvidence(kind) {
    checkKind(kind);
    if (kind === "frozen") {
      return [
        {
          title: "합성 데모 · 중고 물품 주문", kind: "order", occurredAt: "2026-08-18T10:00:00+09:00",
          source: "합성 거래 게시판 주문 기록",
          text: "주문 ID: SYNTHETIC-ORDER-001\n명시금액: 300000원\n합성 데모: 가상의 중고 카메라 거래. 발송 전 주문 내용을 보관함.",
        },
        {
          title: "합성 데모 · 이체 기록", kind: "transfer", occurredAt: "2026-08-18T10:15:00+09:00",
          source: "합성 이체 내역 메모",
          text: "주문 ID: SYNTHETIC-ORDER-001\n명시금액: 330000원\n합성 데모: 가상의 입금 기록. 주문 금액과의 차이 30000원은 확인이 필요한 예시임. 실제 계좌 정보 없음.",
        },
        {
          title: "합성 데모 · 거래 대화", kind: "message", occurredAt: "2026-08-18T10:20:00+09:00",
          source: "합성 거래 상대방과의 대화",
          text: "주문 ID: SYNTHETIC-ORDER-001\n합성 상대방: 주문 금액은 300000원으로 이야기했습니다.\n합성 사용자: 기록의 금액 차이를 확인한 뒤 발송 일정을 정리하겠습니다.",
        },
      ];
    }
    return [
      {
        title: "합성 데모 · 반복 연락 기록", kind: "contact", occurredAt: "2026-08-18T09:00:00+09:00",
        source: "합성 연락 수신 메모",
        text: "합성 데모: 가상의 발신자 A에게 오전에 세 차례 반복 연락을 받았다고 메모함.\n합성 원문: 답을 받을 때까지 계속 연락하겠습니다.",
      },
      {
        title: "합성 데모 · 제삼자 언급", kind: "contact", occurredAt: "2026-08-18T11:00:00+09:00",
        source: "합성 문자 기록",
        text: "합성 원문: 답이 없으면 가족과 직장에도 연락하겠습니다.\n합성 데모 메모: 실제 제삼자에게 연락했는지는 아직 확인하지 못함. 실제 이름이나 연락처 없음.",
      },
      {
        title: "합성 데모 · 위협 문구 기록", kind: "contact", occurredAt: "2026-08-18T14:00:00+09:00",
        source: "합성 메신저 기록",
        text: "합성 원문: 오늘 답하지 않으면 가만두지 않겠다.\n합성 데모 메모: 위 문구를 보관하고 연락 경위를 상담 전에 정리함.",
      },
    ];
  }

  function addEvidence(record, input) {
    checkRecord(record);
    checkEvidence(input);
    if (record.evidence.length >= 50) throw new Error("자료는 사건당 최대 50개까지 추가할 수 있습니다.");
    const next = copyRecord(record);
    const item = Object.freeze({ id: newId(), title: input.title, kind: input.kind, occurredAt: input.occurredAt, source: input.source, text: input.text, included: true });
    next.evidence.push(item);
    for (const line of item.text.split(/\r\n|\r|\n/)) {
      if (line.trim()) next.facts.push({ id: newId(), evidenceId: item.id, quote: line, text: line.trim(), status: "unreviewed", note: "", included: true, reviewedAt: null });
    }
    return next;
  }

  function reviewState(fact) {
    return { text: fact.text, status: fact.status, note: fact.note, reviewedAt: fact.reviewedAt };
  }

  function reviewFact(record, factId, input) {
    checkRecord(record);
    const index = record.facts.findIndex((fact) => fact.id === factId);
    if (index === -1) throw new Error("검토할 사실을 찾을 수 없습니다.");
    checkObject(input, "사실 검토");
    const original = record.facts[index];
    const changes = { text: input.text, status: input.status, note: input.note === undefined ? original.note : input.note, reviewedAt: new Date().toISOString() };
    checkReview(changes);
    const next = copyRecord(record);
    next.updatedAt = changes.reviewedAt;
    next.facts[index] = { ...next.facts[index], ...changes };
    next.history.push({ id: newId(), factId: original.id, evidenceId: original.evidenceId, at: changes.reviewedAt, before: reviewState(original), after: reviewState(next.facts[index]) });
    return next;
  }

  function setEvidenceIncluded(record, evidenceId, included) {
    checkRecord(record);
    if (typeof included !== "boolean") throw new Error("자료 포함 여부는 참 또는 거짓으로 지정해 주세요.");
    const index = record.evidence.findIndex((item) => item.id === evidenceId);
    if (index === -1) throw new Error("포함 여부를 바꿀 자료를 찾을 수 없습니다.");
    const next = copyRecord(record);
    next.evidence[index] = Object.freeze({ ...next.evidence[index], included });
    return next;
  }

  function explicitPayment(item) {
    // Only unambiguous, explicitly labeled values from source text are compared.
    const ids = new Set(Array.from(item.text.matchAll(/^\s*주문\s*(?:ID|번호)\s*[:：=]\s*([A-Za-z0-9][A-Za-z0-9_-]*)\s*$/gim), (match) => match[1]));
    const amounts = new Set(Array.from(item.text.matchAll(/^\s*명시\s*금액\s*[:：=]\s*(?:₩\s*)?([0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)\s*(?:원|KRW)?\s*$/gim), (match) => Number(match[1].replaceAll(",", ""))));
    if (ids.size !== 1 || amounts.size !== 1) return null;
    const amount = [...amounts][0];
    return Number.isSafeInteger(amount) ? { orderId: [...ids][0], amount } : null;
  }

  function sourceIssues(kind, selected) {
    const issues = [];
    for (const required of kind === "frozen" ? ["order", "transfer"] : ["contact"]) {
      if (!selected.some((item) => item.kind === required)) {
        issues.push({ id: `missing-${required}`, title: `자료 부족: ${KIND_LABELS[required]} 자료 없음`, detail: `선택된 자료에 ${KIND_LABELS[required]} 자료가 없습니다. 자료가 없는 상태이며 원문 간 상충을 뜻하지 않습니다.`, evidenceIds: [] });
      }
    }
    const orders = selected.filter((item) => item.kind === "order").map((item) => ({ item, payment: explicitPayment(item) }));
    const transfers = selected.filter((item) => item.kind === "transfer").map((item) => ({ item, payment: explicitPayment(item) }));
    for (const order of orders) {
      for (const transfer of transfers) {
        if (!order.payment || !transfer.payment || order.payment.orderId !== transfer.payment.orderId || order.payment.amount === transfer.payment.amount) continue;
        issues.push({
          id: `amount-${order.item.id}-${transfer.item.id}`, title: "명시금액 불일치",
          detail: `주문 ID ${order.payment.orderId}: 주문 자료 ${order.payment.amount.toLocaleString("ko-KR")}원, 이체 자료 ${transfer.payment.amount.toLocaleString("ko-KR")}원으로 명시되어 있습니다. 차이의 사유를 원문과 함께 확인해 주세요.`,
          evidenceIds: [order.item.id, transfer.item.id],
        });
      }
    }
    return issues;
  }

  function getIssues(record) {
    checkRecord(record);
    return sourceIssues(record.kind, record.evidence.filter((item) => item.included));
  }

  function getSignals(evidence) {
    const items = Array.isArray(evidence) ? evidence : [evidence];
    const rules = [
      ["가족 언급", /가족|부모|배우자|자녀/],
      ["직장 언급", /직장|회사|직장동료/],
      ["위협 관련 표현", /가만두지|해치겠|죽이겠|협박|위협/],
      ["반복 연락 표현", /반복|계속 연락|여러 차례|다시 연락/],
    ];
    const signals = [];
    for (const item of items) {
      checkObject(item, "연락 자료");
      checkText(item.text, 8000, "연락 원문");
      const lines = item.text.split(/\r\n|\r|\n/);
      for (const [label, pattern] of rules) {
        const quote = lines.find((line) => pattern.test(line));
        if (quote !== undefined) signals.push({ label, quote, detail: "원문에 해당 표현이 있어 표시했습니다. 부정 표현과 앞뒤 맥락을 확인해 주세요. 실제 행동이나 위법 여부를 판단한 결과가 아닙니다." });
      }
    }
    return signals;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function anchor(id) {
    try {
      return `evidence-${encodeURIComponent(id)}`;
    } catch {
      throw new Error("자료 ID에 올바르지 않은 문자가 있습니다.");
    }
  }

  function timeHtml(value) {
    return value === null ? "검토 기록 없음" : `<time datetime="${escapeHtml(value)}">${escapeHtml(value)}</time>`;
  }

  function buildReport(record) {
    checkRecord(record);
    const selected = record.evidence.filter((item) => item.included);
    if (!selected.length) throw new Error("내보낼 자료를 한 개 이상 선택해 주세요.");
    const selectedById = new Map(selected.map((item) => [item.id, item]));
    const facts = record.facts.filter((fact) => fact.included && selectedById.has(fact.evidenceId));
    const factIds = new Set(facts.map((fact) => fact.id));
    const history = record.history.filter((entry) => selectedById.has(entry.evidenceId) && factIds.has(entry.factId));
    // Derive issues after selection, so hidden sources cannot leak via summaries.
    const issues = sourceIssues(record.kind, selected);
    const link = (id) => `<a href="#${escapeHtml(encodeURIComponent(anchor(id)))}">${escapeHtml(selectedById.get(id).title)}</a>`;
    const factHtml = (fact) => `<article>
      <h3>${escapeHtml(fact.id)} · ${escapeHtml(STATUSES[fact.status])}</h3>
      <p>현재 정리문</p><div class="verbatim">${escapeHtml(fact.text)}</div>
      <p>원문 인용 · ${link(fact.evidenceId)}</p><blockquote class="verbatim">${escapeHtml(fact.quote)}</blockquote>
      <p>검토 메모</p><div class="verbatim">${escapeHtml(fact.note || "없음")}</div>
      <p>검토 시각: ${timeHtml(fact.reviewedAt)}</p>
    </article>`;
    const reviewHtml = (review) => `<p>${escapeHtml(STATUSES[review.status])}</p><div class="verbatim">${escapeHtml(review.text)}</div><p>메모</p><div class="verbatim">${escapeHtml(review.note || "없음")}</div><p>${timeHtml(review.reviewedAt)}</p>`;
    const signalRows = record.kind === "shield" ? selected.filter((item) => item.kind === "contact").flatMap((item) => getSignals(item).map((signal) => `<tr><th scope="row">${escapeHtml(signal.label)}</th><td><blockquote class="verbatim">${escapeHtml(signal.quote)}</blockquote>${link(item.id)}</td><td>${escapeHtml(signal.detail)}</td></tr>`)).join("") : "";

    return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
  <title>${escapeHtml(TITLES[record.kind])} · ${escapeHtml(record.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { max-width: 960px; margin: 32px auto; padding: 0 24px; color: #17202b; background: white; font: 16px/1.65 system-ui, sans-serif; overflow-wrap: anywhere; }
    h1, h2, h3 { line-height: 1.35; }
    h2 { margin-top: 32px; border-bottom: 1px solid #aeb8c4; padding-bottom: 8px; }
    h3 { font-size: 1rem; }
    a { color: #144b80; text-decoration: underline; }
    dt { font-weight: 700; } dd { margin: 0 0 10px; }
    article { margin: 16px 0; border: 1px solid #c5cdd6; padding: 16px; }
    blockquote { margin: 8px 0; padding-left: 12px; border-left: 3px solid #8995a4; }
    .verbatim { white-space: pre-wrap; overflow-wrap: anywhere; }
    .notice { border: 1px solid #8995a4; padding: 16px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #aeb8c4; padding: 10px; text-align: left; vertical-align: top; }
    caption { text-align: left; font-weight: 700; margin-bottom: 8px; }
    @page { size: A4; margin: 16mm; }
    @media print {
      body { max-width: none; margin: 0; padding: 0; font-size: 10pt; }
      .print-help { display: none; }
      h2, h3 { break-after: avoid; }
      article, tr { break-inside: avoid; }
      thead { display: table-header-group; }
      a { color: inherit; }
    }
  </style>
</head>
<body>
<main>
  <header><h1>${escapeHtml(TITLES[record.kind])}</h1>
    <dl><dt>사건 제목</dt><dd>${escapeHtml(record.title)}</dd><dt>사건 ID</dt><dd>${escapeHtml(record.id)}</dd>
      <dt>생성 시각</dt><dd>${timeHtml(record.createdAt)}</dd><dt>수정 시각</dt><dd>${timeHtml(record.updatedAt)}</dd>
      <dt>내보낸 시각</dt><dd>${timeHtml(new Date().toISOString())}</dd><dt>기록 버전</dt><dd>1</dd></dl>
  </header>
  <aside class="notice" aria-label="자료 이용 안내">
    <p>이 자료는 공식 제출 서식이 아니며 법적 판단이나 결론이 아닙니다. 사용자가 상담 또는 소명 전에 내용을 정리하는 준비 자료입니다.</p>
    <p>로컬 전용: 이 엔진은 브라우저 안에서 자료를 정리하며 서버 전송이나 자동 저장을 하지 않습니다. 내보낸 파일에는 선택한 원문이 포함됩니다.</p>
    <p>합성 데모 안내: ‘합성 데모’로 표시된 예시는 실제 사건·계좌·연락처가 없는 가상의 자료입니다. 직접 입력한 자료는 해당 표시와 구분해 확인해 주세요.</p>
    <p>사실 항목은 원문의 비어 있지 않은 줄을 나눈 정리이며 AI 추출이나 정확도 평가가 아닙니다. ‘확인됨’은 사용자가 표시한 검토 상태입니다.</p>
    <p class="print-help">브라우저의 인쇄 → PDF로 저장을 사용해 보관할 수 있습니다.</p>
  </aside>
  <nav aria-label="선택한 원문 자료"><h2>자료 인덱스</h2><ol>${selected.map((item) => `<li>${link(item.id)} · ${escapeHtml(KIND_LABELS[item.kind])}</li>`).join("")}</ol></nav>
  <section id="confirmed-facts"><h2>확인된 사실 (사용자 표시)</h2>${facts.filter((fact) => fact.status === "confirmed").map(factHtml).join("") || "<p>사용자가 확인한 사실이 없습니다.</p>"}</section>
  <section id="pending-facts"><h2>미검토·재검토가 필요한 사실</h2>${facts.filter((fact) => fact.status !== "confirmed").map(factHtml).join("") || "<p>미검토 또는 재검토 표시된 사실이 없습니다.</p>"}</section>
  <section><h2>자료 확인 이슈</h2>
    <p>${record.kind === "frozen" ? "금액 비교는 원문에 주문 ID 또는 주문번호와 명시금액이 각각 하나로 명확히 적힌 주문·이체 자료를 대상으로 합니다." : "선택한 연락 자료의 보완 여부를 확인합니다."} 이슈가 없다는 것은 자료의 완전성이나 적법성을 증명하지 않습니다.</p>
    <table><caption>선택된 원문 자료의 부족·불일치</caption><thead><tr><th scope="col">구분</th><th scope="col">확인할 내용</th><th scope="col">관련 원문</th></tr></thead>
      <tbody>${issues.map((issue) => `<tr><th scope="row">${escapeHtml(issue.title)}</th><td>${escapeHtml(issue.detail)}</td><td>${issue.evidenceIds.map(link).join("<br>") || "해당 자료 없음"}</td></tr>`).join("") || '<tr><td colspan="3">선택된 자료에서 비교 가능한 불일치나 필수 자료 누락이 발견되지 않았습니다.</td></tr>'}</tbody></table>
  </section>
  ${record.kind === "shield" ? `<section><h2>연락 원문 표현 참고</h2><p>아래 표시는 원문에 쓰인 표현을 찾은 결과이며, 실제 접촉이나 위법 여부에 대한 판단이 아닙니다.</p><table><caption>가족·직장·위협·반복 관련 표현</caption><thead><tr><th scope="col">표현</th><th scope="col">원문 인용</th><th scope="col">읽는 방법</th></tr></thead><tbody>${signalRows || '<tr><td colspan="3">해당 표현이 발견되지 않았습니다. 안전하다는 의미는 아닙니다.</td></tr>'}</tbody></table></section>` : ""}
  <section><h2>선택한 원문 자료</h2>${selected.map((item) => `<article id="${escapeHtml(anchor(item.id))}"><h3>${escapeHtml(item.title)}</h3><dl><dt>자료 ID</dt><dd>${escapeHtml(item.id)}</dd><dt>자료 종류</dt><dd>${escapeHtml(KIND_LABELS[item.kind])}</dd><dt>발생 시각</dt><dd>${timeHtml(item.occurredAt)}</dd><dt>출처</dt><dd>${escapeHtml(item.source)}</dd></dl><p>추가 당시 원문</p><div class="verbatim">${escapeHtml(item.text)}</div></article>`).join("")}</section>
  <section><h2>사실 검토 변경 이력</h2><p>선택한 자료에 연결된 사실의 검토 전후 기록입니다.</p>
    <table><caption>변경 시각과 검토 전후</caption><thead><tr><th scope="col">시각·자료</th><th scope="col">변경 전</th><th scope="col">변경 후</th></tr></thead><tbody>${history.map((entry) => `<tr><td>${timeHtml(entry.at)}<p>${link(entry.evidenceId)}</p><p>사실 ID: ${escapeHtml(entry.factId)}</p><p>이력 ID: ${escapeHtml(entry.id)}</p></td><td>${reviewHtml(entry.before)}</td><td>${reviewHtml(entry.after)}</td></tr>`).join("") || '<tr><td colspan="3">선택한 자료의 검토 변경 이력이 없습니다.</td></tr>'}</tbody></table>
  </section>
</main>
</body>
</html>`;
  }

  return { createCase, demoEvidence, addEvidence, reviewFact, setEvidenceIncluded, getIssues, getSignals, buildReport };
});
