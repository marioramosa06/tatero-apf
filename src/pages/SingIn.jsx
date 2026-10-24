import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Mail,
    Lock,
    LogIn,
    Loader
} from "lucide-react";
import "../styles/DailyReports.css"; // Reuses shared form styles
import Footer from "../components/Footer";

const SignIn = () => {
    const navigate = useNavigate();
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
        setIsPending(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("http://localhost:3000/api/auth/signin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || "Identifiants invalides.");
            }

            // Save token / user data if present
            if (data.token) {
                localStorage.setItem("token", data.token);
            }

            setSuccess("Connexion réussie ! Redirection...");
            setTimeout(() => {
                navigate("/");
            }, 1500);
        } catch (err) {
            setError(err.message || "Une erreur s'est produite lors de la connexion.");
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
                    <span className="report-badge">Espace Utilisateur</span>
                    <h1 className="report-title">Connexion</h1>
                    <p className="report-subtitle">
                        Connectez-vous à votre compte Tatero pour gérer vos factures.
                    </p>
                </div>
            </header>

            <main className="form-card">
                <form className="report-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        {/* Email */}
                        <div className="form-group full-width">
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
                                required
                            />
                        </div>

                        {/* Mot de passe */}
                        <div className="form-group full-width">
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
                                required
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
                                <LogIn className="btn-icon" />
                            ) : (
                                <Loader className="btn-icon spin" />
                            )}
                            {!isPending ? "Se connecter" : "Connexion en cours..."}
                        </button>
                    </div>

                    <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "1rem" }}>
                        Vous n'avez pas encore de compte ?{" "}
                        <Link to="/signup" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
                            Inscrivez-vous ici
                        </Link>
                    </p>
                </form>
            </main>

            <Footer />
        </div>
    );
};

export default SignIn;