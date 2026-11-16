import { useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    FilePlus,
    HardDrive,
    LayoutDashboard,
    Receipt,
    RefreshCw,
    Wifi,
    WifiOff
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { getOfflineStats } from "../utils/offlineStore";
import Footer from "../components/Footer";
import "../styles/OfflineFallback.css";

const OfflineFallback = ({ isUnknownRoute = false }) => {
    const { isAuthenticated } = useAuth();
    const { isOnline, isSyncing, pendingCount, syncNow } = useOnlineStatus();
    const [stats] = useState(() => getOfflineStats());
    const [syncMessage, setSyncMessage] = useState(null);

    const handleRetry = async () => {
        setSyncMessage(null);
        if (navigator.onLine) {
            if (isAuthenticated && pendingCount > 0) {
                const res = await syncNow();
                if (res?.error) {
                    setSyncMessage(res.error);
                    return;
                }
            }
            window.location.reload();
        } else {
            setSyncMessage("Toujours hors ligne. Vérifiez votre connexion puis réessayez.");
        }
    };

    return (
        <>
            <main className="offline-fallback-page">
                <section className="offline-fallback-card" aria-labelledby="offline-fallback-title">
                    <div className="offline-fallback-icon" aria-hidden="true">
                        {isOnline ? <Wifi /> : <WifiOff />}
                    </div>

                    <p
                        className={`offline-fallback-status${isOnline ? " is-online" : ""}`}
                        role="status"
                    >
                        {isOnline ? "Connexion rétablie" : "Mode hors ligne"}
                    </p>

                    <h1 id="offline-fallback-title">
                        {isOnline
                            ? "Vous êtes de nouveau en ligne"
                            : isUnknownRoute
                                ? "Page indisponible hors ligne"
                                : "Vous êtes actuellement hors ligne"}
                    </h1>

                    <p className="offline-fallback-message">
                        {isOnline
                            ? "Votre connexion Internet est revenue. Vous pouvez actualiser la page ou reprendre votre travail."
                            : "Aucune connexion Internet détectée. Vos données déjà mises en cache et la saisie locale restent accessibles."}
                    </p>

                    {isAuthenticated && (
                        <dl className="offline-fallback-summary" aria-label="État du cache local">
                            <div className="offline-fallback-stat">
                                <dt>Factures en cache</dt>
                                <dd className="tabular-nums">{stats.cachedCount}</dd>
                            </div>
                            <div className="offline-fallback-stat">
                                <dt>Actions en attente</dt>
                                <dd className="tabular-nums">{pendingCount}</dd>
                            </div>
                        </dl>
                    )}

                    {syncMessage && (
                        <p className="alert error" role="alert">
                            {syncMessage}
                        </p>
                    )}

                    <div className="offline-fallback-actions">
                        <button
                            type="button"
                            className="offline-fallback-btn offline-fallback-btn-primary"
                            onClick={handleRetry}
                            disabled={isSyncing}
                        >
                            <RefreshCw size={16} className={isSyncing ? "spin" : ""} aria-hidden="true" />
                            <span>{isSyncing ? "Synchronisation..." : "Réessayer"}</span>
                        </button>

                        <Link
                            to="/"
                            className="offline-fallback-btn offline-fallback-btn-secondary"
                        >
                            <ArrowLeft size={16} aria-hidden="true" />
                            <span>Retour à l'accueil</span>
                        </Link>
                    </div>

                    {isAuthenticated && (
                        <div className="offline-fallback-shortcuts">
                            <p className="offline-fallback-shortcuts-title">
                                Espaces disponibles hors ligne
                            </p>
                            <div className="offline-fallback-shortcut-grid">
                                <Link to="/invoices/new" className="offline-fallback-shortcut">
                                    <FilePlus size={16} aria-hidden="true" />
                                    <span>Nouvelle facture</span>
                                </Link>
                                <Link to="/dashboard" className="offline-fallback-shortcut">
                                    <LayoutDashboard size={16} aria-hidden="true" />
                                    <span>Tableau de bord</span>
                                </Link>
                                <Link to="/invoices" className="offline-fallback-shortcut">
                                    <Receipt size={16} aria-hidden="true" />
                                    <span>Toutes les factures</span>
                                </Link>
                                <Link to="/profile#offline" className="offline-fallback-shortcut">
                                    <HardDrive size={16} aria-hidden="true" />
                                    <span>Sauvegarde locale</span>
                                </Link>
                            </div>
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </>
    );
};

export default OfflineFallback;
