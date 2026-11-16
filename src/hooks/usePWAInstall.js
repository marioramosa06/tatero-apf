import { useCallback, useEffect, useState } from "react";

const INSTALL_DISMISSED_KEY = "tatero_install_dismissed_at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const OPEN_INSTALL_MODAL_EVENT = "tatero:open-install-modal";

let cachedDeferredPrompt = null;

if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        cachedDeferredPrompt = event;
    });
    window.addEventListener("appinstalled", () => {
        cachedDeferredPrompt = null;
    });
}

const checkIsStandalone = () => {
    if (typeof window === "undefined") return false;
    return (
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator?.standalone === true
    );
};

const checkIsIOS = () => {
    if (typeof window === "undefined") return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};

const isRecentlyDismissed = () => {
    if (typeof window === "undefined" || !window.localStorage) return false;
    try {
        const raw = window.localStorage.getItem(INSTALL_DISMISSED_KEY);
        if (!raw) return false;
        const ts = Number(raw);
        if (!Number.isFinite(ts)) return false;
        return Date.now() - ts < DISMISS_COOLDOWN_MS;
    } catch {
        return false;
    }
};

const markDismissed = () => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
        window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    } catch {
        // Ignore storage errors
    }
};

export const requestInstallModalOpen = () => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(OPEN_INSTALL_MODAL_EVENT));
    }
};

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(() => cachedDeferredPrompt);
    const [isInstalled, setIsInstalled] = useState(checkIsStandalone);
    const [isIOS] = useState(checkIsIOS);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
        const handleDisplayModeChange = (event) => {
            if (event.matches) {
                setIsInstalled(true);
                setIsModalOpen(false);
            }
        };

        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            cachedDeferredPrompt = event;
            setDeferredPrompt(event);
        };

        const handleAppInstalled = () => {
            cachedDeferredPrompt = null;
            setIsInstalled(true);
            setDeferredPrompt(null);
            setIsModalOpen(false);
        };

        const handleManualOpen = () => {
            if (!checkIsStandalone()) {
                setIsModalOpen(true);
            }
        };

        mediaQuery?.addEventListener?.("change", handleDisplayModeChange);
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);
        window.addEventListener(OPEN_INSTALL_MODAL_EVENT, handleManualOpen);

        return () => {
            mediaQuery?.removeEventListener?.("change", handleDisplayModeChange);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
            window.removeEventListener(OPEN_INSTALL_MODAL_EVENT, handleManualOpen);
        };
    }, []);

    useEffect(() => {
        if (isInstalled || (!deferredPrompt && !isIOS) || isRecentlyDismissed()) {
            return undefined;
        }

        const timer = window.setTimeout(() => {
            setIsModalOpen(true);
        }, 700);

        return () => window.clearTimeout(timer);
    }, [deferredPrompt, isIOS, isInstalled]);

    const dismissModal = useCallback(() => {
        markDismissed();
        setIsModalOpen(false);
    }, []);

    const openModal = useCallback(() => {
        if (!isInstalled) {
            setIsModalOpen(true);
        }
    }, [isInstalled]);

    const install = useCallback(async () => {
        const promptEvent = deferredPrompt || cachedDeferredPrompt;
        if (!promptEvent) return false;
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
            cachedDeferredPrompt = null;
            setIsInstalled(true);
            setDeferredPrompt(null);
            setIsModalOpen(false);
            return true;
        }
        dismissModal();
        return false;
    }, [deferredPrompt, dismissModal]);

    return {
        isInstallable: Boolean(deferredPrompt),
        isInstalled,
        isIOS,
        canShowInstall: !isInstalled && (Boolean(deferredPrompt) || isIOS),
        isModalOpen: !isInstalled && isModalOpen,
        openModal,
        dismissModal,
        install
    };
}
