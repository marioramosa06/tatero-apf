import { useState } from "react";
// import { Link } from "react-router-dom";
import {
    Calendar,
    Users,
    Receipt,
    Coins,
    Calculator,
    MessageSquareText,
    Save,
    Loader
} from "lucide-react";
import "../styles/DailyReports.css";
import Footer from "../components/Footer";

const DailyReports = () => {
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [isPending, setIsPending] = useState(false)

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        nbP: "",
        nbOf: "",
        amount: "",
        comment: ""
    });

    // Auto-calculate Average Cost per Patient
    const calculateAverageCost = () => {
        const patients = parseFloat(formData.nbP);
        const totalAmount = parseFloat(formData.amount);
        if (patients > 0 && totalAmount >= 0) {
            return Math.round(totalAmount / patients);
        }
        return "0.00";
    };

    const averageCostValue = parseFloat(calculateAverageCost());
    const showCommentField = averageCostValue > 3500;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsPending(true)
        setError(null)
        setSuccess(null)
        const submissionData = {
            ...formData,
            averageCost: calculateAverageCost(),
            user: "6ac466b071eb6299c74895eb"
        };
        // console.log("Facture journalière soumise :", submissionData);
        // Add your API call / submit logic here
        fetch("http://192.168.1.3:8000/api/invoices/", {
            headers: { "Content-Type": "application/json" },
            method: "post",
            body: JSON.stringify(submissionData)
        })
            .then((res) => res.json())
            .then((data) => {
                console.log(data)
                if (data.error) {
                    throw new Error(data.error);
                }
                setFormData({
                    date: "",
                    nbP: "",
                    nbOf: "",
                    amount: "",
                    comment: ""
                })
                setSuccess(`Enregistrement d'une facture de ${data.amount} Ar pour la date du ${data.date.split("T")[0]} reussi  `)
                setIsPending(false)
            }).catch((err) => {
                setError(err.message)
                setIsPending(false)
            })

    }


    return (
        <>
            <div className="report-container">

                <header className="report-header">
                    {/* <Link to="/" className="back-link">
                    <ArrowLeft className="back-icon" /> Retour à l'accueil
                </Link> */}
                    <div className="header-title-wrapper">
                        <span className="report-badge">Facture Journalière </span>
                        <h1 className="report-title">Enregistrer une facture</h1>
                        <p className="report-subtitle">
                            Saisissez les détails de la facture journalière pour enregistrer l'activité du jour.
                        </p>
                    </div>
                </header>

                <main className="form-card">


                    <form className="report-form" onSubmit={handleSubmit}>
                        <div className="form-grid">
                            {/* Date */}
                            <div className="form-group">
                                <label htmlFor="date">
                                    <Calendar className="field-icon" />
                                    Date
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Nombre de patients */}
                            <div className="form-group">
                                <label htmlFor="nbP">
                                    <Users className="field-icon" />
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
                                    required
                                />
                            </div>

                            {/* Nombre d'ordonnances facturées */}
                            <div className="form-group">
                                <label htmlFor="nbOf">
                                    <Receipt className="field-icon" />
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
                                    required
                                />
                            </div>

                            {/* Montant Total */}
                            <div className="form-group">
                                <label htmlFor="amount">
                                    <Coins className="field-icon" />
                                    Montant total (Ar)
                                </label>
                                <input
                                    type="number"
                                    id="amount"
                                    name="amount"
                                    step="0.01"
                                    min="0"
                                    placeholder="ex: 150000"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Coût Moyen (Auto-calculated) */}
                            <div className="form-group full-width">
                                <label htmlFor="averageCost">
                                    <Calculator className="field-icon" />
                                    Coût moyen par patient (Calculé)
                                </label>
                                <div className="input-readonly-wrapper">
                                    <input
                                        type="text"
                                        id="averageCost"
                                        name="averageCost"
                                        value={`${calculateAverageCost()}`}
                                        readOnly
                                        className="readonly-input"
                                    />
                                </div>
                            </div>

                            {/* Conditional Comment Field (Shown when averageCost > 3500) */}

                            <div className="form-group full-width conditional-field animate-fade-in">
                                <label htmlFor="comment">
                                    <MessageSquareText className="field-icon" />
                                    {`Commentaire ${showCommentField ? "(Requis : Coût moyen depasse le 3 500 Ar)" : ""}`}
                                </label>
                                <textarea
                                    id="comment"
                                    name="comment"
                                    rows="5"
                                    placeholder={`${showCommentField ? "Veuillez justifier ce coût moyen élevé..." : "Ajouter un commentaire si necessaire..."}`}
                                    value={formData.comment}
                                    onChange={handleChange}
                                    required={showCommentField}
                                ></textarea>
                            </div>

                        </div>
                        {error && <span className="alert error">{error}</span>}
                        {success && <span className="alert success">{success}</span>}
                        <div className="form-actions">
                            <button type="submit" className={`submit-btn ${isPending ? "submitting" : ""}`} disabled={isPending}>
                                {!isPending ? <Save className="btn-icon" /> : <Loader className="btn-icon spin" />} {!isPending ? "Enregitrer la facture" : "Enregistrement..."}
                            </button>
                        </div>
                    </form>
                </main>
                <Footer />
            </div>
        </>
    );
};

export default DailyReports;