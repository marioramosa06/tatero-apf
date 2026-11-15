import test from "node:test";
import assert from "node:assert/strict";
import {
    filterInvoices,
    getInvoiceAverageCost,
    getWeekMondayKey,
    groupInvoicesByMonthAndWeek,
    toDateKey
} from "./invoiceGrouping.js";

test("toDateKey preserves calendar date from ISO strings without timezone shift", () => {
    assert.equal(toDateKey("2026-11-01T00:00:00.000Z"), "2026-11-01");
    assert.equal(toDateKey("2026-10-31"), "2026-10-31");
});

test("getWeekMondayKey resolves week Monday for weekdays and Sundays", () => {
    assert.equal(getWeekMondayKey("2026-11-01"), "2026-10-26");
    assert.equal(getWeekMondayKey("2026-11-02"), "2026-11-02");
    assert.equal(getWeekMondayKey("2026-11-04"), "2026-11-02");
});

test("getInvoiceAverageCost rounds average cost and guards against zero patients", () => {
    assert.equal(getInvoiceAverageCost({ nbP: 3, amount: 10000 }), 3333);
    assert.equal(getInvoiceAverageCost({ nbP: 2, amount: 8000, averageCost: 4000.6 }), 4001);
    assert.equal(getInvoiceAverageCost({ nbP: 0, amount: 5000 }), 0);
});

test("filterInvoices filters by search query and high average cost threshold", () => {
    const sample = [
        { _id: "1", date: "2026-11-04", nbP: 10, amount: 25000, comment: "Consultation standard" },
        { _id: "2", date: "2026-10-28", nbP: 4, amount: 16000, comment: "Cas paludisme urgent" }
    ];

    assert.equal(filterInvoices(sample, { onlyHighAvg: true }).length, 1);
    assert.equal(filterInvoices(sample, { onlyHighAvg: true })[0]._id, "2");
    assert.equal(filterInvoices(sample, { searchQuery: "paludisme" }).length, 1);
    assert.equal(filterInvoices(sample, { searchQuery: "novembre" }).length, 1);
});

test("groupInvoicesByMonthAndWeek creates descending month separators with weekly sub-groups and rounded totals", () => {
    const sample = [
        { _id: "1", date: "2026-10-27T00:00:00.000Z", nbP: 5, nbOf: 5, amount: 12000.4 },
        { _id: "2", date: "2026-11-03T00:00:00.000Z", nbP: 4, nbOf: 4, amount: 10000.2 },
        { _id: "3", date: "2026-11-05T00:00:00.000Z", nbP: 6, nbOf: 6, amount: 15000.6 },
        { _id: "4", date: "2026-11-12T00:00:00.000Z", nbP: 3, nbOf: 3, amount: 9000 }
    ];

    const grouped = groupInvoicesByMonthAndWeek(sample);

    assert.equal(grouped.length, 2);
    assert.equal(grouped[0].monthKey, "2026-11");
    assert.equal(grouped[0].count, 3);
    assert.equal(grouped[0].totalPatients, 13);
    assert.equal(grouped[0].totalAmount, 34001);

    assert.equal(grouped[0].weeks.length, 2);
    assert.equal(grouped[0].weeks[0].weekKey, "2026-11-09");
    assert.equal(grouped[0].weeks[1].weekKey, "2026-11-02");
    assert.equal(grouped[0].weeks[1].items.map((item) => item._id).join(","), "3,2");

    assert.equal(grouped[1].monthKey, "2026-10");
    assert.equal(grouped[1].weeks.length, 1);
    assert.equal(grouped[1].weeks[0].weekKey, "2026-10-26");
});
