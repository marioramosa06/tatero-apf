import { useEffect, useState } from "react";

const checkIsStandalone = () => {
    if (typeof window === "undefined") return false;
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator?.standalone === true
    );
};

const checkIsIOS = () => {
    if (typeof window === "undefined") return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(checkIsStandalone);
    const [isIOS] = useState(checkIsIOS);

    useEffect(() => {
        const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
        const handleDisplayModeChange = (event) => {
            if (event.matches) {
                setIsInstalled(true);
            }
        };

        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setDeferredPrompt(event);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        mediaQuery?.addEventListener?.("change", handleDisplayModeChange);
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            mediaQuery?.removeEventListener?.("change", handleDisplayModeChange);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    const install = async () => {
        if (!deferredPrompt) return false;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setIsInstalled(true);
            setDeferredPrompt(null);
            return true;
        }
        return false;
    };

    return {
        isInstallable: Boolean(deferredPrompt),
        isInstalled,
        isIOS,
        install
    };
}
