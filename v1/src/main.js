import "./style.css";
import {
  startStudyTimer,
  startLeisureTimer,
  stopTimer,
  getTimerState,
  TIMER_MODES,
} from "./timer.js";
import {
  loadState,
  processStudySession,
  processLeisureSession,
  processLoan,
  addHistoryEntry,
  clearHistory,
} from "./storage.js";
import {
  getConfig,
  saveConfig,
  resetConfig,
  DEFAULT_CONFIG,
} from "./config.js";
import {
  formatTime,
  studyToLeisure,
  calculateLoanRepayment,
  generateId,
} from "./utils.js";
import { t, getLanguage, saveLanguage, LANGUAGES } from "./i18n.js";

// DOM Element References
const timerDisplay = document.getElementById("timer-display");
const timerMode = document.getElementById("timer-mode");
const netBalance = document.getElementById("net-balance");
const balanceHint = document.getElementById("balance-hint");
const studyBtn = document.getElementById("study-btn");
const leisureBtn = document.getElementById("leisure-btn");
const loanBtn = document.getElementById("loan-btn");
const stopBtn = document.getElementById("stop-btn");

// Loan UI elements
const loanSection = document.getElementById("loan-section");
const loanAmountInput = document.getElementById("loan-amount");
const loanRepaymentDisplay = document.getElementById("loan-repayment");
const loanErrorDisplay = document.getElementById("loan-error");
const loanConfirmBtn = document.getElementById("loan-confirm-btn");
const loanCancelBtn = document.getElementById("loan-cancel-btn");

// Settings UI elements
const settingsLeisureFactor = document.getElementById(
  "settings-leisure-factor"
);
const settingsInterestRate = document.getElementById("settings-interest-rate");
const settingsDebtLimit = document.getElementById("settings-debt-limit");
const settingsMessage = document.getElementById("settings-message");
const settingsSaveBtn = document.getElementById("settings-save-btn");
const settingsResetBtn = document.getElementById("settings-reset-btn");

// History UI elements
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const historyClearBtn = document.getElementById("history-clear-btn");

// Language UI element
const settingsLanguage = document.getElementById("settings-language");

// Session state for tracking leisure start value
let leisureSessionStartMinutes = 0;

/**
 * Update all UI text with current language translations
 */
function updateUILanguage() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    element.textContent = t(key);
  });

  // Update language selector to show current language
  settingsLanguage.value = getLanguage();

  // Update dynamic elements that need special handling
  const state = loadState();
  updateBalanceDisplay(state.balance);
  updateHistoryDisplay();
}

/**
 * Handle language change
 */
function handleLanguageChange() {
  const newLang = settingsLanguage.value;
  saveLanguage(newLang);
  updateUILanguage();
}

/**
 * Update timer display with formatted time
 * @param {number} seconds - Seconds to display
 */
function updateTimerDisplay(seconds) {
  timerDisplay.textContent = formatTime(seconds);
}

/**
 * Update balance display from state
 * Shows net balance (leisure - debt): positive = play time, negative = debt
 * loanedLeisure is NOT included in net balance - it's borrowed time, not earned
 * @param {Object} balance - Balance object with leisureAvailable, debtMinutes, loanedLeisure
 */
function updateBalanceDisplay(balance) {
  // Net balance = earned leisure - debt (loaned leisure is separate)
  const netValue = balance.leisureAvailable - balance.debtMinutes;
  const isPositive = netValue >= 0;

  // Format value with sign and proper decimals
  const absValue = Math.abs(netValue);
  const formattedValue = Number.isInteger(absValue)
    ? absValue
    : absValue.toFixed(1);
  const displayText = isPositive
    ? `${formattedValue} min`
    : `-${formattedValue} min`;

  netBalance.textContent = displayText;

  // Update color based on positive/negative
  netBalance.classList.remove("text-green-600", "text-red-600");
  netBalance.classList.add(isPositive ? "text-green-600" : "text-red-600");

  // Update hint text with translation
  balanceHint.textContent = isPositive ? t("positiveHint") : t("negativeHint");
}

/**
 * Update button states based on timer mode
 * @param {string} mode - Current timer mode (idle, study, leisure)
 */
function updateButtonStates(mode) {
  const state = loadState();
  const netBalance = state.balance.leisureAvailable - state.balance.debtMinutes;
  const loanedLeisure = state.balance.loanedLeisure || 0;
  // Total available leisure = earned (if positive net) + loaned
  const totalAvailableLeisure = Math.max(0, netBalance) + loanedLeisure;

  if (mode === TIMER_MODES.IDLE) {
    // Show action buttons, hide stop button
    studyBtn.classList.remove("hidden");
    leisureBtn.classList.remove("hidden");
    loanBtn.classList.remove("hidden");
    stopBtn.classList.add("hidden");

    // Disable leisure if no available time (earned or loaned)
    leisureBtn.disabled = totalAvailableLeisure < 1;
    studyBtn.disabled = false;
    loanBtn.disabled = false;

    // Update timer mode text
    timerMode.textContent = t("ready");
  } else {
    // Hide action buttons, show stop button
    studyBtn.classList.add("hidden");
    leisureBtn.classList.add("hidden");
    loanBtn.classList.add("hidden");
    stopBtn.classList.remove("hidden");

    // Update timer mode text
    timerMode.textContent =
      mode === TIMER_MODES.STUDY ? t("studying") : t("leisure");
  }
}

/**
 * Handle study button click - start study timer
 */
function handleStudyClick() {
  startStudyTimer((seconds) => {
    updateTimerDisplay(seconds);
  });
  updateButtonStates(TIMER_MODES.STUDY);
}

/**
 * Handle leisure button click - start leisure countdown
 */
function handleLeisureClick() {
  const state = loadState();
  const netBalanceValue =
    state.balance.leisureAvailable - state.balance.debtMinutes;
  const loanedLeisure = state.balance.loanedLeisure || 0;

  // Total available = earned leisure (if positive) + loaned leisure
  const totalAvailable = Math.max(0, netBalanceValue) + loanedLeisure;

  // Validate enough available time
  if (totalAvailable < 1) {
    const currentBalance = totalAvailable < 0 ? 0 : totalAvailable.toFixed(1);
    timerMode.textContent = t("notEnoughLeisure", currentBalance);
    setTimeout(() => {
      updateButtonStates(TIMER_MODES.IDLE);
    }, 2000);
    return;
  }

  // Store the starting value for stop calculation
  leisureSessionStartMinutes = totalAvailable;

  // Convert available minutes to seconds for countdown
  const totalSeconds = Math.floor(totalAvailable * 60);

  startLeisureTimer(
    totalSeconds,
    (remaining) => {
      updateTimerDisplay(remaining);
    },
    () => {
      // Auto-complete callback when countdown reaches zero
      handleLeisureComplete(netBalanceValue);
    }
  );

  updateButtonStates(TIMER_MODES.LEISURE);
}

/**
 * Handle leisure session completion (auto-stop or manual stop)
 * @param {number} totalMinutesStarted - Total minutes when leisure started
 */
function handleLeisureComplete(totalMinutesStarted) {
  // Capture net balance BEFORE processing
  const stateBefore = loadState();
  const netBalanceBefore =
    stateBefore.balance.leisureAvailable - stateBefore.balance.debtMinutes;

  // Process leisure session - deduct all available time
  const { leisureUsed } = processLeisureSession(totalMinutesStarted);

  // Capture net balance AFTER processing
  const stateAfter = loadState();
  const netBalanceAfter =
    stateAfter.balance.leisureAvailable - stateAfter.balance.debtMinutes;

  // Add history entry with balance changes
  addHistoryEntry({
    id: generateId(),
    date: new Date().toISOString(),
    type: "leisure",
    durationMinutes: totalMinutesStarted,
    leisureUsed: leisureUsed,
    netBalanceBefore: netBalanceBefore,
    netBalanceAfter: netBalanceAfter,
  });

  // Update history display
  updateHistoryDisplay();

  // Show result message
  timerMode.textContent = t("usedLeisure", leisureUsed.toFixed(1));

  // Reset timer display
  updateTimerDisplay(0);

  // Update balance display
  updateBalanceDisplay(stateAfter.balance);

  // Return to idle state after delay
  setTimeout(() => {
    updateButtonStates(TIMER_MODES.IDLE);
  }, 2000);
}

/**
 * Handle stop button click - stop current timer and process session
 */
function handleStopClick() {
  const { mode, elapsed } = stopTimer();
  const elapsedMinutes = Math.floor(elapsed / 60);

  // Reset timer display
  updateTimerDisplay(0);

  if (mode === TIMER_MODES.STUDY) {
    // Validate minimum 1-minute session
    if (elapsedMinutes < 1) {
      timerMode.textContent = t("sessionTooShort");
      setTimeout(() => {
        updateButtonStates(TIMER_MODES.IDLE);
      }, 2000);
      return;
    }

    // Capture net balance BEFORE processing
    const stateBefore = loadState();
    const netBalanceBefore =
      stateBefore.balance.leisureAvailable - stateBefore.balance.debtMinutes;

    // Process study session with debt reduction
    const config = getConfig();
    const { leisureEarned, debtReduced } = processStudySession(
      elapsedMinutes,
      config.leisureFactor
    );

    // Capture net balance AFTER processing
    const stateAfter = loadState();
    const netBalanceAfter =
      stateAfter.balance.leisureAvailable - stateAfter.balance.debtMinutes;

    // Add history entry with settings snapshot and balance changes
    addHistoryEntry({
      id: generateId(),
      date: new Date().toISOString(),
      type: "study",
      durationMinutes: elapsedMinutes,
      leisureEarned: leisureEarned,
      leisureFactor: config.leisureFactor,
      netBalanceBefore: netBalanceBefore,
      netBalanceAfter: netBalanceAfter,
    });

    // Update history display
    updateHistoryDisplay();

    // Show result message
    let message = t("earnedLeisure", leisureEarned.toFixed(1));
    if (debtReduced > 0) {
      message += " " + t("debtPaid", debtReduced);
    }
    timerMode.textContent = message;

    // Update balance display
    updateBalanceDisplay(stateAfter.balance);
  } else if (mode === TIMER_MODES.LEISURE) {
    // For leisure, calculate how much time was used
    // elapsed contains remaining seconds
    const remainingSeconds = elapsed;
    const remainingMinutes = remainingSeconds / 60;

    // Calculate actual minutes used (original - remaining)
    const actualUsedMinutes = leisureSessionStartMinutes - remainingMinutes;

    if (actualUsedMinutes > 0) {
      // Capture net balance BEFORE processing
      const stateBefore = loadState();
      const netBalanceBefore =
        stateBefore.balance.leisureAvailable - stateBefore.balance.debtMinutes;

      // Process only the used portion
      processLeisureSession(actualUsedMinutes);

      // Capture net balance AFTER processing
      const stateAfter = loadState();
      const netBalanceAfter =
        stateAfter.balance.leisureAvailable - stateAfter.balance.debtMinutes;

      // Add history entry with balance changes
      addHistoryEntry({
        id: generateId(),
        date: new Date().toISOString(),
        type: "leisure",
        durationMinutes: actualUsedMinutes,
        leisureUsed: actualUsedMinutes,
        netBalanceBefore: netBalanceBefore,
        netBalanceAfter: netBalanceAfter,
      });

      // Update history display
      updateHistoryDisplay();

      // Show result message
      timerMode.textContent = t("usedLeisure", actualUsedMinutes.toFixed(1));

      // Update balance display
      updateBalanceDisplay(stateAfter.balance);
    } else {
      timerMode.textContent = t("leisureStopped");

      // Update balance display
      const newState = loadState();
      updateBalanceDisplay(newState.balance);
    }
  }

  // Return to idle state after delay
  setTimeout(() => {
    updateButtonStates(TIMER_MODES.IDLE);
  }, 2000);
}

/**
 * Update loan repayment preview based on input
 */
function updateLoanPreview() {
  const config = getConfig();
  const state = loadState();
  const loanMinutes = parseInt(loanAmountInput.value, 10) || 0;

  // Calculate repayment
  const repaymentDue = calculateLoanRepayment(
    loanMinutes,
    config.leisureFactor,
    config.loanInterestRate
  );

  // Display repayment
  loanRepaymentDisplay.textContent = `${repaymentDue.toFixed(1)} ${t(
    "minStudy"
  )}`;

  // Check debt limit
  const newTotalDebt = state.balance.debtMinutes + repaymentDue;
  if (newTotalDebt > config.maxDebtLimit) {
    loanErrorDisplay.textContent = t("exceedsDebtLimit", config.maxDebtLimit);
    loanErrorDisplay.classList.remove("hidden");
    loanConfirmBtn.disabled = true;
  } else if (loanMinutes < 1) {
    loanErrorDisplay.textContent = t("minimumLoan");
    loanErrorDisplay.classList.remove("hidden");
    loanConfirmBtn.disabled = true;
  } else {
    loanErrorDisplay.classList.add("hidden");
    loanConfirmBtn.disabled = false;
  }
}

/**
 * Handle loan button click - show loan dialog
 */
function handleLoanClick() {
  // Show loan section
  loanSection.classList.remove("hidden");

  // Hide action buttons
  studyBtn.classList.add("hidden");
  leisureBtn.classList.add("hidden");
  loanBtn.classList.add("hidden");

  // Update preview with current value
  updateLoanPreview();
}

/**
 * Handle loan cancel - hide loan dialog
 */
function handleLoanCancel() {
  // Hide loan section
  loanSection.classList.add("hidden");

  // Show action buttons
  updateButtonStates(TIMER_MODES.IDLE);
}

/**
 * Handle loan confirmation
 */
function handleLoanConfirm() {
  const config = getConfig();
  const state = loadState();
  const loanMinutes = parseInt(loanAmountInput.value, 10) || 0;

  // Calculate repayment
  const repaymentDue = calculateLoanRepayment(
    loanMinutes,
    config.leisureFactor,
    config.loanInterestRate
  );

  // Validate debt limit
  const newTotalDebt = state.balance.debtMinutes + repaymentDue;
  if (newTotalDebt > config.maxDebtLimit) {
    loanErrorDisplay.textContent = t("exceedsDebtLimit", config.maxDebtLimit);
    loanErrorDisplay.classList.remove("hidden");
    return;
  }

  if (loanMinutes < 1) {
    loanErrorDisplay.textContent = t("minimumLoan");
    loanErrorDisplay.classList.remove("hidden");
    return;
  }

  // Capture net balance BEFORE processing
  const netBalanceBefore =
    state.balance.leisureAvailable - state.balance.debtMinutes;

  // Process loan
  processLoan(loanMinutes, repaymentDue);

  // Capture net balance AFTER processing
  const stateAfter = loadState();
  const netBalanceAfter =
    stateAfter.balance.leisureAvailable - stateAfter.balance.debtMinutes;

  // Add history entry with settings snapshot and balance changes
  addHistoryEntry({
    id: generateId(),
    date: new Date().toISOString(),
    type: "loan",
    loanMinutes: loanMinutes,
    repaymentDue: repaymentDue,
    leisureFactor: config.leisureFactor,
    loanInterestRate: config.loanInterestRate,
    netBalanceBefore: netBalanceBefore,
    netBalanceAfter: netBalanceAfter,
  });

  // Update history display
  updateHistoryDisplay();

  // Hide loan section
  loanSection.classList.add("hidden");

  // Update balance display
  updateBalanceDisplay(stateAfter.balance);

  // Show success message
  timerMode.textContent = t("borrowed", loanMinutes, repaymentDue.toFixed(1));

  // Return to idle state after delay
  setTimeout(() => {
    updateButtonStates(TIMER_MODES.IDLE);
  }, 2000);
}

/**
 * Load and display current settings in the form
 */
function loadSettingsDisplay() {
  const config = getConfig();
  settingsLeisureFactor.value = config.leisureFactor;
  settingsInterestRate.value = Math.round(config.loanInterestRate * 100);
  settingsDebtLimit.value = config.maxDebtLimit;
}

/**
 * Show settings message (success or error)
 * @param {string} message - Message to display
 * @param {boolean} isError - Whether it's an error message
 */
function showSettingsMessage(message, isError = false) {
  settingsMessage.textContent = message;
  settingsMessage.classList.remove("hidden", "text-green-600", "text-red-600");
  settingsMessage.classList.add(isError ? "text-red-600" : "text-green-600");

  // Auto-hide after 3 seconds
  setTimeout(() => {
    settingsMessage.classList.add("hidden");
  }, 3000);
}

/**
 * Handle settings save with validation
 */
function handleSettingsSave() {
  const leisureFactor = parseFloat(settingsLeisureFactor.value);
  const interestRate = parseInt(settingsInterestRate.value, 10) / 100;
  const debtLimit = parseInt(settingsDebtLimit.value, 10);

  try {
    saveConfig({
      leisureFactor: leisureFactor,
      loanInterestRate: interestRate,
      maxDebtLimit: debtLimit,
    });
    showSettingsMessage(t("settingsSaved"));
  } catch (e) {
    showSettingsMessage(`❌ ${e.message}`, true);
  }
}

/**
 * Handle settings reset to defaults
 */
function handleSettingsReset() {
  resetConfig();
  loadSettingsDisplay();
  showSettingsMessage(t("settingsReset"));
}

/**
 * Format a number for display (integer or 1 decimal)
 * @param {number} value - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Format balance change for display
 * @param {number} before - Balance before action
 * @param {number} after - Balance after action
 * @returns {string} HTML string showing before → after
 */
function formatBalanceChange(before, after) {
  if (before === undefined || after === undefined) return "";

  const beforeColor = before >= 0 ? "text-green-600" : "text-red-600";
  const afterColor = after >= 0 ? "text-green-600" : "text-red-600";

  return `<div class="text-xs mt-1 text-gray-600">${t(
    "balance"
  )}: <span class="${beforeColor}">${formatNumber(
    before
  )}</span> → <span class="${afterColor}">${formatNumber(after)}</span></div>`;
}

/**
 * Format a history entry for display
 * @param {Object} entry - History entry object
 * @returns {string} HTML string for the entry
 */
function formatHistoryEntry(entry) {
  const date = new Date(entry.date);
  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  let icon, typeLabel, details, colorClass;

  switch (entry.type) {
    case "study":
      icon = "📚";
      typeLabel = t("studyEntry");
      details = `${entry.durationMinutes} min → +${entry.leisureEarned.toFixed(
        1
      )} ${t("minLeisure")}`;
      if (entry.leisureFactor) {
        details += ` <span class="text-xs text-gray-400">(${t("factor")}: ${
          entry.leisureFactor
        })</span>`;
      }
      colorClass = "border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50";
      break;
    case "leisure":
      icon = "🎮";
      typeLabel = t("leisureEntry");
      details = `-${entry.leisureUsed.toFixed(1)} ${t("minUsed")}`;
      colorClass =
        "border-green-400 bg-gradient-to-r from-green-50 to-emerald-50";
      break;
    case "loan":
      icon = "💰";
      typeLabel = t("loanEntry");
      details = `+${entry.loanMinutes} ${t(
        "minBorrowed"
      )} (${entry.repaymentDue.toFixed(1)} ${t("minToRepay")})`;
      if (entry.leisureFactor && entry.loanInterestRate !== undefined) {
        details += ` <span class="text-xs text-gray-400">(${t("factor")}: ${
          entry.leisureFactor
        }, ${t("interest")}: ${Math.round(
          entry.loanInterestRate * 100
        )}%)</span>`;
      }
      colorClass =
        "border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50";
      break;
    default:
      icon = "❓";
      typeLabel = t("unknownEntry");
      details = "";
      colorClass = "border-gray-400 bg-gray-50";
  }

  const balanceChange = formatBalanceChange(
    entry.netBalanceBefore,
    entry.netBalanceAfter
  );

  return `
    <div class="border-l-4 ${colorClass} p-3 rounded-xl shadow-sm w-full min-w-0">
      <div class="flex justify-between items-center mb-1 gap-2">
        <span class="font-bold text-gray-800 shrink-0">${icon} ${typeLabel}</span>
        <span class="text-xs text-gray-400 font-medium shrink-0">${dateStr} ${timeStr}</span>
      </div>
      <div class="text-sm text-gray-600 break-words">${details}</div>
      ${balanceChange}
    </div>
  `;
}

/**
 * Update history display from current state
 */
function updateHistoryDisplay() {
  const state = loadState();
  const history = state.history || [];
  const netBalanceValue =
    state.balance.leisureAvailable - state.balance.debtMinutes;

  if (history.length === 0) {
    historyList.innerHTML = `<p id="history-empty" class="text-gray-500 text-center py-4">${t(
      "noHistory"
    )}</p>`;
    historyClearBtn.disabled = true;
    return;
  }

  // Disable clear button if net balance is negative (user has debt)
  historyClearBtn.disabled = netBalanceValue < 0;

  // Update tooltip to explain why button is disabled
  if (netBalanceValue < 0) {
    historyClearBtn.title = t("cannotClearDebt");
  } else {
    historyClearBtn.title = t("clearAllHistory");
  }

  historyList.innerHTML = history.map(formatHistoryEntry).join("");
}

/**
 * Handle history clear button click
 */
function handleHistoryClear() {
  if (confirm(t("clearHistoryConfirm"))) {
    clearHistory();
    updateHistoryDisplay();
    timerMode.textContent = t("historyCleared");
    setTimeout(() => {
      updateButtonStates(TIMER_MODES.IDLE);
    }, 2000);
  }
}

// Initialize app
function init() {
  // Load initial state and update UI
  const state = loadState();
  updateBalanceDisplay(state.balance);
  updateButtonStates(TIMER_MODES.IDLE);

  // Load current settings into form
  loadSettingsDisplay();

  // Set current language in selector
  settingsLanguage.value = getLanguage();

  // Update all UI text with current language
  updateUILanguage();

  // Load history display
  updateHistoryDisplay();

  // Bind event listeners
  studyBtn.addEventListener("click", handleStudyClick);
  leisureBtn.addEventListener("click", handleLeisureClick);
  stopBtn.addEventListener("click", handleStopClick);
  loanBtn.addEventListener("click", handleLoanClick);
  loanConfirmBtn.addEventListener("click", handleLoanConfirm);
  loanCancelBtn.addEventListener("click", handleLoanCancel);
  loanAmountInput.addEventListener("input", updateLoanPreview);
  settingsSaveBtn.addEventListener("click", handleSettingsSave);
  settingsResetBtn.addEventListener("click", handleSettingsReset);
  historyClearBtn.addEventListener("click", handleHistoryClear);
  settingsLanguage.addEventListener("change", handleLanguageChange);

  console.log("Study Time Tracker initialized");
}

// Run on DOM ready
document.addEventListener("DOMContentLoaded", init);
