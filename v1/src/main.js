import "./style.css";
import {
  startStudyTimer,
  startLeisureTimer,
  stopTimer,
  getTimerState,
  TIMER_MODES,
  loadActiveSession,
  clearActiveSession,
  forceSaveSession,
} from "./timer.js";
import {
  loadState,
  saveState,
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
import { playAlarmSound, stopAlarmSound, isAlarmPlaying } from "./audio.js";

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

// Alarm modal elements
const alarmModal = document.getElementById("alarm-modal");
const stopAlarmBtn = document.getElementById("stop-alarm-btn");

// Leisure mode modal elements
const leisureModeModal = document.getElementById("leisure-mode-modal");
const leisureAvailableDisplay = document.getElementById(
  "leisure-available-display"
);
const leisureCustomTimeInput = document.getElementById("leisure-custom-time");
const leisureCustomError = document.getElementById("leisure-custom-error");
const leisureCustomConfirmBtn = document.getElementById(
  "leisure-custom-confirm"
);
const leisureUseAllBtn = document.getElementById("leisure-use-all");
const leisureModeCancelBtn = document.getElementById("leisure-mode-cancel");

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

  // Show/hide loaned leisure display
  const loanedLeisureContainer = document.getElementById("loaned-leisure-container");
  const loanedLeisureDisplay = document.getElementById("loaned-leisure");
  
  if (balance.loanedLeisure && balance.loanedLeisure > 0) {
    // Show loaned leisure if user has borrowed time
    const loanedValue = balance.loanedLeisure;
    const formattedLoanedValue = Number.isInteger(loanedValue)
      ? loanedValue
      : loanedValue.toFixed(1);
    loanedLeisureDisplay.textContent = `${formattedLoanedValue} min`;
    loanedLeisureContainer.classList.remove("hidden");
  } else {
    // Hide if no borrowed time
    loanedLeisureContainer.classList.add("hidden");
  }
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
    // Disable loan if balance is positive (user already has leisure time)
    loanBtn.disabled = netBalance > 0;

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
 * Show leisure mode selection modal
 */
function showLeisureModeModal() {
  const state = loadState();
  const netBalanceValue =
    state.balance.leisureAvailable - state.balance.debtMinutes;
  const loanedLeisure = state.balance.loanedLeisure || 0;
  const totalAvailable = Math.max(0, netBalanceValue) + loanedLeisure;

  // Display available time
  leisureAvailableDisplay.textContent = `${totalAvailable.toFixed(1)} min`;

  // Clear input and error
  leisureCustomTimeInput.value = "";
  leisureCustomError.classList.add("hidden");

  // Show modal
  leisureModeModal.classList.remove("hidden");
}

/**
 * Hide leisure mode selection modal
 */
function hideLeisureModeModal() {
  leisureModeModal.classList.add("hidden");
}

/**
 * Validate custom leisure time input
 * @returns {{valid: boolean, minutes: number, error: string}}
 */
function validateCustomLeisureTime() {
  const state = loadState();
  const netBalanceValue =
    state.balance.leisureAvailable - state.balance.debtMinutes;
  const loanedLeisure = state.balance.loanedLeisure || 0;
  const totalAvailable = Math.max(0, netBalanceValue) + loanedLeisure;

  const inputValue = parseFloat(leisureCustomTimeInput.value);

  if (isNaN(inputValue) || inputValue < 1) {
    return {
      valid: false,
      minutes: 0,
      error: t("customTimeMinimum"),
    };
  }

  if (inputValue > totalAvailable) {
    return {
      valid: false,
      minutes: 0,
      error: t("customTimeExceeds", totalAvailable.toFixed(1)),
    };
  }

  return {
    valid: true,
    minutes: inputValue,
    error: "",
  };
}

/**
 * Handle leisure button click - show mode selection modal
 */
function handleLeisureClick() {
  const state = loadState();
  const netBalanceValue =
    state.balance.leisureAvailable - state.balance.debtMinutes;
  const loanedLeisure = state.balance.loanedLeisure || 0;
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

  // Show leisure mode selection modal
  showLeisureModeModal();
}

/**
 * Start leisure session with specified minutes
 * @param {number} minutes - Minutes to use for leisure
 */
function startLeisureSession(minutes) {
  // Store the starting value for stop calculation
  leisureSessionStartMinutes = minutes;

  // Convert minutes to seconds for countdown
  const totalSeconds = Math.floor(minutes * 60);

  startLeisureTimer(
    totalSeconds,
    (remaining) => {
      updateTimerDisplay(remaining);
    },
    () => {
      // Auto-complete callback when countdown reaches zero
      handleLeisureComplete(minutes);
    },
    null,
    minutes,
    (minutesElapsed) => {
      // Callback every minute to deduct from balance
      // Deduct 1 minute from leisure balance
      const currentState = loadState();

      // Deduct from loaned leisure first, then from earned
      if (currentState.balance.loanedLeisure > 0) {
        const toDeduct = Math.min(1, currentState.balance.loanedLeisure);
        currentState.balance.loanedLeisure -= toDeduct;

        // If we couldn't deduct the full minute from loaned, deduct remainder from earned
        if (toDeduct < 1) {
          currentState.balance.leisureAvailable -= 1 - toDeduct;
        }
      } else {
        currentState.balance.leisureAvailable -= 1;
      }

      // Save the updated balance
      saveState(currentState);

      // Update balance display immediately
      updateBalanceDisplay(currentState.balance);
    }
  );

  updateButtonStates(TIMER_MODES.LEISURE);
}

/**
 * Show alarm modal and start alarm sound
 */
function showAlarmModal() {
  alarmModal.classList.remove("hidden");
  playAlarmSound();
}

/**
 * Hide alarm modal and stop alarm sound
 */
function hideAlarmModal() {
  alarmModal.classList.add("hidden");
  stopAlarmSound();
}

/**
 * Handle leisure session completion (auto-stop or manual stop)
 * @param {number} totalMinutesStarted - Total minutes when leisure started
 */
function handleLeisureComplete(totalMinutesStarted) {
  // Capture net balance BEFORE processing (already deducted in real-time)
  const stateBefore = loadState();
  const netBalanceBefore =
    stateBefore.balance.leisureAvailable - stateBefore.balance.debtMinutes;

  // NOTE: We don't call processLeisureSession here because the balance
  // has already been deducted in real-time via the onMinuteTick callback

  // Capture net balance AFTER (should be the same since already deducted)
  const stateAfter = loadState();
  const netBalanceAfter =
    stateAfter.balance.leisureAvailable - stateAfter.balance.debtMinutes;

  // Add history entry with balance changes
  addHistoryEntry({
    id: generateId(),
    date: new Date().toISOString(),
    type: "leisure",
    durationMinutes: totalMinutesStarted,
    leisureUsed: totalMinutesStarted,
    netBalanceBefore: netBalanceBefore,
    netBalanceAfter: netBalanceAfter,
  });

  // Update history display
  updateHistoryDisplay();

  // Show result message
  timerMode.textContent = t("usedLeisure", totalMinutesStarted.toFixed(1));

  // Reset timer display
  updateTimerDisplay(0);

  // Update balance display
  updateBalanceDisplay(stateAfter.balance);

  // Show alarm modal with loud sound
  showAlarmModal();

  // Return to idle state
  updateButtonStates(TIMER_MODES.IDLE);
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

    // Calculate full minutes already deducted by onMinuteTick
    const fullMinutesDeducted = Math.floor(actualUsedMinutes);

    // Calculate partial minute remaining (not yet deducted)
    const partialMinute = actualUsedMinutes - fullMinutesDeducted;

    if (actualUsedMinutes > 0) {
      // Capture net balance BEFORE final deduction
      const stateBefore = loadState();
      const netBalanceBefore =
        stateBefore.balance.leisureAvailable - stateBefore.balance.debtMinutes;

      // Only deduct the partial minute that wasn't deducted in real-time
      if (partialMinute > 0) {
        const currentState = loadState();

        // Deduct partial minute from loaned leisure first, then from earned
        if (currentState.balance.loanedLeisure > 0) {
          const toDeduct = Math.min(
            partialMinute,
            currentState.balance.loanedLeisure
          );
          currentState.balance.loanedLeisure -= toDeduct;

          if (toDeduct < partialMinute) {
            currentState.balance.leisureAvailable -= partialMinute - toDeduct;
          }
        } else {
          currentState.balance.leisureAvailable -= partialMinute;
        }

        saveState(currentState);
      }

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
  const state = loadState();
  const netBalanceValue =
    state.balance.leisureAvailable - state.balance.debtMinutes;

  // Prevent loan if balance is positive
  if (netBalanceValue > 0) {
    timerMode.textContent =
      t("cannotLoanPositiveBalance") ||
      "No puedes solicitar un préstamo con balance positivo";
    setTimeout(() => {
      updateButtonStates(TIMER_MODES.IDLE);
    }, 2000);
    return;
  }

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

/**
 * Recover and resume an active session from localStorage
 * @param {Object} session - The saved session data
 */
function recoverActiveSession(session) {
  if (!session || !session.startTimestamp || !session.mode) {
    clearActiveSession();
    return;
  }

  const elapsedMs = Date.now() - session.startTimestamp;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (session.mode === TIMER_MODES.STUDY) {
    // Resume study timer from saved timestamp
    startStudyTimer((seconds) => {
      updateTimerDisplay(seconds);
    }, session.startTimestamp);

    updateButtonStates(TIMER_MODES.STUDY);
    console.log(`Recovered study session: ${elapsedMinutes} minutes elapsed`);
  } else if (session.mode === TIMER_MODES.LEISURE) {
    const originalMinutes = session.leisureStartMinutes || 0;
    const remainingSeconds = Math.max(
      0,
      Math.floor(originalMinutes * 60) - elapsedSeconds
    );

    // If leisure time has completely elapsed, process it
    if (remainingSeconds <= 0) {
      // Process the full leisure session
      handleRecoveredLeisureComplete(originalMinutes);
      clearActiveSession();
      return;
    }

    // Store for stop calculation
    leisureSessionStartMinutes = originalMinutes;

    // Resume leisure timer from saved timestamp
    startLeisureTimer(
      remainingSeconds,
      (remaining) => {
        updateTimerDisplay(remaining);
      },
      () => {
        // Auto-complete callback when countdown reaches zero
        handleLeisureComplete(originalMinutes);
      },
      session.startTimestamp,
      originalMinutes,
      (minutesElapsed) => {
        // Callback every minute to deduct from balance (same as normal session)
        const currentState = loadState();

        if (currentState.balance.loanedLeisure > 0) {
          const toDeduct = Math.min(1, currentState.balance.loanedLeisure);
          currentState.balance.loanedLeisure -= toDeduct;

          if (toDeduct < 1) {
            currentState.balance.leisureAvailable -= 1 - toDeduct;
          }
        } else {
          currentState.balance.leisureAvailable -= 1;
        }

        saveState(currentState);
        updateBalanceDisplay(currentState.balance);
      }
    );

    updateButtonStates(TIMER_MODES.LEISURE);
    console.log(
      `Recovered leisure session: ${remainingSeconds} seconds remaining`
    );
  }
}

/**
 * Handle recovered leisure session that completed while app was closed
 * @param {number} totalMinutes - Total leisure minutes that were used
 */
function handleRecoveredLeisureComplete(totalMinutes) {
  // Capture net balance BEFORE processing
  const stateBefore = loadState();
  const netBalanceBefore =
    stateBefore.balance.leisureAvailable - stateBefore.balance.debtMinutes;

  // Process leisure session - deduct all used time
  // (This is correct here because the session was closed, no real-time deduction happened)
  const { leisureUsed } = processLeisureSession(totalMinutes);

  // Capture net balance AFTER processing
  const stateAfter = loadState();
  const netBalanceAfter =
    stateAfter.balance.leisureAvailable - stateAfter.balance.debtMinutes;

  // Add history entry with balance changes
  addHistoryEntry({
    id: generateId(),
    date: new Date().toISOString(),
    type: "leisure",
    durationMinutes: totalMinutes,
    leisureUsed: leisureUsed,
    netBalanceBefore: netBalanceBefore,
    netBalanceAfter: netBalanceAfter,
    recovered: true, // Mark as recovered session
  });

  // Update displays
  updateHistoryDisplay();
  updateBalanceDisplay(stateAfter.balance);

  // Show message that session was recovered
  timerMode.textContent =
    t("recoveredLeisure") || `Recovered: ${leisureUsed.toFixed(1)} min leisure`;

  // Show alarm modal with loud sound
  showAlarmModal();

  // Update button states
  updateButtonStates(TIMER_MODES.IDLE);
}

/**
 * Handle page unload - save current session state
 */
function handleBeforeUnload() {
  const timerState = getTimerState();
  if (timerState.isRunning) {
    // Force save the current session
    forceSaveSession();

    // For study sessions, also process and save the elapsed time immediately
    if (timerState.mode === TIMER_MODES.STUDY) {
      const elapsedMinutes = Math.floor(timerState.seconds / 60);
      if (elapsedMinutes >= 1) {
        // Process study session
        const config = getConfig();
        const stateBefore = loadState();
        const netBalanceBefore =
          stateBefore.balance.leisureAvailable -
          stateBefore.balance.debtMinutes;

        const { leisureEarned, debtReduced } = processStudySession(
          elapsedMinutes,
          config.leisureFactor
        );

        const stateAfter = loadState();
        const netBalanceAfter =
          stateAfter.balance.leisureAvailable - stateAfter.balance.debtMinutes;

        // Add history entry
        addHistoryEntry({
          id: generateId(),
          date: new Date().toISOString(),
          type: "study",
          durationMinutes: elapsedMinutes,
          leisureEarned: leisureEarned,
          leisureFactor: config.leisureFactor,
          netBalanceBefore: netBalanceBefore,
          netBalanceAfter: netBalanceAfter,
          recovered: true, // Mark as auto-saved session
        });

        // Clear the active session since we processed it
        clearActiveSession();
      }
    } else if (timerState.mode === TIMER_MODES.LEISURE) {
      // Calculate used leisure time
      const remainingMinutes = timerState.seconds / 60;
      const usedMinutes = timerState.leisureStartMinutes - remainingMinutes;

      if (usedMinutes > 0) {
        const stateBefore = loadState();
        const netBalanceBefore =
          stateBefore.balance.leisureAvailable -
          stateBefore.balance.debtMinutes;

        processLeisureSession(usedMinutes);

        const stateAfter = loadState();
        const netBalanceAfter =
          stateAfter.balance.leisureAvailable - stateAfter.balance.debtMinutes;

        addHistoryEntry({
          id: generateId(),
          date: new Date().toISOString(),
          type: "leisure",
          durationMinutes: usedMinutes,
          leisureUsed: usedMinutes,
          netBalanceBefore: netBalanceBefore,
          netBalanceAfter: netBalanceAfter,
          recovered: true,
        });

        clearActiveSession();
      }
    }
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

  // Check for active session to recover
  const activeSession = loadActiveSession();
  if (activeSession) {
    recoverActiveSession(activeSession);
  }

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

  // Alarm modal button
  stopAlarmBtn.addEventListener("click", hideAlarmModal);

  // Leisure mode modal buttons
  leisureCustomConfirmBtn.addEventListener("click", () => {
    const validation = validateCustomLeisureTime();
    if (validation.valid) {
      hideLeisureModeModal();
      startLeisureSession(validation.minutes);
    } else {
      leisureCustomError.textContent = validation.error;
      leisureCustomError.classList.remove("hidden");
    }
  });

  leisureUseAllBtn.addEventListener("click", () => {
    const state = loadState();
    const netBalanceValue =
      state.balance.leisureAvailable - state.balance.debtMinutes;
    const loanedLeisure = state.balance.loanedLeisure || 0;
    const totalAvailable = Math.max(0, netBalanceValue) + loanedLeisure;

    hideLeisureModeModal();
    startLeisureSession(totalAvailable);
  });

  leisureModeCancelBtn.addEventListener("click", hideLeisureModeModal);

  // Clear error on input change
  leisureCustomTimeInput.addEventListener("input", () => {
    leisureCustomError.classList.add("hidden");
  });

  // Auto-stop alarm event
  window.addEventListener("alarmAutoStopped", () => {
    hideAlarmModal();
  });

  // Add beforeunload listener to save session on page close/refresh
  window.addEventListener("beforeunload", handleBeforeUnload);

  console.log("Study Time Tracker initialized");
}

// Run on DOM ready
document.addEventListener("DOMContentLoaded", init);
