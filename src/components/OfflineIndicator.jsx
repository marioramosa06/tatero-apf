import { CheckCircle2, CloudOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import "../styles/OfflineIndicator.css";

const OfflineIndicator = () => {
    const {
        isOnline,
        pendingCount,
        isSyncing,
        syncError,
        lastSyncedCount,
        syncNow
    } = useOnlineStatus();

    if (isOnline && pendingCount === 0 && lastSyncedCount === 0 && !syncError) {
        return null;
    }

    const toneClass = !isOnline
        ? "is-offline"
        : pendingCount > 0 || syncError
            ? "is-pending"
            : "is-synced";

    return (
        <aside
            className={`offline-indicator ${toneClass}`}
            role="status"
            aria-live="polite"
            aria-label="État de connexion et synchronisation"
        >
            <div className="offline-indicator-main">
                {!isOnline ? (
                    <CloudOff size={16} className="offline-indicator-icon" aria-hidden="true" />
                ) : pendingCount > 0 || isSyncing ? (
                    <RefreshCw
                        size={16}
                        className={`offline-indicator-icon${isSyncing ? " spin" : ""}`}
                        aria-hidden="true"
                    />
                ) : (
                    <CheckCircle2 size={16} className="offline-indicator-icon" aria-hidden="true" />
                )}

                <span className="offline-indicator-text">
                    {!isOnline
                        ? pendingCount > 0
                            ? `Mode hors ligne · ${pendingCount} ${pendingCount > 1 ? "modifications" : "modification"} en attente`
                            : "Mode hors ligne · Données en cache actives"
                        : isSyncing
                            ? "Synchronisation des modifications..."
                            : pendingCount > 0
                                ? `${pendingCount} ${pendingCount > 1 ? "modifications" : "modification"} à synchroniser`
                                : `${lastSyncedCount} ${lastSyncedCount > 1 ? "modifications synchronisées" : "modification synchronisée"}`}
                </span>
            </div>

            {isOnline && pendingCount > 0 && (
                <button
                    type="button"
                    className="offline-sync-btn"
                    onClick={syncNow}
                    disabled={isSyncing}
                >
                    {isSyncing ? "En cours..." : "Synchroniser"}
                </button>
            )}

            {syncError && isOnline && pendingCount > 0 && (
                <span className="offline-sync-error">{syncError}</span>
            )}
        </aside>
    );
};

export default OfflineIndicator;
