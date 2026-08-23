const messageInput = document.querySelector("#message");
const charCount = document.querySelector("#char-count");
const analyzeButton = document.querySelector("#analyze");
const demoCases = document.querySelector("#demo-cases");
const resultPanel = document.querySelector("#result-panel");
const emptyState = document.querySelector("#empty-state");
const resultBody = document.querySelector("#result-body");
const resultTitle = document.querySelector("#result-title");
const resultLabel = document.querySelector("#result-label");

const labelTitles = {
  DANGER: "즉시 행동을 멈추세요",
  INJECTION: "입력 안의 지시문을 격리하세요",
  CAUTION: "추가 행동 전 확인이 필요합니다",
  LOW_RISK_NOT_PROOF: "위험 신호는 낮지만 안전을 확정하지 않습니다",
  ABSTAIN: "판단을 보류합니다",
};

messageInput.addEventListener("input", () => {
  charCount.textContent = `${messageInput.value.length.toLocaleString()} / 12,000`;
});

function renderDemoCases(cases) {
  demoCases.replaceChildren();
  for (const item of cases) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "demo-case";
    button.textContent = item.title;
    button.addEventListener("click", () => {
      messageInput.value = item.text;
      messageInput.dispatchEvent(new Event("input"));
      analyze();
    });
    demoCases.append(button);
  }
}

function renderList(container, values, className, withCategory = false) {
  container.replaceChildren();
  if (!values.length) {
    const empty = document.createElement("span");
    empty.className = "disclaimer";
    empty.textContent = "뚜렷한 신호가 발견되지 않았습니다.";
    container.append(empty);
    return;
  }
  for (const value of values) {
    const chip = document.createElement("span");
    chip.className = className;
    chip.textContent = withCategory ? value.text : value;
    if (withCategory) {
      const category = document.createElement("small");
      category.textContent = value.category;
      chip.append(category);
    }
    container.append(chip);
  }
}

function renderAnalysis(analysis) {
  resultPanel.classList.remove("is-empty");
  emptyState.classList.add("hidden");
  resultBody.classList.remove("hidden");
  resultTitle.textContent = labelTitles[analysis.label] || "분석 결과";
  resultLabel.textContent = analysis.label;
  resultLabel.className = `result-label ${analysis.label.toLowerCase()}`;
  document.querySelector("#risk-score").textContent = analysis.risk_score.toFixed(2);
  document.querySelector("#injection-score").textContent = analysis.injection_score.toFixed(2);
  document.querySelector("#confidence").textContent = analysis.confidence.toFixed(2);
  document.querySelector("#safe-action").textContent = analysis.safe_action;
  document.querySelector("#disclaimer").textContent = analysis.disclaimer;
  renderList(document.querySelector("#evidence"), analysis.evidence, "evidence-chip", true);
  renderList(document.querySelector("#reasons"), analysis.reason_codes, "reason-chip");
}

async function analyze() {
  const text = messageInput.value.trim();
  if (!text) {
    messageInput.focus();
    return;
  }
  analyzeButton.disabled = true;
  analyzeButton.textContent = "분석 중…";
  try {
    const response = await fetch("/v1/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || payload.error || "분석에 실패했습니다.");
    renderAnalysis(payload.analysis);
  } catch (error) {
    resultTitle.textContent = "요청을 처리하지 못했습니다";
    resultLabel.textContent = "ERROR";
    resultLabel.className = "result-label danger";
    emptyState.classList.remove("hidden");
    resultBody.classList.add("hidden");
    emptyState.querySelector("p").textContent = error.message;
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.innerHTML = "안전 분석하기 <span>→</span>";
  }
}

analyzeButton.addEventListener("click", analyze);
messageInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") analyze();
});

fetch("/v1/demo-cases")
  .then((response) => response.json())
  .then((payload) => renderDemoCases(payload.cases || []))
  .catch(() => {
    demoCases.textContent = "데모 케이스를 불러오지 못했습니다.";
  });
