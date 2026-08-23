const pitchCases = document.querySelector("#pitch-cases");
const pitchMessage = document.querySelector("#pitch-message");
const pitchCaseId = document.querySelector("#pitch-case-id");
const pitchResult = document.querySelector("#pitch-result");
const pitchEmpty = document.querySelector("#pitch-empty");
const pitchResultBody = document.querySelector("#pitch-result-body");
const pitchResultTitle = document.querySelector("#pitch-result-title");
const pitchResultLabel = document.querySelector("#pitch-result-label");
const sequenceStart = document.querySelector("#sequence-start");
const sequenceStatus = document.querySelector("#sequence-status");
const caseCount = document.querySelector("#case-count");
const friendIdea = document.querySelector("#friend-idea");
const friendIdeaPreview = document.querySelector("#friend-idea-preview");

const labelTitles = {
  DANGER: "즉시 행동을 멈추세요",
  INJECTION: "입력 안의 지시문을 격리하세요",
  CAUTION: "추가 행동 전 확인이 필요합니다",
  LOW_RISK_NOT_PROOF: "위험 신호는 낮지만 안전을 확정하지 않습니다",
  ABSTAIN: "판단을 보류합니다",
};

let cases = [];
let activeCaseId = "";
let sequenceTimer = null;

function setSequenceStatus(message) {
  sequenceStatus.textContent = message;
}

function renderChips(container, values, categoryMode = false) {
  container.replaceChildren();
  if (!values.length) {
    const empty = document.createElement("span");
    empty.className = "pitch-chip";
    empty.textContent = "뚜렷한 신호 없음";
    container.append(empty);
    return;
  }
  for (const value of values) {
    const chip = document.createElement("span");
    chip.className = "pitch-chip";
    chip.textContent = categoryMode ? value.text : value;
    if (categoryMode) {
      const category = document.createElement("small");
      category.textContent = value.category;
      chip.append(category);
    }
    container.append(chip);
  }
}

function showError(message) {
  pitchCaseId.textContent = "ERROR";
  pitchMessage.textContent = message;
  pitchMessage.classList.add("empty-message");
  pitchResult.classList.add("is-empty");
  pitchEmpty.classList.remove("is-hidden");
  pitchResultBody.classList.add("is-hidden");
  pitchResultTitle.textContent = "데모 서버를 확인해 주세요";
  pitchResultLabel.textContent = "ERROR";
  pitchResultLabel.className = "result-pill danger";
  setSequenceStatus("서버 응답을 받지 못했습니다.");
}

function renderAnalysis(analysis) {
  const labelClass = analysis.label.toLowerCase();
  pitchResult.classList.remove("is-empty");
  pitchEmpty.classList.add("is-hidden");
  pitchResultBody.classList.remove("is-hidden");
  pitchResultTitle.textContent = labelTitles[analysis.label] || "분석 결과";
  pitchResultLabel.textContent = analysis.label;
  pitchResultLabel.className = `result-pill ${labelClass}`;
  document.querySelector("#pitch-risk").textContent = Number(analysis.risk_score).toFixed(2);
  document.querySelector("#pitch-injection").textContent = Number(analysis.injection_score).toFixed(2);
  document.querySelector("#pitch-confidence").textContent = Number(analysis.confidence).toFixed(2);
  document.querySelector("#pitch-safe-action").textContent = analysis.safe_action;
  renderChips(document.querySelector("#pitch-evidence"), analysis.evidence || [], true);
  renderChips(document.querySelector("#pitch-reasons"), analysis.reason_codes || []);
}

async function analyzeCase(item) {
  activeCaseId = item.id;
  document.querySelectorAll(".case-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.caseId === item.id);
  });
  pitchCaseId.textContent = item.id.toUpperCase();
  pitchMessage.textContent = item.text;
  pitchMessage.classList.remove("empty-message");
  setSequenceStatus(`${item.title} · 분석 중`);
  try {
    const response = await fetch("/v1/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: item.text }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || payload.error || "분석에 실패했습니다.");
    renderAnalysis(payload.analysis);
    setSequenceStatus(`${item.title} · 결과 확인`);
  } catch (error) {
    showError(error.message);
  }
}

function renderCases() {
  pitchCases.replaceChildren();
  caseCount.textContent = String(cases.length).padStart(2, "0");
  for (const item of cases) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "case-button";
    button.dataset.caseId = item.id;
    button.textContent = item.title;
    const label = document.createElement("small");
    label.textContent = item.label;
    button.append(label);
    button.addEventListener("click", () => {
      stopSequence();
      analyzeCase(item);
    });
    pitchCases.append(button);
  }
}

function stopSequence() {
  if (sequenceTimer) {
    window.clearTimeout(sequenceTimer);
    sequenceTimer = null;
  }
  sequenceStart.textContent = "90초 데모 시작 ▶";
}

function runSequence(index = 0) {
  if (!cases.length || index >= cases.length) {
    setSequenceStatus("전체 케이스가 끝났습니다. 이제 문장을 직접 테스트해보세요.");
    sequenceStart.textContent = "90초 데모 다시 시작 ▶";
    sequenceTimer = null;
    return;
  }
  const item = cases[index];
  analyzeCase(item);
  sequenceStart.textContent = "진행 중 · Esc로 멈춤";
  sequenceTimer = window.setTimeout(() => runSequence(index + 1), 4300);
}

function startSequence() {
  stopSequence();
  document.querySelector("#pitch-demo").scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => runSequence(), 450);
}

function setupProgressRail() {
  const sections = [...document.querySelectorAll("[data-section]")];
  const links = [...document.querySelectorAll("[data-progress]")];
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (!visible) return;
    links.forEach((link) => link.classList.toggle("is-active", link.dataset.progress === visible.target.dataset.section));
  }, { threshold: 0.35 });
  sections.forEach((section) => observer.observe(section));
}

sequenceStart.addEventListener("click", startSequence);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") stopSequence();
  if (event.code === "Space" && !["INPUT", "TEXTAREA", "BUTTON"].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    startSequence();
  }
});
friendIdea.addEventListener("input", () => {
  const idea = friendIdea.value.trim();
  friendIdeaPreview.textContent = idea ? `“${idea}”도 문제 순간·AI 입력·행동 변화 기준으로 함께 비교합니다.` : "문제 순간과 첫 사용자를 함께 적으면 비교가 쉬워집니다.";
});

setupProgressRail();
fetch("/v1/demo-cases")
  .then((response) => response.json())
  .then((payload) => {
    cases = Array.isArray(payload.cases) ? payload.cases : [];
    renderCases();
    if (!cases.length) showError("데모 케이스가 없습니다.");
  })
  .catch(() => showError("데모 케이스를 불러오지 못했습니다."));
