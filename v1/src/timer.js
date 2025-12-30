/**
 * Timer state and control module
 * Manages study (count-up) and leisure (countdown) timers
 * Includes auto-save functionality to persist progress
 */

/** Timer modes */
export const TIMER_MODES = {
  IDLE: "idle",
  STUDY: "study",
  LEISURE: "leisure",
};

/** Storage key for active session */
const ACTIVE_SESSION_KEY = "studyTrackerActiveSession";

/** Internal timer state */
let timerState = {
  mode: TIMER_MODES.IDLE,
  seconds: 0,
  isRunning: false,
  intervalId: null,
  onTick: null,
  onComplete: null,
  onMinuteTick: null, // Callback every minute
  startTimestamp: null, // When the session started
  leisureStartMinutes: 0, // For leisure mode: starting minutes
  minutesElapsed: 0, // Track minutes elapsed for leisure
};

/**
 * Get current timer state
 * @returns {{ mode: string, seconds: number, isRunning: boolean, startTimestamp: number|null, leisureStartMinutes: number }}
 */
export function getTimerState() {
  return {
    mode: timerState.mode,
    seconds: timerState.seconds,
    isRunning: timerState.isRunning,
    startTimestamp: timerState.startTimestamp,
    leisureStartMinutes: timerState.leisureStartMinutes,
  };
}

/**
 * Save active session to localStorage for recovery
 * @param {string} [tabId] - Optional tab ID to mark session ownership
 */
function saveActiveSession(tabId = null) {
  if (!timerState.isRunning) return;

  const session = {
    mode: timerState.mode,
    startTimestamp: timerState.startTimestamp,
    leisureStartMinutes: timerState.leisureStartMinutes,
    savedAt: Date.now(),
    tabId: tabId || timerState.tabId, // Track which tab owns this session
  };

  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn("Failed to save active session:", e.message);
  }
}

/**
 * Clear active session from localStorage
 */
export function clearActiveSession() {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (e) {
    console.warn("Failed to clear active session:", e.message);
  }
}

/**
 * Load active session from localStorage
 * @returns {Object|null} Active session data or null
 */
export function loadActiveSession() {
  try {
    const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to load active session:", e.message);
  }
  return null;
}

/**
 * Start study timer (count-up)
 * @param {function} onTick - Callback called every second with elapsed seconds
 * @param {number} [resumeFromTimestamp] - Optional timestamp to resume from
 * @param {string} [tabId] - Optional tab ID to mark session ownership
 */
export function startStudyTimer(
  onTick,
  resumeFromTimestamp = null,
  tabId = null
) {
  // Stop any existing timer
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }

  const startTimestamp = resumeFromTimestamp || Date.now();

  // Calculate initial seconds if resuming
  let initialSeconds = 0;
  if (resumeFromTimestamp) {
    initialSeconds = Math.floor((Date.now() - resumeFromTimestamp) / 1000);
  }

  timerState = {
    mode: TIMER_MODES.STUDY,
    seconds: initialSeconds,
    isRunning: true,
    intervalId: null,
    onTick: onTick,
    onComplete: null,
    startTimestamp: startTimestamp,
    leisureStartMinutes: 0,
    tabId: tabId, // Store tab ID
  };

  // Save initial session state with tab ID
  saveActiveSession(tabId);

  timerState.intervalId = setInterval(() => {
    timerState.seconds++;
    if (timerState.onTick) {
      timerState.onTick(timerState.seconds);
    }
    // Auto-save every 60 seconds (1 minute)
    if (timerState.seconds % 60 === 0) {
      saveActiveSession(tabId);
    }
  }, 1000);
}

/**
 * Start leisure countdown timer
 * @param {number} totalSeconds - Starting seconds
 * @param {function} onTick - Callback with remaining seconds
 * @param {function} onComplete - Callback when countdown reaches zero
 * @param {number} [resumeFromTimestamp] - Optional timestamp to resume from
 * @param {number} [originalStartMinutes] - Original leisure minutes when session started
 * @param {function} [onMinuteTick] - Optional callback every minute for balance deduction
 */
export function startLeisureTimer(
  totalSeconds,
  onTick,
  onComplete,
  resumeFromTimestamp = null,
  originalStartMinutes = null,
  onMinuteTick = null
) {
  // Stop any existing timer
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }

  const startTimestamp = resumeFromTimestamp || Date.now();
  const leisureStartMinutes = originalStartMinutes || totalSeconds / 60;

  // Calculate remaining seconds if resuming
  let currentSeconds = totalSeconds;
  let minutesAlreadyElapsed = 0;

  if (resumeFromTimestamp) {
    const elapsedSeconds = Math.floor(
      (Date.now() - resumeFromTimestamp) / 1000
    );
    currentSeconds = Math.max(
      0,
      Math.floor(leisureStartMinutes * 60) - elapsedSeconds
    );
    minutesAlreadyElapsed = Math.floor(elapsedSeconds / 60);
  }

  timerState = {
    mode: TIMER_MODES.LEISURE,
    seconds: currentSeconds,
    isRunning: true,
    intervalId: null,
    onTick: onTick,
    onComplete: onComplete,
    onMinuteTick: onMinuteTick,
    startTimestamp: startTimestamp,
    leisureStartMinutes: leisureStartMinutes,
    minutesElapsed: minutesAlreadyElapsed,
    tabId: null, // Will be set if needed
  };

  // Save initial session state
  saveActiveSession();

  // Initial tick
  if (timerState.onTick) {
    timerState.onTick(timerState.seconds);
  }

  // If already at zero (from resuming), complete immediately
  if (currentSeconds <= 0) {
    clearActiveSession();
    timerState.isRunning = false;
    if (timerState.onComplete) {
      timerState.onComplete();
    }
    return;
  }

  let lastMinute = Math.ceil(currentSeconds / 60);

  timerState.intervalId = setInterval(() => {
    timerState.seconds--;

    if (timerState.onTick) {
      timerState.onTick(timerState.seconds);
    }

    // Check if a full minute has passed
    const currentMinute = Math.ceil(timerState.seconds / 60);
    if (currentMinute < lastMinute) {
      lastMinute = currentMinute;
      timerState.minutesElapsed++;

      // Trigger minute callback for balance deduction
      if (timerState.onMinuteTick) {
        timerState.onMinuteTick(timerState.minutesElapsed);
      }
    }

    // Auto-save every 60 seconds (1 minute)
    if (timerState.seconds % 60 === 0 && timerState.seconds > 0) {
      saveActiveSession();
    }

    // Auto-complete when countdown reaches zero
    if (timerState.seconds <= 0) {
      clearInterval(timerState.intervalId);
      clearActiveSession();
      timerState.isRunning = false;
      if (timerState.onComplete) {
        timerState.onComplete();
      }
    }
  }, 1000);
}

/**
 * Stop current timer
 * @returns {{ mode: string, elapsed: number, startTimestamp: number|null, leisureStartMinutes: number }} Timer mode, seconds elapsed/used, and session info
 */
export function stopTimer() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }

  // Clear saved session
  clearActiveSession();

  const result = {
    mode: timerState.mode,
    elapsed: timerState.seconds,
    startTimestamp: timerState.startTimestamp,
    leisureStartMinutes: timerState.leisureStartMinutes,
  };

  // Reset state
  timerState = {
    mode: TIMER_MODES.IDLE,
    seconds: 0,
    isRunning: false,
    intervalId: null,
    onTick: null,
    onComplete: null,
    onMinuteTick: null,
    startTimestamp: null,
    leisureStartMinutes: 0,
    minutesElapsed: 0,
  };

  return result;
}

/**
 * Force save current session (useful for beforeunload)
 */
export function forceSaveSession() {
  saveActiveSession();
}
