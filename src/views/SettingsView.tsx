import { Globe, Moon, Bell, MessageCircle, ShieldCheck, LogOut, ChevronRight, User } from "lucide-react";
import { motion } from "motion/react";

export default function SettingsView() {
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
              <button className="px-5 py-1.5 text-[11px] font-black rounded-full bg-primary text-white">NL</button>
              <button className="px-5 py-1.5 text-[11px] font-black rounded-full text-on-surface-variant">EN</button>
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
              <p className="text-xs text-on-surface-variant">Systeem standaard</p>
            </div>
            <button className="w-12 h-6 bg-surface-container rounded-full relative p-1 group">
              <div className="w-4 h-4 bg-white rounded-full shadow-sm group-hover:translate-x-1 transition-transform" />
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
              <button className="w-12 h-6 bg-primary rounded-full relative p-1">
                <div className="w-4 h-4 bg-white rounded-full translate-x-6" />
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
              <button className="w-12 h-6 bg-primary rounded-full relative p-1">
                <div className="w-4 h-4 bg-white rounded-full translate-x-6" />
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
            <button className="flex items-center justify-between p-5 bg-white rounded-3xl border border-surface-container group">
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
            <button className="flex items-center justify-between p-5 bg-white rounded-3xl border border-surface-container group">
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
        <button className="w-full py-5 rounded-3xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 border border-red-100 active:scale-[0.98] transition-all">
          <LogOut size={20} />
          Uitloggen
        </button>
        <p className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-8">Versie 2.4.0 • Gemaakt in Suriname 🇸🇷</p>
      </div>
    </div>
  );
}
