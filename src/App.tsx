import React, { useState, useEffect } from "react";
import CustomerInterface from "./components/CustomerInterface";
import ManagerInterface from "./components/ManagerInterface";
import { 
  User, 
  ClipboardList, 
  Globe, 
  LogIn, 
  LogOut, 
  WifiOff, 
  Settings, 
  Clock, 
  ShieldCheck, 
  X 
} from "lucide-react";
import { Language } from "./types";
import { t } from "./lib/i18n";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, auth, loginWithGoogle, logout } from "./lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { LogoG } from "./components/Logo";
import { motion, AnimatePresence } from "motion/react";
import PullToRefresh from "./components/PullToRefresh";

export default function App() {
  const [lang, setLang] = useState<Language>("it");
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [minPrepTime, setMinPrepTime] = useState<number>(30);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "general"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().minPrepTime !== undefined) {
        setMinPrepTime(docSnap.data().minPrepTime);
      }
    });
    return () => unsub();
  }, []);

  const handleUpdateMinPrepTime = async (val: number) => {
    setMinPrepTime(val);
    try {
      await setDoc(doc(db, "settings", "general"), { minPrepTime: val }, { merge: true });
    } catch (e) {
      console.error("Failed to update minPrepTime", e);
    }
  };

  const adminEmails = [
    "salumeriaenotecagigliola@gmail.com",
    "beatrice.gigliola@gmail.com",
    "beatricegigliola@gmail.com",
    "gigliolabeatrice@gmail.com",
    "beatrice.gigliola8@gmail.com",
    "samgigliola@gmail.com",
    "massfrancy98@gmail.com",
  ].map(email => email.toLowerCase().trim());
  
  const userEmail = user?.email?.toLowerCase().trim() || "";
  const isAdmin = userEmail !== "" && adminEmails.includes(userEmail);

  return (
    <div className="min-h-screen font-sans bg-brand-paper selection:bg-brand-gold selection:text-brand-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[1000] bg-brand-black text-brand-gold p-4 shadow-2xl flex items-center justify-center gap-3 border-b border-brand-gold/20"
          >
            <WifiOff className="animate-pulse" size={20} />
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-tight">
                {lang === "it" ? "Connessione Assente" : lang === "de" ? "Keine Verbindung" : "Offline"}
              </p>
              <p className="text-[9px] opacity-60 uppercase font-bold tracking-widest mt-1">
                {lang === "it" 
                  ? "L'ordine verrà salvato sul dispositivo e inviato appena torni online" 
                  : lang === "de" 
                  ? "Die Bestellung wird lokal gespeichert und synchronisiert, sobald Sie wieder online sind" 
                  : "Order will be saved locally and synced when online"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Settings/Login Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[110] bg-brand-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[3rem] w-full max-w-sm shadow-[0_30px_100px_rgba(0,0,0,0.5)] border border-brand-gold/10">
            <div className="flex justify-center mb-8">
              <LogoG size="lg" />
            </div>

            <div className="pt-8 mx-auto w-full">
              {user ? (
                <div className="space-y-6">
                  <div className="bg-brand-paper p-4 rounded-2xl border border-brand-black/5 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          className="w-12 h-12 rounded-full border-2 border-brand-gold shadow-lg"
                          alt="profile"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full border-2 border-brand-gold shadow-lg bg-white flex items-center justify-center text-brand-black">
                          <User size={24} />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="font-black truncate text-brand-black leading-none mb-1 text-sm">
                          {user.displayName || user.email?.split('@')[0]}
                        </p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-brand-black/30 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-brand-black/10">
                      <p className={`text-[10px] font-black uppercase tracking-widest p-3 rounded-xl text-center ${isAdmin ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isAdmin ? "✓ Accesso Staff Autorizzato" : "✕ Email non autorizzata"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-red-50 text-red-600 font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors"
                  >
                    <LogOut size={18} /> Disconnetti
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={async () => {
                      try {
                        await loginWithGoogle();
                        setShowSettings(false);
                      } catch (e: any) {
                        console.error("Errore login in App.tsx:", e);
                        // Gli alert e i suggerimenti Safari sono gestiti in firebase.ts
                      }
                    }}
                    className="w-full flex items-center justify-center gap-4 p-5 rounded-3xl bg-brand-black text-brand-gold font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-sm mb-2"
                  >
                    <LogIn size={20} strokeWidth={3} /> Accedi con Google
                  </button>

                  <div className="bg-brand-gold/10 p-5 rounded-2xl border border-brand-gold/20">
                    <p className="text-[10px] text-center text-brand-black/60 leading-relaxed uppercase font-black tracking-widest">
                      ⚠️ UTENTI APPLE / SAFARI:<br />
                      Se il login non si apre, clicca sul pulsante <span className="text-brand-black">"Apri in una nuova scheda"</span> in alto a destra per caricare l'app fuori da questo riquadro.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-8 text-brand-black/20 font-black uppercase tracking-[0.3em] py-2 text-[10px] hover:text-brand-gold transition-colors"
            >
              {lang === "it" ? "Chiudi" : lang === "de" ? "Schließen" : "Close"}
            </button>
          </div>
        </div>
      )}

      <main>
        {isAdmin ? (
          <ManagerInterface 
            lang={lang} 
            user={user}
            onLogout={() => {
              logout();
            }}
            minPrepTime={minPrepTime}
            onUpdateMinPrepTime={handleUpdateMinPrepTime}
          />
        ) : (
          <CustomerInterface 
            lang={lang} 
            setLang={setLang}
            minPrepTime={minPrepTime} 
            onOpenAdmin={() => setShowSettings(true)}
            isManager={false} // Customers are never managers in this view
          />
        )}
      </main>
    </div>
  );
}
