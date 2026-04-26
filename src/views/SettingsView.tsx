import { useState, useEffect } from "react";
import { Globe, Bell, MessageCircle, ShieldCheck, LogOut, ChevronRight, User, Check, Loader2, Pencil, Save, X, Mail, Phone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fetchProfile, updateProfile, UserProfile } from "../api/profile";
import { useSettings } from "../context/SettingsContext";

const APP_VERSION = "2.4.0";

export default function SettingsView() {
  const { t, language, setLanguage } = useSettings();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [rateAlerts, setRateAlerts] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await fetchProfile();
      if (data) {
        setProfile(data);
        setEditName(data.display_name);
        setEditEmail(data.email);
        setEditPhone(data.phone);
        setRateAlerts(data.rate_alerts);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const showToast = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const updated = await updateProfile({
      display_name: editName,
      email: editEmail,
      phone: editPhone,
    });
    if (updated) {
      setProfile(updated);
      setIsEditing(false);
      showToast();
    }
    setIsSaving(false);
  };

  // 通用字段 (非 language / dark_mode) 的写库 helper
  const saveProfileField = async (key: string, value: any) => {
    const updates: any = { [key]: value };
    const updated = await updateProfile(updates);
    if (updated) {
      setProfile(updated);
      showToast();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 text-primary">
        <Loader2 size={40} className="animate-spin" />
        <p className="font-bold">{t('settings.loading')}</p>
      </div>
    );
  }

  const avatarUrl = profile?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCI6Pd1nnoofvkgxmCx5cKIlNJsQRbdZ94z8hnJP2GCJ_4w_R3NDHdwz2zDVp0WVN3io5mThp1C3v0mNwKtteCw8a85uQcF-AkqJrX2xkh6-mVa12JrGBe4fwR-8pyqImrjA_xr21H0pOVNJLBwq6GGU4hDFNqs6MWw2xJCa7xNsQRJGVUsM093K8xjU1g-800zeebvaGvoL7ElTWR6DdRCXZ0BLwSoNWhjuz8fAn-xoHGIZRxYMZ4XjfxiVPKINKc-svdM0KDPPM33";

  return (
    <div className="space-y-10">
      <section className="flex flex-col items-center gap-4 py-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/20 bg-surface-container">
            <img
              src={avatarUrl}
              className="w-full h-full object-cover"
              alt={t('common.user')}
              referrerPolicy="no-referrer"
            />
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`absolute bottom-0 right-0 p-2 rounded-full shadow-lg border-4 border-surface transition-colors ${isEditing ? 'bg-red-500 text-white' : 'bg-primary text-white'}`}
          >
            {isEditing ? <X size={16} /> : <Pencil size={16} />}
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-headline font-extrabold text-on-surface">
            {profile?.display_name || t('common.user')}
          </h2>
          <p className="text-on-surface-variant font-medium">
            {profile?.email || t('settings.defaultSubtitle')}
          </p>
        </div>
      </section>

      <AnimatePresence>
        {isEditing && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-3xl p-6 border border-primary/20 shadow-lg shadow-primary/5 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <User size={20} />
                </div>
                <h3 className="text-lg font-bold">{t('settings.personalInfo')}</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{t('settings.name')}</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={t('settings.namePlaceholder')}
                      className="w-full bg-surface-container-low rounded-2xl py-4 pl-11 pr-4 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{t('settings.email')}</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder={t('settings.emailPlaceholder')}
                      className="w-full bg-surface-container-low rounded-2xl py-4 pl-11 pr-4 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{t('settings.phone')}</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder={t('settings.phonePlaceholder')}
                      className="w-full bg-surface-container-low rounded-2xl py-4 pl-11 pr-4 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('settings.saving')}
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {t('settings.saveToCloud')}
                  </>
                )}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* General */}
        <div className="bg-white rounded-3xl p-6 border border-surface-container">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Globe size={20} />
            </div>
            <h3 className="text-lg font-bold">{t('settings.general')}</h3>
          </div>
          <div className="flex justify-between items-center py-2">
            <div>
              <p className="font-bold text-on-surface">{t('settings.language')}</p>
              <p className="text-xs text-on-surface-variant">{t('settings.languageSub')}</p>
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

        {/* Notifications */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-surface-container">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
              <Bell size={20} />
            </div>
            <h3 className="text-lg font-bold">{t('settings.notifications')}</h3>
          </div>
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="p-2 bg-primary/5 text-primary rounded-lg font-bold text-xs">📈</span>
                <div>
                  <p className="font-bold text-on-surface">{t('settings.rateAlerts')}</p>
                  <p className="text-xs text-on-surface-variant">{t('settings.rateAlertsSub')}</p>
                </div>
              </div>
              <button
                onClick={() => { setRateAlerts(!rateAlerts); saveProfileField('rate_alerts', !rateAlerts); }}
                className={`w-12 h-6 rounded-full relative p-1 transition-colors ${rateAlerts ? 'bg-primary' : 'bg-surface-container'}`}
              >
                <motion.div
                  animate={{ x: rateAlerts ? 24 : 0 }}
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
            <h3 className="text-lg font-bold">{t('settings.support')}</h3>
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
                  <p className="font-bold">{t('settings.whatsapp')}</p>
                  <p className="text-xs text-on-surface-variant">{t('settings.whatsappSub')}</p>
                </div>
              </div>
              <ChevronRight className="text-on-surface-variant group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => alert(t('settings.privacyAlert'))}
              className="flex items-center justify-between p-5 bg-white rounded-3xl border border-surface-container group hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/5 text-primary rounded-2xl">
                  <ShieldCheck size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold">{t('settings.privacy')}</p>
                  <p className="text-xs text-on-surface-variant">{t('settings.privacySub')}</p>
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
          {t('settings.logout')}
        </button>
        <p className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-8">
          {t('settings.version', { v: APP_VERSION })}
        </p>
      </div>

      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] bg-primary text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm"
          >
            <Check size={18} />
            {t('settings.savedToast')}
          </motion.div>
        )}
      </AnimatePresence>

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
                <h3 className="font-headline font-bold text-xl text-on-surface">{t('settings.logoutConfirmTitle')}</h3>
                <p className="text-sm text-on-surface-variant mt-2">{t('settings.logoutConfirmBody')}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-4 rounded-2xl font-bold bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  {t('settings.cancel')}
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    alert(t('settings.loggedOutAlert'));
                  }}
                  className="flex-1 py-4 rounded-2xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  {t('settings.logout')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
