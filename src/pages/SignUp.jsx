import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    User,
    Mail,
    Lock,
    UserPlus,
    Loader,
    Home,
    Users2
} from "lucide-react";
import "../styles/DailyReports.css"; // Reuses shared form styles
import Footer from "../components/Footer";

const SignUp = () => {
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isPending, setIsPending] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        gender: "",
        email: "",
        workAt: "",
        password: "",
        confirmPassword: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Client-side validation

        if (!formData.name.trim()) {
            setError("Veuillez saisir votre nom complet.");
            return;
        }
        if (formData.gender === "") {
            setError("Veuillez selectionner votre genre.");
            return;
        }

        if (!formData.email.trim()) {
            setError("Veuillez saisir adresse email.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            setError("Veuillez saisir une adresse email valide.");
            return;
        }
        if (!formData.workAt.trim()) {
            setError("Veuillez preciser votre lieu de travail.");
            return;
        }

        if (!formData.password) {
            setError("Veuillez entrer votre nouveau mot de passe.");
            return;
        } else if (formData.password.length < 6) {
            setError("Votre mot de passe doit contenir au moins 6 caractères.");
            return;
        } else if (formData.password !== formData.confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        setIsPending(true);
        try {
            const response = await fetch("http://localhost:8000/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    gender: formData.gender,
                    email: formData.email,
                    workAt: formData.workAt,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (!response.ok || data?.message || data?.error) {
                throw new Error(data?.message || data?.error || "Une erreur s'est produite lors de l'inscription.");
            }

            setSuccess("Compte créé avec succès ! Redirection vers la page de connexion...");
            setTimeout(() => {
                navigate("/signin");
            }, 3000);
        } catch (err) {
            setError(err.message || "Une erreur s'est produite lors de l'inscription.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="report-container">
            <header className="report-header">
                <Link to="/" className="back-link">
                    <ArrowLeft className="back-icon" /> Retour à l'accueil
                </Link>
                <div className="header-title-wrapper">
                    <span className="report-badge">Créer un compte</span>
                    <h1 className="report-title">Inscription</h1>
                    <p className="report-subtitle">
                        Rejoignez Tatero pour enregistrer et suivre vos factures en toute simplicité.
                    </p>
                </div>
            </header>

            <main className="form-card">
                <form className="report-form" onSubmit={handleSubmit} noValidate>
                    <div className="form-grid">
                        {/* Nom complet */}
                        <div className="form-group">
                            <label htmlFor="name">
                                <User className="field-icon" />
                                Nom complet
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                placeholder="ex: Mario Ramosa"
                                value={formData.name}
                                onChange={handleChange}

                            />
                        </div>

                        {/* Genre */}
                        <div className="form-group">
                            <span className="form-group-label" id="gender-label">
                                <Users2 className="field-icon" />
                                Genre
                            </span>
                            <div className="gender-chip-group" role="group" aria-labelledby="gender-label">
                                {[
                                    { value: "homme", label: "Homme" },
                                    { value: "femme", label: "Femme" }
                                ].map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={`gender-chip ${formData.gender === value ? "selected" : ""}`}
                                        aria-pressed={formData.gender === value}
                                        onClick={() => setFormData((prev) => ({ ...prev, gender: value }))}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="form-group ">
                            <label htmlFor="email">
                                <Mail className="field-icon" />
                                Adresse Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="exemple@domaine.com"
                                value={formData.email}
                                onChange={handleChange}

                            />
                        </div>

                        {/* lieu de travail */}
                        <div className="form-group ">
                            <label htmlFor="workAt">

                                <Home className="field-icon" />
                                Lieu de travail
                            </label>
                            <input
                                type="text"
                                id="workAt"
                                name="workAt"
                                placeholder="ex: CSB1 Anivorano"
                                value={formData.workAt}
                                onChange={handleChange}

                            />
                        </div>

                        {/* Mot de passe */}
                        <div className="form-group">
                            <label htmlFor="password">
                                <Lock className="field-icon" />
                                Mot de passe
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                minLength={6}

                            />
                        </div>

                        {/* Confirmation Mot de passe */}
                        <div className="form-group">
                            <label htmlFor="confirmPassword">
                                <Lock className="field-icon" />
                                Confirmer le mot de passe
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                minLength={6}

                            />
                        </div>
                    </div>

                    {error && <span className="alert error">{error}</span>}
                    {success && <span className="alert success">{success}</span>}

                    <div className="form-actions">
                        <button
                            type="submit"
                            className={`submit-btn ${isPending ? "submitting" : ""}`}
                            disabled={isPending}
                        >
                            {!isPending ? (
                                <UserPlus className="btn-icon" />
                            ) : (
                                <Loader className="btn-icon spin" />
                            )}
                            {!isPending ? "S'inscrire" : "Création du compte..."}
                        </button>
                    </div>

                    <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "1rem" }}>
                        Vous avez déjà un compte ?{" "}
                        <Link to="/signin" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
                            Connectez-vous ici
                        </Link>
                    </p>
                </form>
            </main>

            <Footer />
        </div>
    );
};

export default SignUp;