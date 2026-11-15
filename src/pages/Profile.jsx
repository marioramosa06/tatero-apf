import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, CalendarDays, LogOut, Mail, UserRound } from "lucide-react";
import Footer from "../components/Footer";
import PWAInstallButton from "../components/PWAInstallButton";
import useAuth from "../hooks/useAuth";
import { fetchProfileWithCache } from "../utils/invoiceApi";
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
                const cachedOrLive = await fetchProfileWithCache({
                    token,
                    signal: controller.signal
                });
                if (cachedOrLive) {
                    setProfile(cachedOrLive);
                }
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
        <>
            <div className="profile-page report-container">
                <header className="report-header profile-header">
                    <div className="header-title-wrapper">
                        <p className="report-kicker">Espace personnel</p>
                        <h1 className="report-title">Mon profil</h1>
                        <p className="report-subtitle">Vos informations de compte.</p>
                    </div>
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
                            <PWAInstallButton />
                            <button className="profile-logout-action" type="button" onClick={handleLogout}>
                                <LogOut aria-hidden="true" /> Se déconnecter
                            </button>
                        </div>
                    </section>
                </main>
            </div>
            <Footer />
        </>
    );
};

export default Profile;