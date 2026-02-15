const form = document.getElementById("logForm");
const scoreValue = document.getElementById("scoreValue");
const scoreStatus = document.getElementById("scoreStatus");
const scoreNote = document.getElementById("scoreNote");
const leakInsight = document.getElementById("leakInsight");
const behaviorInsight = document.getElementById("behaviorInsight");
const suggestionsList = document.getElementById("suggestionsList");
const heroScore = document.getElementById("heroScore");
const heroStatus = document.getElementById("heroStatus");
const heroTrend = document.getElementById("heroTrend");
const chartNote = document.getElementById("chartNote");

const scrollToForm = document.getElementById("scrollToForm");
const demoFill = document.getElementById("demoFill");
const generateInsightsBtn = document.getElementById("generateInsights");

let chartInstance = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const scoreStatusMap = (score) => {
  if (score >= 70) {
    return { label: "High", color: "var(--success)" };
  }
  if (score >= 40) {
    return { label: "Medium", color: "var(--warning)" };
  }
  return { label: "Low", color: "var(--danger)" };
};

const computeScore = (data) => {
  const sleepBonus = data.sleep >= 7 && data.sleep <= 9 ? 12 : -8;
  const raw =
    50 +
    data.study * 6 +
    data.tasks * 4 -
    data.social * 5 -
    data.entertainment * 4 +
    sleepBonus;
  return Math.round(clamp(raw, 0, 100));
};

const updateScoreUI = (score) => {
  const status = scoreStatusMap(score);
  scoreValue.textContent = score;
  scoreStatus.textContent = status.label;
  scoreStatus.style.background = status.color;
  scoreStatus.style.color = "white";
  scoreNote.textContent =
    status.label === "High"
      ? "Great focus today. Keep the momentum consistent."
      : status.label === "Medium"
      ? "Solid progress. Tighten one or two habits for a jump."
      : "Focus on reducing leaks and protecting deep work blocks.";

  heroScore.textContent = score;
  heroStatus.textContent = status.label;
  heroTrend.textContent =
    status.label === "High"
      ? "Moving up"
      : status.label === "Medium"
      ? "Stabilizing"
      : "Needs lift";
};

const getFormData = () => {
  const formData = new FormData(form);
  return {
    study: Number(formData.get("study")) || 0,
    social: Number(formData.get("social")) || 0,
    entertainment: Number(formData.get("entertainment")) || 0,
    sleep: Number(formData.get("sleep")) || 0,
    tasks: Number(formData.get("tasks")) || 0,
    goal: (formData.get("goal") || "").toString().trim(),
  };
};

const createLocalInsights = (data, score) => {
  const leaks = [];
  if (data.social + data.entertainment >= 4) {
    leaks.push("Digital leisure is taking a large slice of the day.");
  }
  if (data.sleep < 6) {
    leaks.push("Sleep is below recovery range, which reduces focus.");
  }
  if (!leaks.length) {
    leaks.push("No major leaks detected. Keep monitoring small distractions.");
  }

  const behavior =
    score >= 70
      ? "Your habits show strong intentional focus with healthy recovery."
      : score >= 40
      ? "You balance progress and distraction. Tightening one routine helps."
      : "Focus time is being diluted. Rebuild a daily structure.";

  const suggestions = [];
  if (data.social > 1.5) {
    suggestions.push("Batch social media into two short windows.");
  }
  if (data.entertainment > 2) {
    suggestions.push("Swap 30 minutes of entertainment for a quick win task.");
  }
  if (data.sleep < 7) {
    suggestions.push("Protect a consistent bedtime to recover focus.");
  }
  suggestions.push(`Prioritize: ${data.goal || "your top goal"}.`);

  return { leaks: leaks.join(" "), behavior, suggestions };
};

const updateInsightsUI = (insights) => {
  leakInsight.textContent = insights.leaks;
  behaviorInsight.textContent = insights.behavior;
  suggestionsList.innerHTML = "";
  insights.suggestions.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    suggestionsList.appendChild(li);
  });
};

const updateChart = (data) => {
  if (!window.Chart) {
    chartNote.textContent = "Chart.js is unavailable.";
    return;
  }

  const chartData = {
    labels: ["Study", "Social", "Entertainment", "Sleep", "Tasks"],
    datasets: [
      {
        label: "Hours or count",
        data: [data.study, data.social, data.entertainment, data.sleep, data.tasks],
        backgroundColor: [
          "rgba(79, 70, 229, 0.8)",
          "rgba(244, 114, 182, 0.7)",
          "rgba(245, 158, 11, 0.7)",
          "rgba(22, 163, 74, 0.7)",
          "rgba(14, 116, 144, 0.7)",
        ],
        borderRadius: 8,
      },
    ],
  };

  if (chartInstance) {
    chartInstance.data = chartData;
    chartInstance.update();
    return;
  }

  const ctx = document.getElementById("balanceChart").getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
};

const requestAiInsights = async (data, score) => {
  const payload = {
    score,
    input: {
      studyHours: data.study,
      socialHours: data.social,
      entertainmentHours: data.entertainment,
      sleepHours: data.sleep,
      tasksCompleted: data.tasks,
      goal: data.goal,
    },
  };

  try {
    const response = await fetch("/api/insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("AI request failed");
    }

    const result = await response.json();
    if (result?.insights) {
      return result.insights;
    }
    return createLocalInsights(data, score);
  } catch (error) {
    return createLocalInsights(data, score);
  }
};

const handleSubmit = async (event) => {
  event.preventDefault();
  const data = getFormData();
  const score = computeScore(data);
  updateScoreUI(score);
  updateChart(data);
  chartNote.textContent = "Chart updated with your latest log.";

  const insights = await requestAiInsights(data, score);
  updateInsightsUI(insights);
};

form.addEventListener("submit", handleSubmit);

generateInsightsBtn.addEventListener("click", async () => {
  const data = getFormData();
  const score = computeScore(data);
  updateScoreUI(score);
  const insights = await requestAiInsights(data, score);
  updateInsightsUI(insights);
});

scrollToForm.addEventListener("click", () => {
  document.getElementById("formSection").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

demoFill.addEventListener("click", () => {
  form.study.value = 4.5;
  form.social.value = 2;
  form.entertainment.value = 1.5;
  form.sleep.value = 7.5;
  form.tasks.value = 5;
  form.goal.value = "Finish the project storyboard";
});
