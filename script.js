const form = document.getElementById("logForm");
const scoreValue = document.getElementById("scoreValue");
const scoreStatus = document.getElementById("scoreStatus");
const scoreNote = document.getElementById("scoreNote");
const unaccountedValue = document.getElementById("unaccountedValue");
const unaccountedStatus = document.getElementById("unaccountedStatus");
const unaccountedNote = document.getElementById("unaccountedNote");
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

const timetableGrid = document.getElementById("timetableGrid");
const timelineTicks = document.getElementById("timelineTicks");
const activityButtons = Array.from(document.querySelectorAll(".activity-btn"));
const activeActivityLabel = document.getElementById("activeActivityLabel");
const clearSelectionBtn = document.getElementById("clearSelection");
const resetScheduleBtn = document.getElementById("resetSchedule");
const tasksInput = document.getElementById("tasksInput");
const goalInput = document.getElementById("goalInput");

const totalStudy = document.getElementById("totalStudy");
const totalSocial = document.getElementById("totalSocial");
const totalEntertainment = document.getElementById("totalEntertainment");
const totalSleep = document.getElementById("totalSleep");
const totalTasks = document.getElementById("totalTasks");
const totalOther = document.getElementById("totalOther");
const totalUnaccounted = document.getElementById("totalUnaccounted");

let chartInstance = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const slotsPerHour = 1;
const totalSlots = 24 * slotsPerHour;
const schedule = Array.from({ length: totalSlots }, () => "");
const slotElements = [];

const activityKeys = [
  "study",
  "social",
  "entertainment",
  "sleep",
  "tasks",
  "other",
];

let activeActivity = "study";
let isSelecting = false;
let selectionStart = null;
let selectionEnd = null;

const indexToTime = (index) => {
  const hour = Math.floor(index / slotsPerHour);
  return `${String(hour).padStart(2, "0")}:00`;
};

const computeTotals = () => {
  const totals = {
    study: 0,
    social: 0,
    entertainment: 0,
    sleep: 0,
    tasks: 0,
    other: 0,
  };

  schedule.forEach((activity) => {
    if (activity && totals[activity] !== undefined) {
      totals[activity] += 1;
    }
  });

  const totalScheduled = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const unaccounted = Math.round((24 - totalScheduled) * 10) / 10;
  return { ...totals, unaccounted };
};

const computeScore = (data) => {
  const sleepBonus = data.sleep >= 7 && data.sleep <= 9 ? 12 : -8;
  const raw =
    50 +
    data.study * 6 +
    data.tasksCount * 4 -
    data.social * 5 -
    data.entertainment * 4 +
    sleepBonus;
  return Math.round(clamp(raw, 0, 100));
};

const scoreStatusMap = (score) => {
  if (score >= 70) {
    return { label: "High", color: "var(--success)" };
  }
  if (score >= 40) {
    return { label: "Medium", color: "var(--warning)" };
  }
  return { label: "Low", color: "var(--danger)" };
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

const updateUnaccountedUI = (unaccounted) => {
  const safeValue = Number.isFinite(unaccounted) ? unaccounted : 0;
  unaccountedValue.textContent = safeValue.toFixed(1);

  if (safeValue < 0) {
    unaccountedStatus.textContent = "Overbooked";
    unaccountedStatus.style.background = "var(--danger)";
    unaccountedStatus.style.color = "white";
    unaccountedNote.textContent = `You logged ${Math.abs(safeValue).toFixed(1)} hours over 24.`;
    return;
  }

  if (safeValue <= 2) {
    unaccountedStatus.textContent = "Tight";
    unaccountedStatus.style.background = "var(--warning)";
    unaccountedStatus.style.color = "#1c2333";
    unaccountedNote.textContent = "Almost every hour is accounted for.";
    return;
  }

  unaccountedStatus.textContent = "Open";
  unaccountedStatus.style.background = "var(--success)";
  unaccountedStatus.style.color = "white";
  unaccountedNote.textContent = "These are hours you can allocate intentionally.";
};

const updateTotalsUI = () => {
  const totals = computeTotals();
  totalStudy.textContent = `${totals.study.toFixed(1)}h`;
  totalSocial.textContent = `${totals.social.toFixed(1)}h`;
  totalEntertainment.textContent = `${totals.entertainment.toFixed(1)}h`;
  totalSleep.textContent = `${totals.sleep.toFixed(1)}h`;
  totalTasks.textContent = `${totals.tasks.toFixed(1)}h`;
  totalOther.textContent = `${totals.other.toFixed(1)}h`;
  totalUnaccounted.textContent = `${totals.unaccounted.toFixed(1)}h`;
  updateUnaccountedUI(totals.unaccounted);
};

const setSlotActivity = (index, activity) => {
  schedule[index] = activity;
  const slot = slotElements[index];
  slot.className = "time-slot";
  if (activity) {
    slot.classList.add(`activity-${activity}`);
  }
};

const clearSelectionHighlight = () => {
  slotElements.forEach((slot) => slot.classList.remove("is-selected"));
};

const highlightRange = (start, end) => {
  clearSelectionHighlight();
  const [minIndex, maxIndex] = start < end ? [start, end] : [end, start];
  for (let i = minIndex; i <= maxIndex; i += 1) {
    slotElements[i].classList.add("is-selected");
  }
};

const applyActivityToRange = (start, end, activity) => {
  const [minIndex, maxIndex] = start < end ? [start, end] : [end, start];
  for (let i = minIndex; i <= maxIndex; i += 1) {
    setSlotActivity(i, activity);
  }
};

const renderGrid = () => {
  timetableGrid.innerHTML = "";
  timelineTicks.innerHTML = "";
  slotElements.length = 0;

  for (let hour = 0; hour < 24; hour += 1) {
    const tick = document.createElement("div");
    tick.className = "timeline-tick";
    tick.textContent = `${String(hour).padStart(2, "0")}:00`;
    tick.dataset.hour = String(hour);
    tick.addEventListener("click", () => {
      const endIndex = Number(tick.dataset.hour);
      if (endIndex < 0) {
        return;
      }
      applyActivityToRange(0, endIndex, activeActivity);
      updateTotalsUI();
    });
    timelineTicks.appendChild(tick);
  }

  for (let i = 0; i < totalSlots; i += 1) {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "time-slot";
    slot.dataset.index = String(i);
    slot.setAttribute("aria-label", `${indexToTime(i)} - ${indexToTime(i + 1)}`);

    slot.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      slot.setPointerCapture(event.pointerId);
      isSelecting = true;
      selectionStart = i;
      selectionEnd = i;
      highlightRange(selectionStart, selectionEnd);
    });

    slot.addEventListener("pointerenter", () => {
      if (!isSelecting) {
        return;
      }
      selectionEnd = i;
      highlightRange(selectionStart, selectionEnd);
    });

    slot.addEventListener("click", () => {
      if (isSelecting) {
        return;
      }
      applyActivityToRange(i, i, activeActivity);
      updateTotalsUI();
    });

    timetableGrid.appendChild(slot);
    slotElements.push(slot);
  }
};

const finishSelection = () => {
  if (!isSelecting || selectionStart === null || selectionEnd === null) {
    return;
  }
  isSelecting = false;
  applyActivityToRange(selectionStart, selectionEnd, activeActivity);
  clearSelectionHighlight();
  selectionStart = null;
  selectionEnd = null;
  updateTotalsUI();
};

const setActiveActivity = (activity) => {
  activeActivity = activity;
  activityButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.activity === activity);
  });
  const activeLabel = activityButtons.find((button) => button.dataset.activity === activity);
  activeActivityLabel.textContent = activeLabel ? activeLabel.textContent.trim() : "";
};

const getFormData = () => {
  const totals = computeTotals();
  return {
    study: totals.study,
    social: totals.social,
    entertainment: totals.entertainment,
    sleep: totals.sleep,
    tasksHours: totals.tasks,
    other: totals.other,
    unaccounted: totals.unaccounted,
    tasksCount: Number(tasksInput.value) || 0,
    goal: goalInput.value.trim(),
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
  if (data.unaccounted > 4) {
    leaks.push("Large unaccounted time blocks can hide hidden leaks.");
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
  if (data.unaccounted > 3) {
    suggestions.push("Assign unaccounted hours to a clear goal or recovery.");
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

  const chartUnaccounted = Math.max(0, data.unaccounted);

  const chartData = {
    labels: ["Study", "Social", "Entertainment", "Sleep", "Tasks", "Other", "Unaccounted"],
    datasets: [
      {
        label: "Hours",
        data: [
          data.study,
          data.social,
          data.entertainment,
          data.sleep,
          data.tasksHours,
          data.other,
          chartUnaccounted,
        ],
        backgroundColor: [
          "rgba(79, 70, 229, 0.8)",
          "rgba(244, 114, 182, 0.7)",
          "rgba(245, 158, 11, 0.7)",
          "rgba(22, 163, 74, 0.7)",
          "rgba(14, 116, 144, 0.7)",
          "rgba(148, 163, 184, 0.7)",
          "rgba(59, 130, 246, 0.65)",
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
      tasksHours: data.tasksHours,
      otherHours: data.other,
      unaccountedHours: data.unaccounted,
      tasksCompleted: data.tasksCount,
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

const resetDashboard = () => {
  scoreValue.textContent = "--";
  scoreStatus.textContent = "Not rated";
  scoreStatus.style.background = "rgba(28, 35, 51, 0.08)";
  scoreStatus.style.color = "var(--ink)";
  scoreNote.textContent = "Log your day to see a score.";
  heroScore.textContent = "--";
  heroStatus.textContent = "Not rated";
  heroTrend.textContent = "Awaiting data";
  leakInsight.textContent = "No analysis yet.";
  behaviorInsight.textContent = "Awaiting your data.";
  suggestionsList.innerHTML = "<li>Complete a log to unlock suggestions.</li>";
  chartNote.textContent = "This chart updates when you calculate a score.";

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
};

activityButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveActivity(button.dataset.activity);
  });
});

clearSelectionBtn.addEventListener("click", () => {
  selectionStart = null;
  selectionEnd = null;
  clearSelectionHighlight();
});

resetScheduleBtn.addEventListener("click", () => {
  schedule.fill("");
  slotElements.forEach((slot, index) => {
    slot.className = "time-slot";
    schedule[index] = "";
  });
  tasksInput.value = "";
  goalInput.value = "";
  updateTotalsUI();
  resetDashboard();
});

document.addEventListener("pointerup", finishSelection);
document.addEventListener("pointercancel", finishSelection);

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
  schedule.fill("");
  const setRange = (startHour, endHour, activity) => {
    const startIndex = Math.round(startHour * slotsPerHour);
    const endIndex = Math.round(endHour * slotsPerHour);

    if (endIndex >= startIndex) {
      for (let i = startIndex; i < endIndex; i += 1) {
        setSlotActivity(i, activity);
      }
      return;
    }

    for (let i = startIndex; i < totalSlots; i += 1) {
      setSlotActivity(i, activity);
    }
    for (let i = 0; i < endIndex; i += 1) {
      setSlotActivity(i, activity);
    }
  };

  setRange(0, 7, "sleep");
  setRange(7, 8, "other");
  setRange(8, 11.5, "study");
  setRange(12, 13, "social");
  setRange(13, 15, "tasks");
  setRange(15, 16.5, "entertainment");
  setRange(22.5, 24, "sleep");

  tasksInput.value = "5";
  goalInput.value = "Finish the project storyboard";
  updateTotalsUI();
});

renderGrid();
setActiveActivity(activeActivity);
updateTotalsUI();
