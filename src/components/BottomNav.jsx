import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    FilePlus,
    CalendarDays,
    BarChart3,
} from "lucide-react";
import "../styles/BottomNav.css";

const BottomNav = () => {
    return (
        <nav className="bottom-appbar" aria-label="Navigation mobile">
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "bottom-nav-item active" : "bottom-nav-item"}>
                <LayoutDashboard className="bottom-nav-icon" aria-hidden="true" />
                <span className="bottom-nav-label">Dashboard</span>
            </NavLink>

            <NavLink to="/invoices/new" className={({ isActive }) => isActive ? "bottom-nav-item active" : "bottom-nav-item"}>
                <FilePlus className="bottom-nav-icon" aria-hidden="true" />
                <span className="bottom-nav-label">Jour</span>
            </NavLink>

            <NavLink to="/reports/week" className={({ isActive }) => isActive ? "bottom-nav-item active" : "bottom-nav-item"}>
                <CalendarDays className="bottom-nav-icon" aria-hidden="true" />
                <span className="bottom-nav-label">Semaine</span>
            </NavLink>

            <NavLink to="/reports/month" className={({ isActive }) => isActive ? "bottom-nav-item active" : "bottom-nav-item"}>
                <BarChart3 className="bottom-nav-icon" aria-hidden="true" />
                <span className="bottom-nav-label">Mois</span>
            </NavLink>
        </nav>
    );
};

export default BottomNav;