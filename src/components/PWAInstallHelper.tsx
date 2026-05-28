import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share, PlusSquare, ExternalLink, HelpCircle, Sparkles } from 'lucide-react';
import { Language } from '../types';

interface PWAInstallHelperProps {
  lang: Language;
}

const TRANSLATIONS = {
  it: {
    title: "Gigliola sul tuo telefono",
    subtitle: "Accedi al menù digitale e invia ordini più velocemente installando l'applicazione direttamente sulla tua Schermata Home!",
    buttonInstall: "Installa l'App",
    iosTitle: "Installa su iPhone / iPad",
    iosSubtitle: "Segui questi semplici passaggi per salvare Gigliola come un'applicazione nativa:",
    iosStep1: "Tocca il pulsante di condivisione di Safari",
    iosStep2: "Scorri il menu e seleziona",
    iosStep2_ext: "Aggiungi alla schermata Home",
    iosStep3: "Conferma toccando 'Aggiungi' in alto a destra.",
    iframeTitle: "Visualizzatore di AI Studio",
    iframeWarn: "Per installare l'app sbloccarne tutte le funzioni, aprila in una scheda del browser separata cliccando sul pulsante con la freccia in alto a destra!",
    iframeBtn: "Apri in una Nuova Scheda",
    close: "In Seguito",
    alreadyInstalled: "App installata correttamente!",
  },
  en: {
    title: "Gigliola on your Phone",
    subtitle: "Access the digital menu and place your orders faster by installing the app directly onto your Home Screen!",
    buttonInstall: "Install App",
    iosTitle: "Install on iPhone / iPad",
    iosSubtitle: "Follow these simple steps to save Gigliola as a native app on iOS:",
    iosStep1: "Tap the Safari share button",
    iosStep2: "Scroll down and select",
    iosStep2_ext: "Add to Home Screen",
    iosStep3: "Confirm by tapping 'Add' in the top right corner.",
    iframeTitle: "AI Studio Preview Mode",
    iframeWarn: "To install this app and use all of its features, please open it in a separate browser tab using the top-right button!",
    iframeBtn: "Open in New Tab",
    close: "Maybe Later",
    alreadyInstalled: "App successfully installed!",
  },
  de: {
    title: "Gigliola auf Ihrem Handy",
    subtitle: "Greifen Sie schneller auf das digitale Menü zu und bestellen Sie direkt von Ihrem Startbildschirm aus!",
    buttonInstall: "App installieren",
    iosTitle: "Auf iPhone / iPad installieren",
    iosSubtitle: "Folgen Sie diesen Schritten, um Gigliola als native App auf iOS zu speichern:",
    iosStep1: "Tippen Sie auf das Teilen-Symbol in Safari",
    iosStep2: "Scrollen Sie nach unten und wählen Sie",
    iosStep2_ext: "Zum Home-Bildschirm",
    iosStep3: "Bestätigen Sie mit 'Hinzufügen' oben rechts.",
    iframeTitle: "AI-Studio Vorschaumodus",
    iframeWarn: "Um die App zu installieren, öffnen Sie sie bitte in einem separaten Tab über die Schaltfläche oben rechts!",
    iframeBtn: "In neue Registerkarte öffnen",
    close: "Später",
    alreadyInstalled: "App erfolgreich installiert!",
  },
  fr: {
    title: "Gigliola sur votre téléphone",
    subtitle: "Accédez au menu numérique et commandez plus rapidement en installant l'application sur votre écran d'accueil !",
    buttonInstall: "Installer l'App",
    iosTitle: "Installer sur iPhone / iPad",
    iosSubtitle: "Suivez ces instructions pour enregistrer Gigliola comme une application native :",
    iosStep1: "Appuyez sur le bouton de partage de Safari",
    iosStep2: "Défilez vers le bas et sélectionnez",
    iosStep2_ext: "Sur l'écran d'accueil",
    iosStep3: "Confirmez en appuyant sur 'Ajouter' en haut à droite.",
    iframeTitle: "Mode aperçu AI Studio",
    iframeWarn: "Pour installer l'application, ouvrez-la dans un nouvel onglet à l'aide du bouton en haut à droite !",
    iframeBtn: "Ouvrir dans un nouvel onglet",
    close: "Plus tard",
    alreadyInstalled: "Application installée avec succès !",
  }
};

export default function PWAInstallHelper({ lang }: PWAInstallHelperProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.it;

  useEffect(() => {
    // 1. Detect if standalone or already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(!!standalone);

    // 2. Detect if inside AI Studio iframe preview
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    // 3. Detect if iOS (iPhone/iPad/iPod)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // 4. Capture browser PWA prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // If the user hasn't explicitly dismissed it, let's show our custom prompt
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed && !standalone) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS check for auto-showing instruction banner
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (!dismissed && ios && !standalone && !inIframe) {
      // Delay slightly for presentation smoothness
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 5. Check if manual show event is triggered (from any menu button)
    const handleManualShow = () => {
      setShowPrompt(true);
    };
    window.addEventListener('show-pwa-install', handleManualShow);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('show-pwa-install', handleManualShow);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt clicked, choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    setHasDismissed(true);
    setShowPrompt(false);
  };

  const handleNewTabClick = () => {
    // Open current URL in outside window
    window.open(window.location.href, '_blank');
  };

  // If already running in standalone/installed mode, we don't need any install helpers.
  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {/* 1. Subdued top warning bar ONLY if inside AI Studio iframe preview */}
      {isInIframe && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[999] bg-brand-gold text-brand-black p-3.5 shadow-lg border-b border-brand-black/10 select-none text-center flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 flex-shrink-0 animate-bounce" />
            <span className="text-xs font-serif font-black uppercase tracking-wider">{t.iframeTitle}:</span>
            <span className="text-[11px] font-bold text-left max-w-xl leading-tight opacity-90">{t.iframeWarn}</span>
          </div>
          <button
            onClick={handleNewTabClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-black text-brand-gold font-serif font-black text-[10px] uppercase tracking-wider shadow active:scale-95 transition-all flex-shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
            {t.iframeBtn}
          </button>
        </motion.div>
      )}

      {/* 2. Custom prompt or instruction Drawer modal overlay */}
      {showPrompt && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPrompt(false)}
            className="fixed inset-0 z-[1000] bg-brand-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 30, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-[1001] bg-brand-paper shadow-2xl rounded-t-[3rem] border-t border-brand-gold/20 pt-8 pb-10 px-6 max-w-md mx-auto"
          >
            {/* Elegant Header accent */}
            <div className="w-12 h-1 bg-brand-black/10 rounded-full mx-auto mb-6" />

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-serif font-bold text-brand-black leading-tight">
                  {isIOS ? t.iosTitle : t.title}
                </h3>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-full hover:bg-brand-black/5 text-brand-black/30 hover:text-brand-black transition-colors"
                title={t.close}
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-brand-black/70 mb-6 leading-relaxed">
              {isIOS ? t.iosSubtitle : t.subtitle}
            </p>

            {/* Content for iOS devices */}
            {isIOS ? (
              <div className="space-y-4 bg-brand-gold/5 p-5 rounded-2xl border border-brand-gold/15 mb-6 text-brand-black/95">
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-brand-black text-brand-gold flex items-center justify-center font-bold text-[10px] tracking-wider mt-0.5 flex-shrink-0">
                    1
                  </div>
                  <p className="leading-relaxed font-semibold">
                    {t.iosStep1} <span className="inline-block align-middle p-1 rounded-md bg-white border border-brand-black/5 shadow-sm text-brand-black"><Share size={14} className="inline mr-0.5" /></span>
                  </p>
                </div>
                
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-brand-black text-brand-gold flex items-center justify-center font-bold text-[10px] tracking-wider mt-0.5 flex-shrink-0">
                    2
                  </div>
                  <p className="leading-relaxed font-semibold">
                    {t.iosStep2} <strong className="text-brand-gold-dark">"{t.iosStep2_ext}"</strong> <span className="inline-block align-middle p-1 rounded-md bg-white border border-brand-black/5 shadow-sm text-brand-black"><PlusSquare size={14} className="inline mr-0.5" /></span>
                  </p>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-brand-black text-brand-gold flex items-center justify-center font-bold text-[10px] tracking-wider mt-0.5 flex-shrink-0">
                    3
                  </div>
                  <p className="leading-relaxed font-semibold">
                    {t.iosStep3}
                  </p>
                </div>
              </div>
            ) : (
              /* Content for Android/Chrome/Desktop */
              deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-brand-black text-brand-gold font-serif font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 hover:bg-black transition-all mb-4 border border-brand-gold/30"
                >
                  <Download className="w-5 h-5" strokeWidth={2.5} />
                  {t.buttonInstall}
                </button>
              )
            )}

            <button
              onClick={handleDismiss}
              className="w-full text-brand-black/40 hover:text-brand-black font-semibold text-[11px] uppercase tracking-widest py-3 text-center transition-colors"
            >
              {t.close}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
