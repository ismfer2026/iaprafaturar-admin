import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_LOCALE, dictionaries } from "./dictionaries";
import { SUPPORTED_LOCALES, type LocaleOption, type SupportedLocale } from "./types";

const STORAGE_KEY = "iap_locale";

type I18nContextValue = {
  locale: SupportedLocale;
  localeOptions: LocaleOption[];
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, fallbackOrParams?: string | TranslationParams, params?: TranslationParams) => string;
};

type TranslationParams = Record<string, string | number>;

const localeOptions: LocaleOption[] = [
  { locale: "pt-BR", label: "Português (Brasil)", nativeLabel: "Português (Brasil)" },
  { locale: "en-US", label: "English (US)", nativeLabel: "English (US)" },
  { locale: "es-AL", label: "Español (América Latina)", nativeLabel: "Español (América Latina)" },
];

const I18nContext = createContext<I18nContextValue | null>(null);

const isSupportedLocale = (value: string | null | undefined): value is SupportedLocale =>
  SUPPORTED_LOCALES.includes(value as SupportedLocale);

const normalizeBrowserLocale = (value: string | undefined): SupportedLocale | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();

  if (normalized.startsWith("pt")) return "pt-BR";
  if (normalized.startsWith("en")) return "en-US";
  if (normalized.startsWith("es")) return "es-AL";

  return null;
};

const getNestedValue = (source: unknown, path: string): string | undefined => {
  const value = path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);

  return typeof value === "string" ? value : undefined;
};

const interpolate = (value: string, params?: TranslationParams): string => {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
  ));
};

const getInitialLocale = (): SupportedLocale => {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    // Storage can be unavailable in private browsing or restricted webviews.
  }

  const browserLocale = normalizeBrowserLocale(window.navigator.language);
  return browserLocale ?? DEFAULT_LOCALE;
};

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // The selected locale still applies for the current session.
    }
  }, [locale]);

  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback(
    (key: string, fallbackOrParams?: string | TranslationParams, params?: TranslationParams) => {
      const fallback = typeof fallbackOrParams === "string" ? fallbackOrParams : undefined;
      const interpolationParams = typeof fallbackOrParams === "object" ? fallbackOrParams : params;
      const value = (
        getNestedValue(dictionaries[locale], key) ??
        getNestedValue(dictionaries[DEFAULT_LOCALE], key) ??
        fallback ??
        key
      );
      return interpolate(value, interpolationParams);
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      localeOptions,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return React.createElement(I18nContext.Provider, { value }, children);
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
};

export type { SupportedLocale } from "./types";
