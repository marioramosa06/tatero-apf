import { getAuthHeaders } from "./authHeaders";
import {
    enqueueCreateInvoice,
    enqueueDeleteInvoice,
    enqueueUpdateInvoice,
    getCachedInvoicesInRange,
    getCachedProfile,
    isOfflineTempId,
    mergeCachedInvoices,
    readCachedInvoices,
    saveCachedProfile
} from "./offlineStore";

const API_BASE = "https://api-tatero-apf.vercel.app/api";

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
        const response = await fetch(
            `${API_BASE}/invoices/range?startDate=${startDate}&endDate=${endDate}`,
            {
                headers: getAuthHeaders(token),
                signal
            }
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
            }
            throw new Error(data?.error || data?.message || "Impossible de charger les factures.");
        }
        if (!Array.isArray(data)) {
            throw new Error("La réponse du serveur est invalide.");
        }

        mergeCachedInvoices(data, { startDate, endDate });
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
        const response = await fetch(`${API_BASE}/invoices`, {
            headers: getAuthHeaders(token),
            signal
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
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
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: getAuthHeaders(token),
            signal
        });
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

export const submitCreateInvoice = async ({ token, payload }) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const localInvoice = enqueueCreateInvoice(payload);
        return { invoice: localInvoice, queued: true };
    }

    try {
        const response = await fetch(`${API_BASE}/invoices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(token)
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.error) {
            throw new Error(data?.error || data?.message || "Impossible d'enregistrer la facture.");
        }

        const existing = readCachedInvoices();
        mergeCachedInvoices([data, ...existing], null);
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
            `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(token)
                },
                body: JSON.stringify(payload)
            }
        );
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
            `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}`,
            {
                method: "DELETE",
                headers: getAuthHeaders(token)
            }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.error) {
            throw new Error(data?.error || data?.message || "Impossible de supprimer cette facture.");
        }

        const cached = readCachedInvoices();
        mergeCachedInvoices(
            cached.filter((inv) => String(inv._id ?? inv.id) !== String(invoiceId)),
            null
        );
        return { queued: false };
    } catch (err) {
        if (isOfflineOrNetworkError(err)) {
            enqueueDeleteInvoice(invoiceId);
            return { queued: true };
        }
        throw err;
    }
};
