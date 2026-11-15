import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { fetchInvoicesRangeWithCache, submitCreateInvoice } from "../utils/invoiceApi";
import {
    Calendar,
    Users,
    Receipt,
    Coins,
    Calculator,
    MessageSquareText,
    Save,
    Loader,
    ArrowLeft
} from "lucide-react";
import "../styles/DailyReports.css";
import Footer from "../components/Footer";

const formatDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getNextWeekday = (date) => {
    const dateKey = String(date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        return formatDateInputValue(new Date());
    }

    const [year, month, day] = dateKey.split("-").map(Number);
    const nextDate = new Date(year, month - 1, day + 1);

    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
        nextDate.setDate(nextDate.getDate() + 1);
    }

    return formatDateInputValue(nextDate);
};

const DailyReports = () => {
    const { user, token } = useAuth();
    const hasUserEditedDateRef = useRef(false);

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isPending, setIsPending] = useState(false);

    const [formData, setFormData] = useState({
        date: formatDateInputValue(new Date()),
        nbP: "",
        nbOf: "",
        amount: "",
        comment: ""
    });

    useEffect(() => {
        if (!token) return;

        const now = new Date();
        const startDate = formatDateInputValue(new Date(now.getFullYear(), now.getMonth() - 6, 1));
        const endDate = formatDateInputValue(new Date(now.getFullYear(), now.getMonth() + 2, 0));
        const controller = new AbortController();

        const loadLastInvoiceDate = async () => {
            try {
                const { invoices: data } = await fetchInvoicesRangeWithCache({
                    token,
                    startDate,
                    endDate,
                    signal: controller.signal
                });
                if (!Array.isArray(data) || data.length === 0) return;

                const latestInvoice = [...data].sort((a, b) => {
                    const keyA = String(a?.date || "").slice(0, 10);
                    const keyB = String(b?.date || "").slice(0, 10);
                    const dateCmp = keyB.localeCompare(keyA);
                    if (dateCmp !== 0) return dateCmp;

                    const timeA = new Date(a?.updatedAt || a?.createdAt || 0).getTime() || 0;
                    const timeB = new Date(b?.updatedAt || b?.createdAt || 0).getTime() || 0;
                    return timeB - timeA;
                })[0];

                const lastDateKey = String(latestInvoice?.date || "").slice(0, 10);
                if (!/^\d{4}-\d{2}-\d{2}$/.test(lastDateKey) || hasUserEditedDateRef.current) {
                    return;
                }

                setFormData((prev) => ({
                    ...prev,
                    date: getNextWeekday(lastDateKey)
                }));
            } catch (err) {
                if (err.name !== "AbortError") {
                    // Keep default date if prefill lookup fails
                }
            }
        };

        loadLastInvoiceDate();
        return () => controller.abort();
    }, [token]);

    const calculateAverageCost = () => {
        const patients = parseFloat(formData.nbP);
        const totalAmount = parseFloat(formData.amount);
        if (patients > 0 && totalAmount >= 0) {
            return Math.round(totalAmount / patients);
        }
        return 0;
    };

    const averageCostValue = parseFloat(calculateAverageCost());
    const showCommentField = averageCostValue > 3500;

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "date") {
            hasUserEditedDateRef.current = true;
        }
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!formData.date) {
            setError("Veuillez sélectionner une date.");
            return;
        }
        if (formData.nbP === "" || !Number.isInteger(Number(formData.nbP)) || Number(formData.nbP) < 0) {
            setError("Veuillez saisir un nombre de patients valide.");
            return;
        }
        if (formData.nbOf === "" || !Number.isInteger(Number(formData.nbOf)) || Number(formData.nbOf) < 0) {
            setError("Veuillez saisir un nombre d'ordonnances valide.");
            return;
        }
        if (formData.amount === "" || !Number.isFinite(Number(formData.amount)) || Number(formData.amount) < 0) {
            setError("Veuillez saisir un montant valide.");
            return;
        }
        if (showCommentField && !formData.comment.trim()) {
            setError("Veuillez justifier le coût moyen supérieur à 3 500 Ar.");
            return;
        }

        setIsPending(true);
        const submissionData = {
            ...formData,
            averageCost: calculateAverageCost(),
            user: user?._id
        };

        try {
            const { invoice: saved, queued } = await submitCreateInvoice({
                token,
                payload: submissionData
            });

            setFormData({
                date: getNextWeekday(submissionData.date),
                nbP: "",
                nbOf: "",
                amount: "",
                comment: ""
            });

            const formattedAmount = Math.round(Number(saved.amount) || 0).toLocaleString("fr-FR");
            const dateStr = String(saved.date || submissionData.date).split("T")[0];
            setSuccess(
                queued
                    ? `Mode hors ligne : facture de ${formattedAmount} Ar pour le ${dateStr} enregistrée localement (en attente de synchronisation).`
                    : `Enregistrement d'une facture de ${formattedAmount} Ar pour la date du ${dateStr} réussi.`
            );
        } catch (err) {
            setError(err.message || "Impossible d'enregistrer la facture.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <>
            <div className="report-container">
                <header className="report-header">
                    <Link to="/" className="back-link">
                        <ArrowLeft className="back-icon" aria-hidden="true" /> Retour à l'accueil
                    </Link>
                    <div className="header-title-wrapper">
                        <p className="report-kicker">Facture journalière</p>
                        <h1 className="report-title">Enregistrer une facture</h1>
                        <p className="report-subtitle">
                            Saisissez les détails de la facture journalière pour enregistrer l'activité du jour.
                        </p>
                    </div>
                </header>

                <main className="form-card">
                    <form className="report-form" onSubmit={handleSubmit} noValidate>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="date">
                                    <Calendar className="field-icon" aria-hidden="true" />
                                    Date
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="nbP">
                                    <Users className="field-icon" aria-hidden="true" />
                                    Nombre de patients
                                </label>
                                <input
                                    type="number"
                                    id="nbP"
                                    name="nbP"
                                    min="0"
                                    placeholder="ex: 25"
                                    value={formData.nbP}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="nbOf">
                                    <Receipt className="field-icon" aria-hidden="true" />
                                    Ordonnances facturées
                                </label>
                                <input
                                    type="number"
                                    id="nbOf"
                                    name="nbOf"
                                    min="0"
                                    placeholder="ex: 20"
                                    value={formData.nbOf}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="amount">
                                    <Coins className="field-icon" aria-hidden="true" />
                                    Montant total (Ar)
                                </label>
                                <input
                                    type="number"
                                    id="amount"
                                    name="amount"
                                    step="0.01"
                                    min="0"
                                    placeholder="ex: 15000"
                                    value={formData.amount}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="averageCost">
                                    <Calculator className="field-icon" aria-hidden="true" />
                                    Coût moyen par patient (Ar)
                                </label>
                                <div className="input-readonly-wrapper">
                                    <input
                                        type="text"
                                        id="averageCost"
                                        name="averageCost"
                                        value={`${calculateAverageCost()} Ar`}
                                        readOnly
                                        className={`readonly-input${showCommentField ? " is-high" : ""}`}
                                    />
                                </div>
                            </div>

                            <div className="form-group full-width conditional-field">
                                <label htmlFor="comment">
                                    <MessageSquareText className="field-icon" aria-hidden="true" />
                                    {`Commentaire${showCommentField ? " (Requis : coût moyen > 3 500 Ar)" : ""}`}
                                </label>
                                <textarea
                                    id="comment"
                                    name="comment"
                                    rows="4"
                                    placeholder={showCommentField ? "Veuillez justifier ce coût moyen élevé..." : "Ajouter un commentaire si nécessaire..."}
                                    value={formData.comment}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                        </div>

                        {error && <span className="alert error" role="alert">{error}</span>}
                        {success && <span className="alert success" role="status">{success}</span>}

                        <div className="form-actions">
                            <button type="submit" className={`submit-btn ${isPending ? "submitting" : ""}`} disabled={isPending}>
                                {!isPending ? <Save className="btn-icon" aria-hidden="true" /> : <Loader className="btn-icon spin" aria-hidden="true" />}
                                {!isPending ? "Enregistrer la facture" : "Enregistrement..."}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
            <Footer />
        </>
    );
};

export default DailyReports;