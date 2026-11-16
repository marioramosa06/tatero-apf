import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./NavBar";
import BottomNav from "./BottomNav";
import OfflineIndicator from "./OfflineIndicator";
import PWAInstallButton from "./PWAInstallButton";

const AppLayout = () => {
    const location = useLocation();

    const showNavPaths = [
        "/invoices",
        "/invoices/new",
        "/dashboard",
        "/reports/week",
        "/reports/month",
        "/profile",
    ];

    const shouldShowNav = showNavPaths.includes(location.pathname);

    return (
        <div className="app-layout">
            {shouldShowNav && <Navbar />}

            <main className={`app-main-content${shouldShowNav ? " with-nav" : ""}`}>
                <Outlet />
            </main>

            <OfflineIndicator hasBottomNav={shouldShowNav} />
            <PWAInstallButton />

            {shouldShowNav && <BottomNav />}
        </div>
    );
};

export default AppLayout;