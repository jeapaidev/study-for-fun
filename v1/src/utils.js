/**
 * Business logic calculations for Study Time Tracker
 * @module utils
 */

/**
 * Calculate leisure earned from study time
 * @param {number} studyMinutes - Minutes studied
 * @param {number} factor - Leisure factor (0.1-1.0)
 * @returns {number} Leisure minutes earned
 */
export function studyToLeisure(studyMinutes, factor) {
  return studyMinutes * factor;
}

/**
 * Calculate study repayment for a loan
 * @param {number} loanMinutes - Leisure minutes to borrow
 * @param {number} factor - Leisure factor
 * @param {number} interestRate - Interest rate (decimal, e.g., 0.1 for 10%)
 * @returns {number} Study minutes required to repay
 */
export function calculateLoanRepayment(loanMinutes, factor, interestRate) {
  const studyMultiplier = 1 / factor;
  return loanMinutes * studyMultiplier * (1 + interestRate);
}

/**
 * Format seconds as MM:SS
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Generate unique session ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
