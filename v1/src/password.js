// password.js - Password management for manual time adjustment

const PASSWORD_STORAGE_KEY = "studyTrackerPassword";

/**
 * Simple hash function using Web Crypto API
 * @param {string} text - Text to hash
 * @returns {Promise<string>} Hashed text
 */
async function hashPassword(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

/**
 * Check if password is configured
 * @returns {boolean} True if password exists
 */
export function hasPassword() {
  try {
    const stored = localStorage.getItem(PASSWORD_STORAGE_KEY);
    return stored !== null && stored !== "";
  } catch (e) {
    console.warn("Cannot check password:", e.message);
    return false;
  }
}

/**
 * Save password hash to storage
 * @param {string} password - Password to save
 * @returns {Promise<boolean>} True if saved successfully
 */
export async function savePassword(password) {
  if (!password || password.length < 4) {
    throw new Error("Password must be at least 4 characters");
  }

  try {
    const hash = await hashPassword(password);
    localStorage.setItem(PASSWORD_STORAGE_KEY, hash);
    return true;
  } catch (e) {
    console.error("Failed to save password:", e.message);
    throw new Error("Failed to save password");
  }
}

/**
 * Verify if provided password matches stored hash
 * @param {string} password - Password to verify
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password) {
  if (!hasPassword()) {
    return false;
  }

  try {
    const hash = await hashPassword(password);
    const storedHash = localStorage.getItem(PASSWORD_STORAGE_KEY);
    return hash === storedHash;
  } catch (e) {
    console.error("Failed to verify password:", e.message);
    return false;
  }
}

/**
 * Clear password from storage (admin reset)
 * WARNING: This will allow reconfiguring password but user loses access
 */
export function clearPassword() {
  try {
    localStorage.removeItem(PASSWORD_STORAGE_KEY);
    return true;
  } catch (e) {
    console.error("Failed to clear password:", e.message);
    return false;
  }
}
