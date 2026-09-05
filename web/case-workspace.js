"use strict";

// Browser-local workspaces reuse the existing FinGuard frame, controls and tokens.
// No case material is sent to the server or silently persisted.
const recordSession = {
  frozen: null, shield: null, notices: { frozen: "", shield: "" },
  drafts: { frozen: {}, shield: {} }, selected: { frozen: "", shield: "" },
  selectedFact: { frozen: "", shield: "" }, edits: { frozen: {}, shield: {} },
  frozenCases: [],
};
const SHIELD_VIEWS = [
  ["s01", "개요"], ["s02", "연락 기록"], ["s03", "위험 신호"],
  ["s04", "증거 보관"], ["s05", "이슈 검토"], ["s06", "타임라인"],
  ["s07", "상담 준비"], ["s08", "자료 보완"],
];
const RECORD_STATUS = { unreviewed: "확인 전", confirmed: "사용자 확인", needs_review: "추가 확인" };
const RECORD_KIND = { order: "주문 자료", transfer: "입금 자료", message: "대화", contact: "추심 연락", document: "보완 문서" };

function caseRecord(kind) {
  if (!recordSession[kind]) recordSession[kind] = FinGuardRecords.createCase(kind);
  return recordSession[kind];
}
function commitCase(kind, record, notice) {
  recordSession[kind] = record;
  recordSession.notices[kind] = notice;
}
function recordAction(label, action, kind, attrs = {}, primary = false) {
  return actionButton(label, action, primary ? "button figma-primary" : "button figma-secondary", { "data-record-kind": kind, ...attrs });
}
function recordViewButton(label, kind, view, primary = false) {
  return recordAction(label, "record-view", kind, { "data-record-view": view }, primary);
}
function openRecordView(kind, view, options = {}) {
  state.showReference = false;
  if (kind === "shield") {
    state.shieldView = view;
    navigate("shield-workspace");
    return true;
  }
  const targetIndex = workspaceStepIndex(view);
  const activeIndex = workspaceStepIndex(state.workspaceScreen || "c01");
  const reachableThrough = Math.max(state.workspaceProgress, activeIndex);
  if (targetIndex >= 0 && !options.allowSkip && targetIndex > reachableThrough + 1) {
    recordSession.notices.frozen = "다음 단계부터 확인해 주세요. 완료한 단계는 사이드바에서 다시 열 수 있습니다.";
    render();
    return false;
  }
  if (targetIndex >= 0) state.workspaceProgress = Math.max(state.workspaceProgress, targetIndex);
  state.workspaceScreen = view;
  navigate("workspace");
  return true;
}
function recordTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "시각 미확인" : date.toLocaleString("ko-KR", { hour12: false });
}
function localRecordDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function recordNotice(kind) {
  const notice = setAttrs(el("p", "record-notice", recordSession.notices[kind]), { role: "status", "aria-live": "polite" });
  return notice;
}
function recordField(label, name, value, options = {}) {
  const { multiline = false, choices, ...attrs } = options;
  const id = "record-" + name;
  const control = choices ? el("select", "record-input") : el(multiline ? "textarea" : "input", "record-input");
  if (choices) choices.forEach(([key, text]) => control.append(setAttrs(el("option", "", text), { value: key })));
  setAttrs(control, { id, name, "data-record-field": name, ...attrs });
  control.value = value || "";
  return el("label", "record-field", el("span", "", label), control);
}
function recordEmpty(title, detail, kind, view) {
  return el("section", "record-empty", el("h2", "", title), el("p", "", detail),
    recordViewButton("첫 자료 추가하기", kind, view, true),
    recordAction("합성 예시 3건 추가", "record-demo", kind));
}
function recordRail(kind, view) {
  const record = caseRecord(kind);
  const frozen = kind === "frozen";
  const rail = setAttrs(el("aside", "figma-service-rail record-rail"), frozen ? { "data-workspace-screen": view } : {});
  const brand = screenButton("FinGuard", "home", "figma-rail-brand-link", { "aria-label": "FinGuard 홈" });
  append(rail, el("div", "figma-rail-brand", el("span", "figma-rail-mark", "F"), brand),
    el("span", "figma-rail-caption", kind === "shield" ? "SHIELD · 불법 추심 대응" : "FROZEN · 계좌가 막힌 후"),
    el("strong", "figma-rail-case", kind === "shield" ? "추심 연락 기록" : "지급정지 소명 준비"),
    el("span", "figma-rail-subtitle", "합성자료 체험 · 브라우저 내 작업"));
  const nav = setAttrs(el("nav", frozen ? "figma-rail-nav figma-stepper-nav" : "figma-rail-nav"), { "aria-label": kind === "shield" ? "불법 추심 업무 메뉴" : "사건 진행 단계" });
  if (frozen) {
    const activeIndex = workspaceStepIndex(view);
    const reachableThrough = Math.max(state.workspaceProgress, activeIndex);
    WORKSPACE_STEPS.forEach((step, index) => {
      const route = step.routes.includes(view) ? view : step.routes[0];
      const locked = index > reachableThrough;
      const complete = index < state.workspaceProgress;
      const wrapper = el("div", "figma-step-wrap");
      const item = button("", `figma-rail-item figma-step-item ${activeIndex === index ? "is-active" : ""} ${complete ? "is-complete" : ""} ${locked ? "is-locked" : ""}`.trim(), {
        "data-action": "record-view",
        "data-record-kind": kind,
        "data-record-view": route,
        "data-workspace-step": step.id,
        "aria-label": `${step.label}${locked ? " (잠김)" : ""}`,
        "aria-current": activeIndex === index ? "step" : undefined,
        "aria-disabled": locked,
        title: locked ? "이전 단계를 완료하면 열 수 있습니다." : undefined,
        disabled: locked,
      });
      append(item,
        setAttrs(el("span", "figma-step-marker", complete ? "✓" : String(index + 1).padStart(2, "0")), { "aria-hidden": "true" }),
        el("span", "figma-step-label", step.label),
        setAttrs(el("span", "figma-step-status", locked ? "잠김" : complete ? "완료" : activeIndex === index ? "진행 중" : ""), { "aria-hidden": "true" }));
      wrapper.append(item);
      if (index < WORKSPACE_STEPS.length - 1) wrapper.append(el("span", `figma-step-arrow ${index < reachableThrough ? "is-reached" : "is-locked"}`, "↓"));
      nav.append(wrapper);
    });
  } else {
    SHIELD_VIEWS.forEach(([id, label]) => {
      const active = id === view;
      nav.append(actionButton(label, "record-view", "figma-rail-item" + (active ? " is-active" : ""), {
        "data-record-kind": kind, "data-record-view": id, "aria-current": active ? "page" : undefined,
      }));
    });
  }
  const footer = el("div", "record-rail-footer",
    el("strong", "", frozen ? "다음 단계부터 순서대로 열립니다" : "필요한 업무부터 선택하세요"),
    el("p", "", frozen ? "완료한 단계는 사이드바에서 다시 확인할 수 있습니다." : "페이지를 모두 순서대로 완료할 필요는 없습니다."));
  if (kind === "frozen") footer.append(recordAction("기존 화면 예시 보기", "record-reference", kind));
  else footer.append(screenButton("처음 안내 다시 보기", "shield", "record-rail-link"));
  rail.append(nav, footer);
  return rail;
}
function recordStats(kind) {
  const record = caseRecord(kind);
  const confirmed = record.facts.filter(f => f.status === "confirmed").length;
  return figmaDesktopStats([
    [kind === "shield" ? "연락·자료" : "원문 자료", String(record.evidence.length), "이 사건에 추가한 원문", "info"],
    ["확인한 항목", String(confirmed), "사용자가 원문과 대조", "success"],
    ["확인 전·보완", String(record.facts.length - confirmed), "내보낼 때 별도 표시", "warning"],
    ["포함할 원문", String(record.evidence.filter(e => e.included).length), "직접 선택한 자료만", "neutral"],
  ]);
}
function recordOverview(kind) {
  const record = caseRecord(kind);
  const start = kind === "shield" ? "s02" : "c02";
  const review = kind === "shield" ? "s03" : "c02";
  const report = kind === "shield" ? "s07" : "c07";
  const block = el("div", "record-section-stack");
  block.append(recordStats(kind));
  if (kind === "frozen" && recordSession.frozenCases.length) {
    const other = figmaDesktopSection("이 탭의 다른 사건", "새 사건은 자동으로 합쳐지지 않습니다. 선택하면 해당 사건의 원문·확인 이력·작성 중 내용으로 돌아갑니다.");
    recordSession.frozenCases.forEach((item, index) => other.append(recordAction("사건 " + item.record.id.slice(0, 8) + " · 원문 " + item.record.evidence.length + "건", "record-switch-case", kind, { "data-record-case-index": index })));
    block.append(other);
  }
  if (!record.evidence.length) {
    block.append(recordEmpty(kind === "shield" ? "첫 연락부터 남겨보세요" : "흩어진 자료를 한 사건으로", "원문은 그대로 두고, 확인한 사실과 설명은 따로 기록합니다.", kind, start));
    return block;
  }
  const split = el("div", "record-summary-grid");
  const activity = figmaDesktopSection("최근 추가한 자료", "원문을 선택하면 관련 확인 항목으로 이동합니다.");
  record.evidence.slice(-5).reverse().forEach(e => activity.append(recordAction(e.title + " · " + recordTime(e.occurredAt), "record-select-evidence", kind, { "data-evidence-id": e.id, "data-record-view": review })));
  const next = figmaDesktopSection("지금 할 일", "확인 전 항목을 숨기지 않고 자료에 함께 표시합니다.");
  append(next, recordViewButton(kind === "shield" ? "원문과 항목 대조하기" : "자료 수집 계속하기", kind, review, true),
    recordViewButton(kind === "shield" ? "상담 준비 자료 만들기" : "소명팩 준비 상태 확인", kind, report),
    el("p", "record-muted", "자동 신고·기관 전송·지급정지 해제는 실행하지 않습니다."));
  split.append(activity, next);
  block.append(split);
  return block;
}
function recordIntake(kind, supplement = false) {
  const record = caseRecord(kind);
  const draft = recordSession.drafts[kind];
  const section = figmaDesktopSection(supplement ? "원문을 보완하세요" : kind === "shield" ? "연락 한 건 남기기" : "자료 추가", "추가한 원문은 수정하지 않습니다. 설명은 확인 화면에서 따로 남길 수 있습니다.");
  const form = setAttrs(el("form", "record-form"), { id: "record-intake", "data-record-kind": kind });
  const row = el("div", "record-form-row",
    recordField("자료 이름", "title", draft.title, { required: true, maxlength: 100, placeholder: kind === "shield" ? "예: 가족 연락을 언급한 문자" : "예: 주문서 · 합성 주문 FG-DEMO-01" }),
    recordField("자료 종류", "kind", draft.kind || (kind === "shield" ? "contact" : "order"), { choices: Object.entries(RECORD_KIND) }));
  const meta = el("div", "record-form-row",
    recordField("연락·거래 시각", "occurredAt", draft.occurredAt || localRecordDate(), { type: "datetime-local", required: true }),
    recordField("자료 출처 / 채널", "source", draft.source, { required: true, maxlength: 100, placeholder: "예: 합성 문자 · 판매내역" }));
  const original = recordField("원문 내용", "text", draft.text, { multiline: true, required: true, rows: 7, maxlength: 8000, placeholder: "자료의 원문을 붙여넣으세요. 실제 개인정보 대신 합성자료를 사용해 주세요." });
  const file = setAttrs(el("input", "record-file-input"), { type: "file", id: "record-text-file", accept: ".txt,text/plain", "data-record-kind": kind });
  const fileLabel = el("label", "record-file-label", el("span", "", "TXT에서 원문 불러오기"), file);
  const save = setAttrs(el("button", "button figma-primary", supplement ? "보완 원문 추가" : "원문 추가하고 확인하기"), { type: "submit" });
  append(form, row, meta, original, el("p", "record-muted", "텍스트·UTF-8 TXT만 지원 · 최대 8,000자 · 이미지/PDF 자동 읽기는 아직 지원하지 않습니다."),
    el("div", "record-actions", save, fileLabel));
  section.append(form, recordAction("합성 예시 3건 추가", "record-demo", kind));
  const wrap = el("div", "record-summary-grid record-intake-layout", section);
  const list = figmaDesktopSection("연결한 원문", record.evidence.length + "건 · 새 자료를 추가해도 이전 확인 이력은 유지됩니다.");
  record.evidence.forEach(e => list.append(el("article", "record-mini-source", el("strong", "", e.title),
    el("p", "", (RECORD_KIND[e.kind] || e.kind) + " · " + recordTime(e.occurredAt)),
    el("p", "record-source-excerpt", e.text.slice(0, 130)),
    recordAction("원문·확인 항목 보기", "record-select-evidence", kind, { "data-evidence-id": e.id, "data-record-view": kind === "shield" ? "s03" : "c03" }))));
  if (!record.evidence.length) list.append(el("p", "record-muted", "아직 추가한 자료가 없습니다. 왼쪽에서 원문을 입력하거나 합성 예시로 시작하세요."));
  wrap.append(list);
  return wrap;
}
function recordWorkbench(kind) {
  const record = caseRecord(kind);
  if (!record.evidence.length) return recordEmpty("대조할 원문이 없습니다", "연락이나 자료 한 건을 먼저 추가해 주세요.", kind, kind === "shield" ? "s02" : "c02");
  const selected = record.evidence.find(e => e.id === recordSession.selected[kind]) || record.evidence[0];
  const facts = record.facts.filter(f => f.evidenceId === selected.id);
  const fact = facts.find(f => f.id === recordSession.selectedFact[kind]) || facts[0];
  const columns = el("div", "record-workbench");
  const list = figmaDesktopSection(kind === "shield" ? "연락·자료" : "원문 목록", record.evidence.length + "건");
  record.evidence.forEach(e => {
    const item = recordAction(e.title, "record-select-evidence", kind, { "data-evidence-id": e.id });
    item.className = "record-source-button" + (e.id === selected.id ? " is-selected" : "");
    item.setAttribute("aria-pressed", String(e.id === selected.id));
    append(item, el("span", "", RECORD_KIND[e.kind] + " · " + recordTime(e.occurredAt)));
    list.append(item);
  });
  const original = figmaDesktopSection("선택한 원문", selected.source + " · " + recordTime(selected.occurredAt));
  append(original, el("h3", "record-source-title", selected.title), el("blockquote", "record-original", selected.text),
    el("p", "record-muted", "원문 보존 · 아래 항목은 문장 단위로 정리했습니다. AI가 사실·적법성을 확정한 결과가 아닙니다."));
  if (kind === "shield") {
    const signals = FinGuardRecords.getSignals(selected);
    const signalList = el("div", "record-signals");
    signals.forEach(s => signalList.append(el("article", "record-signal", el("strong", "", s.label), el("q", "", s.quote), el("p", "", s.detail))));
    original.append(el("h3", "", "원문에서 찾은 단서"), signalList);
    if (!signals.length) original.append(el("p", "record-muted", "현재 규칙에 해당하는 표현을 찾지 못했습니다. 문제가 없다는 의미는 아닙니다."));
    original.append(el("p", "record-muted", "채무의 존재·금액과 추심 방식은 별개로 확인해야 합니다. 단서만으로 불법을 판정하지 않습니다."));
  }
  const review = figmaDesktopSection("원문과 확인 항목", "확인 전 / 사용자 확인 / 추가 확인을 구분합니다.");
  facts.forEach(f => {
    const item = recordAction(f.text, "record-select-fact", kind, { "data-fact-id": f.id });
    item.className = "record-fact-button" + (fact?.id === f.id ? " is-selected" : "");
    item.setAttribute("aria-pressed", String(fact?.id === f.id));
    item.prepend(figmaBadge(RECORD_STATUS[f.status], f.status === "confirmed" ? "figma-badge-blue" : "figma-badge-warning"));
    review.append(item);
  });
  if (fact) {
    const edit = recordSession.edits[kind][fact.id] || fact;
    const form = setAttrs(el("form", "record-form record-review-form"), { id: "record-review", "data-record-kind": kind, "data-fact-id": fact.id });
    append(form, el("p", "record-quote-label", "원문 근거"), el("blockquote", "record-quote", fact.quote),
      recordField("내가 확인한 내용", "reviewText", edit.text, { multiline: true, rows: 3, maxlength: 8000, required: true }),
      recordField("확인 상태", "reviewStatus", edit.status, { choices: Object.entries(RECORD_STATUS) }),
      recordField("확인 메모 / 수정 이유", "reviewNote", edit.note, { multiline: true, rows: 2, maxlength: 1000, placeholder: "예: 거래 원문과 금액이 달라 추가 확인 필요" }),
      setAttrs(el("button", "button figma-primary", "확인 내용 반영"), { type: "submit" }));
    review.append(form);
  }
  columns.append(list, original, review);
  return columns;
}
function recordIssues(kind, view) {
  const record = caseRecord(kind);
  const wrap = el("div", "record-section-stack");
  if (!record.evidence.length) return recordEmpty("확인할 자료가 없습니다", "원문을 추가하면 연결과 보완 상태를 확인할 수 있습니다.", kind, kind === "shield" ? "s02" : "c02");
  if (kind === "frozen") {
    const compare = el("div", "record-summary-grid");
    ["order", "transfer"].forEach(type => {
      const pane = figmaDesktopSection(RECORD_KIND[type], "동일한 주문 식별자가 명시된 자료의 금액만 비교합니다.");
      record.evidence.filter(e => e.kind === type).forEach(e => pane.append(el("article", "record-mini-source",
        el("h3", "", e.title), el("blockquote", "record-original", e.text))));
      if (!record.evidence.some(e => e.kind === type)) pane.append(el("p", "record-muted", "자료 없음 · 자동으로 일치 판정하지 않습니다."));
      compare.append(pane);
    });
    wrap.append(compare);
  }
  const section = figmaDesktopSection(kind === "shield" ? "확인할 사항과 빠진 자료" : "상충·자료 보완", "현재 원문에서 확인 가능한 범위입니다. 사용자 확인으로 원문 자체의 불일치가 사라지지는 않습니다.");
  const issues = FinGuardRecords.getIssues(record);
  issues.forEach(issue => {
    const card = el("article", "record-issue", el("h3", "", issue.title), el("p", "", issue.detail));
    (issue.evidenceIds || []).forEach(id => {
      const source = record.evidence.find(e => e.id === id);
      if (source) card.append(recordAction(source.title + " 대조", "record-select-evidence", kind, { "data-evidence-id": id, "data-record-view": kind === "shield" ? "s03" : "c03" }));
    });
    section.append(card);
  });
  if (!issues.length) section.append(el("p", "record-muted", "현재 비교 규칙에서 불일치를 찾지 못했습니다. 전체 자료의 진위·완전성을 보장하지 않습니다."));
  const pending = record.facts.filter(f => f.status !== "confirmed");
  section.append(el("h3", "", "사용자 확인 전·추가 확인 " + pending.length + "건"));
  pending.slice(0, 8).forEach(f => section.append(recordAction(f.text, "record-select-fact", kind, { "data-fact-id": f.id, "data-record-view": kind === "shield" ? "s03" : "c03" })));
  if (kind === "shield") section.append(figmaCallout("분리해서 확인", "연락 사실과 추심 방식의 문제, 계약·채무 금액의 확인은 구분합니다. 계약서가 없어도 확보한 연락 원문으로 상담 준비를 시작할 수 있습니다.", "info"));
  wrap.append(section);
  return wrap;
}
function recordTimeline(kind) {
  const record = caseRecord(kind);
  const section = figmaDesktopSection("연락·자료 타임라인", "원문에 기록한 발생 시각입니다. 항목 확인 이력의 작업 시각과 구분합니다.");
  record.evidence.slice().sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt)).forEach(e => section.append(el("article", "record-timeline-item",
    el("time", "", recordTime(e.occurredAt)), el("div", "", el("h3", "", e.title), el("p", "", e.source),
      recordAction("연결 원문 보기", "record-select-evidence", kind, { "data-evidence-id": e.id, "data-record-view": kind === "shield" ? "s03" : "c03" })))));
  if (!record.evidence.length) section.append(el("p", "record-muted", "기록을 추가하면 시간순으로 표시됩니다."));
  const history = figmaDesktopSection("작업 이력", "최근 확인·수정 20건입니다. 전체 확인 이력은 내보내는 자료에 포함됩니다.");
  record.history.slice().reverse().slice(0, 20).forEach(item => history.append(el("div", "record-history-row", el("time", "", recordTime(item.at)),
    el("strong", "", RECORD_STATUS[item.before.status] + " → " + RECORD_STATUS[item.after.status]),
    el("p", "", "수정 전: " + item.before.text), el("p", "", "수정 후: " + item.after.text),
    item.after.note ? el("p", "", "메모: " + item.after.note) : null)));
  if (!record.history.length) history.append(el("p", "record-muted", "아직 변경 이력이 없습니다."));
  return el("div", "record-summary-grid", section, history);
}
function recordSources(kind, reportMode = false) {
  const record = caseRecord(kind);
  const section = figmaDesktopSection("포함할 원문 선택", "체크를 해제해도 작업 중인 원문은 삭제되지 않습니다. 내보낸 자료에서만 제외됩니다.");
  record.evidence.forEach(e => {
    const check = setAttrs(el("input", ""), { type: "checkbox", "data-record-include": e.id, "data-record-kind": kind });
    check.checked = e.included;
    section.append(el("label", "record-include-row", check, el("span", "", el("strong", "", e.title), el("small", "", RECORD_KIND[e.kind] + " · " + e.source))));
  });
  if (!record.evidence.length) section.append(el("p", "record-muted", "포함할 원문이 없습니다. 먼저 자료를 추가해 주세요."));
  if (reportMode) {
    const selected = record.evidence.filter(e => e.included).length;
    const exportButton = recordAction("HTML 내려받기", "record-export", kind, {}, true);
    const print = recordAction("인쇄 / PDF로 저장", "record-print", kind);
    exportButton.disabled = !selected;
    print.disabled = !selected;
    append(section, el("div", "record-section-stack", exportButton, print),
      el("p", "record-muted", "PDF는 브라우저 인쇄에서 ‘PDF로 저장’을 선택하세요. 기관으로 자동 전송하지 않습니다."));
  }
  return section;
}
function officialSupport() {
  const section = figmaDesktopSection("공식 상담에 가져갈 준비", "작성한 자료를 직접 검토한 뒤 공식 기관에 문의하세요.");
  const routes = [
    ["금융감독원 · 1332", "불법사금융 신고·지원 안내 확인", "https://www.fss.or.kr"],
    ["대한법률구조공단 · 132", "법률 상담·채무자대리인 지원 안내 확인", "https://www.klac.or.kr"],
  ];
  routes.forEach(([title, description, href]) => {
    const link = setAttrs(el("a", "record-official-link", title), { href, target: "_blank", rel: "noopener noreferrer" });
    section.append(el("div", "record-mini-source", link, el("p", "", description)));
  });
  section.append(el("p", "record-muted", "이 문서는 상담 준비 보조자료입니다. 접수·대리인 선임·법적 효력이 발생한 것은 아닙니다."));
  return section;
}
function recordReport(kind) {
  const record = caseRecord(kind);
  const side = el("div", "record-section-stack", recordSources(kind, true));
  if (kind === "shield") side.append(officialSupport());
  const preview = figmaDesktopSection(kind === "shield" ? "상담 준비 자료 미리보기" : "소명팩 미리보기", "현재 원문·확인 내용·포함 범위로 생성합니다. 확인 전 항목은 별도로 남깁니다.");
  if (record.evidence.some(e => e.included)) {
    const frame = setAttrs(el("iframe", "record-report-preview"), { title: kind === "shield" ? "상담 준비 자료" : "지급정지 소명 준비 자료", sandbox: "" });
    frame.srcdoc = FinGuardRecords.buildReport(record);
    preview.append(frame);
  } else preview.append(el("p", "record-muted", "원문을 한 건 이상 선택하면 미리보기가 생성됩니다."));
  return el("div", "record-report-grid", preview, side);
}
function renderRecordWorkspace(kind, view) {
  const record = caseRecord(kind);
  const shield = kind === "shield";
  const step = shield ? view.slice(1) : view.slice(1).replace(/[ab]$/, "");
  const titles = shield ? Object.fromEntries(SHIELD_VIEWS) : {
    c01: "사건 개요", c02: "사건 자료 수집", c03: "원문·사실 확인", c04: "주문–입금 거래 연결",
    c05a: "이슈 검토", c05b: "상충·미확인 검토", c06: "사건 타임라인", c07: "증거 연결 보고서", c08: "자료 보완",
  };
  const content = el("div", "figma-desktop-content record-content");
  const storage = el("div", "record-storage-notice", el("strong", "", "합성자료 체험 · 이 탭에서 작업 중"),
    el("span", "", "서버·브라우저 저장소에 보관하지 않습니다. 새로고침 전 자료를 내려받으세요."));
  content.append(storage, recordNotice(kind));
  if (step === "01") content.append(recordOverview(kind));
  else if (step === "02" || step === "08") content.append(recordIntake(kind, step === "08"));
  else if (step === "03") content.append(recordWorkbench(kind));
  else if (step === "04" && shield) content.append(recordSources(kind), recordViewButton("선택한 자료로 상담 준비", kind, "s07", true));
  else if (step === "04" || step === "05") content.append(recordIssues(kind, view));
  else if (step === "06") content.append(recordTimeline(kind));
  else content.append(recordReport(kind));
  const frame = figmaDesktopFrame(recordRail(kind, view), titles[view] || "원문·사실 확인",
    (shield ? "SHIELD" : "FROZEN") + " · " + record.id, content, "record-workspace");
  frame.dataset.recordKind = kind;
  return frame;
}
function loadRecordDemo(kind) {
  let record = caseRecord(kind);
  const samples = FinGuardRecords.demoEvidence(kind).filter(e => !record.evidence.some(old => old.title === e.title && old.text === e.text));
  samples.forEach(e => { record = FinGuardRecords.addEvidence(record, e); });
  if (samples.length) commitCase(kind, record, "합성 원문 " + samples.length + "건을 추가했습니다. 원문과 정리 항목을 대조해 주세요.");
  else recordSession.notices[kind] = "이미 같은 합성 예시가 있습니다. 기존 기록을 그대로 유지합니다.";
  recordSession.selected[kind] = record.evidence[0]?.id || "";
  openRecordView(kind, kind === "shield" ? "s03" : "c03", { allowSkip: true });
}
function startFrozenRecord(message) {
  if (recordSession.frozen && recordSession.frozenCases.length >= 9) throw new Error("이 탭에서는 최대 10개 사건을 정리할 수 있습니다. 기존 사건은 개요에서 선택해 계속 작업하세요.");
  let record = FinGuardRecords.createCase("frozen");
  if (message.trim()) {
    record = FinGuardRecords.addEvidence(record, {
      title: "Gate에서 가져온 메시지", kind: "message", source: "합성 Gate 입력 · 표시 시각은 가져온 시각 (수신 시각 미확인)",
      occurredAt: new Date().toISOString(), text: message.trim(),
    });
  }
  if (recordSession.frozen) recordSession.frozenCases.push(frozenSnapshot());
  activateFrozen({ record, draft: {}, selected: "", selectedFact: "", edits: {} });
  commitCase("frozen", record, "사건 작업을 시작했습니다. 원문과 확인 내용은 이 탭에서만 유지됩니다.");
}
function frozenSnapshot() {
  return { record: recordSession.frozen, draft: recordSession.drafts.frozen, selected: recordSession.selected.frozen,
    selectedFact: recordSession.selectedFact.frozen, edits: recordSession.edits.frozen, progress: state.workspaceProgress };
}
function activateFrozen(item) {
  recordSession.frozen = item.record;
  recordSession.drafts.frozen = item.draft;
  recordSession.selected.frozen = item.selected;
  recordSession.selectedFact.frozen = item.selectedFact;
  recordSession.edits.frozen = item.edits;
  state.workspaceProgress = Number.isInteger(item.progress) ? item.progress : 0;
}
function exportRecord(kind, print = false) {
  const html = FinGuardRecords.buildReport(caseRecord(kind));
  if (print) {
    const win = window.open("", "_blank");
    if (!win) throw new Error("인쇄 창이 차단됐습니다. 팝업을 허용하거나 HTML을 내려받아 인쇄해 주세요.");
    win.opener = null;
    win.document.open();
    win.addEventListener("load", () => { win.focus(); win.print(); }, { once: true });
    win.document.write(html);
    win.document.close();
    recordSession.notices[kind] = "인쇄 창을 열었습니다. ‘PDF로 저장’을 직접 선택하세요. 아직 저장 완료 여부는 확인할 수 없습니다.";
  } else {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = (kind === "shield" ? "FinGuard-상담준비-" : "FinGuard-소명팩-") + new Date().toISOString().slice(0, 10) + ".html";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    recordSession.notices[kind] = "현재 상태의 HTML 다운로드를 요청했습니다. 내려받은 파일을 확인해 주세요.";
  }
}
function handleRecordAction(target) {
  const action = target.dataset.action;
  if (!action?.startsWith("record-")) return false;
  const kind = target.dataset.recordKind === "shield" ? "shield" : "frozen";
  try {
    if (action === "record-view" || action === "record-open") openRecordView(kind, target.dataset.recordView || (kind === "shield" ? "s02" : "c02"));
    else if (action === "record-switch-case" && kind === "frozen") {
      const index = Number(target.dataset.recordCaseIndex);
      if (!Number.isInteger(index) || !recordSession.frozenCases[index]) throw new Error("전환할 사건을 찾지 못했습니다.");
      const previous = frozenSnapshot();
      activateFrozen(recordSession.frozenCases[index]);
      recordSession.frozenCases[index] = previous;
      recordSession.notices.frozen = "선택한 사건으로 전환했습니다. 다른 사건과 자료를 합치지 않았습니다.";
      openRecordView("frozen", "c01");
    }
    else if (action === "record-demo") loadRecordDemo(kind);
    else if (action === "record-reference") { state.showReference = true; state.workspaceScreen = "c01"; navigate("workspace"); }
    else if (action === "record-select-evidence" || action === "record-select-fact") {
      const record = caseRecord(kind);
      if (target.dataset.evidenceId) {
        recordSession.selected[kind] = target.dataset.evidenceId;
        recordSession.selectedFact[kind] = "";
      }
      if (target.dataset.factId) {
        const fact = record.facts.find(f => f.id === target.dataset.factId);
        if (!fact) throw new Error("확인할 항목을 찾지 못했습니다.");
        recordSession.selected[kind] = fact.evidenceId;
        recordSession.selectedFact[kind] = fact.id;
      }
      if (target.dataset.recordView) openRecordView(kind, target.dataset.recordView);
      else render();
    } else if (action === "record-export" || action === "record-print") { exportRecord(kind, action === "record-print"); render(); }
  } catch (error) { recordSession.notices[kind] = error.message; render(); }
  return true;
}
document.addEventListener("input", event => {
  const form = event.target.closest("#record-intake, #record-review");
  if (!form) return;
  const kind = form.dataset.recordKind;
  const values = Object.fromEntries(new FormData(form));
  if (form.id === "record-intake") recordSession.drafts[kind] = values;
  else recordSession.edits[kind][form.dataset.factId] = { text: values.reviewText, status: values.reviewStatus, note: values.reviewNote };
});
document.addEventListener("submit", event => {
  const form = event.target;
  if (!["record-intake", "record-review"].includes(form.id)) return;
  event.preventDefault();
  const kind = form.dataset.recordKind;
  const values = Object.fromEntries(new FormData(form));
  try {
    if (form.id === "record-intake") {
      const record = FinGuardRecords.addEvidence(caseRecord(kind), values);
      commitCase(kind, record, "원문을 추가했습니다. 문장 단위로 정리한 항목을 직접 확인해 주세요.");
      recordSession.selected[kind] = record.evidence[record.evidence.length - 1].id;
      recordSession.selectedFact[kind] = "";
      recordSession.drafts[kind] = {};
      openRecordView(kind, kind === "shield" ? "s03" : "c03");
    } else {
      const record = FinGuardRecords.reviewFact(caseRecord(kind), form.dataset.factId, { text: values.reviewText, status: values.reviewStatus, note: values.reviewNote });
      commitCase(kind, record, "확인 내용과 수정 이력을 반영했습니다. 원문은 그대로 보존됩니다.");
      delete recordSession.edits[kind][form.dataset.factId];
      render();
    }
  } catch (error) { recordSession.notices[kind] = error.message; render(); }
});
document.addEventListener("change", async event => {
  const input = event.target;
  const kind = input.dataset.recordKind;
  if (!["frozen", "shield"].includes(kind)) return;
  try {
    if (input.dataset.recordInclude) {
      commitCase(kind, FinGuardRecords.setEvidenceIncluded(caseRecord(kind), input.dataset.recordInclude, input.checked), "내보낼 원문 범위를 변경했습니다. 작업 중인 원문은 삭제하지 않았습니다.");
      render();
    } else if (input.id === "record-text-file") {
      const file = input.files?.[0];
      if (!file) return;
      if (!/\.txt$/i.test(file.name) || file.size > 64000) throw new Error("64KB 이하의 UTF-8 TXT 파일만 불러올 수 있습니다.");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      if (!text.trim() || text.length > 8000 || text.includes("\u0000")) throw new Error("비어 있지 않은 텍스트 8,000자 이하만 불러올 수 있습니다.");
      recordSession.drafts[kind] = { ...recordSession.drafts[kind], text, title: recordSession.drafts[kind].title || file.name };
      recordSession.notices[kind] = "TXT 내용을 불러왔습니다. 원문 추가 버튼을 눌러 사건에 연결하세요.";
      render();
    }
  } catch (error) { recordSession.notices[kind] = error.message; render(); }
});
window.addEventListener("beforeunload", event => {
  const changed = recordSession.frozenCases.length > 0 || ["frozen", "shield"].some(kind => {
    const draft = recordSession.drafts[kind];
    return Boolean(draft.text || draft.title || Object.keys(recordSession.edits[kind]).length ||
      recordSession[kind]?.evidence.length);
  });
  if (changed) { event.preventDefault(); event.returnValue = ""; }
});
