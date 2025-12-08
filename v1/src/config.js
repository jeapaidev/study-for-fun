// config.js - Configuration management module

const STORAGE_KEY = "studyTrackerConfig";

/** Default configuration values */
export const DEFAULT_CONFIG = {
  leisureFactor: 0.5,
  loanInterestRate: 0.1,
  maxDebtLimit: 60,
};

/**
 * Validate configuration values
 * @param {Object} config - Configuration to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateConfig(config) {
  if (config.leisureFactor < 0.1 || config.leisureFactor > 1.0) {
    throw new Error("leisureFactor must be between 0.1 and 1.0");
  }
  if (config.loanInterestRate < 0.0 || config.loanInterestRate > 0.5) {
    throw new Error("loanInterestRate must be between 0.0 and 0.5");
  }
  if (config.maxDebtLimit < 0 || config.maxDebtLimit > 180) {
    throw new Error("maxDebtLimit must be between 0 and 180");
  }
  return true;
}

/**
 * Get current configuration
 * @returns {Object} Current config (from storage or defaults)
 */
export function getConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      validateConfig(config);
      return config;
    }
  } catch (e) {
    console.warn("Invalid config in storage, using defaults:", e.message);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Save configuration to storage
 * @param {Object} config - Configuration to save
 * @throws {Error} If validation fails
 */
export function saveConfig(config) {
  validateConfig(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Reset configuration to defaults
 * @returns {Object} Default configuration
 */
export function resetConfig() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_CONFIG };
}
