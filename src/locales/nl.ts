// 荷兰语 (默认语言)
// 添加 / 修改文案只动这个文件, 不需要再翻 context 代码。

const nl = {
  // common
  'common.loading': 'Laden...',
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
  'dashboard.commoditiesTitle': 'Grondstoffen vandaag',

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
  'prices.soonTitle': 'Binnenkort beschikbaar',
  'prices.soonBody':
    'Binnenkort kunnen winkels hun prijzen hier publiceren en kunt u eenvoudig vergelijken waar u het beste kunt kopen.',
  'prices.workingPill': 'Wij werken eraan',
  'prices.empty': 'Nog geen prijsdata beschikbaar.',

  // settings
  'settings.loading': 'Profiel laden...',
  'settings.defaultSubtitle': 'Beheer uw voorkeuren en account',
  'settings.personalInfo': 'Persoonlijke Gegevens',
  'settings.name': 'Naam',
  'settings.namePlaceholder': 'Uw volledige naam',
  'settings.email': 'E-mailadres',
  'settings.emailPlaceholder': 'uw@email.com',
  'settings.phone': 'Telefoonnummer',
  'settings.phonePlaceholder': '+597 xxxxxxx',
  'settings.saveToCloud': 'Opslaan',
  'settings.saving': 'Opslaan...',
  'settings.general': 'Algemeen',
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
  'settings.savedToast': 'Opgeslagen!',

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

  // rate alerts
  'alerts.empty': 'Nog geen waarschuwingen ingesteld.',
  'alerts.addNew': 'Waarschuwing toevoegen',
  'alerts.kindAbove': 'Boven',
  'alerts.kindBelow': 'Onder',
  'alerts.kindChange': 'Verandering ±%',
  'alerts.save': 'Opslaan',
  'alerts.cancel': 'Annuleren',
  'alerts.permissionDenied': 'Meldingen zijn geblokkeerd. Sta meldingen toe in uw browserinstellingen om waarschuwingen te ontvangen.',
} as const;

export default nl;
