import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import "../styles/PWAInstallButton.css";

const PWAInstallButton = ({ variant = "default" }) => {
    const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    if (isInstalled) {
        return null;
    }

    if (isInstallable) {
        return (
            <button
                type="button"
                onClick={install}
                className={`pwa-install-btn pwa-install-${variant}`}
            >
                <Download size={15} aria-hidden="true" />
                <span>Installer l'app</span>
            </button>
        );
    }

    if (isIOS) {
        return (
            <>
                <button
                    type="button"
                    onClick={() => setShowIOSGuide(true)}
                    className={`pwa-install-btn pwa-install-ios pwa-install-${variant}`}
                >
                    <Download size={15} aria-hidden="true" />
                    <span>Installer sur iOS</span>
                </button>

                {showIOSGuide && (
                    <div
                        className="pwa-ios-backdrop"
                        onClick={() => setShowIOSGuide(false)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pwa-ios-title"
                    >
                        <div className="pwa-ios-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="pwa-ios-modal-header">
                                <h3 id="pwa-ios-title">Installer sur iPhone / iPad</h3>
                                <button
                                    type="button"
                                    className="pwa-ios-close"
                                    onClick={() => setShowIOSGuide(false)}
                                    aria-label="Fermer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <ol className="pwa-ios-steps">
                                <li>
                                    Appuyez sur le bouton <Share size={14} className="pwa-ios-share-icon" aria-hidden="true" /> <strong>Partager</strong> dans la barre d'outils de Safari.
                                </li>
                                <li>
                                    Faites défiler vers le bas puis appuyez sur <strong>Sur l'écran d'accueil</strong>.
                                </li>
                                <li>
                                    Appuyez sur <strong>Ajouter</strong> en haut à droite.
                                </li>
                            </ol>
                            <button
                                type="button"
                                className="pwa-ios-confirm"
                                onClick={() => setShowIOSGuide(false)}
                            >
                                Compris
                            </button>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return null;
};

export default PWAInstallButton;
