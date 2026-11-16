import { API_BASE_URL, notifyAuthExpired } from "./apiConfig";
import { getAuthHeaders } from "./authHeaders";
import {
    enqueueCreateInvoice,
    enqueueDeleteInvoice,
    enqueueUpdateInvoice,
    getCachedInvoicesInRange,
    getCachedProfile,
    getLastSyncedAt,
    isOfflineTempId,
    mergeCachedInvoices,
    readCachedInvoices,
    saveCachedProfile,
    setLastSyncedAt
} from "./offlineStore";

const SESSION_EXPIRED_MSG = "Votre session a expiré. Veuillez vous reconnecter.";

export const isOfflineOrNetworkError = (err) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return true;
    }
    if (!err) return false;
    if (err.name === "TypeError") return true;
    const message = String(err.message || "").toLowerCase();
    return (
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("network request failed") ||
        message.includes("load failed")
    );
};

export const fetchInvoicesRangeWithCache = async ({ token, startDate, endDate, signal }) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return {
            invoices: getCachedInvoicesInRange(startDate, endDate),
            fromCache: true
        };
    }

    try {
        const params = new URLSearchParams({
            startDate: String(startDate || ""),
            endDate: String(endDate || "")
        });
        const response = await fetch(
            `${API_BASE_URL}/invoices/range?${params.toString()}`,
            {
                headers: getAuthHeaders(token),
                signal
            }
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            if (response.status === 401) {
                notifyAuthExpired();
                throw new Error(SESSION_EXPIRED_MSG);
            }
            throw new Error(data?.error || data?.message || "Impossible de charger les factures.");
        }
        if (!Array.isArray(data)) {
            throw new Error("La réponse du serveur est invalide.");
        }

        mergeCachedInvoices(data, { startDate, endDate });
        setLastSyncedAt();
        return {
            invoices: getCachedInvoicesInRange(startDate, endDate),
            fromCache: false
        };
    } catch (err) {
        if (err.name === "AbortError") throw err;
        if (isOfflineOrNetworkError(err)) {
            const cached = getCachedInvoicesInRange(startDate, endDate);
            return {
                invoices: cached,
                fromCache: true
            };
        }
        throw err;
    }
};

export const fetchAllInvoicesWithCache = async ({ token, signal }) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return {
            invoices: readCachedInvoices(),
            fromCache: true
        };
    }

    try {
        const response = await fetch(`${API_BASE_URL}/invoices`, {
            headers: getAuthHeaders(token),
            signal
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            if (response.status === 401) {
                notifyAuthExpired();
                throw new Error(SESSION_EXPIRED_MSG);
            }
            throw new Error(data?.error || data?.message || "Impossible de charger les factures.");
        }

        const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.invoices)
                ? data.invoices
                : null;

        if (!list) {
            throw new Error("La réponse du serveur est invalide.");
        }

        const merged = mergeCachedInvoices(list, null);
        setLastSyncedAt();
        return {
            invoices: merged,
            fromCache: false
        };
    } catch (err) {
        if (err.name === "AbortError") throw err;
        if (isOfflineOrNetworkError(err)) {
            return {
                invoices: readCachedInvoices(),
                fromCache: true
            };
        }
        throw err;
    }
};

export const fetchProfileWithCache = async ({ token, signal }) => {
    if (!token) return null;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return getCachedProfile();
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: getAuthHeaders(token),
            signal
        });
        if (response.status === 401) {
            notifyAuthExpired();
            return null;
        }
        if (!response.ok) {
            return getCachedProfile();
        }
        const data = await response.json().catch(() => null);
        if (!data) return getCachedProfile();
        const profile = data.user || data;
        saveCachedProfile(profile);
        return profile;
    } catch (err) {
        if (err.name === "AbortError") throw err;
        return getCachedProfile();
    }
};

export const prefetchAllOfflineData = async ({ token, signal } = {}) => {
    if (!token) {
        throw new Error("Connexion requise pour préparer le mode hors ligne.");
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("Connexion Internet requise pour actualiser le cache hors ligne.");
    }

    const [{ invoices, fromCache }] = await Promise.all([
        fetchAllInvoicesWithCache({ token, signal }),
        fetchProfileWithCache({ token, signal }).catch(() => null)
    ]);

    return {
        cachedCount: invoices.length,
        fromCache,
        lastSyncedAt: getLastSyncedAt()
    };
};

export const submitCreateInvoice = async ({ token, payload }) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const localInvoice = enqueueCreateInvoice(payload);
        return { invoice: localInvoice, queued: true };
    }

    try {
        const response = await fetch(`${API_BASE_URL}/invoices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(token)
            },
            body: JSON.stringify(payload)
        });
        if (response.status === 401) {
            notifyAuthExpired();
            throw new Error(SESSION_EXPIRED_MSG);
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.error) {
            throw new Error(data?.error || data?.message || "Impossible d'enregistrer la facture.");
        }

        const existing = readCachedInvoices();
        mergeCachedInvoices([data, ...existing], null);
        setLastSyncedAt();
        return { invoice: data, queued: false };
    } catch (err) {
        if (isOfflineOrNetworkError(err)) {
            const localInvoice = enqueueCreateInvoice(payload);
            return { invoice: localInvoice, queued: true };
        }
        throw err;
    }
};

export const submitUpdateInvoice = async ({ token, invoiceId, payload, existingInvoice = {} }) => {
    if (
        isOfflineTempId(invoiceId) ||
        (typeof navigator !== "undefined" && navigator.onLine === false)
    ) {
        const updatedInvoice = enqueueUpdateInvoice(invoiceId, payload, existingInvoice);
        return { invoice: updatedInvoice, queued: true };
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/invoices/${encodeURIComponent(invoiceId)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(token)
                },
                body: JSON.stringify(payload)
            }
        );
        if (response.status === 401) {
            notifyAuthExpired();
            throw new Error(SESSION_EXPIRED_MSG);
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.error) {
            throw new Error(data?.error || data?.message || "Impossible d'enregistrer les modifications.");
        }

        const updatedInvoice = {
            ...existingInvoice,
            ...payload,
            ...data,
            _id: data._id ?? existingInvoice._id ?? invoiceId,
            id: data.id ?? data._id ?? existingInvoice.id ?? invoiceId,
            pendingSync: false
        };
        const cached = readCachedInvoices();
        mergeCachedInvoices(
            cached.map((inv) =>
                String(inv._id ?? inv.id) === String(invoiceId) ? updatedInvoice : inv
            ),
            null
        );
        setLastSyncedAt();
        return { invoice: updatedInvoice, queued: false };
    } catch (err) {
        if (isOfflineOrNetworkError(err)) {
            const updatedInvoice = enqueueUpdateInvoice(invoiceId, payload, existingInvoice);
            return { invoice: updatedInvoice, queued: true };
        }
        throw err;
    }
};

export const submitDeleteInvoice = async ({ token, invoiceId }) => {
    if (
        isOfflineTempId(invoiceId) ||
        (typeof navigator !== "undefined" && navigator.onLine === false)
    ) {
        enqueueDeleteInvoice(invoiceId);
        return { queued: true };
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/invoices/${encodeURIComponent(invoiceId)}`,
            {
                method: "DELETE",
                headers: getAuthHeaders(token)
            }
        );
        if (response.status === 401) {
            notifyAuthExpired();
            throw new Error(SESSION_EXPIRED_MSG);
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.error) {
            throw new Error(data?.error || data?.message || "Impossible de supprimer cette facture.");
        }

        const cached = readCachedInvoices();
        mergeCachedInvoices(
            cached.filter((inv) => String(inv._id ?? inv.id) !== String(invoiceId)),
            null
        );
        setLastSyncedAt();
        return { queued: false };
    } catch (err) {
        if (isOfflineOrNetworkError(err)) {
            enqueueDeleteInvoice(invoiceId);
            return { queued: true };
        }
        throw err;
    }
};
