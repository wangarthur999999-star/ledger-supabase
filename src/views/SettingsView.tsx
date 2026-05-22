import { useState, useEffect, useRef } from "react";
import { Globe, Bell, MessageCircle, ShieldCheck, ChevronRight, User, Check, Loader2, Pencil, Save, X, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { readProfileSync, updateProfile, UserProfile } from "../api/profile";
import { useSettings } from "../context/SettingsContext";
import {
  listMyAlerts,
  upsertAlert,
  deleteAlert,
  type AlertThreshold,
  type ThresholdKind,
} from "../api/alerts";
import { requestPermission, getPermission, isSupported as notificationsSupported } from "../lib/notifications";
import { isWebPushSupported, subscribeWebPush } from "../lib/webPush";

// 由 vite.config.ts 从 package.json 注入, 永远跟 package 同步
const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

// WhatsApp 支持号码: 走 env, 没配则整个按钮隐藏 (避免上线后留假入口)。
// 在 .env.local / Vercel env 里设 VITE_WHATSAPP_NUMBER, 格式 "597XXXXXXX" (无 +)。
const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || '';

export default function SettingsView() {
  const { t, language, setLanguage } = useSettings();

  // 同步读初始 profile: readProfileSync 是纯 localStorage 操作, 没必要再走
  // useEffect/setIsLoading 的异步双跳。这样组件首次 render 直接就有数据。
  const initialProfile = readProfileSync();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editName, setEditName] = useState(initialProfile.display_name);
  const [editEmail, setEditEmail] = useState(initialProfile.email);
  const [editPhone, setEditPhone] = useState(initialProfile.phone);

  const [showSavedToast, setShowSavedToast] = useState(false);

  // toast 计时器: 用 ref 持有最近一次的 timeout, 这样:
  //   1) 用户连续点保存时, 新 toast 来之前先清旧的 (否则旧 timer 会提前 hide 新 toast)
  //   2) 组件 unmount 时清掉, 避免 setState on unmounted component (React 18 不再警告, 但仍是 leak)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setShowSavedToast(true);
    toastTimerRef.current = setTimeout(() => {
      setShowSavedToast(false);
      toastTimerRef.current = null;
    }, 2000);
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

  return (
    <div className="space-y-10">
      <section className="flex flex-col items-center gap-4 py-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/20 bg-surface-container flex items-center justify-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-full h-full object-cover"
                alt={t('common.user')}
                referrerPolicy="no-referrer"
                // 头像 URL 挂了时 fallback 到默认图标 (不再显示空 img)
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <User size={48} className="text-on-surface-variant" />
            )}
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`absolute bottom-0 right-0 p-2 rounded-full shadow-lg border-4 border-surface transition-colors ${isEditing ? 'bg-red-500 text-white' : 'bg-primary text-white'}`}
            aria-label={isEditing ? 'Cancel edit' : 'Edit profile'}
          >
            {isEditing ? <X size={16} /> : <Pencil size={16} />}
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-headline font-extrabold text-on-surface">
            {profile.display_name || t('common.user')}
          </h2>
          <p className="text-on-surface-variant font-medium">
            {profile.email || t('settings.defaultSubtitle')}
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

        {/* Notifications: 真实的阈值订阅 UI */}
        <RateAlertsSection />

        {/* Support */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <h3 className="text-lg font-bold">{t('settings.support')}</h3>
          </div>
          <div className={`grid ${WHATSAPP_NUMBER ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
            {WHATSAPP_NUMBER && (
              <button
                onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank', 'noopener')}
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
            )}
            <button
              onClick={() => {
                const lang = language === 'EN' ? 'en' : 'nl';
                window.open(`/privacy.html?lang=${lang}`, '_blank', 'noopener');
              }}
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
        <p className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
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

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// RateAlertsSection
//
// 让用户配置 "当 USD/SRD 街头买入价 ≥ X SRD 时通知我" 这种订阅。
// 当前 UI 只支持最常用的几个组合 (USD/EUR × above/below/change), 不是完整 form。
// 后期可以扩成完整 CRUD list。
//
// 流程:
//   1. mount 时拉用户当前订阅 listMyAlerts()
//   2. 用户点 "Add alert" 显示个 mini form, 填 pair + kind + value
//   3. 提交时先调 requestPermission(), 拒了就不存
//   4. 调 upsertAlert(), 刷新列表
//   5. 列表里每行可以删
//
// 注: 这里不处理 Web Push subscription (sw + endpoint), 那需要 sw.js + VAPID key
//     setup。当前实现的"通知"是: app 打开期间 rates 更新触发 useAlertWatcher
//     里直接调 showNotification (本地通知)。够覆盖核心场景。
//     Web Push 订阅在未来需要时, 在 upsertAlert 时多传 endpoint/p256dh/auth。
// ─────────────────────────────────────────────────────────────────

interface NewAlertDraft {
  pair: string;
  kind: ThresholdKind;
  value: string; // 用 string 是因为 input value 是 string, 提交时 parse
}

function RateAlertsSection() {
  const { t, locale } = useSettings();
  const [alerts, setAlerts] = useState<AlertThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<string>('default');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<NewAlertDraft>({
    pair: 'USD / SRD',
    kind: 'above',
    value: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let canceled = false;
    Promise.all([listMyAlerts(), getPermission()]).then(([a, p]) => {
      if (canceled) return;
      setAlerts(a);
      setPermission(p);
      setLoading(false);
    });
    return () => {
      canceled = true;
    };
  }, []);

  if (!notificationsSupported()) {
    // 老浏览器 / 不支持的环境完全隐藏
    return null;
  }

  const handleAdd = async () => {
    const v = parseFloat(draft.value);
    if (!Number.isFinite(v) || v <= 0) return;

    setSubmitting(true);
    // 第一次添加时请求通知权限
    const granted = await requestPermission();
    setPermission(granted);
    if (granted !== 'granted') {
      setSubmitting(false);
      return;
    }

    // 尝试订阅 Web Push (浏览器). 失败/不支持时 push 凭证为 null,
    // 服务端会跳过推送, 客户端 watcher 仍然能在 app 打开时本地触发。
    let pushCreds: { endpoint: string; p256dh: string; auth: string } | null = null;
    if (isWebPushSupported()) {
      pushCreds = await subscribeWebPush();
    }

    const created = await upsertAlert({
      pair: draft.pair,
      threshold_kind: draft.kind,
      threshold_value: v,
      push_endpoint: pushCreds?.endpoint ?? null,
      push_p256dh: pushCreds?.p256dh ?? null,
      push_auth: pushCreds?.auth ?? null,
    });
    if (created) {
      const updated = await listMyAlerts();
      setAlerts(updated);
      setDraft({ pair: 'USD / SRD', kind: 'above', value: '' });
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteAlert(id);
    if (ok) setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const formatAlert = (a: AlertThreshold): string => {
    const sign = a.threshold_kind === 'above' ? '≥' : a.threshold_kind === 'below' ? '≤' : '±';
    const valueStr = Number(a.threshold_value).toLocaleString(locale, { minimumFractionDigits: 2 });
    const unit = a.threshold_kind === 'change' ? '%' : '';
    return `${a.pair} ${sign} ${valueStr}${unit}`;
  };

  return (
    <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-surface-container space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
          <Bell size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold">{t('settings.notifications')}</h3>
          <p className="text-xs text-on-surface-variant">{t('settings.rateAlertsSub')}</p>
        </div>
      </div>

      {permission === 'denied' && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">
          {t('alerts.permissionDenied')}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">{t('common.loading')}</p>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-on-surface-variant italic">{t('alerts.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between bg-surface-container-low rounded-2xl px-4 py-3"
            >
              <span className="font-mono text-sm font-bold">{formatAlert(a)}</span>
              <button
                onClick={() => handleDelete(a.id)}
                className="p-2 -mr-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                aria-label="Delete alert"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence initial={false}>
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-container-low rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={draft.pair}
                  onChange={(e) => setDraft({ ...draft, pair: e.target.value })}
                  className="bg-white rounded-xl px-3 py-2 text-sm font-bold border border-surface-container"
                >
                  <option value="USD / SRD">USD / SRD</option>
                  <option value="EUR / SRD">EUR / SRD</option>
                </select>
                <select
                  value={draft.kind}
                  onChange={(e) => setDraft({ ...draft, kind: e.target.value as ThresholdKind })}
                  className="bg-white rounded-xl px-3 py-2 text-sm font-bold border border-surface-container"
                >
                  <option value="above">{t('alerts.kindAbove')}</option>
                  <option value="below">{t('alerts.kindBelow')}</option>
                  <option value="change">{t('alerts.kindChange')}</option>
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={draft.kind === 'change' ? '5.0' : '40.00'}
                  value={draft.value}
                  onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                  className="bg-white rounded-xl px-3 py-2 text-sm font-bold border border-surface-container outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant border border-surface-container"
                >
                  <X size={14} className="inline mr-1" />
                  {t('alerts.cancel')}
                </button>
                <button
                  onClick={handleAdd}
                  disabled={submitting || !draft.value}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-white disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={14} className="inline animate-spin" /> : <Check size={14} className="inline mr-1" />}
                  {t('alerts.save')}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-2xl text-sm font-bold bg-primary/5 text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            {t('alerts.addNew')}
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
