// storage.js - State persistence with localStorage

const STORAGE_KEY = "studyTrackerState";
const MAX_HISTORY_ENTRIES = 50;

/** Default application state */
export const DEFAULT_STATE = {
  config: {
    leisureFactor: 0.5,
    loanInterestRate: 0.1,
    maxDebtLimit: 60,
  },
  balance: {
    leisureAvailable: 0,
    debtMinutes: 0,
  },
  history: [],
};

/**
 * Check if localStorage is available
 * @returns {boolean} True if localStorage works
 */
function isStorageAvailable() {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Load application state from storage
 * @returns {Object} Complete state (or defaults if empty/corrupted)
 */
export function loadState() {
  if (!isStorageAvailable()) {
    console.warn("localStorage not available, using in-memory defaults");
    return { ...DEFAULT_STATE, history: [] };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      // Ensure all required fields exist
      return {
        config: { ...DEFAULT_STATE.config, ...state.config },
        balance: { ...DEFAULT_STATE.balance, ...state.balance },
        history: Array.isArray(state.history) ? state.history : [],
      };
    }
  } catch (e) {
    console.warn("Invalid state in storage, using defaults:", e.message);
  }
  return { ...DEFAULT_STATE, history: [] };
}

/**
 * Save application state to storage
 * @param {Object} state - State to persist
 */
export function saveState(state) {
  if (!isStorageAvailable()) {
    console.warn("localStorage not available, state not persisted");
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state:", e.message);
  }
}

/**
 * Add session to history
 * @param {Object} entry - Session entry to add
 */
export function addHistoryEntry(entry) {
  const state = loadState();
  state.history.unshift(entry);
  // Enforce 50-entry limit
  if (state.history.length > MAX_HISTORY_ENTRIES) {
    state.history = state.history.slice(0, MAX_HISTORY_ENTRIES);
  }
  saveState(state);
}

/**
 * Clear all history
 */
export function clearHistory() {
  const state = loadState();
  state.history = [];
  saveState(state);
}

/**
 * Update balance
 * @param {Object} balance - New balance values
 */
export function updateBalance(balance) {
  const state = loadState();
  state.balance = { ...state.balance, ...balance };
  saveState(state);
}

/**
 * Process a completed study session with debt reduction logic
 * @param {number} studyMinutes - Minutes studied
 * @param {number} leisureFactor - Current leisure factor from config
 * @returns {{ leisureEarned: number, debtReduced: number }} Results of the session
 */
export function processStudySession(studyMinutes, leisureFactor) {
  const state = loadState();
  let debtReduced = 0;
  let effectiveStudyMinutes = studyMinutes;
  let leisureEarned = 0;

  // If there's debt, reduce it first
  if (state.balance.debtMinutes > 0) {
    debtReduced = Math.min(studyMinutes, state.balance.debtMinutes);
    state.balance.debtMinutes -= debtReduced;
    effectiveStudyMinutes = studyMinutes - debtReduced;
  }

  // Remaining study time earns leisure
  if (effectiveStudyMinutes > 0) {
    leisureEarned = effectiveStudyMinutes * leisureFactor;
    state.balance.leisureAvailable += leisureEarned;
  }

  saveState(state);

  return { leisureEarned, debtReduced };
}

/**
 * Process a completed leisure session
 * @param {number} minutesUsed - Leisure minutes consumed
 * @returns {{ leisureUsed: number }} Results of the session
 */
export function processLeisureSession(minutesUsed) {
  const state = loadState();

  // Deduct from available leisure
  state.balance.leisureAvailable = Math.max(
    0,
    state.balance.leisureAvailable - minutesUsed
  );

  saveState(state);

  return { leisureUsed: minutesUsed };
}

/**
 * Process a loan request
 * @param {number} loanMinutes - Leisure minutes borrowed
 * @param {number} repaymentDue - Study minutes required to repay
 * @returns {{ loanMinutes: number, repaymentDue: number }} Results of the loan
 */
export function processLoan(loanMinutes, repaymentDue) {
  const state = loadState();

  // Add borrowed leisure time
  state.balance.leisureAvailable += loanMinutes;

  // Add debt (study time to repay)
  state.balance.debtMinutes += repaymentDue;

  saveState(state);

  return { loanMinutes, repaymentDue };
}
