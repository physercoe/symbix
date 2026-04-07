import { create } from 'zustand';
import en from './en';
import zh from './zh';
import type { TranslationKey } from './en';

export type Locale = 'en' | 'zh';

const translations: Record<Locale, Record<string, string>> = { en, zh };

const STORAGE_KEY = 'symbix:locale';

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'zh') return stored;
  // Auto-detect from browser
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: getInitialLocale(),
  setLocale: (locale) => {
    localStorage.setItem(STORAGE_KEY, locale);
    set({ locale });
  },
}));

/**
 * Translation hook. Returns a `t` function that maps keys to localized strings.
 *
 * Supports interpolation: t('key', { name: 'Alice' }) replaces {name} with Alice.
 */
export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const dict = translations[locale];

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let value = dict[key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  }

  return { t, locale };
}

export type { TranslationKey };
