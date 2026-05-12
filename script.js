// ─────────────────────────────────────────────
// navigation setting up
// Grab all the nav buttons and screen sections
// from the HTML so we can switch between them.
// ─────────────────────────────────────────────
const navItems = document.querySelectorAll(".topbar-nav .nav-item");
const screens = document.querySelectorAll(".screen");
const topbar = document.getElementById("topbar");

// ─────────────────────────────────────────────
// APP DATA (the heart of the app)
// Holds the current state of the budget and expenses.
// It is now synced with the backend database.
// ─────────────────────────────────────────────
let appData = {
  cycle: null,
  expenses: [],
};

// ─────────────────────────────────────────────
// DATA SYNCING
// Fetches the latest cycle and transactions from the
// database and updates the local appData state.
// ─────────────────────────────────────────────
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

// This is the main tranfaring function of the app.
// if we call for example the dashboard it will tranfare to it and it will hide every
// other screen and show only the dashboard.
// It also highlights the correct nav button and
// hides the nav bar entirely on the setup screen.
function navigateTo(targetId) {
  const navContainer = document.querySelector(".topbar-nav");

  // Hide the top navigation bar when the user is on the setup screen
  // (they shouldn't be able to jump away mid-setup)
  if (targetId === "setup") {
    navContainer.style.display = "none";
  } else {
    navContainer.style.display = "flex";
  }

  // Remove "active" highlight from all nav buttons,
  // then add it back only to the one matching this screen
  navItems.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.target === targetId) btn.classList.add("active");
  });

  // hide all screens, then reveal only the target one
  screens.forEach((screen) => {
    screen.classList.add("hidden");
    if (screen.id === targetId) screen.classList.remove("hidden");
  });

  // Each screen has its own loader function . call the one you want .
  if (targetId === "dashboard") loadDashboard();
  if (targetId === "history") loadHistory();
  if (targetId === "settings") loadSettings();
}

// linking each nav button so clicking it navigates
// to the screen linked with it
navItems.forEach((btn) => {
  if (btn.dataset.target)
    btn.addEventListener("click", () => navigateTo(btn.dataset.target));
});

// Shows the top navigation bar and sets the username display.
// Called after any successful login or unlock.
function showAppChrome(username) {
  topbar.classList.remove("hidden");
  document.getElementById("nav-username").textContent = username;
}
function setData(user) {
  topbar.classList.remove("hidden");

  document.getElementById("nav-username").textContent = user.data.userName;
  const avatarUrl = `http://localhost:3000/uploads/${user.data.avatar}`;
  let img = document.querySelector("#nav-avatar");
  if (user.data.avatar == "#") {
    img.textContent = newUsername.slice(0, 2).toUpperCase();
  } else {
    img.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  }
}
// Hides the top navigation bar.
// Called when the user logs out or switches accounts.
function hideAppChrome() {
  topbar.classList.add("hidden");
}

// ─────────────────────────────────────────────
// switch between the screens
// Simple links that take the user between the
// login and signup screens.
// ─────────────────────────────────────────────

// "Don't have an account? Sign up" link
document.getElementById("go-to-signup").addEventListener("click", (e) => {
  e.preventDefault();
  navigateTo("signup-screen");
});

// "Already have an account? Log in" link
document.getElementById("go-to-login").addEventListener("click", (e) => {
  e.preventDefault();
  navigateTo("login-screen");
});

// "Switch account" link on the lock screen —
// clears the remembered user and goes back to login
document.getElementById("switch-account").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("budget_username");
  localStorage.removeItem("token");
  hideAppChrome();
  navigateTo("login-screen");
});

// ─────────────────────────────────────────────
// SIGNUP FORM
// When the user submits the signup form,
// send their details to the API and create their account.
// ─────────────────────────────────────────────
document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const userName = document.getElementById("signup-username").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const pin = document.getElementById("signup-pin").value;

  // Call the backend to register the new user
  const data = await apiRegister(userName, email, password, pin);

  if (data.status == "success") {
    // Save the JWT token so future API calls are authenticated
    localStorage.setItem("token", data.data);
    e.target.reset();
    showAppChrome(userName);
    alert("Account created! Let's set up your first budget cycle.");

    // Send the new user straight to the budget setup screen
    navigateTo("setup");
  } else {
    alert(data.message);
  }
});

// ─────────────────────────────────────────────
// LOGIN FORM
// When the user submits the login form,
// verify their credentials via the API and
// send them to the PIN lock screen on success.
// ─────────────────────────────────────────────
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const data = await apiLogin(email, password);

  if (data.status == "success") {
    // Save the JWT token so future API calls are authenticated
    localStorage.setItem("token", data.data);

    // Fetch the full user profile to get their display name
    const user = await apiGetUser();
    document.getElementById("welcome-username").textContent =
      user.data.userName;
    localStorage.setItem("budget_username", user.data.userName);

    e.target.reset();
    // Don't go straight to the dashboard — require PIN confirmation first
    navigateTo("lock-screen");
  } else {
    alert(data.message);
  }
});

// ─────────────────────────────────────────────
// PIN UNLOCK FORM
// The user sees this after login or on returning.
// They enter their PIN to actually get into the app.
// ─────────────────────────────────────────────
document
  .getElementById("pin-login-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const pin = document.getElementById("unlock-pin").value;

    const data = await apiCheckPin(pin);

    if (data.status == "success") {
      e.target.reset();

      // Re-fetch the user to make sure we have fresh data
      const user = await apiGetUser();
      setData(user);

      // Fetch user's cycle and expenses from the database
      await syncData();

      // NEW: Check if the cycle we just fetched is expired, and renew if needed!
      await checkAndAutoRenewCycle();

      if (appData.cycle) {
        navigateTo("dashboard");
      } else {
        navigateTo("setup");
      }
    } else {
      alert(data.message);
    }
  });

// ─────────────────────────────────────────────
// LOGOUT BUTTON
// Clears the remembered user and sends them
// back to the login screen.
// ─────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("budget_username");
  localStorage.removeItem("token");
  hideAppChrome();
  navigateTo("login-screen");
});

// ─────────────────────────────────────────────
// CATEGORY BUTTONS (Expense form)
// When the user picks a spending category
// (e.g. Food, Transport), highlight that button
// and store its value in the hidden input field.
// ─────────────────────────────────────────────
document.querySelectorAll(".cat-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    // Deselect all category buttons first
    document
      .querySelectorAll(".cat-btn")
      .forEach((b) => b.classList.remove("selected"));

    // Highlight the one they clicked
    btn.classList.add("selected");

    // Write the selected category into the hidden form field
    document.getElementById("expense-category").value = btn.dataset.value;
  });
});

// ─────────────────────────────────────────────
// WARNING MODAL
// A pop-up dialog that appears when the user
// has overspent — either for the day or in total.
// ─────────────────────────────────────────────
const warningOverlay = document.getElementById("warning-modal-overlay");
const warningOkBtn = document.getElementById("warning-modal-ok");

// Clicking OK dismisses the warning modal
warningOkBtn.addEventListener("click", () => {
  warningOverlay.classList.add("hidden");
});

// Builds and shows the warning modal.
// Pass type = "daily" for daily overspend, or "total" for budget exceeded.
// The data object carries the numbers to display in the message.
function showWarningModal(type, data) {
  const icon = document.getElementById("warning-modal-icon");
  const title = document.getElementById("warning-modal-title");
  const body = document.getElementById("warning-modal-body");
  const btn = document.getElementById("warning-modal-ok");

  if (type === "daily") {
    // User spent more than their daily safe limit
    icon.textContent = "📅";
    title.textContent = "Daily Limit Exceeded";
    const overBy = Math.abs(Math.floor(data.dailyRemaining));

    // Calculate what their new daily target should be going forward
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
    // User has blown their entire budget for the cycle
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

// Returns an emoji icon for a given expense category.
// Falls back to 💰 if the category isn't recognized.
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

// Formats an ISO date string into a human-friendly format
// like "May 12, 3:45 PM"
function formatDate(dateString) {
  const options = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleDateString("en-US", options);
}

// ─────────────────────────────────────────────
// BUDGET CYCLE SETUP FORM
// The user fills this in once to define their
// budget period: name, start date, end date,
// and total allowance in EGP.
// ─────────────────────────────────────────────
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");

// When the start date changes, make sure the end date
// can't be set to something earlier than it
startDateInput.addEventListener("change", () => {
  endDateInput.min = startDateInput.value;
  if (endDateInput.value && endDateInput.value < startDateInput.value) {
    endDateInput.value = "";
  }
});

// When the setup form is submitted, save the cycle to the database
document.getElementById("setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Grab the new error message element and hide it initially
  const errorMsg = document.getElementById("setup-error-msg");
  errorMsg.style.display = "none";

  const start = new Date(startDateInput.value);
  const end = new Date(endDateInput.value);

  // Extra safety check — end must be after start
  if (end < start) {
    errorMsg.textContent =
      "Invalid cycle: The end date must be after the start date.";
    errorMsg.style.display = "block";
    return;
  }

  const amount = parseFloat(document.getElementById("allowance").value);

  // Extra safety check — amount cannot be negative
  if (amount <= 0) {
    errorMsg.textContent = "Invalid cycle: Total allowance cannot <= 0";
    errorMsg.style.display = "block";
    return;
  }

  const name = document.getElementById("cycle-name").value || "My Budget";

  // Call the backend to save the new budget cycle
  const res = await apiInitCycle(
    amount,
    name,
    startDateInput.value,
    endDateInput.value,
  );

  if (res.status === "success") {
    // Pull the fresh cycle configuration into the app state
    await syncData();
    e.target.reset();
    errorMsg.style.display = "none";
    navigateTo("dashboard");
  } else {
    // Show backend API errors directly in the form
    errorMsg.textContent = res.message || "Failed to start the budget cycle.";
    errorMsg.style.display = "block";
  }
});

// ─────────────────────────────────────────────
// LOG EXPENSE FORM
// When the user submits a new expense,
// send it to the backend and update the list.
// ─────────────────────────────────────────────
document.getElementById("log-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Make sure a cycle exists before logging anything
  if (!appData.cycle) {
    alert("Please set up a budget cycle first!");
    navigateTo("setup");
    return;
  }

  const amount = parseFloat(document.getElementById("expense-amount").value);
  const category = document.getElementById("expense-category").value;
  const note = document.getElementById("expense-note").value || "Expense";

  // Send the new expense object to the database
  const res = await apiAddTransaction(amount, category, note);

  if (res.status === "success") {
    // Refresh the local state from the database
    await syncData();

    // Reset the overspend modal flags so warnings can show again
    // after this new expense is added
    if (appData.cycle) {
      const modalShownKey = `masroofy_modal_shown_${appData.cycle.startDate}`;
      sessionStorage.removeItem(modalShownKey);
    }

    alert("Expense logged!");
    e.target.reset();
    navigateTo("dashboard");
  } else {
    alert(res.message);
  }
});

// ─────────────────────────────────────────────
// DASHBOARD LOADER
// The main screen of the app. Calculates all
// budget stats and updates every UI element.
// ─────────────────────────────────────────────
async function loadDashboard() {
  // Nothing to show if no cycle is set up yet
  if (!appData.cycle) return;

  document.getElementById("dashboard-cycle-title").textContent =
    appData.cycle.cycleName || "Active Budget";

  // Set up time boundaries for today and the cycle end
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(appData.cycle.endDate);
  end.setHours(23, 59, 59, 999);

  // Add up everything spent across all expenses
  const totalSpent = appData.expenses.reduce((sum, exp) => sum + exp.amount, 0);

  let displayRemaining = appData.cycle.allowance - totalSpent;
  const isTotalOverspent = displayRemaining < 0;

  // How many days are left in this budget cycle (minimum 1)
  const timeDiffToEnd = end.getTime() - today.getTime();
  let daysLeftIncludingToday = Math.ceil(timeDiffToEnd / (1000 * 3600 * 24));
  if (daysLeftIncludingToday < 1) daysLeftIncludingToday = 1;

  // Calculate how much has been spent just today
  const todayStart = new Date(today);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const spentToday = appData.expenses
    .filter((exp) => {
      const d = new Date(exp.date);
      return d >= todayStart && d <= todayEnd;
    })
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Figure out what the safe daily spending target is:
  // take what was remaining before today and divide by days left
  const spentBeforeToday = totalSpent - spentToday;
  const remainingBeforeToday = appData.cycle.allowance - spentBeforeToday;

  const dailyTarget = Math.max(
    0,
    remainingBeforeToday / daysLeftIncludingToday,
  );
  const dailyRemaining = dailyTarget - spentToday;
  const isDailyOverspent = dailyRemaining < 0;

  // Calculate how full each progress bar should be (0 to 1)
  const dailyPct = dailyTarget > 0 ? spentToday / dailyTarget : 1;
  const totalPct =
    appData.cycle.allowance > 0 ? totalSpent / appData.cycle.allowance : 1;

  // Returns a color between green and red based on how much has been spent.
  // 0% spent = green, 100% spent = red
  function getGradientColor(pct) {
    const p = Math.min(Math.max(pct, 0), 1);
    const hue = Math.floor(156 - p * 156);
    return `hsl(${hue}, 50%, 49%)`;
  }

  // If overspent, use the danger (red) color; otherwise use the gradient
  const dailyColor = isDailyOverspent
    ? "var(--danger-color)"
    : getGradientColor(dailyPct);
  const totalColor = isTotalOverspent
    ? "var(--danger-color)"
    : getGradientColor(totalPct);

  // Apply overspent styling to the daily stat card if needed
  const statDaily = document.getElementById("stat-daily");
  if (isDailyOverspent) {
    statDaily.classList.add("overspent");
  } else {
    statDaily.classList.remove("overspent");
  }

  // Update the daily limit display and progress bar
  document.getElementById("daily-limit-target").textContent =
    `Limit: ${Math.floor(dailyTarget)} EGP`;
  const dailyLimitEl = document.getElementById("daily-limit-display");
  dailyLimitEl.textContent = `${Math.floor(dailyRemaining)} EGP`;
  dailyLimitEl.style.color = dailyColor;

  const dailyBar = document.getElementById("daily-bar");
  dailyBar.style.width = `${Math.min(dailyPct * 100, 100)}%`;
  dailyBar.style.backgroundColor = dailyColor;

  // Apply overspent styling to the total balance card if needed
  const statTotal = document.getElementById("stat-remaining");
  if (isTotalOverspent) {
    statTotal.classList.add("overspent");
  } else {
    statTotal.classList.remove("overspent");
  }

  // Update the total remaining balance display and progress bar
  const totalRemainingEl = document.getElementById("remaining-balance-display");
  totalRemainingEl.textContent = `${Math.floor(displayRemaining)} EGP`;
  totalRemainingEl.style.color = totalColor;

  const balanceBar = document.getElementById("balance-bar");
  balanceBar.style.width = `${Math.min(totalPct * 100, 100)}%`;
  balanceBar.style.backgroundColor = totalColor;

  // Update the allowance label and days remaining counter
  document.getElementById("allowance-display").textContent =
    `of ${appData.cycle.allowance} EGP`;
  document.getElementById("days-remaining-display").textContent =
    daysLeftIncludingToday;

  // Show the cycle end date in a friendly format
  const endFormat = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  document.getElementById("cycle-dates-display").textContent =
    `cycle ends ${endFormat}`;

  // Show a warning banner if the user has used more than the configured threshold
  // (default is 80%, but the user can change it in Settings)
  const res = await apiGetAlert();
  const thresholdPercent = res.data;
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

  // Check if we've already shown the overspend modal this session.
  // We only show each warning once per session to avoid spamming the user.
  const modalShownKey = `masroofy_modal_shown_${appData.cycle.startDate}`;
  const shownFlags = JSON.parse(sessionStorage.getItem(modalShownKey) || "{}");

  if (isTotalOverspent && !shownFlags.total) {
    // Total budget is blown — show the serious warning
    shownFlags.total = true;
    sessionStorage.setItem(modalShownKey, JSON.stringify(shownFlags));
    showWarningModal("total", {
      remaining: displayRemaining,
      allowance: appData.cycle.allowance,
    });
  } else if (isDailyOverspent && !isTotalOverspent && !shownFlags.daily) {
    // Only today's limit is exceeded — show the softer daily warning
    shownFlags.daily = true;
    sessionStorage.setItem(modalShownKey, JSON.stringify(shownFlags));
    showWarningModal("daily", {
      dailyRemaining,
      dailyTarget,
      daysLeft: daysLeftIncludingToday,
      remainingTotal: displayRemaining,
    });
  }

  // Render the recent transactions list at the bottom of the dashboard
  const recentList = document.getElementById("recent-tx-list");
  recentList.innerHTML = "";

  if (appData.expenses.length === 0) {
    recentList.innerHTML =
      '<p style="color:var(--text-muted); font-size:13px; text-align:center; padding: 20px 0;">No transactions yet.</p>';
  } else {
    appData.expenses.forEach((exp) => {
      // Only show the note if it's something meaningful (not the default "Expense")
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

  // Draw the category breakdown donut chart
  renderDynamicDonut();
}

// ─────────────────────────────────────────────
// DONUT CHART RENDERER
// Draws the spending breakdown chart by category.
// Each category gets a slice of the SVG circle
// proportional to how much was spent on it.
// ─────────────────────────────────────────────
function renderDynamicDonut() {
  const radius = 85;
  const circumference = 2 * Math.PI * radius;

  // Start all category totals at zero
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

  // Sum up spending per category
  appData.expenses.forEach((exp) => {
    if (totals[exp.category] !== undefined) {
      totals[exp.category] += exp.amount;
    } else {
      totals.other += exp.amount;
    }
    grandTotal += exp.amount;
  });

  // If nothing has been spent yet, hide all slices and stop
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

  // Draw each category slice by adjusting stroke-dasharray and stroke-dashoffset.
  // This is the standard SVG technique for drawing partial circles.
  let currentOffset = 0;
  for (const [category, amount] of Object.entries(totals)) {
    const circle = document.getElementById(`circle-${category}`);
    if (!circle) continue;

    if (amount === 0) {
      // Nothing spent in this category — hide the slice
      circle.setAttribute("stroke-dasharray", `0 ${circumference}`);
      circle.style.opacity = "0";
    } else {
      circle.style.opacity = "1";
      circle.style.cursor = "pointer";

      // Calculate how long this slice's stroke should be
      const dashLength = (amount / grandTotal) * circumference;
      const gapLength = circumference - dashLength;

      circle.setAttribute(
        "stroke-dasharray",
        `${dashLength.toFixed(1)} ${gapLength.toFixed(1)}`,
      );
      circle.setAttribute("stroke-dashoffset", currentOffset.toFixed(1));
      currentOffset -= dashLength;

      // Add a tooltip showing the category name and percentage
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

// ─────────────────────────────────────────────
// HISTORY SCREEN LOADER
// Shows the full list of all recorded expenses
// with a delete button on each one.
// ─────────────────────────────────────────────
function loadHistory() {
  const historyList = document.getElementById("transaction-list");
  historyList.innerHTML = "";

  if (appData.expenses.length === 0) {
    historyList.innerHTML =
      '<p style="color:var(--text-muted); text-align:center; margin-top: 40px;">Your history is empty.</p>';
    return;
  }

  // Render each expense as a row with its icon, name, date, amount, and a delete button
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

// Deletes a single expense via the API and refreshes the list
window.deleteTransaction = async function (id) {
  if (confirm("Delete this expense?")) {
    const res = await apiDeleteTransaction(id);
    if (res.status === "success") {
      await syncData(); // Re-fetch the cleaned list from database
      loadHistory(); // Re-render the list after deletion
    } else {
      alert(res.message);
    }
  }
};

// ─────────────────────────────────────────────
// SETTINGS SCREEN LOADER
// Fills in the settings page with current cycle info.
// ─────────────────────────────────────────────
function loadSettings() {
  const nameEl = document.getElementById("settings-cycle-name");
  const detailsEl = document.getElementById("settings-cycle-details");
  const badgeEl = document.getElementById("settings-cycle-badge");

  if (appData.cycle) {
    // Show the active cycle's name, date range, and allowance
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
    // No cycle set up yet — prompt the user to go set one up
    nameEl.textContent = "No active cycle";
    detailsEl.textContent = "Go to Setup to initialize a budget";
    badgeEl.style.display = "none";
  }
}

// ─────────────────────────────────────────────
// AVATAR UPLOAD
// Lets the user pick a profile picture.
// It's stored as base64 in localStorage and
// shown in the top navigation bar.
// ─────────────────────────────────────────────
// document
//   .getElementById("avatar-upload")
//   .addEventListener("change", function (e) {
//     const file = e.target.files[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = function (event) {
//         const base64Image = event.target.result;
//         // Save the image and update the nav avatar immediately
//         document.getElementById("nav-avatar").innerHTML =
//           `<img src="${base64Image}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
//         alert("Profile picture updated!");
//       };
//       reader.readAsDataURL(file);
//     }
//   });

// ─────────────────────────────────────────────
// SETTINGS ACTIONS
// ─────────────────────────────────────────────
// Upload New Image
const uploadBtn = document.querySelector("#avatar-upload");
uploadBtn.addEventListener("change", async (event) => {
  const files = event.target.files;
  if (files && files.length > 0) {
    const file = files[0];
    const reader = new FileReader();
    if (file.type.split("/")[0] == "image") {
      let img = document.getElementById("nav-avatar");
      reader.onload = async function (e) {
        img.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        alert("Profile picture updated!");
        const user = await apiGetUser();
        const data = {
          avatar: file,
          userName: user.data.userName,
        };
        await apiEditUser(data);
      };
      // Read the image file as a data URL (Base64 encoded string)
      reader.readAsDataURL(file);
    } else {
      uploadBtn.value = "";
      alert("Plz Enter Valid Image");
    }
  }
});

// Update the display name shown in the nav bar
document
  .getElementById("update-username-btn")
  .addEventListener("click", async () => {
    const newUsername = document.getElementById("settings-username").value;
    if (newUsername.trim()) {
      const user = await apiGetUser();
      const userEdit = { userName: newUsername, avatar: user.data.avatar };
      const data = await apiEditUser(userEdit);
      if (data.status == "success") {
        localStorage.setItem("token", data.data);
        document.getElementById("nav-username").textContent = newUsername;
        document.getElementById("welcome-username").textContent = newUsername;
        // If no avatar is set, show the first 2 letters of the username as a fallback
        if (user.avatar == "#") {
          document.getElementById("nav-avatar").textContent = newUsername
            .slice(0, 2)
            .toUpperCase();
        }
        alert("Username updated successfully!");
        document.getElementById("settings-username").value = "";
      } else {
        alert(data.message);
      }
    }
  });

// Update the percentage threshold at which the warning banner appears
// (e.g. set to 70 to get warned when you've used 70% of your budget)
document
  .getElementById("update-warning-btn")
  .addEventListener("click", async () => {
    const newPercent = document.getElementById(
      "settings-warning-percent",
    ).value;
    if (newPercent && newPercent > 0 && newPercent <= 100) {
      const data = await apiChangeAlert(newPercent);
      if (data.status == "success") {
        alert(`Warning threshold set to ${newPercent}%`);
        loadDashboard();
      } else {
        alert(data.message);
      }
    }
  });

// Nuclear option — wipes the entire budget cycle from the database.
// The user must confirm before anything is deleted.
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
      await syncData(); // Sync the now-empty state
      alert("Cycle reset!");
      navigateTo("setup");
    }
  });
// ─────────────────────────────────────────────
// changing password modal
// Opens an overlay asking for old and new password.
// ─────────────────────────────────────────────
const changePwdBtn = document.getElementById("change-password-btn");
const pwdModalOverlay = document.getElementById("password-modal-overlay");
const cancelPwdBtn = document.getElementById("cancel-password-btn");
const changePwdForm = document.getElementById("change-password-form");
const pwdErrorMsg = document.getElementById("password-error-msg"); // <-- Grab the error text element

// 1. Open the modal
changePwdBtn.addEventListener("click", () => {
  pwdModalOverlay.classList.remove("hidden");
});

// 2. Close the modal (Cancel)
cancelPwdBtn.addEventListener("click", () => {
  pwdModalOverlay.classList.add("hidden");
  changePwdForm.reset(); // Clear the inputs
  pwdErrorMsg.style.display = "none"; // Hide the error text so it's clean next time
});

// 3. Handle the form submission
changePwdForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  // Hide any old error messages when trying again
  pwdErrorMsg.style.display = "none";
  const oldPassword = document.getElementById("old-password").value;
  const newPassword = document.getElementById("new-password").value;

  // call the api here

  const res = await apiChangePassword(oldPassword, newPassword);

  if (res.status === "success") {
    // Hide modal and clear form on success
    pwdModalOverlay.classList.add("hidden");
    changePwdForm.reset();
    pwdErrorMsg.style.display = "none";
  } else {
    // Show error inside the modal instead of an alert!
    pwdErrorMsg.textContent = res.message || "Failed to change password.";
    pwdErrorMsg.style.display = "block";
  }
});
// ─────────────────────────────────────────────
// auto renew fo the cycle
// Checks if the current cycle is expired. If yes,
// starts a new one with the exact same duration and allowance.
// ─────────────────────────────────────────────
async function checkAndAutoRenewCycle() {
  if (!appData.cycle) return;
  const cycle = (await apiGetCycle()).data;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Midnight today
  const endDate = new Date(cycle.endDate); // extract enddate here
  endDate.setHours(23, 59, 59, 999); // Very end of the expiration day

  // Check if the cycle's end date has passed
  if (endDate < today) {
    console.log("here");
    // 1. Calculate the duration of the old cycle in milliseconds
    const oldStart = new Date(cycle.startDate); //need getting the new startdate from the api
    const oldEnd = new Date(cycle.endDate); // need getting the old enddate from the api
    const durationInMs = oldEnd.getTime() - oldStart.getTime();
    // 2. Set new dates (Start today, end 'duration' days from today)
    const newStart = new Date();
    const newEnd = new Date(newStart.getTime() + durationInMs);

    // Helper to format date safely in local time (YYYY-MM-DD)
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const res = await apiInitCycle(
      cycle.totalAmount,
      cycle.cycleName,
      newStart,
      newEnd,
    );
    if (res.status === "success") {
      // 4. Sync the new cycle to the app
      await apiDeleteCycle(cycle._id);
      await syncData();
      // Clear any old warning flags so they can trigger properly for the new cycle
      sessionStorage.removeItem(
        `masroofy_modal_shown_${appData.cycle.startDate}`,
      );

      // NEW: Force the screen to redraw with the fresh dates and amounts!
      loadDashboard();
      loadSettings();

      alert(
        "Your previous cycle ended. A new cycle has been started automatically!",
      );
    }
  }
}
// ─────────────────────────────────────────────
// AUTO LOGIN (Fast Login)
// On every page load, this tries to silently
// log the user back in using a saved session.
// If it works, the user lands on the lock screen
// instead of the full login page.
// ─────────────────────────────────────────────
async function def() {
  const navContainer = document.querySelector("#topbar");
  navContainer.classList.add("hidden");
  if (!localStorage.getItem("token")) return;
  const data = await apiFastLogin();
  if (data.status == "success") {
    localStorage.setItem("token", data.data);
    const user = await apiGetUser();
    document.getElementById("welcome-username").textContent =
      user.data.userName;
    const avatarUrl = `http://localhost:3000/uploads/${user.data.avatar}`;
    navContainer.querySelector("#nav-avatar").innerHTML =
      `<img src="${avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    navigateTo("lock-screen");
  }
}
def();
