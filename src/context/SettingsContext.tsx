import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { fetchProfile, updateProfile } from '../api/profile';

type Lang = 'NL' | 'EN';

const translations = {
  NL: {
    // common
    'common.loading': 'Laden...',
    'common.retry': 'Opnieuw proberen',
    'common.profile': 'Profiel',
    'common.user': 'Gebruiker',
    'common.amerikaanseDollar': 'Amerikaanse Dollar',
    'common.surinaamseDollar': 'Surinaamse Dollar',
    'common.unknown': 'Onbekend',

    // bottom nav
    'nav.dashboard': 'Dashboard',
    'nav.rates': 'Koersen',
    'nav.prices': 'Prijzen',
    'nav.settings': 'Instellingen',

    // top bar
    'topbar.refresh': 'Vernieuwen',
    'topbar.settings': 'Instellingen',
    'topbar.updatePrefix': 'Update: ',

    // page titles
    'pageTitle.rates': 'Wisselkoersen',
    'pageTitle.prices': 'Prijsvergelijker',
    'pageTitle.settings': 'Instellingen',
    'pageTitle.default': 'Sovereign Ledger',

    // dashboard
    'dashboard.title': 'Wisselkoersen Dashboard',
    'dashboard.subtitle': 'Real-time financiële inzichten voor Suriname.',
    'dashboard.loading': 'Koersen laden...',
    'dashboard.lastUpdatedPrefix': 'Laatst bijgewerkt: ',

    // rates
    'rates.title': 'Wisselkoersen',
    'rates.subtitle': 'Alle koersen op één plek – officieel & straat.',
    'rates.loading': 'Koersen laden...',
    'rates.lastUpdatedPrefix': 'Laatst bijgewerkt: ',
    'rates.officialLabel': 'Official (CBvS)',
    'rates.streetLabel': 'Street (Cambio)',
    'rates.buy': 'Aankoop',
    'rates.sell': 'Verkoop',
    'rates.spread': 'Spread: {value} SRD',

    // converter
    'converter.title': 'Valutaomzetter',
    'converter.subtitle': 'Snel en eenvoudig omrekenen',
    'converter.liveBadge': 'Live Street Rate',
    'converter.fromLabel': 'Van {currency}',
    'converter.toLabel': 'Naar {currency}',
    'converter.loading': 'Wisselkoers laden...',
    'converter.ratePrefix': 'Wisselkoers: 1 USD = {rate} SRD',
    'converter.streetRateSublabel': 'Street Buy Rate',
    'converter.inputPlaceholder': '0.00',
    'converter.noRateFound': 'Kan USD wisselkoers niet vinden.',
    'converter.fetchError': 'Kan wisselkoers niet laden. Controleer je verbinding.',

    // currency card
    'card.official': 'Official (CBvS)',
    'card.street': 'Street (Cambio)',

    // prices
    'prices.title': 'Prijsvergelijker',
    'prices.subtitle': 'Volg de prijzen van grondstoffen wereldwijd.',
    'prices.monthlyData': 'Maandelijkse data',
    'prices.groupEnergy': 'Energie',
    'prices.groupMetals': 'Metalen',
    'prices.groupOther': 'Overige grondstoffen',

    'dashboard.commoditiesTitle': 'Grondstoffen vandaag',
    'prices.soonTitle': 'Binnenkort beschikbaar',
    'prices.soonBody': 'Binnenkort kunnen winkels hun prijzen hier publiceren en kunt u eenvoudig vergelijken waar u het beste kunt kopen.',
    'prices.workingPill': 'Wij werken eraan',

    // settings (占位,F2-B 会真用)
    'settings.loading': 'Profiel laden...',
    'settings.defaultSubtitle': 'Beheer uw voorkeuren en account',
    'settings.personalInfo': 'Persoonlijke Gegevens',
    'settings.name': 'Naam',
    'settings.namePlaceholder': 'Uw volledige naam',
    'settings.email': 'E-mailadres',
    'settings.emailPlaceholder': 'uw@email.com',
    'settings.phone': 'Telefoonnummer',
    'settings.phonePlaceholder': '+597 xxxxxxx',
    'settings.saveToCloud': 'Opslaan in Cloud',
    'settings.saving': 'Opslaan...',
    'settings.general': 'Algemeen',
    'settings.darkMode': 'Donkere modus',
    'settings.darkModeSub': 'Schakel tussen licht en donker thema',
    'settings.language': 'Taal',
    'settings.languageSub': 'Kies uw voorkeurstaal',
    'settings.notifications': 'Meldingen',
    'settings.rateAlerts': 'Koerswaarschuwingen',
    'settings.rateAlertsSub': 'Ontvang meldingen bij grote SRD wijzigingen',
    'settings.support': 'Ondersteuning',
    'settings.whatsapp': 'WhatsApp Support',
    'settings.whatsappSub': 'Direct antwoord op uw vragen',
    'settings.privacy': 'Privacy Beleid',
    'settings.privacySub': 'Hoe wij uw data beschermen',
    'settings.version': 'Versie {v} · Gemaakt in Suriname 🇸🇷',
    'settings.savedToast': 'Opgeslagen in cloud!',

    // time
    'time.justNow': 'zojuist',
    'time.minuteAgo': '{n} minuut geleden',
    'time.minutesAgo': '{n} minuten geleden',
    'time.hourAgo': '{n} uur geleden',
    'time.hoursAgo': '{n} uur geleden',
    'time.dayAgo': '{n} dag geleden',
    'time.daysAgo': '{n} dagen geleden',

    // error states
    'error.loadFailed': 'Gegevens laden mislukt',
    'error.loadFailedSub': 'Netwerk- of servicefout. Probeer het opnieuw.',
    'error.retry': 'Opnieuw proberen',
  },

  EN: {
    'common.loading': 'Loading...',
    'common.retry': 'Try Again',
    'common.profile': 'Profile',
    'common.user': 'User',
    'common.amerikaanseDollar': 'US Dollar',
    'common.surinaamseDollar': 'Surinamese Dollar',
    'common.unknown': 'Unknown',

    'nav.dashboard': 'Dashboard',
    'nav.rates': 'Rates',
    'nav.prices': 'Prices',
    'nav.settings': 'Settings',

    'topbar.refresh': 'Refresh',
    'topbar.settings': 'Settings',
    'topbar.updatePrefix': 'Updated: ',

    'pageTitle.rates': 'Exchange Rates',
    'pageTitle.prices': 'Price Comparison',
    'pageTitle.settings': 'Settings',
    'pageTitle.default': 'Sovereign Ledger',

    'dashboard.title': 'Exchange Rates Dashboard',
    'dashboard.subtitle': 'Real-time financial insights for Suriname.',
    'dashboard.loading': 'Loading rates...',
    'dashboard.lastUpdatedPrefix': 'Last updated: ',

    'rates.title': 'Exchange Rates',
    'rates.subtitle': 'All rates in one place – official & street.',
    'rates.loading': 'Loading rates...',
    'rates.lastUpdatedPrefix': 'Last updated: ',
    'rates.officialLabel': 'Official (CBvS)',
    'rates.streetLabel': 'Street (Cambio)',
    'rates.buy': 'Buy',
    'rates.sell': 'Sell',
    'rates.spread': 'Spread: {value} SRD',

    'converter.title': 'Currency Converter',
    'converter.subtitle': 'Quick and easy conversion',
    'converter.liveBadge': 'Live Street Rate',
    'converter.fromLabel': 'From {currency}',
    'converter.toLabel': 'To {currency}',
    'converter.loading': 'Loading rate...',
    'converter.ratePrefix': 'Exchange rate: 1 USD = {rate} SRD',
    'converter.streetRateSublabel': 'Street Buy Rate',
    'converter.inputPlaceholder': '0.00',
    'converter.noRateFound': 'Could not find USD exchange rate.',
    'converter.fetchError': 'Could not load exchange rate. Check your connection.',

    'card.official': 'Official (CBvS)',
    'card.street': 'Street (Cambio)',

    'prices.title': 'Price Comparison',
    'prices.subtitle': 'Track global commodity prices.',
    'prices.monthlyData': 'Monthly data',
    'prices.groupEnergy': 'Energy',
    'prices.groupMetals': 'Metals',
    'prices.groupOther': 'Other commodities',

    'dashboard.commoditiesTitle': 'Commodities today',
    'prices.soonTitle': 'Coming soon',
    'prices.soonBody': 'Stores will soon be able to publish their prices here so you can easily compare where to buy.',
    'prices.workingPill': 'In the works',

    'settings.loading': 'Loading profile...',
    'settings.defaultSubtitle': 'Manage your preferences and account',
    'settings.personalInfo': 'Personal Information',
    'settings.name': 'Name',
    'settings.namePlaceholder': 'Your full name',
    'settings.email': 'Email address',
    'settings.emailPlaceholder': 'you@email.com',
    'settings.phone': 'Phone number',
    'settings.phonePlaceholder': '+597 xxxxxxx',
    'settings.saveToCloud': 'Save to Cloud',
    'settings.saving': 'Saving...',
    'settings.general': 'General',
    'settings.darkMode': 'Dark Mode',
    'settings.darkModeSub': 'Switch between light and dark theme',
    'settings.language': 'Language',
    'settings.languageSub': 'Choose your preferred language',
    'settings.notifications': 'Notifications',
    'settings.rateAlerts': 'Rate Alerts',
    'settings.rateAlertsSub': 'Get notified of major SRD changes',
    'settings.support': 'Support',
    'settings.whatsapp': 'WhatsApp Support',
    'settings.whatsappSub': 'Direct answers to your questions',
    'settings.privacy': 'Privacy Policy',
    'settings.privacySub': 'How we protect your data',
    'settings.version': 'Version {v} • Made in Suriname 🇸🇷',
    'settings.savedToast': 'Saved to cloud!',

    'time.justNow': 'just now',
    'time.minuteAgo': '{n} minute ago',
    'time.minutesAgo': '{n} minutes ago',
    'time.hourAgo': '{n} hour ago',
    'time.hoursAgo': '{n} hours ago',
    'time.dayAgo': '{n} day ago',
    'time.daysAgo': '{n} days ago',

    // error states
    'error.loadFailed': 'Failed to load data',
    'error.loadFailedSub': 'Network or service error. Please try again.',
    'error.retry': 'Try again',
  },
} as const;

export type TKey = keyof typeof translations.NL;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? `{${key}}` : String(v);
  });
}

interface SettingsContextType {
  language: Lang;
  locale: string;
  darkMode: boolean;
  setLanguage: (lang: Lang) => void;
  setDarkMode: (on: boolean) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Lang>('NL');
  const [darkMode, setDarkModeState] = useState(false);

  useEffect(() => {
    fetchProfile().then((profile) => {
      if (profile) {
        if (profile.language === 'NL' || profile.language === 'EN') {
          setLanguageState(profile.language);
        }
        setDarkModeState(profile.dark_mode);
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const setLanguage = async (lang: Lang) => {
    setLanguageState(lang);
    await updateProfile({ language: lang });
  };

  const setDarkMode = async (on: boolean) => {
    setDarkModeState(on);
    await updateProfile({ dark_mode: on });
  };

  const t = (key: TKey, vars?: Record<string, string | number>): string => {
    const dict = translations[language];
    const template = dict[key] ?? translations.NL[key] ?? key;
    return interpolate(template, vars);
  };

  const locale = language === 'NL' ? 'nl-NL' : 'en-US';

  return (
    <SettingsContext.Provider
      value={{ language, locale, darkMode, setLanguage, setDarkMode, t }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
