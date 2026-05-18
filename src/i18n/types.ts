export const SUPPORTED_LOCALES = ["pt-BR", "en-US", "es-AL"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type TranslationValue = string | TranslationTree;

export type TranslationTree = {
  [key: string]: TranslationValue;
};

export type LocaleOption = {
  locale: SupportedLocale;
  label: string;
  nativeLabel: string;
};
