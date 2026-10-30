import { NavLink } from "react-router-dom";
import {
    Home,
    FilePlus,
    CalendarDays,
    BarChart3,
    Info,
    CircleUserRound
} from "lucide-react";
import "../styles/BottomNav.css";

const BottomNav = () => {
    return (
        <nav className="bottom-appbar">
            <NavLink to="/" end className={({ isActive }) => isActive ? "bottom-nav-item active" : "bottom-nav-item"}>
                <Home className="bottom-nav-icon" />
                <span className="bottom-nav-label">Accueil</span>
            </NavLink>

            <NavLink to="/invoices/new" className={({ isActive }) => isActive ? "bottom-nav-item active" : "bottom-nav-item"}>
                <FilePlus className="bottom-nav-icon" />
                <span className="bottom-nav-label">Jour</span>
            </NavLink>

            <NavLink to="/reports/week" className={({ isActive }) => isActive ? "bottom-nav-item active" : "bottom-nav-item"}>
                <CalendarDays className="bottom-nav-icon" />
                <span className="bottom-nav-label">Semaine</span>
            </NavLink>

            <NavLink to="/reports/month" className={({ isActive }) => isActive ? "bottom-nav-item active" : "bottom-nav-item"}>
                <BarChart3 className="bottom-nav-icon" />
                <span className="bottom-nav-label">Mois</span>
            </NavLink>

            <NavLink to="/profile" className={({ isActive }) => isActive ? "bottom-nav-item active" : "bottom-nav-item"}>
                <CircleUserRound className="bottom-nav-icon" />
                <span className="bottom-nav-label">Profil</span>
            </NavLink>

            {/* <NavLink to="/about" className={({ isActive }) => isActive ? "bottom-nav-item active" : "bottom-nav-item"}>
                <Info className="bottom-nav-icon" />
                <span className="bottom-nav-label">À propos</span>
            </NavLink> */}
        </nav>
    );
};

export default BottomNav;