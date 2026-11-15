import test from "node:test";
import assert from "node:assert/strict";
import {
    enqueueCreateInvoice,
    enqueueDeleteInvoice,
    enqueueUpdateInvoice,
    getCachedInvoicesInRange,
    getPendingCount,
    getPendingQueue,
    mergeCachedInvoices,
    readCachedInvoices,
    syncOfflineQueue
} from "./offlineStore.js";

const createMemoryStorage = () => {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k)
    };
};

test("offlineStore queues create, edits pending create in-place, and cancels when deleted", () => {
    const storage = createMemoryStorage();

    const created = enqueueCreateInvoice(
        { date: "2026-11-14", nbP: 10, nbOf: 10, amount: 30000, averageCost: 3000, comment: "" },
        storage
    );
    assert.equal(getPendingCount(storage), 1);
    assert.equal(created.pendingSync, true);
    assert.equal(readCachedInvoices(storage).length, 1);

    const updated = enqueueUpdateInvoice(
        created._id,
        { date: "2026-11-14", nbP: 12, nbOf: 12, amount: 36000, averageCost: 3000, comment: "Ajusté" },
        created,
        storage
    );
    assert.equal(getPendingCount(storage), 1);
    assert.equal(updated.amount, 36000);
    assert.equal(getPendingQueue(storage)[0].payload.comment, "Ajusté");

    enqueueDeleteInvoice(created._id, storage);
    assert.equal(getPendingCount(storage), 0);
    assert.equal(readCachedInvoices(storage).length, 0);
});

test("mergeCachedInvoices preserves out-of-range cached items and pending operations", () => {
    const storage = createMemoryStorage();

    mergeCachedInvoices(
        [{ _id: "oct-1", date: "2026-10-15T00:00:00.000Z", nbP: 5, nbOf: 5, amount: 15000 }],
        { startDate: "2026-10-01", endDate: "2026-10-31" },
        storage
    );

    enqueueCreateInvoice(
        { date: "2026-11-10", nbP: 8, nbOf: 8, amount: 24000, averageCost: 3000, comment: "Hors ligne" },
        storage
    );

    mergeCachedInvoices(
        [{ _id: "nov-1", date: "2026-11-05T00:00:00.000Z", nbP: 6, nbOf: 6, amount: 18000 }],
        { startDate: "2026-11-01", endDate: "2026-11-30" },
        storage
    );

    const all = readCachedInvoices(storage);
    assert.equal(all.length, 3);
    assert.equal(getCachedInvoicesInRange("2026-11-01", "2026-11-30", storage).length, 2);
});

test("syncOfflineQueue replays queued create, update, and delete operations sequentially", async () => {
    const storage = createMemoryStorage();

    mergeCachedInvoices(
        [
            { _id: "srv-1", date: "2026-11-02", nbP: 5, nbOf: 5, amount: 15000 },
            { _id: "srv-2", date: "2026-11-03", nbP: 4, nbOf: 4, amount: 12000 }
        ],
        null,
        storage
    );

    enqueueCreateInvoice(
        { date: "2026-11-14", nbP: 7, nbOf: 7, amount: 21000, averageCost: 3000, comment: "" },
        storage
    );
    enqueueUpdateInvoice(
        "srv-1",
        { date: "2026-11-02", nbP: 6, nbOf: 6, amount: 18000, averageCost: 3000, comment: "Maj" },
        { _id: "srv-1" },
        storage
    );
    enqueueDeleteInvoice("srv-2", storage);

    assert.equal(getPendingCount(storage), 3);

    const calls = [];
    const fakeFetch = async (url, options = {}) => {
        calls.push({ url, method: options.method });
        if (options.method === "POST") {
            return {
                ok: true,
                status: 201,
                json: async () => ({ _id: "srv-created-99", date: "2026-11-14", nbP: 7, nbOf: 7, amount: 21000 })
            };
        }
        if (options.method === "PUT") {
            return {
                ok: true,
                status: 200,
                json: async () => ({ _id: "srv-1", date: "2026-11-02", nbP: 6, nbOf: 6, amount: 18000, comment: "Maj" })
            };
        }
        return {
            ok: true,
            status: 200,
            json: async () => ({ message: "Deleted" })
        };
    };

    const result = await syncOfflineQueue({
        token: "jwt-token",
        fetchImpl: fakeFetch,
        storage
    });

    assert.equal(result.synced, 3);
    assert.equal(result.remaining, 0);
    assert.equal(result.error, null);
    assert.equal(calls.map((c) => c.method).join(","), "POST,PUT,DELETE");

    const cached = readCachedInvoices(storage);
    assert.equal(cached.length, 2);
    assert.equal(cached[0]._id, "srv-created-99");
    assert.equal(cached[0].pendingSync, false);
});
