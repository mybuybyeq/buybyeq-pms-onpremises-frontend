import { useContext, useEffect, useState, useRef, useCallback } from "react";
import "./App.scss";
import { ThemeContext } from "./context/ThemeContext";
import { DARK_THEME, LIGHT_THEME } from "./constants/themeConstants";
import MoonIcon from "./assets/icons/moon.svg";
import SunIcon from "./assets/icons/sun.svg";
import { Routes, Route, Navigate } from "react-router-dom";
import ProfileIcon from "./assets/images/user.png";
import BaseLayout from "./layout/BaseLayout";
import { Dashboard, PageNotFound } from "./screens";
import { TabProvider } from "./context/TabContext";
import Property from "./screens/settings/property/property-screen";
import Rooms from "./screens/settings/property/rooms/room-screen";
import RoomTypes from "./screens/settings/property/room-types/room-types-screen";
import { MdOutlineMenu } from "react-icons/md";
import { SidebarContext } from "./context/SidebarContext";
import CreateRolesAndPermissions from "./screens/settings/security/roles-and-permisions/create-roles-and-permisions";
import RolesTable from "./screens/settings/security/roles-and-permisions/view-roles-and-permisions";
import EmployeeScreen from "./screens/settings/security/employees/employee-screen";
import MealPlansTable from "./screens/settings/property/meal-plans/meal-plans";
import GuestManagement from "./screens/guests/my-guest";
import HotelBookingPage from "./screens/reservations/availabilty/check-availability";
import RoomStatusUpdate from "./screens/reception/room-status/room-status";
import LostAndFound from "./screens/reception/lost-and-found/lost-and-found";
import ExtraServices from "./screens/settings/property/extra-services/extra-services-table";
import RoomRack from "./screens/reception/room-rack/room-rack";
import RoomRack2 from "./screens/reservations/room-rack/room-rack";
import MaintenanceReasons from "./screens/maintenance/maintenance-reasons";
import MaintenancePage from "./screens/maintenance/maintenance-log";
import PMSLoginPage from "./screens/loginsignup/loginpage.jsx";
import CurrentDayBookings from "./screens/bookings-and-status/todays-bookings";
import TodaysCheckIns from "./screens/bookings-and-status/todays-checkins";
import NoShowBookings from "./screens/bookings-and-status/no-show-bookings";
import TodayCheckouts from "./screens/bookings-and-status/todays-checkouts";
import DelayedCheckouts from "./screens/bookings-and-status/delayed-checkout";
import UpComingCheckIns from "./screens/bookings-and-status/upcoming-checkins";
import UpComingCheckOuts from "./screens/bookings-and-status/upcoming-checkouts";
import EmailConfigPage from "./screens/settings/emails/email-config";
import EmailTemplatesPage from "./screens/settings/emails/email-template";
import GuestReports from "./screens/reports/guest-reports";
import OccupancyReports from "./screens/reports/occupancy-reports";
import ReservationReports from "./screens/reports/reservation-reports";
import PageEnable from "./screens/settings/page-enable/page-enable";
import InvoiceDetailsReport from "./screens/reports/invoice-detail-report";
import CurrentStayingReport from "./screens/reports/guest-staying-report";

function App() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { openSidebar } = useContext(SidebarContext);
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem("ispmsuser") === "true");
  const { theme, toggleTheme } = useContext(ThemeContext);

  const handleSuccessfulLogin = useCallback(() => {
    sessionStorage.setItem("ispmsuser", "true");
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", theme === DARK_THEME);
    return () => document.body.classList.remove("dark-mode", "light-mode");
  }, [theme]);

  const handleClickOutside = useCallback((e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(sessionStorage.getItem("ispmsuser") === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem("ispmsuser");
    sessionStorage.removeItem("userData");
    sessionStorage.removeItem("isAuthenticated");
    localStorage.removeItem("activeTab");
    localStorage.removeItem("tabs");
    localStorage.removeItem("themeMode");
    setIsAuthenticated(false);
    window.location.href = "/login";
  }, []);

  const handleChangePassword = useCallback(() => {
    console.log("Navigating to change password...");
  }, []);

  const dropdownButtonStyle = {
    width: "100%",
    padding: "8px 16px",
    background: "var(--secondary-color)",
    color: "var(--side-text-color)",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    "&:hover": {
      background: "var(--hover-color)",
    },
  };

  return (
    <div className="pms">
      <TabProvider>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <PMSLoginPage onLoginSuccess={handleSuccessfulLogin} />
            }
          />

          {isAuthenticated ? (
            <Route element={<BaseLayout />}>
              <Route index path="/" element={<Dashboard />} />
              <Route path="/maintenance/reasons" element={<MaintenanceReasons />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/property" element={<Property />} />
              <Route path="/property/rooms" element={<Rooms />} />
              <Route path="/property/room-type" element={<RoomTypes />} />
              <Route path="/property/extra-services" element={<ExtraServices />} />
              <Route path="/security/add-roles-and-rights" element={<CreateRolesAndPermissions />} />
              <Route path="/security/roles-and-rights" element={<RolesTable />} />
              <Route path="/security/employees" element={<EmployeeScreen />} />
              <Route path="/meal-plans" element={<MealPlansTable />} />
              <Route path="/customers" element={<GuestManagement />} />
              <Route path="/reservations/availability" element={<HotelBookingPage />} />
              <Route path="/reservations/booking" element={<RoomRack2 />} />
              <Route path="/reception/room-rack" element={<RoomRack />} />
              <Route path="/reception/room-status" element={<RoomStatusUpdate />} />
              <Route path="/reception/lost-and-found" element={<LostAndFound />} />
              <Route path="/bookings/current-day" element={<CurrentDayBookings />} />
              <Route path="/bookings/current-day-checkins" element={<TodaysCheckIns />} />
              <Route path="/bookings/no-show" element={<NoShowBookings />} />
              <Route path="/bookings/today-checkout" element={<TodayCheckouts />} />
              <Route path="/bookings/delayed-checkouts" element={<DelayedCheckouts />} />
              <Route path="/bookings/upcoming-checkins" element={<UpComingCheckIns />} />
              <Route path="/bookings/upcoming-checkouts" element={<UpComingCheckOuts />} />
              <Route path="/emails/configure" element={<EmailConfigPage />} />
              <Route path="/emails/template" element={<EmailTemplatesPage />} />
              <Route path="/guest-report" element={<GuestReports />} />
              <Route path="/guest-staying-report" element={<CurrentStayingReport />} />
              <Route path="/occupancy-report" element={<OccupancyReports />} />
              <Route path="/reservation-report" element={<ReservationReports />} />
              <Route path="/invoice-report" element={<InvoiceDetailsReport />} />
              <Route path="/settings/page-enable" element={<PageEnable />} />

              <Route path="*" element={<PageNotFound />} />
            </Route>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>

        {isAuthenticated && (
          <div className="top-controls-container">
            <style>
              {`
                @media (min-width: 768px) {
                  .mobile-only {
                    display: none !important;
                  }
                }
                .top-controls-container {
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  display: flex;
                  align-items: center;
                  gap: 16px;
                  z-index: 1000;
                }
                .profile-dropdown {
                  position: absolute;
                  top: 40px;
                  right: 0;
                  background: var(--secondary-color);
                  border: 1px solid #ddd;
                  border-radius: 6px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  min-width: 160px;
                  padding: 8px 0;
                  z-index: 1000;
                }
                .profile-button {
                  background: transparent;
                  border: none;
                  cursor: pointer;
                  padding: 0;
                }
              `}
            </style>

            <div className="area-top-l mobile-only">
              <button className="sidebar-open-btn" type="button" onClick={openSidebar} aria-label="Open sidebar">
                <MdOutlineMenu size={24} />
              </button>
            </div>
            <button type="button" onClick={toggleTheme}>
              <img className="theme-icon" src={theme === LIGHT_THEME ? SunIcon : MoonIcon} alt="theme icon" />
            </button>

            <div style={{ position: "relative" }} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-label="User menu"
                className="profile-button"
              >
                <img src={ProfileIcon} alt="Profile" width="32" height="32" style={{ borderRadius: "50%" }} />
              </button>
              {dropdownOpen && (
                <div className="profile-dropdown">
                  <button onClick={handleChangePassword} style={dropdownButtonStyle} aria-label="Change password">
                    Change Password
                  </button>
                  <button onClick={handleLogout} style={dropdownButtonStyle} aria-label="Logout">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </TabProvider>
    </div>
  );
}

export default App;
