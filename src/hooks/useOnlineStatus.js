import { useCallback, useEffect, useState } from "react";
import useAuth from "./useAuth";
import {
    OFFLINE_CHANGE_EVENT,
    OFFLINE_SYNC_COMPLETE_EVENT,
    getLastSyncedAt,
    getPendingCount,
    syncOfflineQueue
} from "../utils/offlineStore";

export function useOnlineStatus() {
    const { token } = useAuth();
    const [isOnline, setIsOnline] = useState(() =>
        typeof navigator !== "undefined" ? navigator.onLine : true
    );
    const [pendingCount, setPendingCount] = useState(() => getPendingCount());
    const [lastSyncedAt, setLastSyncedAtState] = useState(() => getLastSyncedAt());
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(null);
    const [lastSyncedCount, setLastSyncedCount] = useState(0);

    const syncNow = useCallback(async () => {
        if (!token) return { synced: 0, remaining: getPendingCount(), error: null };
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            return { synced: 0, remaining: getPendingCount(), error: null };
        }
        if (getPendingCount() === 0) {
            return { synced: 0, remaining: 0, error: null };
        }

        setIsSyncing(true);
        setSyncError(null);
        const result = await syncOfflineQueue({ token });
        setPendingCount(result.remaining);
        setLastSyncedAtState(getLastSyncedAt());
        setIsSyncing(false);

        if (result.error) {
            setSyncError(result.error);
        } else if (result.synced > 0) {
            setLastSyncedCount(result.synced);
        }

        return result;
    }, [token]);

    useEffect(() => {
        if (lastSyncedCount <= 0) return undefined;
        const timer = setTimeout(() => setLastSyncedCount(0), 4000);
        return () => clearTimeout(timer);
    }, [lastSyncedCount]);

    useEffect(() => {
        if (!token || !isOnline || getPendingCount() === 0) return undefined;
        const timer = window.setTimeout(() => {
            syncNow();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [token, isOnline, syncNow]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncNow();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        const handleVisibilityChange = () => {
            if (!document.hidden && navigator.onLine) {
                setIsOnline(true);
                syncNow();
            }
        };

        const handleOfflineChange = (event) => {
            const nextCount = typeof event?.detail?.pendingCount === "number"
                ? event.detail.pendingCount
                : getPendingCount();
            setPendingCount(nextCount);
            if (event?.detail?.lastSyncedAt !== undefined) {
                setLastSyncedAtState(event.detail.lastSyncedAt);
            } else {
                setLastSyncedAtState(getLastSyncedAt());
            }
        };

        const handleSyncComplete = (event) => {
            setPendingCount(getPendingCount());
            setLastSyncedAtState(getLastSyncedAt());
            if (event?.detail?.synced > 0) {
                setLastSyncedCount(event.detail.synced);
            }
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener(OFFLINE_CHANGE_EVENT, handleOfflineChange);
        window.addEventListener(OFFLINE_SYNC_COMPLETE_EVENT, handleSyncComplete);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener(OFFLINE_CHANGE_EVENT, handleOfflineChange);
            window.removeEventListener(OFFLINE_SYNC_COMPLETE_EVENT, handleSyncComplete);
        };
    }, [syncNow]);

    return {
        isOnline,
        pendingCount,
        lastSyncedAt,
        isSyncing,
        syncError,
        lastSyncedCount,
        syncNow
    };
}
