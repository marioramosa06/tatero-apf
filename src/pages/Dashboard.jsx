import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    CalendarDays,
    FilePlus,
    Receipt,
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

const Dashboard = () => {
    const { token, user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const now = new Date();
        const startDate = formatDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
        const endDate = formatDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        const controller = new AbortController();

        const loadInvoices = async () => {
            try {
                const response = await fetch(
                    `https://api-tatero-apf.vercel.app/api/invoices/range?startDate=${startDate}&endDate=${endDate}`,
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
    }, [token]);

    const totalPatients = invoices.reduce((total, invoice) => total + (Number(invoice.nbP) || 0), 0);
    const totalPrescriptions = invoices.reduce((total, invoice) => total + (Number(invoice.nbOf) || 0), 0);
    const totalAmount = invoices.reduce((total, invoice) => total + (Number(invoice.amount) || 0), 0);
    const formatNumber = (value) => new Intl.NumberFormat("fr-FR").format(value);
    const monthName = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date());

    const metrics = [
        { label: "Factures enregistrées", value: formatNumber(invoices.length), icon: Receipt },
        { label: "Patients", value: formatNumber(totalPatients), icon: Users },
        { label: "Ordonnances", value: formatNumber(totalPrescriptions), icon: FilePlus },
        { label: "Montant total", value: `${formatNumber(totalAmount)} Ar`, icon: Wallet }
    ];

    return (
        <>
            <div className="dashboard-page report-container">
                <header className="report-header">
                    <Link to="/" className="back-link">
                        <ArrowLeft className="back-icon" /> Retour à l'accueil
                    </Link>
                    <div className="header-title-wrapper">
                        <span className="report-badge">Tableau de bord</span>
                        <h1 className="report-title">
                            Bonjour{user?.name ? `, ${user.name}` : ""}
                        </h1>
                        <p className="report-subtitle">
                            Voici le résumé de votre activité pour {monthName}.
                        </p>
                    </div>
                </header>

                <main className="dashboard-content">
                    <section className="dashboard-metrics" aria-label="Résumé du mois">
                        {metrics.map(({ label, value, icon: Icon }) => (
                            <article className="dashboard-metric" key={label}>
                                <span className="dashboard-metric-icon"><Icon aria-hidden="true" /></span>
                                <div>
                                    <p>{label}</p>
                                    {loading
                                        ? <span className="dashboard-metric-loading" role="status">Chargement...</span>
                                        : <strong>{value}</strong>}
                                </div>
                            </article>
                        ))}
                    </section>

                    {error && <div className="alert error" role="alert">{error}</div>}

                    <section className="dashboard-shortcuts" aria-labelledby="dashboard-shortcuts-title">
                        <div className="dashboard-section-heading">
                            <div>
                                <span className="dashboard-section-eyebrow">Accès rapide</span>
                                <h2 id="dashboard-shortcuts-title">Gérer votre activité</h2>
                            </div>
                        </div>
                        <div className="dashboard-shortcut-grid">
                            <Link to="/invoices/new" className="dashboard-shortcut">
                                <span className="dashboard-shortcut-icon"><FilePlus aria-hidden="true" /></span>
                                <span><strong>Nouvelle facture</strong><small>Enregistrer l'activité du jour</small></span>
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
