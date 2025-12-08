// i18n.js - Internationalization module

const LANGUAGE_STORAGE_KEY = "studyTrackerLanguage";

/** Supported languages */
export const LANGUAGES = {
  en: "English",
  es: "Español",
  fr: "Français",
};

/** Default language */
export const DEFAULT_LANGUAGE = "en";

/** Translation strings for all languages */
const translations = {
  en: {
    // Header
    appTitle: "📖 Study & Play",
    appSubtitle: "Study to earn play time!",

    // Timer section
    ready: "Ready",
    studying: "📚 Studying...",
    leisure: "🎮 Leisure...",
    netBalance: "Net Balance",
    positiveHint: "Positive = play time available",
    negativeHint: "Negative = study time owed",

    // Action buttons
    study: "Study",
    leisureBtn: "Leisure",
    loan: "Loan",
    stopTimer: "Stop Timer",

    // Loan section
    requestLoan: "Request Loan",
    leisureMinutesToBorrow: "Leisure minutes to borrow",
    repaymentRequired: "Repayment required:",
    minStudy: "min study",
    confirm: "Confirm",
    cancel: "Cancel",
    exceedsDebtLimit: "Exceeds debt limit (max {0} min)",
    minimumLoan: "Minimum loan is 1 minute",

    // Settings section
    settings: "Settings",
    language: "Language",
    leisureFactor: "Leisure Factor (0.1 - 1.0)",
    leisureFactorHint: "1 min study = X min leisure",
    loanInterestRate: "Loan Interest Rate (0% - 50%)",
    loanInterestHint: "Extra study required on loans",
    maxDebtLimit: "Max Debt Limit (minutes)",
    maxDebtHint: "Maximum study debt allowed (0 = unlimited)",
    save: "Save",
    reset: "Reset",
    settingsSaved: "✅ Settings saved successfully",
    settingsReset: "🔄 Settings reset to defaults",

    // History section
    history: "History",
    noHistory: "No history yet",
    clearHistory: "Clear History",
    clearHistoryConfirm: "Are you sure you want to clear all history?",
    historyCleared: "🗑️ History cleared",
    cannotClearDebt: "Cannot clear history while you have pending debt",
    clearAllHistory: "Clear all history",

    // History entries
    studyEntry: "Study",
    leisureEntry: "Leisure",
    loanEntry: "Loan",
    unknownEntry: "Unknown",
    factor: "factor",
    interest: "interest",
    balance: "Balance",
    minLeisure: "min leisure",
    minUsed: "min used",
    minBorrowed: "min borrowed",
    minToRepay: "min to repay",

    // Messages
    notEnoughLeisure: "⚠️ Need at least 1 min (you have {0} min)",
    sessionTooShort: "⚠️ Session too short (min 1 min)",
    earnedLeisure: "✅ Earned {0} min leisure",
    debtPaid: "({0} min debt paid)",
    usedLeisure: "🎮 Used {0} min leisure",
    leisureStopped: "🎮 Leisure session stopped",
    borrowed: "💰 Borrowed {0} min ({1} min to repay)",

    // Footer
    version: "Study & Play v1.0",
  },
  es: {
    // Header
    appTitle: "📖 Estudia & Juega",
    appSubtitle: "¡Estudia para ganar tiempo de juego!",

    // Timer section
    ready: "Listo",
    studying: "📚 Estudiando...",
    leisure: "🎮 Ocio...",
    netBalance: "Balance Neto",
    positiveHint: "Positivo = tiempo de juego disponible",
    negativeHint: "Negativo = tiempo de estudio pendiente",

    // Action buttons
    study: "Estudiar",
    leisureBtn: "Ocio",
    loan: "Préstamo",
    stopTimer: "Detener",

    // Loan section
    requestLoan: "Solicitar Préstamo",
    leisureMinutesToBorrow: "Minutos de ocio a pedir",
    repaymentRequired: "Pago requerido:",
    minStudy: "min estudio",
    confirm: "Confirmar",
    cancel: "Cancelar",
    exceedsDebtLimit: "Excede límite de deuda (máx {0} min)",
    minimumLoan: "El préstamo mínimo es 1 minuto",

    // Settings section
    settings: "Configuración",
    language: "Idioma",
    leisureFactor: "Factor de Ocio (0.1 - 1.0)",
    leisureFactorHint: "1 min estudio = X min ocio",
    loanInterestRate: "Tasa de Interés (0% - 50%)",
    loanInterestHint: "Estudio extra requerido en préstamos",
    maxDebtLimit: "Límite de Deuda (minutos)",
    maxDebtHint: "Deuda máxima permitida (0 = ilimitado)",
    save: "Guardar",
    reset: "Restablecer",
    settingsSaved: "✅ Configuración guardada",
    settingsReset: "🔄 Configuración restablecida",

    // History section
    history: "Historial",
    noHistory: "Sin historial",
    clearHistory: "Borrar Historial",
    clearHistoryConfirm: "¿Estás seguro de borrar todo el historial?",
    historyCleared: "🗑️ Historial borrado",
    cannotClearDebt: "No puedes borrar el historial con deuda pendiente",
    clearAllHistory: "Borrar todo el historial",

    // History entries
    studyEntry: "Estudio",
    leisureEntry: "Ocio",
    loanEntry: "Préstamo",
    unknownEntry: "Desconocido",
    factor: "factor",
    interest: "interés",
    balance: "Balance",
    minLeisure: "min ocio",
    minUsed: "min usado",
    minBorrowed: "min prestado",
    minToRepay: "min a pagar",

    // Messages
    notEnoughLeisure: "⚠️ Necesitas al menos 1 min (tienes {0} min)",
    sessionTooShort: "⚠️ Sesión muy corta (mín 1 min)",
    earnedLeisure: "✅ Ganaste {0} min de ocio",
    debtPaid: "({0} min de deuda pagada)",
    usedLeisure: "🎮 Usaste {0} min de ocio",
    leisureStopped: "🎮 Sesión de ocio detenida",
    borrowed: "💰 Prestaste {0} min ({1} min a pagar)",

    // Footer
    version: "Estudia & Juega v1.0",
  },
  fr: {
    // Header
    appTitle: "📖 Étudie & Joue",
    appSubtitle: "Étudie pour gagner du temps de jeu !",

    // Timer section
    ready: "Prêt",
    studying: "📚 En étude...",
    leisure: "🎮 Loisir...",
    netBalance: "Solde Net",
    positiveHint: "Positif = temps de jeu disponible",
    negativeHint: "Négatif = temps d'étude dû",

    // Action buttons
    study: "Étudier",
    leisureBtn: "Loisir",
    loan: "Prêt",
    stopTimer: "Arrêter",

    // Loan section
    requestLoan: "Demander un Prêt",
    leisureMinutesToBorrow: "Minutes de loisir à emprunter",
    repaymentRequired: "Remboursement requis :",
    minStudy: "min étude",
    confirm: "Confirmer",
    cancel: "Annuler",
    exceedsDebtLimit: "Dépasse la limite de dette (max {0} min)",
    minimumLoan: "Le prêt minimum est de 1 minute",

    // Settings section
    settings: "Paramètres",
    language: "Langue",
    leisureFactor: "Facteur de Loisir (0.1 - 1.0)",
    leisureFactorHint: "1 min étude = X min loisir",
    loanInterestRate: "Taux d'Intérêt (0% - 50%)",
    loanInterestHint: "Étude supplémentaire sur les prêts",
    maxDebtLimit: "Limite de Dette (minutes)",
    maxDebtHint: "Dette maximale autorisée (0 = illimité)",
    save: "Sauvegarder",
    reset: "Réinitialiser",
    settingsSaved: "✅ Paramètres sauvegardés",
    settingsReset: "🔄 Paramètres réinitialisés",

    // History section
    history: "Historique",
    noHistory: "Pas encore d'historique",
    clearHistory: "Effacer l'Historique",
    clearHistoryConfirm: "Voulez-vous vraiment effacer tout l'historique ?",
    historyCleared: "🗑️ Historique effacé",
    cannotClearDebt: "Impossible d'effacer l'historique avec une dette",
    clearAllHistory: "Effacer tout l'historique",

    // History entries
    studyEntry: "Étude",
    leisureEntry: "Loisir",
    loanEntry: "Prêt",
    unknownEntry: "Inconnu",
    factor: "facteur",
    interest: "intérêt",
    balance: "Solde",
    minLeisure: "min loisir",
    minUsed: "min utilisé",
    minBorrowed: "min emprunté",
    minToRepay: "min à rembourser",

    // Messages
    notEnoughLeisure: "⚠️ Il faut au moins 1 min (vous avez {0} min)",
    sessionTooShort: "⚠️ Session trop courte (min 1 min)",
    earnedLeisure: "✅ Gagné {0} min de loisir",
    debtPaid: "({0} min de dette payée)",
    usedLeisure: "🎮 Utilisé {0} min de loisir",
    leisureStopped: "🎮 Session de loisir arrêtée",
    borrowed: "💰 Emprunté {0} min ({1} min à rembourser)",

    // Footer
    version: "Étudie & Joue v1.0",
  },
};

/**
 * Get current language from storage
 * @returns {string} Language code (en, es, fr)
 */
export function getLanguage() {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && LANGUAGES[stored]) {
    return stored;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Save language to storage
 * @param {string} lang - Language code (en, es, fr)
 */
export function saveLanguage(lang) {
  if (!LANGUAGES[lang]) {
    throw new Error(`Unsupported language: ${lang}`);
  }
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

/**
 * Get translation for a key
 * @param {string} key - Translation key
 * @param {...any} args - Arguments for placeholders {0}, {1}, etc.
 * @returns {string} Translated string
 */
export function t(key, ...args) {
  const lang = getLanguage();
  const langStrings = translations[lang] || translations[DEFAULT_LANGUAGE];
  let text = langStrings[key] || translations[DEFAULT_LANGUAGE][key] || key;

  // Replace placeholders {0}, {1}, etc.
  args.forEach((arg, index) => {
    text = text.replace(`{${index}}`, arg);
  });

  return text;
}

/**
 * Get all translations for current language
 * @returns {Object} All translation strings
 */
export function getAllTranslations() {
  const lang = getLanguage();
  return translations[lang] || translations[DEFAULT_LANGUAGE];
}
