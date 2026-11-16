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
import "../styles/DailyReports.css";
import Footer from "../components/Footer";
import PasswordInput from "../components/PasswordInput";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

const getFriendlyAuthError = (message) => {
    const normalized = String(message || "").trim();

    if (!normalized) {
        return "Une erreur s'est produite lors de l'inscription.";
    }

    const lowerMessage = normalized.toLowerCase();

    if (
        lowerMessage.includes("déjà utilisée") ||
        lowerMessage.includes("already") ||
        lowerMessage.includes("duplicate") ||
        lowerMessage.includes("already exists")
    ) {
        return "Cette adresse e-mail est déjà utilisée. Essayez une autre adresse ou connectez-vous.";
    }

    if (lowerMessage.includes("email") && lowerMessage.includes("valid")) {
        return "Veuillez saisir une adresse e-mail valide.";
    }

    if (
        lowerMessage.includes("nom") ||
        lowerMessage.includes("genre") ||
        lowerMessage.includes("lieu") ||
        lowerMessage.includes("travail")
    ) {
        return "Veuillez vérifier les informations obligatoires du formulaire.";
    }

    if (
        lowerMessage.includes("fetch") ||
        lowerMessage.includes("network") ||
        lowerMessage.includes("serveur") ||
        lowerMessage.includes("failed to fetch")
    ) {
        return "Impossible de joindre le serveur d'inscription. Vérifiez votre connexion Internet, puis réessayez. Si le problème persiste, réessayez plus tard.";
    }

    return normalized;
};

const SignUp = () => {
    const navigate = useNavigate();
    const { isOnline } = useOnlineStatus();
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

        if (!formData.name.trim()) {
            setError("Veuillez saisir votre nom complet.");
            return;
        }
        if (formData.gender === "") {
            setError("Veuillez sélectionner votre genre.");
            return;
        }

        if (!formData.email.trim()) {
            setError("Veuillez saisir votre adresse email.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            setError("Veuillez saisir une adresse email valide.");
            return;
        }
        if (!formData.workAt.trim()) {
            setError("Veuillez préciser votre lieu de travail.");
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
            const response = await fetch("https://api-tatero-apf.vercel.app/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    gender: formData.gender,
                    email: formData.email.trim(),
                    workAt: formData.workAt.trim(),
                    password: formData.password
                })
            });

            const data = await response.json().catch(() => ({}));
            const serverMessage = typeof data === "string" ? data : data?.message || data?.error;

            if (!response.ok) {
                throw new Error(getFriendlyAuthError(serverMessage));
            }

            setSuccess("Compte créé avec succès ! Redirection vers la page de connexion...");
            setTimeout(() => {
                navigate("/signin");
            }, 3000);
        } catch (err) {
            setError(getFriendlyAuthError(err.message));
        } finally {
            setIsPending(false);
        }
    };

    return (
        <>
            <div className="report-container auth-container-wide">
                <header className="report-header">
                    <Link to="/" className="back-link">
                        <ArrowLeft className="back-icon" aria-hidden="true" /> Retour à l'accueil
                    </Link>
                    <div className="header-title-wrapper">
                        <p className="report-kicker">Créer un compte</p>
                        <h1 className="report-title">Inscription</h1>
                        <p className="report-subtitle">
                            Rejoignez Tatero pour enregistrer et suivre vos factures en toute simplicité.
                        </p>
                    </div>
                </header>

                <main className="form-card">
                    {!isOnline && (
                        <div className="offline-cache-note" role="status">
                            <span>Mode hors ligne : une connexion Internet est requise pour créer un compte.</span>
                        </div>
                    )}
                    <form className="report-form" onSubmit={handleSubmit} noValidate>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="name">
                                    <User className="field-icon" aria-hidden="true" />
                                    Nom complet
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    placeholder="ex: Rakotondrabe Koto"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <span className="form-group-label" id="gender-label">
                                    <Users2 className="field-icon" aria-hidden="true" />
                                    Genre
                                </span>
                                <div className="gender-option-group" role="radiogroup" aria-labelledby="gender-label">
                                    {[
                                        { value: "homme", label: "Homme" },
                                        { value: "femme", label: "Femme" }
                                    ].map(({ value, label }) => {
                                        const isSelected = formData.gender === value;
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                role="radio"
                                                aria-checked={isSelected}
                                                className={`gender-option${isSelected ? " selected" : ""}`}
                                                onClick={() => setFormData((prev) => ({ ...prev, gender: value }))}
                                            >
                                                <span className="gender-option-indicator" aria-hidden="true" />
                                                <span>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">
                                    <Mail className="field-icon" aria-hidden="true" />
                                    Adresse email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    placeholder="ex: rakoto@mailaka.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="workAt">
                                    <Home className="field-icon" aria-hidden="true" />
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

                            <div className="form-group">
                                <label htmlFor="password">
                                    <Lock className="field-icon" aria-hidden="true" />
                                    Mot de passe
                                </label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    placeholder="Nouveau mot de passe"
                                    value={formData.password}
                                    onChange={handleChange}
                                    minLength={6}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">
                                    <Lock className="field-icon" aria-hidden="true" />
                                    Confirmer le mot de passe
                                </label>
                                <PasswordInput
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    placeholder="Confirmer le mot de passe"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && <span className="alert error" role="alert">{error}</span>}
                        {success && <span className="alert success" role="status">{success}</span>}

                        <div className="form-actions">
                            <button
                                type="submit"
                                className={`submit-btn ${isPending ? "submitting" : ""}`}
                                disabled={isPending}
                            >
                                {!isPending ? (
                                    <UserPlus className="btn-icon" aria-hidden="true" />
                                ) : (
                                    <Loader className="btn-icon spin" aria-hidden="true" />
                                )}
                                {!isPending ? "S'inscrire" : "Création du compte..."}
                            </button>
                        </div>

                        <p className="auth-footer-note">
                            Vous avez déjà un compte ?{" "}
                            <Link to="/signin" className="auth-footer-link">
                                Connectez-vous ici
                            </Link>
                        </p>
                    </form>
                </main>
            </div>
            <Footer />
        </>
    );
};

export default SignUp;