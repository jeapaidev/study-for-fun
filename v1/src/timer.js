/**
 * Timer state and control module
 * Manages study (count-up) and leisure (countdown) timers
 */

/** Timer modes */
export const TIMER_MODES = {
  IDLE: "idle",
  STUDY: "study",
  LEISURE: "leisure",
};

/** Internal timer state */
let timerState = {
  mode: TIMER_MODES.IDLE,
  seconds: 0,
  isRunning: false,
  intervalId: null,
  onTick: null,
  onComplete: null,
};

/**
 * Get current timer state
 * @returns {{ mode: string, seconds: number, isRunning: boolean }}
 */
export function getTimerState() {
  return {
    mode: timerState.mode,
    seconds: timerState.seconds,
    isRunning: timerState.isRunning,
  };
}

/**
 * Start study timer (count-up)
 * @param {function} onTick - Callback called every second with elapsed seconds
 */
export function startStudyTimer(onTick) {
  // Stop any existing timer
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }

  timerState = {
    mode: TIMER_MODES.STUDY,
    seconds: 0,
    isRunning: true,
    intervalId: null,
    onTick: onTick,
    onComplete: null,
  };

  timerState.intervalId = setInterval(() => {
    timerState.seconds++;
    if (timerState.onTick) {
      timerState.onTick(timerState.seconds);
    }
  }, 1000);
}

/**
 * Start leisure countdown timer
 * @param {number} totalSeconds - Starting seconds
 * @param {function} onTick - Callback with remaining seconds
 * @param {function} onComplete - Callback when countdown reaches zero
 */
export function startLeisureTimer(totalSeconds, onTick, onComplete) {
  // Stop any existing timer
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }

  timerState = {
    mode: TIMER_MODES.LEISURE,
    seconds: totalSeconds,
    isRunning: true,
    intervalId: null,
    onTick: onTick,
    onComplete: onComplete,
  };

  // Initial tick
  if (timerState.onTick) {
    timerState.onTick(timerState.seconds);
  }

  timerState.intervalId = setInterval(() => {
    timerState.seconds--;
    if (timerState.onTick) {
      timerState.onTick(timerState.seconds);
    }

    // Auto-complete when countdown reaches zero
    if (timerState.seconds <= 0) {
      clearInterval(timerState.intervalId);
      timerState.isRunning = false;
      if (timerState.onComplete) {
        timerState.onComplete();
      }
    }
  }, 1000);
}

/**
 * Stop current timer
 * @returns {{ mode: string, elapsed: number }} Timer mode and seconds elapsed/used
 */
export function stopTimer() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }

  const result = {
    mode: timerState.mode,
    elapsed: timerState.seconds,
  };

  // Reset state
  timerState = {
    mode: TIMER_MODES.IDLE,
    seconds: 0,
    isRunning: false,
    intervalId: null,
    onTick: null,
    onComplete: null,
  };

  return result;
}
