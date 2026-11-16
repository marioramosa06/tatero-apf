import { useState } from "react";
import { CheckCircle2, CloudOff, RefreshCw, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import "../styles/OfflineIndicator.css";

const OfflineIndicator = ({ hasBottomNav = false }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const {
        isOnline,
        pendingCount,
        isSyncing,
        syncError,
        lastSyncedCount,
        syncNow
    } = useOnlineStatus();
    const [dismissedFor, setDismissedFor] = useState(null);

    if (isOnline && pendingCount === 0 && lastSyncedCount === 0 && !syncError) {
        return null;
    }

    const statusSignature = `${isOnline ? "on" : "off"}:${pendingCount}:${Boolean(syncError)}:${lastSyncedCount > 0 ? "synced" : ""}`;
    if (dismissedFor === statusSignature) {
        return null;
    }

    const toneClass = !isOnline
        ? "is-offline"
        : pendingCount > 0 || syncError
            ? "is-pending"
            : "is-synced";

    const showManageLink = isAuthenticated && location.pathname !== "/profile" && (!isOnline || pendingCount > 0);
    const showOfflinePageLink = !isOnline && !showManageLink && location.pathname !== "/offline";
    const statusLabel = !isOnline
        ? pendingCount > 0
            ? `Hors ligne · ${pendingCount} en attente`
            : "Hors ligne"
        : isSyncing
            ? "Synchronisation..."
            : pendingCount > 0
                ? `${pendingCount} à synchroniser`
                : `${lastSyncedCount} synchronisée${lastSyncedCount > 1 ? "s" : ""}`;

    return (
        <aside
            className={`offline-indicator ${toneClass} ${hasBottomNav ? "has-bottom-nav" : "no-bottom-nav"}`}
            role="status"
            aria-live="polite"
            aria-label="État de connexion et synchronisation"
        >
            <div className="offline-indicator-main">
                {!isOnline ? (
                    <CloudOff size={15} className="offline-indicator-icon" aria-hidden="true" />
                ) : pendingCount > 0 || isSyncing ? (
                    <RefreshCw
                        size={15}
                        className={`offline-indicator-icon${isSyncing ? " spin" : ""}`}
                        aria-hidden="true"
                    />
                ) : (
                    <CheckCircle2 size={15} className="offline-indicator-icon" aria-hidden="true" />
                )}

                <span className="offline-indicator-text">{statusLabel}</span>
            </div>

            <div className="offline-indicator-actions">
                {isOnline && pendingCount > 0 && (
                    <button
                        type="button"
                        className="offline-sync-btn"
                        onClick={syncNow}
                        disabled={isSyncing}
                    >
                        {isSyncing ? "En cours" : "Sync"}
                    </button>
                )}
                {showManageLink && (
                    <Link to="/profile#offline" className="offline-manage-link">
                        Gérer
                    </Link>
                )}
                {showOfflinePageLink && (
                    <Link to="/offline" className="offline-manage-link">
                        Infos
                    </Link>
                )}
                <button
                    type="button"
                    className="offline-dismiss-btn"
                    onClick={() => setDismissedFor(statusSignature)}
                    aria-label="Masquer l'indicateur"
                    title="Masquer"
                >
                    <X size={14} aria-hidden="true" />
                </button>
            </div>

            {syncError && isOnline && pendingCount > 0 && (
                <span className="offline-sync-error">{syncError}</span>
            )}
        </aside>
    );
};

export default OfflineIndicator;
