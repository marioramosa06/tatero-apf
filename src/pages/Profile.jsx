import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, CalendarDays, LogOut, Mail, UserRound } from "lucide-react";
import Footer from "../components/Footer";
import useAuth from "../hooks/useAuth";
import { getAuthHeaders } from "../utils/authHeaders";
import "../styles/Profile.css";

const Profile = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadProfile = async () => {
            try {
                const response = await fetch("https://api-tatero-apf.vercel.app/api/auth/profile", {
                    headers: getAuthHeaders(token),
                    signal: controller.signal
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.message || "Impossible de charger votre profil.");
                }

                setProfile(data);
            } catch (requestError) {
                if (requestError.name !== "AbortError") {
                    setError(requestError.message || "Impossible de charger votre profil.");
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        loadProfile();
        return () => controller.abort();
    }, [token]);

    const account = profile || user || {};
    const initials = account.name
        ?.split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "?";

    const handleLogout = () => {
        logout();
        navigate("/signin", { replace: true });
    };

    const formatDate = (date) => {
        if (!date) return "Non renseignée";
        const parsedDate = new Date(date);
        return Number.isNaN(parsedDate.getTime())
            ? "Non renseignée"
            : parsedDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    };

    return (
        <div className="profile-page">
            <header className="profile-heading">
                <span className="profile-eyebrow">Espace personnel</span>
                <h1>Mon profil</h1>
                <p>Vos informations de compte.</p>
            </header>

            <main className="profile-content">
                {error && <div className="alert error" role="alert">{error}</div>}
                {loading && <p className="profile-loading" role="status">Chargement du profil...</p>}

                <section className="profile-panel" aria-label="Informations du compte">
                    <div className="profile-summary">
                        <div className="profile-avatar" aria-hidden="true">{initials}</div>
                        <div className="profile-identity">
                            <h2>{account.name || "Utilisateur"}</h2>
                            <p>{account.email || "Adresse email non renseignée"}</p>
                        </div>
                        <span className="profile-status">Compte actif</span>
                    </div>

                    <dl className="profile-details">
                        <div className="profile-detail">
                            <dt><UserRound aria-hidden="true" /> Genre</dt>
                            <dd>{account.gender || "Non renseigné"}</dd>
                        </div>
                        <div className="profile-detail">
                            <dt><BriefcaseBusiness aria-hidden="true" /> Lieu de travail</dt>
                            <dd>{account.workAt || "Non renseigné"}</dd>
                        </div>
                        <div className="profile-detail">
                            <dt><Mail aria-hidden="true" /> Adresse email</dt>
                            <dd>{account.email || "Non renseignée"}</dd>
                        </div>
                        <div className="profile-detail">
                            <dt><CalendarDays aria-hidden="true" /> Membre depuis</dt>
                            <dd>{formatDate(account.createdAt)}</dd>
                        </div>
                    </dl>

                    <div className="profile-actions">
                        <Link className="profile-primary-action" to="/invoices/new">
                            Nouvelle facture <ArrowRight aria-hidden="true" />
                        </Link>
                        <button className="profile-logout-action" type="button" onClick={handleLogout}>
                            <LogOut aria-hidden="true" /> Se déconnecter
                        </button>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default Profile;