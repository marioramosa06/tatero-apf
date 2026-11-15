import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    CalendarDays,
    FilePlus,
    Minus,
    Receipt,
    TrendingDown,
    TrendingUp,
    Users,
    Wallet
} from "lucide-react";
import Footer from "../components/Footer";
import useAuth from "../hooks/useAuth";
import { getAuthHeaders } from "../utils/authHeaders";
import "../styles/Dashboard.css";

const formatDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const toDateKey = (value) => String(value || "").slice(0, 10);

const parseDateKey = (dateKey) => {
    const [year, month, day] = String(dateKey).split("-").map(Number);
    return new Date(year, month - 1, day);
};

const formatShortDate = (dateValue) => {
    if (!dateValue) return "—";
    const key = toDateKey(dateValue);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return String(dateValue);
    return parseDateKey(key).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
};

const formatShortDayMonth = (dateValue) => {
    const key = toDateKey(dateValue);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return String(dateValue);
    return parseDateKey(key).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short"
    });
};

const summarizeInvoices = (list) => {
    const count = list.length;
    const patients = list.reduce((total, inv) => total + (Number(inv.nbP) || 0), 0);
    const prescriptions = list.reduce((total, inv) => total + (Number(inv.nbOf) || 0), 0);
    const amount = Math.round(list.reduce((total, inv) => total + (Number(inv.amount) || 0), 0));
    const averageCost = patients > 0 ? Math.round(amount / patients) : 0;

    return { count, patients, prescriptions, amount, averageCost };
};

const formatNumber = (value) => new Intl.NumberFormat("fr-FR").format(Math.round(Number(value) || 0));

const getComparisonDelta = (current, previous, unit = "") => {
    const diff = current - previous;
    const suffix = unit ? ` ${unit}` : "";

    if (previous === 0 && current === 0) {
        return {
            direction: "flat",
            label: "0 %",
            previousText: `vs 0${suffix}`
        };
    }

    if (previous === 0) {
        return {
            direction: diff > 0 ? "up" : "down",
            label: `${diff > 0 ? "+" : ""}${formatNumber(diff)}${suffix}`,
            previousText: `vs 0${suffix}`
        };
    }

    const pct = (diff / previous) * 100;
    const rounded = Math.round(pct * 10) / 10;
    const formattedPct = new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
        maximumFractionDigits: 1
    }).format(Math.abs(rounded));

    if (rounded === 0) {
        return {
            direction: "flat",
            label: "0 %",
            previousText: `vs ${formatNumber(previous)}${suffix}`
        };
    }

    return {
        direction: rounded > 0 ? "up" : "down",
        label: `${rounded > 0 ? "+" : "-"}${formattedPct} %`,
        previousText: `vs ${formatNumber(previous)}${suffix}`
    };
};

const getInvoiceSortTime = (invoice) => {
    const timestamp = invoice?.updatedAt || invoice?.createdAt;
    if (timestamp) {
        const parsed = new Date(timestamp).getTime();
        if (Number.isFinite(parsed)) return parsed;
    }
    const key = toDateKey(invoice?.date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        return parseDateKey(key).getTime();
    }
    return 0;
};

const Dashboard = () => {
    const { token, user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const periods = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const today = new Date(year, month, now.getDate());

        const curMonthStart = new Date(year, month, 1);
        const curMonthEnd = new Date(year, month + 1, 0);
        const prevMonthStart = new Date(year, month - 1, 1);
        const prevMonthEnd = new Date(year, month, 0);

        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const curWeekStart = new Date(today);
        curWeekStart.setDate(today.getDate() + diffToMonday);
        const curWeekEnd = new Date(curWeekStart);
        curWeekEnd.setDate(curWeekStart.getDate() + 6);

        const prevWeekStart = new Date(curWeekStart);
        prevWeekStart.setDate(curWeekStart.getDate() - 7);
        const prevWeekEnd = new Date(curWeekStart);
        prevWeekEnd.setDate(curWeekStart.getDate() - 1);

        // Fetch 4 months back so "last saved invoice" still resolves if current/prev month are empty
        const historyLookback = new Date(year, month - 3, 1);
        const earliestFetch = new Date(
            Math.min(prevMonthStart.getTime(), prevWeekStart.getTime(), historyLookback.getTime())
        );
        const latestFetch = new Date(
            Math.max(curMonthEnd.getTime(), curWeekEnd.getTime())
        );

        return {
            fetchStart: formatDateInputValue(earliestFetch),
            fetchEnd: formatDateInputValue(latestFetch),
            curMonthStart: formatDateInputValue(curMonthStart),
            curMonthEnd: formatDateInputValue(curMonthEnd),
            prevMonthStart: formatDateInputValue(prevMonthStart),
            prevMonthEnd: formatDateInputValue(prevMonthEnd),
            curWeekStart: formatDateInputValue(curWeekStart),
            curWeekEnd: formatDateInputValue(curWeekEnd),
            prevWeekStart: formatDateInputValue(prevWeekStart),
            prevWeekEnd: formatDateInputValue(prevWeekEnd),
            curMonthLabel: new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(curMonthStart),
            prevMonthLabel: new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(prevMonthStart)
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const loadInvoices = async () => {
            try {
                const response = await fetch(
                    `https://api-tatero-apf.vercel.app/api/invoices/range?startDate=${periods.fetchStart}&endDate=${periods.fetchEnd}`,
                    {
                        headers: getAuthHeaders(token),
                        signal: controller.signal
                    }
                );
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
                    }
                    throw new Error(data?.error || data?.message || "Impossible de charger les données du tableau de bord.");
                }
                if (!Array.isArray(data)) {
                    throw new Error("La réponse du serveur est invalide.");
                }

                setInvoices(data);
            } catch (requestError) {
                if (requestError.name !== "AbortError") {
                    setError(requestError.message || "Impossible de charger les données du tableau de bord.");
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        loadInvoices();
        return () => controller.abort();
    }, [token, periods.fetchStart, periods.fetchEnd]);

    const {
        curMonthStats,
        prevMonthStats,
        curWeekStats,
        prevWeekStats,
        lastSavedInvoice
    } = useMemo(() => {
        const inRange = (inv, start, end) => {
            const key = toDateKey(inv.date);
            return key >= start && key <= end;
        };

        const curMonthList = invoices.filter((inv) => inRange(inv, periods.curMonthStart, periods.curMonthEnd));
        const prevMonthList = invoices.filter((inv) => inRange(inv, periods.prevMonthStart, periods.prevMonthEnd));
        const curWeekList = invoices.filter((inv) => inRange(inv, periods.curWeekStart, periods.curWeekEnd));
        const prevWeekList = invoices.filter((inv) => inRange(inv, periods.prevWeekStart, periods.prevWeekEnd));

        const sorted = [...invoices].sort((a, b) => {
            const timeDiff = getInvoiceSortTime(b) - getInvoiceSortTime(a);
            if (timeDiff !== 0) return timeDiff;
            return toDateKey(b.date).localeCompare(toDateKey(a.date));
        });

        return {
            curMonthStats: summarizeInvoices(curMonthList),
            prevMonthStats: summarizeInvoices(prevMonthList),
            curWeekStats: summarizeInvoices(curWeekList),
            prevWeekStats: summarizeInvoices(prevWeekList),
            lastSavedInvoice: sorted[0] || null
        };
    }, [invoices, periods]);

    const metrics = [
        { label: "Factures enregistrées", value: formatNumber(curMonthStats.count), icon: Receipt },
        { label: "Patients", value: formatNumber(curMonthStats.patients), icon: Users },
        { label: "Ordonnances", value: formatNumber(curMonthStats.prescriptions), icon: FilePlus },
        { label: "Montant total", value: `${formatNumber(curMonthStats.amount)} Ar`, icon: Wallet }
    ];

    const buildComparisonRows = (current, previous) => [
        {
            label: "Montant total",
            valueText: `${formatNumber(current.amount)} Ar`,
            delta: getComparisonDelta(current.amount, previous.amount, "Ar")
        },
        {
            label: "Patients",
            valueText: formatNumber(current.patients),
            delta: getComparisonDelta(current.patients, previous.patients)
        },
        {
            label: "Ordonnances",
            valueText: formatNumber(current.prescriptions),
            delta: getComparisonDelta(current.prescriptions, previous.prescriptions)
        },
        {
            label: "Coût moyen",
            valueText: `${formatNumber(current.averageCost)} Ar`,
            delta: getComparisonDelta(current.averageCost, previous.averageCost, "Ar")
        },
        {
            label: "Factures saisies",
            valueText: formatNumber(current.count),
            delta: getComparisonDelta(current.count, previous.count)
        }
    ];

    const weeklyComparisonRows = buildComparisonRows(curWeekStats, prevWeekStats);
    const monthlyComparisonRows = buildComparisonRows(curMonthStats, prevMonthStats);

    const lastInvoicePatients = Number(lastSavedInvoice?.nbP) || 0;
    const lastInvoicePrescriptions = Number(lastSavedInvoice?.nbOf) || 0;
    const lastInvoiceAmount = Math.round(Number(lastSavedInvoice?.amount) || 0);
    const lastInvoiceAvg = Math.round(
        Number(
            lastSavedInvoice?.averageCost ??
            (lastInvoicePatients > 0 ? lastInvoiceAmount / lastInvoicePatients : 0)
        ) || 0
    );
    const isLastInvoiceHighAvg = lastInvoiceAvg > 3500;

    const renderDeltaBadge = (delta) => {
        const Icon =
            delta.direction === "up"
                ? TrendingUp
                : delta.direction === "down"
                    ? TrendingDown
                    : Minus;

        return (
            <span className={`comparison-delta delta-${delta.direction} tabular-nums`}>
                <Icon aria-hidden="true" />
                <span>{delta.label}</span>
            </span>
        );
    };

    return (
        <>
            <div className="dashboard-page report-container">
                <header className="report-header">
                    <Link to="/" className="back-link">
                        <ArrowLeft className="back-icon" aria-hidden="true" /> Retour à l'accueil
                    </Link>
                    <div className="header-title-wrapper">
                        <p className="report-kicker">
                            Tableau de bord <span aria-hidden="true">·</span> <span className="month-capitalize">{periods.curMonthLabel}</span>
                        </p>
                        <h1 className="report-title">
                            Bonjour{user?.name ? `, ${user.name}` : ""}
                        </h1>
                        <p className="report-subtitle">
                            Résumé de votre activité pour le mois en cours.
                        </p>
                    </div>
                </header>

                <main className="dashboard-content">
                    <section className="dashboard-metrics" aria-label="Résumé du mois">
                        {metrics.map(({ label, value, icon: Icon }) => (
                            <article className="dashboard-metric" key={label}>
                                <div className="dashboard-metric-top">
                                    <p>{label}</p>
                                    <span className="dashboard-metric-icon"><Icon aria-hidden="true" /></span>
                                </div>
                                {loading
                                    ? <span className="dashboard-metric-loading" role="status">Chargement...</span>
                                    : <strong className="tabular-nums">{value}</strong>}
                            </article>
                        ))}
                    </section>

                    {error && <div className="alert error" role="alert">{error}</div>}

                    <section className="dashboard-panel" aria-labelledby="last-invoice-title">
                        <div className="dashboard-panel-header">
                            <div className="dashboard-panel-title-group">
                                <h2 id="last-invoice-title">Dernière facture enregistrée</h2>
                                {!loading && lastSavedInvoice && (
                                    <p className="dashboard-panel-meta">
                                        Date de facture : {formatShortDate(lastSavedInvoice.date)}
                                        {lastSavedInvoice.createdAt && (
                                            <>
                                                <span aria-hidden="true"> · </span>
                                                Saisie le {new Date(lastSavedInvoice.createdAt).toLocaleDateString("fr-FR", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </>
                                        )}
                                    </p>
                                )}
                            </div>
                            <Link to="/invoices" className="dashboard-panel-link">
                                Toutes les factures <ArrowRight aria-hidden="true" />
                            </Link>
                        </div>

                        {loading ? (
                            <p className="dashboard-panel-state" role="status">Chargement de la dernière facture...</p>
                        ) : !lastSavedInvoice ? (
                            <div className="dashboard-panel-empty">
                                <p>Aucune facture enregistrée sur les quatre derniers mois.</p>
                                <Link to="/invoices/new" className="dashboard-inline-cta">
                                    Enregistrer une facture <ArrowRight aria-hidden="true" />
                                </Link>
                            </div>
                        ) : (
                            <>
                                <dl className="last-invoice-grid">
                                    <div className="last-invoice-cell">
                                        <dt>Date</dt>
                                        <dd className="tabular-nums">{formatShortDate(lastSavedInvoice.date)}</dd>
                                    </div>
                                    <div className="last-invoice-cell">
                                        <dt>Patients</dt>
                                        <dd className="tabular-nums">{formatNumber(lastInvoicePatients)}</dd>
                                    </div>
                                    <div className="last-invoice-cell">
                                        <dt>Ordonnances</dt>
                                        <dd className="tabular-nums">{formatNumber(lastInvoicePrescriptions)}</dd>
                                    </div>
                                    <div className="last-invoice-cell">
                                        <dt>Montant</dt>
                                        <dd className="tabular-nums">{formatNumber(lastInvoiceAmount)} Ar</dd>
                                    </div>
                                    <div className="last-invoice-cell">
                                        <dt>Coût moyen</dt>
                                        <dd className={`tabular-nums ${isLastInvoiceHighAvg ? "is-high" : ""}`}>
                                            {formatNumber(Math.round(lastInvoiceAvg))} Ar
                                            {isLastInvoiceHighAvg && <span className="high-flag"> (Élevé)</span>}
                                        </dd>
                                    </div>
                                </dl>
                                {lastSavedInvoice.comment && (
                                    <p className="last-invoice-comment">
                                        <span>Remarque :</span> {lastSavedInvoice.comment}
                                    </p>
                                )}
                            </>
                        )}
                    </section>

                    <section className="dashboard-comparisons" aria-label="Comparaison hebdomadaire et mensuelle">
                        <article className="dashboard-panel" aria-labelledby="weekly-comparison-title">
                            <div className="dashboard-panel-header">
                                <div className="dashboard-panel-title-group">
                                    <h2 id="weekly-comparison-title">Statistiques hebdomadaires</h2>
                                    <p className="dashboard-panel-meta">
                                        {formatShortDayMonth(periods.curWeekStart)} – {formatShortDayMonth(periods.curWeekEnd)}
                                        <span aria-hidden="true"> · </span>
                                        vs {formatShortDayMonth(periods.prevWeekStart)} – {formatShortDayMonth(periods.prevWeekEnd)}
                                    </p>
                                </div>
                                <Link to="/reports/week" className="dashboard-panel-link">
                                    Voir semaine <ArrowRight aria-hidden="true" />
                                </Link>
                            </div>

                            {loading ? (
                                <p className="dashboard-panel-state" role="status">Calcul des statistiques hebdomadaires...</p>
                            ) : (
                                <div className="comparison-list">
                                    {weeklyComparisonRows.map((row) => (
                                        <div className="comparison-row" key={row.label}>
                                            <span className="comparison-label">{row.label}</span>
                                            <div className="comparison-values">
                                                <strong className="comparison-current tabular-nums">{row.valueText}</strong>
                                                <div className="comparison-sub">
                                                    <span className="comparison-prev tabular-nums">{row.delta.previousText}</span>
                                                    {renderDeltaBadge(row.delta)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </article>

                        <article className="dashboard-panel" aria-labelledby="monthly-comparison-title">
                            <div className="dashboard-panel-header">
                                <div className="dashboard-panel-title-group">
                                    <h2 id="monthly-comparison-title">Statistiques mensuelles</h2>
                                    <p className="dashboard-panel-meta">
                                        <span className="month-capitalize">{periods.curMonthLabel}</span>
                                        <span aria-hidden="true"> · </span>
                                        vs <span className="month-capitalize">{periods.prevMonthLabel}</span>
                                    </p>
                                </div>
                                <Link to="/reports/month" className="dashboard-panel-link">
                                    Voir mois <ArrowRight aria-hidden="true" />
                                </Link>
                            </div>

                            {loading ? (
                                <p className="dashboard-panel-state" role="status">Calcul des statistiques mensuelles...</p>
                            ) : (
                                <div className="comparison-list">
                                    {monthlyComparisonRows.map((row) => (
                                        <div className="comparison-row" key={row.label}>
                                            <span className="comparison-label">{row.label}</span>
                                            <div className="comparison-values">
                                                <strong className="comparison-current tabular-nums">{row.valueText}</strong>
                                                <div className="comparison-sub">
                                                    <span className="comparison-prev tabular-nums">{row.delta.previousText}</span>
                                                    {renderDeltaBadge(row.delta)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </article>
                    </section>

                    <section className="dashboard-shortcuts" aria-labelledby="dashboard-shortcuts-title">
                        <div className="dashboard-section-heading">
                            <h2 id="dashboard-shortcuts-title">Accès rapide</h2>
                        </div>
                        <div className="dashboard-shortcut-grid">
                            <Link to="/invoices/new" className="dashboard-shortcut">
                                <span className="dashboard-shortcut-icon"><FilePlus aria-hidden="true" /></span>
                                <span><strong>Nouvelle facture</strong><small>Enregistrer l'activité du jour</small></span>
                                <ArrowRight className="dashboard-shortcut-arrow" aria-hidden="true" />
                            </Link>
                            <Link to="/invoices" className="dashboard-shortcut">
                                <span className="dashboard-shortcut-icon"><Receipt aria-hidden="true" /></span>
                                <span><strong>Toutes les factures</strong><small>Consulter, modifier ou supprimer</small></span>
                                <ArrowRight className="dashboard-shortcut-arrow" aria-hidden="true" />
                            </Link>
                            <Link to="/reports/week" className="dashboard-shortcut">
                                <span className="dashboard-shortcut-icon"><CalendarDays aria-hidden="true" /></span>
                                <span><strong>Rapport hebdomadaire</strong><small>Consulter les chiffres de la semaine</small></span>
                                <ArrowRight className="dashboard-shortcut-arrow" aria-hidden="true" />
                            </Link>
                            <Link to="/reports/month" className="dashboard-shortcut">
                                <span className="dashboard-shortcut-icon"><BarChart3 aria-hidden="true" /></span>
                                <span><strong>Récap mensuel</strong><small>Explorer les données du mois</small></span>
                                <ArrowRight className="dashboard-shortcut-arrow" aria-hidden="true" />
                            </Link>
                        </div>
                    </section>
                </main>
            </div>
            <Footer />
        </>
    );
};

export default Dashboard;
