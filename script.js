const navItems = document.querySelectorAll(".topbar-nav .nav-item");
const screens = document.querySelectorAll(".screen");
const topbar = document.getElementById("topbar");

let appData = {
  cycle: null,
  expenses: [],
};

async function syncData() {
  try {
    const cycleRes = await apiGetCycle();
    if (cycleRes && cycleRes.status === "success" && cycleRes.data) {
      appData.cycle = {
        _id: cycleRes.data._id,
        allowance: cycleRes.data.totalAmount,
        cycleName: cycleRes.data.cycleName,
        startDate: cycleRes.data.startDate,
        endDate: cycleRes.data.endDate,
      };

      const transRes = await apiGetTransactions();
      if (transRes && transRes.status === "success" && transRes.data) {
        appData.expenses = transRes.data
          .map((t) => ({
            id: t._id,
            amount: t.amount,
            category: t.category,
            note: t.note,
            date: t.timestamp,
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
      } else {
        appData.expenses = [];
      }
    } else {
      appData.cycle = null;
      appData.expenses = [];
    }
  } catch (error) {
    console.error("Data Sync Error:", error);
  }
}

function navigateTo(targetId) {
  const navContainer = document.querySelector(".topbar-nav");
  if (targetId === "setup") {
    navContainer.style.display = "none";
  } else {
    navContainer.style.display = "flex";
  }
  navItems.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.target === targetId) btn.classList.add("active");
  });

  screens.forEach((screen) => {
    screen.classList.add("hidden");
    if (screen.id === targetId) screen.classList.remove("hidden");
  });

  if (targetId === "dashboard") loadDashboard();
  if (targetId === "history") loadHistory();
  if (targetId === "settings") loadSettings();
}

navItems.forEach((btn) => {
  if (btn.dataset.target)
    btn.addEventListener("click", () => navigateTo(btn.dataset.target));
});

const rememberedUser = localStorage.getItem("budget_username");

if (rememberedUser) {
  document.getElementById("welcome-username").textContent = rememberedUser;
  showAppChrome(rememberedUser);
  navigateTo("lock-screen");
} else {
  navigateTo("login-screen");
}

function showAppChrome(username) {
  topbar.classList.remove("hidden");
  document.getElementById("nav-username").textContent = username;
}

function hideAppChrome() {
  topbar.classList.add("hidden");
}

document.getElementById("go-to-signup").addEventListener("click", (e) => {
  e.preventDefault();
  navigateTo("signup-screen");
});
document.getElementById("go-to-login").addEventListener("click", (e) => {
  e.preventDefault();
  navigateTo("login-screen");
});
document.getElementById("switch-account").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("budget_username");
  localStorage.removeItem("token");
  hideAppChrome();
  navigateTo("login-screen");
});

document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const userName = document.getElementById("signup-username").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const pin = document.getElementById("signup-pin").value;
  const data = await apiRegister(userName, email, password, pin);
  if (data.status == "success") {
    localStorage.setItem("token", data.data);
    e.target.reset();
    showAppChrome(userName);
    alert("Account created! Let's set up your first budget cycle.");
    navigateTo("setup");
  } else {
    alert(data.message);
  }
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const data = await apiLogin(email, password);
  if (data.status == "success") {
    localStorage.setItem("token", data.data);
    const user = await apiGetUser();
    document.getElementById("welcome-username").textContent =
      user.data.userName;
    localStorage.setItem("budget_username", user.data.userName);
    e.target.reset();
    navigateTo("lock-screen");
  } else {
    alert(data.message);
  }
});

document
  .getElementById("pin-login-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const pin = document.getElementById("unlock-pin").value;
    const data = await apiCheckPin(pin);
    if (data.status == "success") {
      e.target.reset();
      const user = await apiGetUser();
      showAppChrome(user.data.userName);

      await syncData();

      if (appData.cycle) {
        navigateTo("dashboard");
      } else {
        navigateTo("setup");
      }
    } else {
      alert(data.message);
    }
  });

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("budget_username");
  localStorage.removeItem("token");
  hideAppChrome();
  navigateTo("login-screen");
});

document.querySelectorAll(".cat-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".cat-btn")
      .forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    document.getElementById("expense-category").value = btn.dataset.value;
  });
});

const warningOverlay = document.getElementById("warning-modal-overlay");
const warningOkBtn = document.getElementById("warning-modal-ok");

warningOkBtn.addEventListener("click", () => {
  warningOverlay.classList.add("hidden");
});

function showWarningModal(type, data) {
  const icon = document.getElementById("warning-modal-icon");
  const title = document.getElementById("warning-modal-title");
  const body = document.getElementById("warning-modal-body");
  const btn = document.getElementById("warning-modal-ok");

  if (type === "daily") {
    icon.textContent = "📅";
    title.textContent = "Daily Limit Exceeded";
    const overBy = Math.abs(Math.floor(data.dailyRemaining));
    const newDailyTarget =
      data.remainingTotal > 0
        ? Math.floor(data.remainingTotal / Math.max(data.daysLeft - 1, 1))
        : 0;
    body.innerHTML = `
      You've gone <strong>${overBy} EGP</strong> over today's safe daily limit of
      <strong>${Math.floor(data.dailyTarget)} EGP</strong>.<br><br>
      Because you overspent today, your budget will be redistributed across the
      remaining <strong>${data.daysLeft - 1} day${data.daysLeft - 1 !== 1 ? "s" : ""}</strong>.
      Your new daily target will be approximately
      <strong>${newDailyTarget} EGP/day</strong>.
    `;
    btn.className = "warning-modal-btn";
    btn.textContent = "Understood";
  } else {
    icon.textContent = "🚨";
    title.textContent = "Total Budget Exceeded";
    const overBy = Math.abs(Math.floor(data.remaining));
    body.innerHTML = `
      You've exceeded your total budget of
      <strong>${Math.floor(data.allowance)} EGP</strong> by
      <strong>${overBy} EGP</strong>.<br><br>
      You are now spending beyond your set allowance for this cycle.
      Consider reviewing your expenses or adjusting your budget in Settings.
    `;
    btn.className = "warning-modal-btn danger-btn";
    btn.textContent = "I understand";
  }

  warningOverlay.classList.remove("hidden");
}

function getCategoryIcon(category) {
  const icons = {
    food: "🍕",
    transport: "🚌",
    entertainment: "🎬",
    education: "📚",
    health: "💊",
    shopping: "🛍️",
    cafe: "☕",
    other: "···",
  };
  return icons[category] || "💰";
}

function formatDate(dateString) {
  const options = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleDateString("en-US", options);
}

const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");

startDateInput.addEventListener("change", () => {
  endDateInput.min = startDateInput.value;
  if (endDateInput.value && endDateInput.value < startDateInput.value) {
    endDateInput.value = "";
  }
});

document.getElementById("setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const start = new Date(startDateInput.value);
  const end = new Date(endDateInput.value);

  if (end < start) {
    alert("Invalid cycle: The end date must be after the start date.");
    return;
  }

  const amount = parseFloat(document.getElementById("allowance").value);
  const name = document.getElementById("cycle-name").value || "My Budget";

  const res = await apiInitCycle(
    amount,
    name,
    startDateInput.value,
    endDateInput.value,
  );

  if (res.status === "success") {
    await syncData();
    alert("Cycle started!");
    e.target.reset();
    navigateTo("dashboard");
  } else {
    alert(res.message);
  }
});

document.getElementById("log-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!appData.cycle) {
    alert("Please set up a budget cycle first!");
    navigateTo("setup");
    return;
  }

  const amount = parseFloat(document.getElementById("expense-amount").value);
  const category = document.getElementById("expense-category").value;
  const note = document.getElementById("expense-note").value || "Expense";

  const res = await apiAddTransaction(amount, category, note);

  if (res.status === "success") {
    await syncData();
    const modalShownKey = `masroofy_modal_shown_${appData.cycle.startDate}`;
    sessionStorage.removeItem(modalShownKey);

    alert("Expense logged!");
    e.target.reset();
    navigateTo("dashboard");
  } else {
    alert(res.message);
  }
});

function loadDashboard() {
  if (!appData.cycle) return;
  document.getElementById("dashboard-cycle-title").textContent =
    appData.cycle.cycleName || "Active Budget";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(appData.cycle.endDate);
  end.setHours(23, 59, 59, 999);

  const totalSpent = appData.expenses.reduce((sum, exp) => sum + exp.amount, 0);

  let displayRemaining = appData.cycle.allowance - totalSpent;
  const isTotalOverspent = displayRemaining < 0;

  const timeDiffToEnd = end.getTime() - today.getTime();
  let daysLeftIncludingToday = Math.ceil(timeDiffToEnd / (1000 * 3600 * 24));
  if (daysLeftIncludingToday < 1) daysLeftIncludingToday = 1;

  const todayStart = new Date(today);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const spentToday = appData.expenses
    .filter((exp) => {
      const d = new Date(exp.date);
      return d >= todayStart && d <= todayEnd;
    })
    .reduce((sum, exp) => sum + exp.amount, 0);

  const spentBeforeToday = totalSpent - spentToday;
  const remainingBeforeToday = appData.cycle.allowance - spentBeforeToday;

  const dailyTarget = Math.max(
    0,
    remainingBeforeToday / daysLeftIncludingToday,
  );
  const dailyRemaining = dailyTarget - spentToday;
  const isDailyOverspent = dailyRemaining < 0;

  const dailyPct = dailyTarget > 0 ? spentToday / dailyTarget : 1;
  const totalPct =
    appData.cycle.allowance > 0 ? totalSpent / appData.cycle.allowance : 1;

  function getGradientColor(pct) {
    const p = Math.min(Math.max(pct, 0), 1);
    const hue = Math.floor(156 - p * 156);
    return `hsl(${hue}, 50%, 49%)`;
  }

  const dailyColor = isDailyOverspent
    ? "var(--danger-color)"
    : getGradientColor(dailyPct);
  const totalColor = isTotalOverspent
    ? "var(--danger-color)"
    : getGradientColor(totalPct);

  const statDaily = document.getElementById("stat-daily");
  if (isDailyOverspent) {
    statDaily.classList.add("overspent");
  } else {
    statDaily.classList.remove("overspent");
  }

  document.getElementById("daily-limit-target").textContent =
    `Limit: ${Math.floor(dailyTarget)} EGP`;
  const dailyLimitEl = document.getElementById("daily-limit-display");
  dailyLimitEl.textContent = `${Math.floor(dailyRemaining)} EGP`;
  dailyLimitEl.style.color = dailyColor;

  const dailyBar = document.getElementById("daily-bar");
  dailyBar.style.width = `${Math.min(dailyPct * 100, 100)}%`;
  dailyBar.style.backgroundColor = dailyColor;

  const statTotal = document.getElementById("stat-remaining");
  if (isTotalOverspent) {
    statTotal.classList.add("overspent");
  } else {
    statTotal.classList.remove("overspent");
  }

  const totalRemainingEl = document.getElementById("remaining-balance-display");
  totalRemainingEl.textContent = `${Math.floor(displayRemaining)} EGP`;
  totalRemainingEl.style.color = totalColor;

  const balanceBar = document.getElementById("balance-bar");
  balanceBar.style.width = `${Math.min(totalPct * 100, 100)}%`;
  balanceBar.style.backgroundColor = totalColor;

  document.getElementById("allowance-display").textContent =
    `of ${appData.cycle.allowance} EGP`;
  document.getElementById("days-remaining-display").textContent =
    daysLeftIncludingToday;

  const endFormat = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  document.getElementById("cycle-dates-display").textContent =
    `cycle ends ${endFormat}`;

  const thresholdPercent = localStorage.getItem("budget_warning_percent") || 80;
  const banner = document.getElementById("warning-banner");
  const usedPercent = Math.min(
    (totalSpent / appData.cycle.allowance) * 100,
    100,
  );

  if (usedPercent >= thresholdPercent) {
    banner.textContent = `You have used ${usedPercent.toFixed(0)}% of your allowance.`;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
  const modalShownKey = `masroofy_modal_shown_${appData.cycle.startDate}`;
  const shownFlags = JSON.parse(sessionStorage.getItem(modalShownKey) || "{}");

  if (isTotalOverspent && !shownFlags.total) {
    shownFlags.total = true;
    sessionStorage.setItem(modalShownKey, JSON.stringify(shownFlags));
    showWarningModal("total", {
      remaining: displayRemaining,
      allowance: appData.cycle.allowance,
    });
  } else if (isDailyOverspent && !isTotalOverspent && !shownFlags.daily) {
    shownFlags.daily = true;
    sessionStorage.setItem(modalShownKey, JSON.stringify(shownFlags));
    showWarningModal("daily", {
      dailyRemaining,
      dailyTarget,
      daysLeft: daysLeftIncludingToday,
      remainingTotal: displayRemaining,
    });
  }

  const recentList = document.getElementById("recent-tx-list");
  recentList.innerHTML = "";

  if (appData.expenses.length === 0) {
    recentList.innerHTML =
      '<p style="color:var(--text-muted); font-size:13px; text-align:center; padding: 20px 0;">No transactions yet.</p>';
  } else {
    appData.expenses.forEach((exp) => {
      const noteHtml =
        exp.note && exp.note !== "Expense" ? ` · ${exp.note}` : "";
      recentList.innerHTML += `
        <div class="tx-item">
          <div class="tx-icon">${getCategoryIcon(exp.category)}</div>
          <div style="flex:1;">
             <div class="tx-name">${exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}</div>
             <div class="tx-date">${formatDate(exp.date)}${noteHtml}</div>
          </div>
          <div class="tx-amount negative">−${exp.amount} EGP</div>
        </div>
      `;
    });
  }

  renderDynamicDonut();
}

function renderDynamicDonut() {
  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  const totals = {
    food: 0,
    transport: 0,
    entertainment: 0,
    education: 0,
    health: 0,
    shopping: 0,
    cafe: 0,
    other: 0,
  };
  let grandTotal = 0;

  appData.expenses.forEach((exp) => {
    if (totals[exp.category] !== undefined) {
      totals[exp.category] += exp.amount;
    } else {
      totals.other += exp.amount;
    }
    grandTotal += exp.amount;
  });

  if (grandTotal === 0) {
    for (const cat in totals) {
      const circle = document.getElementById(`circle-${cat}`);
      if (circle) {
        circle.setAttribute("stroke-dasharray", `0 ${circumference}`);
        circle.style.opacity = "0";
      }
    }
    return;
  }

  let currentOffset = 0;
  for (const [category, amount] of Object.entries(totals)) {
    const circle = document.getElementById(`circle-${category}`);
    if (!circle) continue;

    if (amount === 0) {
      circle.setAttribute("stroke-dasharray", `0 ${circumference}`);
      circle.style.opacity = "0";
    } else {
      circle.style.opacity = "1";
      circle.style.cursor = "pointer";

      const dashLength = (amount / grandTotal) * circumference;
      const gapLength = circumference - dashLength;

      circle.setAttribute(
        "stroke-dasharray",
        `${dashLength.toFixed(1)} ${gapLength.toFixed(1)}`,
      );
      circle.setAttribute("stroke-dashoffset", currentOffset.toFixed(1));
      currentOffset -= dashLength;

      const percent = ((amount / grandTotal) * 100).toFixed(1);
      let titleElement = circle.querySelector("title");
      if (!titleElement) {
        titleElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "title",
        );
        circle.appendChild(titleElement);
      }
      const catName = category.charAt(0).toUpperCase() + category.slice(1);
      titleElement.textContent = `${catName}: ${percent}%`;
    }
  }
}

function loadHistory() {
  const historyList = document.getElementById("transaction-list");
  historyList.innerHTML = "";

  if (appData.expenses.length === 0) {
    historyList.innerHTML =
      '<p style="color:var(--text-muted); text-align:center; margin-top: 40px;">Your history is empty.</p>';
    return;
  }

  appData.expenses.forEach((exp) => {
    historyList.innerHTML += `
      <div class="history-item" id="tx-${exp.id}">
        <div class="tx-icon">${getCategoryIcon(exp.category)}</div>
        <div style="flex:1;">
          <div class="tx-name">${exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}</div>
          <div class="tx-date">${formatDate(exp.date)} · ${exp.note}</div>
        </div>
        <div class="history-item-actions">
          <span class="tx-amount negative" style="min-width:80px;text-align:right;">−${exp.amount} EGP</span>
          <button class="btn-danger" style="padding:8px 14px;font-size:13px;" onclick="deleteTransaction('${exp.id}')">Delete</button>
        </div>
      </div>
    `;
  });
}

window.deleteTransaction = async function (id) {
  if (confirm("Delete this expense?")) {
    const res = await apiDeleteTransaction(id);
    if (res.status === "success") {
      await syncData();
      loadHistory();
    } else {
      alert(res.message);
    }
  }
};

function loadSettings() {
  const nameEl = document.getElementById("settings-cycle-name");
  const detailsEl = document.getElementById("settings-cycle-details");
  const badgeEl = document.getElementById("settings-cycle-badge");

  if (appData.cycle) {
    nameEl.textContent = appData.cycle.cycleName || "Active Budget";
    const start = new Date(appData.cycle.startDate).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" },
    );
    const end = new Date(appData.cycle.endDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    detailsEl.textContent = `${start} → ${end} · ${appData.cycle.allowance} EGP`;
    badgeEl.style.display = "inline-block";
  } else {
    nameEl.textContent = "No active cycle";
    detailsEl.textContent = "Go to Setup to initialize a budget";
    badgeEl.style.display = "none";
  }
}

document
  .getElementById("avatar-upload")
  .addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const base64Image = event.target.result;
        localStorage.setItem("budget_avatar", base64Image);
        document.getElementById("nav-avatar").innerHTML =
          `<img src="${base64Image}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        alert("Profile picture updated!");
      };
      reader.readAsDataURL(file);
    }
  });

document.getElementById("update-username-btn").addEventListener("click", () => {
  const newUsername = document.getElementById("settings-username").value;
  if (newUsername.trim()) {
    localStorage.setItem("budget_username", newUsername);
    document.getElementById("nav-username").textContent = newUsername;
    document.getElementById("welcome-username").textContent = newUsername;

    if (!localStorage.getItem("budget_avatar")) {
      document.getElementById("nav-avatar").textContent = newUsername
        .slice(0, 2)
        .toUpperCase();
    }
    alert("Username updated successfully!");
    document.getElementById("settings-username").value = "";
  }
});

document.getElementById("update-warning-btn").addEventListener("click", () => {
  const newPercent = document.getElementById("settings-warning-percent").value;
  if (newPercent && newPercent > 0 && newPercent <= 100) {
    localStorage.setItem("budget_warning_percent", newPercent);
    alert(`Warning threshold set to ${newPercent}%`);
    loadDashboard();
  }
});

document
  .getElementById("reset-cycle-btn")
  .addEventListener("click", async () => {
    if (
      confirm(
        "Are you sure you want to delete the active cycle and ALL expenses?",
      )
    ) {
      if (appData.cycle && appData.cycle._id) {
        await apiDeleteCycle(appData.cycle._id);
      }
      await syncData();
      alert("Cycle reset!");
      navigateTo("setup");
    }
  });

fastLogin();
