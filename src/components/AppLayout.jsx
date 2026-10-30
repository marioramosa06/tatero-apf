import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./NavBar";
import BottomNav from "./BottomNav";

const AppLayout = () => {
    const location = useLocation();

    const showNavPaths = [
        "/invoices/new",
        "/reports/week",
        "/reports/month",
        "/about"

    ];

    const shouldShowNav = showNavPaths.includes(location.pathname);

    return (
        <div className="app-layout">
            {shouldShowNav && <Navbar />}

            <main
                className="app-main-content"
                style={{ paddingBottom: shouldShowNav ? "88px" : "0" }}
            >
                <Outlet />
            </main>

            {shouldShowNav && <BottomNav />}
        </div>
    );
};

export default AppLayout;