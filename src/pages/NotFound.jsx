import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import OfflineFallback from "./OfflineFallback";
import "../styles/NotFound.css";

const NotFound = () => {
    const { isOnline } = useOnlineStatus();

    if (!isOnline) {
        return <OfflineFallback isUnknownRoute />;
    }

    return (
        <main className="not-found-page">
            <section className="not-found-card" aria-labelledby="not-found-title">
                <div className="not-found-icon" aria-hidden="true">
                    <Compass />
                </div>
                <p className="not-found-code">Erreur 404</p>
                <h1 id="not-found-title">Cette page est introuvable</h1>
                <p className="not-found-message">
                    Le lien est peut-être incorrect ou la page a été déplacée.
                </p>
                <Link className="not-found-home-link" to="/">
                    <ArrowLeft aria-hidden="true" />
                    Retour à l’accueil
                </Link>
            </section>
        </main>
    );
};

export default NotFound;
