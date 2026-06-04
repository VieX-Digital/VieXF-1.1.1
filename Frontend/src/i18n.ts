import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import en from "./locales/en/translation.json"
import vi from "./locales/vi/translation.json"
import enOnboarding from "./locales/en/onboarding.json"
import viOnboarding from "./locales/vi/onboarding.json"

// Ensure localStorage has a default language of 'vi' on first startup
const savedLang =
  typeof window !== "undefined" && window.localStorage
    ? window.localStorage.getItem("vie:lang")
    : null
if (typeof window !== "undefined" && window.localStorage && !savedLang) {
  window.localStorage.setItem("vie:lang", "vi")
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en, onboarding: enOnboarding },
      vi: { translation: vi, onboarding: viOnboarding },
    },
    lng: savedLang || "vi",
    fallbackLng: "vi",
    debug: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "vie:lang",
      caches: ["localStorage"],
    },
  })

export default i18n
