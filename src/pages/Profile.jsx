import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    BriefcaseBusiness,
    CalendarDays,
    Download,
    HardDriveDownload,
    LogOut,
    Mail,
    RefreshCw,
    RotateCcw,
    Smartphone,
    Upload,
    UserRound
} from "lucide-react";
import Footer from "../components/Footer";
import useAuth from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { requestInstallModalOpen, usePWAInstall } from "../hooks/usePWAInstall";
import { fetchProfileWithCache, prefetchAllOfflineData } from "../utils/invoiceApi";
import {
    OFFLINE_CHANGE_EVENT,
    OFFLINE_SYNC_COMPLETE_EVENT,
    cancelQueuedOperation,
    exportOfflineBackupData,
    getOfflineStats,
    getPendingQueue,
    importOfflineBackupData
} from "../utils/offlineStore";
import "../styles/Profile.css";

const OPERATION_LABELS = {
    create: "Ajout",
    update: "Modification",
    delete: "Suppression"
};

const Profile = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const { isOnline, isSyncing, syncError, syncNow } = useOnlineStatus();
    const { canShowInstall } = usePWAInstall();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [offlineStats, setOfflineStats] = useState(() => getOfflineStats());
    const [pendingQueue, setPendingQueue] = useState(() => getPendingQueue());
    const [isPrefetching, setIsPrefetching] = useState(false);
    const [offlineNotice, setOfflineNotice] = useState(null);
    const [offlineError, setOfflineError] = useState(null);

    const refreshOfflineState = useCallback(() => {
        setOfflineStats(getOfflineStats());
        setPendingQueue(getPendingQueue());
    }, []);

    useEffect(() => {
        window.addEventListener(OFFLINE_CHANGE_EVENT, refreshOfflineState);
        window.addEventListener(OFFLINE_SYNC_COMPLETE_EVENT, refreshOfflineState);
        return () => {
            window.removeEventListener(OFFLINE_CHANGE_EVENT, refreshOfflineState);
            window.removeEventListener(OFFLINE_SYNC_COMPLETE_EVENT, refreshOfflineState);
        };
    }, [refreshOfflineState]);

    useEffect(() => {
        const controller = new AbortController();

        const loadProfile = async () => {
            try {
                const cachedOrLive = await fetchProfileWithCache({
                    token,
                    signal: controller.signal
                });
                if (cachedOrLive) {
                    setProfile(cachedOrLive);
                }
            } catch (requestError) {
                if (requestError.name !== "AbortError") {
                    setError(requestError.message || "Impossible de charger votre profil.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                    refreshOfflineState();
                }
            }
        };

        loadProfile();
        return () => controller.abort();
    }, [token, refreshOfflineState]);

    const account = profile || user || {};
    const initials = account.name
        ?.split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "?";

    const handleLogout = () => {
        logout();
        navigate("/signin", { replace: true });
    };

    const formatDate = (date) => {
        if (!date) return "Non renseignée";
        const parsedDate = new Date(date);
        return Number.isNaN(parsedDate.getTime())
            ? "Non renseignée"
            : parsedDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    };

    const formatSyncDate = (isoString) => {
        if (!isoString) return "Jamais";
        const parsed = new Date(isoString);
        if (Number.isNaN(parsed.getTime())) return "Jamais";
        return parsed.toLocaleString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const handlePrefetchCache = async () => {
        setOfflineError(null);
        setOfflineNotice(null);
        setIsPrefetching(true);
        try {
            const result = await prefetchAllOfflineData({ token });
            refreshOfflineState();
            setOfflineNotice(
                `Cache hors ligne actualisé (${result.cachedCount} ${result.cachedCount > 1 ? "factures disponibles" : "facture disponible"} hors ligne).`
            );
        } catch (err) {
            setOfflineError(err.message || "Impossible de mettre à jour le cache hors ligne.");
        } finally {
            setIsPrefetching(false);
        }
    };

    const handleManualSync = async () => {
        setOfflineError(null);
        setOfflineNotice(null);
        const result = await syncNow();
        refreshOfflineState();
        if (result.error) {
            setOfflineError(result.error);
        } else if (result.synced > 0) {
            setOfflineNotice(
                `${result.synced} ${result.synced > 1 ? "modifications synchronisées" : "modification synchronisée"} avec le serveur.`
            );
        }
    };

    const handleCancelOperation = (queueId) => {
        setOfflineError(null);
        if (cancelQueuedOperation(queueId)) {
            refreshOfflineState();
            setOfflineNotice("Action hors ligne annulée.");
        }
    };

    const handleExportBackup = () => {
        setOfflineError(null);
        const snapshot = exportOfflineBackupData();
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const todayKey = new Date().toISOString().slice(0, 10);
        anchor.href = url;
        anchor.download = `tatero-sauvegarde-${todayKey}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        setOfflineNotice("Sauvegarde locale exportée au format JSON.");
    };

    const handleImportFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setOfflineError(null);
        setOfflineNotice(null);
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const result = importOfflineBackupData(parsed);
            refreshOfflineState();
            setOfflineNotice(
                `Import terminé : ${result.totalCached} factures en cache local (${result.importedCount} ajoutée${result.importedCount > 1 ? "s" : ""}).`
            );
        } catch (err) {
            setOfflineError(err.message || "Impossible de lire ce fichier de sauvegarde.");
        }
    };

    return (
        <>
            <div className="profile-page report-container">
                <header className="report-header profile-header">
                    <div className="header-title-wrapper">
                        <p className="report-kicker">Espace personnel</p>
                        <h1 className="report-title">Mon profil</h1>
                        <p className="report-subtitle">Vos informations de compte, synchronisation et sauvegarde hors ligne.</p>
                    </div>
                </header>

                <main className="profile-content">
                    {error && <div className="alert error" role="alert">{error}</div>}
                    {loading && <p className="profile-loading" role="status">Chargement du profil...</p>}

                    <section className="profile-panel" aria-label="Informations du compte">
                        <div className="profile-summary">
                            <div className="profile-avatar" aria-hidden="true">{initials}</div>
                            <div className="profile-identity">
                                <h2>{account.name || "Utilisateur"}</h2>
                                <p>{account.email || "Adresse email non renseignée"}</p>
                            </div>
                        </div>

                        <dl className="profile-details">
                            <div className="profile-detail">
                                <dt><UserRound aria-hidden="true" /> Genre</dt>
                                <dd>{account.gender || "Non renseigné"}</dd>
                            </div>
                            <div className="profile-detail">
                                <dt><BriefcaseBusiness aria-hidden="true" /> Lieu de travail</dt>
                                <dd>{account.workAt || "Non renseigné"}</dd>
                            </div>
                            <div className="profile-detail">
                                <dt><Mail aria-hidden="true" /> Adresse email</dt>
                                <dd>{account.email || "Non renseignée"}</dd>
                            </div>
                            <div className="profile-detail">
                                <dt><CalendarDays aria-hidden="true" /> Membre depuis</dt>
                                <dd>{formatDate(account.createdAt)}</dd>
                            </div>
                        </dl>

                        <div className="profile-actions">
                            <button className="profile-logout-action" type="button" onClick={handleLogout}>
                                <LogOut aria-hidden="true" /> Se déconnecter
                            </button>
                        </div>
                    </section>

                    <section id="offline" className="profile-panel offline-hub-panel" aria-labelledby="offline-hub-title">
                        <div className="offline-hub-header">
                            <div>
                                <h2 id="offline-hub-title">Mode hors ligne et sauvegarde</h2>
                                <p className="offline-hub-subtitle">
                                    Consultez l'état du cache local, gérez la file d'attente ou exportez vos données.
                                </p>
                            </div>
                            <span className={`offline-connection-state ${isOnline ? "is-online" : "is-offline"}`}>
                                {isOnline ? "En ligne" : "Hors ligne"}
                            </span>
                        </div>

                        <dl className="offline-stats-grid">
                            <div className="offline-stat-cell">
                                <dt>Factures en cache</dt>
                                <dd className="tabular-nums">{offlineStats.cachedCount}</dd>
                            </div>
                            <div className="offline-stat-cell">
                                <dt>Actions en attente</dt>
                                <dd className="tabular-nums">{offlineStats.pendingCount}</dd>
                            </div>
                            <div className="offline-stat-cell">
                                <dt>Dernière synchro</dt>
                                <dd className="tabular-nums">{formatSyncDate(offlineStats.lastSyncedAt)}</dd>
                            </div>
                        </dl>

                        {(offlineNotice || offlineError || syncError) && (
                            <div className="offline-hub-feedback">
                                {offlineNotice && <p className="alert success" role="status">{offlineNotice}</p>}
                                {(offlineError || syncError) && (
                                    <p className="alert error" role="alert">{offlineError || syncError}</p>
                                )}
                            </div>
                        )}

                        <div className="offline-hub-actions">
                            <button
                                type="button"
                                className="offline-hub-btn offline-hub-btn-primary"
                                onClick={handlePrefetchCache}
                                disabled={!isOnline || isPrefetching}
                            >
                                <HardDriveDownload size={16} aria-hidden="true" />
                                <span>{isPrefetching ? "Mise en cache..." : "Mettre à jour le cache"}</span>
                            </button>

                            {pendingQueue.length > 0 && (
                                <button
                                    type="button"
                                    className="offline-hub-btn"
                                    onClick={handleManualSync}
                                    disabled={!isOnline || isSyncing}
                                >
                                    <RefreshCw size={16} className={isSyncing ? "spin" : ""} aria-hidden="true" />
                                    <span>{isSyncing ? "Synchronisation..." : `Synchroniser (${pendingQueue.length})`}</span>
                                </button>
                            )}

                            <button
                                type="button"
                                className="offline-hub-btn"
                                onClick={handleExportBackup}
                            >
                                <Download size={16} aria-hidden="true" />
                                <span>Exporter JSON</span>
                            </button>

                            <button
                                type="button"
                                className="offline-hub-btn"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={16} aria-hidden="true" />
                                <span>Importer JSON</span>
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/json,.json"
                                onChange={handleImportFile}
                                className="sr-only"
                                aria-label="Importer une sauvegarde JSON"
                            />

                            {canShowInstall && (
                                <button
                                    type="button"
                                    className="offline-hub-btn"
                                    onClick={requestInstallModalOpen}
                                >
                                    <Smartphone size={16} aria-hidden="true" />
                                    <span>Installer l'application</span>
                                </button>
                            )}
                        </div>

                        {pendingQueue.length > 0 && (
                            <div className="offline-queue-section">
                                <h3>Modifications en attente de synchronisation</h3>
                                <ul className="offline-queue-list">
                                    {pendingQueue.map((op) => {
                                        const inv = op.invoice || op.payload || op.previousInvoice || {};
                                        const dateText = String(inv.date || "").slice(0, 10) || "Date inconnue";
                                        const amountText = Number.isFinite(Number(inv.amount))
                                            ? `${Math.round(Number(inv.amount)).toLocaleString("fr-FR")} Ar`
                                            : null;

                                        return (
                                            <li className="offline-queue-item" key={op.queueId}>
                                                <div className="offline-queue-info">
                                                    <strong>{OPERATION_LABELS[op.type] || op.type}</strong>
                                                    <span className="tabular-nums">
                                                        Facture du {dateText}
                                                        {amountText ? ` · ${amountText}` : ""}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="offline-queue-cancel"
                                                    onClick={() => handleCancelOperation(op.queueId)}
                                                    title="Annuler cette action locale"
                                                >
                                                    <RotateCcw size={14} aria-hidden="true" />
                                                    <span>Annuler</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </section>
                </main>
            </div>
            <Footer />
        </>
    );
};

export default Profile;