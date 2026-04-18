import { useState } from "react";
import { Globe, Moon, Bell, MessageCircle, ShieldCheck, LogOut, ChevronRight, User, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function SettingsView() {
  const [language, setLanguage] = useState<'NL' | 'EN'>('NL');
  const [darkMode, setDarkMode] = useState(false);
  const [rateAlerts, setRateAlerts] = useState(true);
  const [folderAlerts, setFolderAlerts] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const showToast = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  return (
    <div className="space-y-10">
      <section className="flex flex-col items-center gap-4 py-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary-fixed bg-surface-container">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCI6Pd1nnoofvkgxmCx5cKIlNJsQRbdZ94z8hnJP2GCJ_4w_R3NDHdwz2zDVp0WVN3io5mThp1C3v0mNwKtteCw8a85uQcF-AkqJrX2xkh6-mVa12JrGBe4fwR-8pyqImrjA_xr21H0pOVNJLBwq6GGU4hDFNqs6MWw2xJCa7xNsQRJGVUsM093K8xjU1g-800zeebvaGvoL7ElTWR6DdRCXZ0BLwSoNWhjuz8fAn-xoHGIZRxYMZ4XjfxiVPKINKc-svdM0KDPPM33" 
              className="w-full h-full object-cover"
              alt="User"
              referrerPolicy="no-referrer"
            />
          </div>
          <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg border-4 border-surface">
            <User size={16} />
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-headline font-extrabold text-on-surface">Instellingen</h2>
          <p className="text-on-surface-variant font-medium">Beheer uw voorkeuren en account</p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* General */}
        <div className="bg-white rounded-3xl p-6 border border-surface-container">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Globe size={20} />
            </div>
            <h3 className="text-lg font-bold">Algemeen</h3>
          </div>
          <div className="flex justify-between items-center py-2">
            <div>
              <p className="font-bold text-on-surface">Taal</p>
              <p className="text-xs text-on-surface-variant">Kies uw voorkeurstaal</p>
            </div>
            <div className="flex bg-surface-container p-1 rounded-full">
              <button 
                onClick={() => { setLanguage('NL'); showToast(); }}
                className={`px-5 py-1.5 text-[11px] font-black rounded-full transition-all ${language === 'NL' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                NL
              </button>
              <button 
                onClick={() => { setLanguage('EN'); showToast(); }}
                className={`px-5 py-1.5 text-[11px] font-black rounded-full transition-all ${language === 'EN' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Display */}
        <div className="bg-white rounded-3xl p-6 border border-surface-container">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-secondary-container text-secondary rounded-xl">
              <Moon size={20} />
            </div>
            <h3 className="text-lg font-bold">Weergave</h3>
          </div>
          <div className="flex justify-between items-center py-2">
            <div>
              <p className="font-bold text-on-surface">Donkere Modus</p>
              <p className="text-xs text-on-surface-variant">{darkMode ? 'Ingeschakeld' : 'Systeem standaard'}</p>
            </div>
            <button 
              onClick={() => { setDarkMode(!darkMode); showToast(); }}
              className={`w-12 h-6 rounded-full relative p-1 transition-colors ${darkMode ? 'bg-primary' : 'bg-surface-container'}`}
            >
              <motion.div 
                animate={{ x: darkMode ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-surface-container">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
              <Bell size={20} />
            </div>
            <h3 className="text-lg font-bold">Meldingen</h3>
          </div>
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="p-2 bg-primary/5 text-primary rounded-lg font-bold text-xs">📈</span>
                <div>
                  <p className="font-bold text-on-surface">Koerswaarschuwingen</p>
                  <p className="text-xs text-on-surface-variant">Ontvang meldingen bij grote SRD wijzigingen</p>
                </div>
              </div>
              <button 
                onClick={() => { setRateAlerts(!rateAlerts); showToast(); }}
                className={`w-12 h-6 rounded-full relative p-1 transition-colors ${rateAlerts ? 'bg-primary' : 'bg-surface-container'}`}
              >
                <motion.div 
                  animate={{ x: rateAlerts ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="p-2 bg-primary/5 text-primary rounded-lg font-bold text-xs">📖</span>
                <div>
                  <p className="font-bold text-on-surface">Nieuwe Folders</p>
                  <p className="text-xs text-on-surface-variant">Meldingen voor de nieuwste aanbiedingen</p>
                </div>
              </div>
              <button 
                onClick={() => { setFolderAlerts(!folderAlerts); showToast(); }}
                className={`w-12 h-6 rounded-full relative p-1 transition-colors ${folderAlerts ? 'bg-primary' : 'bg-surface-container'}`}
              >
                <motion.div 
                  animate={{ x: folderAlerts ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <h3 className="text-lg font-bold">Ondersteuning</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => window.open('https://wa.me/5978000000', '_blank')}
              className="flex items-center justify-between p-5 bg-white rounded-3xl border border-surface-container group hover:border-emerald-200 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <MessageCircle size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold">WhatsApp Support</p>
                  <p className="text-xs text-on-surface-variant">Direct antwoord op uw vragen</p>
                </div>
              </div>
              <ChevronRight className="text-on-surface-variant group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => alert('Privacybeleid: Uw gegevens worden veilig opgeslagen in Supabase en worden nooit gedeeld met derden. Wij gebruiken alleen anonieme API-sleutels voor gegevenstoegang.')}
              className="flex items-center justify-between p-5 bg-white rounded-3xl border border-surface-container group hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/5 text-primary rounded-2xl">
                  <ShieldCheck size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold">Privacy Beleid</p>
                  <p className="text-xs text-on-surface-variant">Hoe wij uw data beschermen</p>
                </div>
              </div>
              <ChevronRight className="text-on-surface-variant group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <div className="py-8">
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-5 rounded-3xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 border border-red-100 active:scale-[0.98] transition-all hover:bg-red-100"
        >
          <LogOut size={20} />
          Uitloggen
        </button>
        <p className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-8">Versie 2.4.0 • Gemaakt in Suriname 🇸🇷</p>
      </div>

      {/* Saved Toast */}
      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] bg-primary text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm"
          >
            <Check size={18} />
            Opgeslagen!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
                <LogOut size={32} />
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl text-on-surface">Uitloggen?</h3>
                <p className="text-sm text-on-surface-variant mt-2">Weet u zeker dat u wilt uitloggen? U kunt later weer inloggen.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-4 rounded-2xl font-bold bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Annuleren
                </button>
                <button 
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    alert('U bent uitgelogd.');
                  }}
                  className="flex-1 py-4 rounded-2xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Uitloggen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
