import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Mail,
    Lock,
    LogIn,
    Loader
} from "lucide-react";
import "../styles/DailyReports.css";
import Footer from "../components/Footer";
import useAuth from "../hooks/useAuth";
import PasswordInput from "../components/PasswordInput";

const getFriendlyAuthError = (message) => {
    const normalized = String(message || "").trim();

    if (!normalized) {
        return "Une erreur s'est produite lors de la connexion.";
    }

    const lowerMessage = normalized.toLowerCase();

    if (
        lowerMessage.includes("déjà utilisée") ||
        lowerMessage.includes("already") ||
        lowerMessage.includes("duplicate") ||
        lowerMessage.includes("already exists")
    ) {
        return "Cette adresse e-mail est déjà utilisée. Connectez-vous ou choisissez une autre adresse.";
    }

    if (
        lowerMessage.includes("aucun compte") ||
        lowerMessage.includes("introuvable") ||
        lowerMessage.includes("not found")
    ) {
        return "Aucun compte trouvé pour cette adresse e-mail.";
    }

    if (
        lowerMessage.includes("mot de passe") ||
        lowerMessage.includes("incorrect") ||
        lowerMessage.includes("invalid password") ||
        lowerMessage.includes("password")
    ) {
        return "Le mot de passe est incorrect. Veuillez réessayer.";
    }

    if (lowerMessage.includes("email") && lowerMessage.includes("valid")) {
        return "Veuillez saisir une adresse e-mail valide.";
    }

    if (
        lowerMessage.includes("fetch") ||
        lowerMessage.includes("network") ||
        lowerMessage.includes("serveur") ||
        lowerMessage.includes("failed to fetch")
    ) {
        return "Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.";
    }

    return normalized;
};

const SignIn = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isPending, setIsPending] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        password: ""
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

        if (!formData.email.trim() || !formData.password) {
            setError("Veuillez saisir votre adresse email et votre mot de passe.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            setError("Veuillez saisir une adresse email valide.");
            return;
        }

        setIsPending(true);
        try {
            const response = await fetch("https://api-tatero-apf.vercel.app/api/auth/signin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email.trim(),
                    password: formData.password
                })
            });

            const data = await response.json().catch(() => ({}));
            const serverMessage = typeof data === "string" ? data : data?.message || data?.error;

            if (!response.ok || data?.hasError) {
                throw new Error(getFriendlyAuthError(serverMessage));
            }
            if (!data.token) {
                throw new Error("La réponse du serveur ne contient pas de jeton de connexion.");
            }
            login(data.token, data.user);

            setSuccess("Connexion réussie ! Redirection...");

            setTimeout(() => {
                navigate("/dashboard");
            }, 1500);
        } catch (err) {
            setError(err.message || "Une erreur s'est produite lors de la connexion.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <>
            <div className="report-container auth-container">
                <header className="report-header">
                    <Link to="/" className="back-link">
                        <ArrowLeft className="back-icon" aria-hidden="true" /> Retour à l'accueil
                    </Link>
                    <div className="header-title-wrapper">
                        <p className="report-kicker">Espace utilisateur</p>
                        <h1 className="report-title">Connexion</h1>
                        <p className="report-subtitle">
                            Connectez-vous à votre compte pour gérer vos factures.
                        </p>
                    </div>
                </header>

                <main className="form-card">
                    <form className="report-form" onSubmit={handleSubmit} noValidate>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label htmlFor="email">
                                    <Mail className="field-icon" aria-hidden="true" />
                                    Adresse email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    placeholder="rakoto@mailaka.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="password">
                                    <Lock className="field-icon" aria-hidden="true" />
                                    Mot de passe
                                </label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    placeholder="Votre mot de passe"
                                    value={formData.password}
                                    onChange={handleChange}
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
                                    <LogIn className="btn-icon" aria-hidden="true" />
                                ) : (
                                    <Loader className="btn-icon spin" aria-hidden="true" />
                                )}
                                {!isPending ? "Se connecter" : "Connexion en cours..."}
                            </button>
                        </div>

                        <p className="auth-footer-note">
                            Vous n'avez pas encore de compte ?{" "}
                            <Link to="/signup" className="auth-footer-link">
                                Inscrivez-vous ici
                            </Link>
                        </p>
                    </form>
                </main>
            </div>
            <Footer />
        </>
    );
};

export default SignIn;