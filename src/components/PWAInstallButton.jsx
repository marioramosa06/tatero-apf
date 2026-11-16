import { useEffect } from "react";
import { CheckCircle2, Download, Share, Smartphone, WifiOff, X } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import "../styles/PWAInstallButton.css";

const PWAInstallButton = () => {
    const {
        isInstallable,
        isInstalled,
        isIOS,
        isModalOpen,
        dismissModal,
        install
    } = usePWAInstall();

    useEffect(() => {
        if (!isModalOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                dismissModal();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isModalOpen, dismissModal]);

    if (isInstalled || !isModalOpen || (!isInstallable && !isIOS)) {
        return null;
    }

    return (
        <div
            className="pwa-install-backdrop"
            onClick={dismissModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
        >
            <div className="pwa-install-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pwa-install-modal-header">
                    <div className="pwa-install-brand">
                        <img
                            src="/pwa-192x192.png"
                            alt=""
                            width="44"
                            height="44"
                            className="pwa-install-app-icon"
                        />
                        <div className="pwa-install-heading">
                            <p className="pwa-install-eyebrow">Application web</p>
                            <h2 id="pwa-install-title">Installer Tatero</h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="pwa-install-close"
                        onClick={dismissModal}
                        aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="pwa-install-modal-body">
                    <p className="pwa-install-description">
                        Ajoutez Tatero sur votre écran d'accueil pour un accès rapide et une utilisation fiable sur le terrain.
                    </p>

                    <ul className="pwa-install-benefits">
                        <li>
                            <WifiOff size={15} aria-hidden="true" />
                            <span>Saisie et consultation de vos factures même sans connexion Internet</span>
                        </li>
                        <li>
                            <CheckCircle2 size={15} aria-hidden="true" />
                            <span>Synchronisation automatique dès le retour du réseau</span>
                        </li>
                        <li>
                            <Smartphone size={15} aria-hidden="true" />
                            <span>Lancement plein écran depuis l'écran d'accueil</span>
                        </li>
                    </ul>

                    {isInstallable ? (
                        <div className="pwa-install-actions">
                            <button
                                type="button"
                                className="pwa-install-later"
                                onClick={dismissModal}
                            >
                                Plus tard
                            </button>
                            <button
                                type="button"
                                className="pwa-install-confirm"
                                onClick={install}
                            >
                                <Download size={16} aria-hidden="true" />
                                <span>Installer l'application</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            <ol className="pwa-ios-steps">
                                <li>
                                    Appuyez sur le bouton <Share size={14} className="pwa-ios-share-icon" aria-hidden="true" /> <strong>Partager</strong> dans la barre de Safari.
                                </li>
                                <li>
                                    Sélectionnez <strong>Sur l'écran d'accueil</strong> dans le menu.
                                </li>
                                <li>
                                    Appuyez sur <strong>Ajouter</strong> en haut à droite.
                                </li>
                            </ol>
                            <div className="pwa-install-actions">
                                <button
                                    type="button"
                                    className="pwa-install-later"
                                    onClick={dismissModal}
                                >
                                    Plus tard
                                </button>
                                <button
                                    type="button"
                                    className="pwa-install-confirm"
                                    onClick={dismissModal}
                                >
                                    Compris
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PWAInstallButton;
