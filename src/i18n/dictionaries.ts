import { enUS } from "./locales/en-US";
import { esAL } from "./locales/es-AL";
import { ptBR } from "./locales/pt-BR";
import type { SupportedLocale, TranslationTree } from "./types";

export const DEFAULT_LOCALE: SupportedLocale = "pt-BR";

export const dictionaries = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-AL": esAL,
} satisfies Record<SupportedLocale, TranslationTree>;
