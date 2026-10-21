import { useContext, useEffect, useRef, useState } from "react";
import logoImage from "../../assets/images/BBQ_LOGO.png";
import {
  MdOutlineGridView,
  MdCalendarToday,
  MdOutlineSettings,
  MdOutlineClose,
  MdHotel,
  MdMeetingRoom,
  MdFindInPage,
  MdBuild,
  MdReportProblem,
  MdPeopleOutline,
  MdAssessment,
  MdHistory,
  MdFactCheck,
  MdListAlt,
  MdToday,
  MdLogin,
  MdPendingActions,
  MdLogout,
  MdTimerOff,
  MdEventAvailable,
  MdEventBusy,
  MdOutlineWeb,
} from "react-icons/md";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { SidebarContext } from "../../context/SidebarContext";
import { useTabContext } from "../../context/TabContext";
import { useNavigate } from "react-router-dom";
import { Sidebar as ProSidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import "./Sidebar.scss";
import { FiCheckCircle } from "react-icons/fi";
import { getPageVisibility } from "../../screens/settings/page-enable/page-enable";

const Sidebar = ({ onCollapsedChange }) => {
  const navigate = useNavigate();
  const { isSidebarOpen, closeSidebar } = useContext(SidebarContext);
  const { openTab } = useTabContext();
  const navbarRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCollapse = (collapsed) => {
    setIsCollapsed(collapsed);
    if (onCollapsedChange) {
      onCollapsedChange(collapsed);
    }
  };

  const handleClickOutside = (event) => {
    if (
      navbarRef.current &&
      !navbarRef.current.contains(event.target) &&
      event.target.className !== "sidebar-oepn-btn"
    ) {
      closeSidebar();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNavigation = (title, path, component) => {
    openTab({ title, path, component });
    navigate(path, { state: { component } });
    closeSidebar();
  };

  const menuItemStyles = {
    button: {
      backgroundColor: "var(--secondary-color)",
      color: "var(--side-text-color)",
      "&:hover": {
        backgroundColor: "var(--side-link-hover-color)",
      },
    },
    subMenuContent: {
      backgroundColor: "var(--secondary-color)",
      ".ps-menu-button": {
        justifyContent: "flex-start !important",
      },
    },
  };

  // Read visibility config from localStorage (provided by page-enable.jsx)
  const pageVisibility = typeof window !== "undefined" ? getPageVisibility() : {};

  // ---------- Build TOP menu items ----------
  const menuItems = [];

  // Dashboard
  if (pageVisibility.dashboard !== false) {
    menuItems.push({
      icon: <MdOutlineGridView size={18} />,
      text: "Dashboard",
      path: "/",
      component: "Dashboard",
    });
  }

  // Reservation & Availability
  if (pageVisibility.reservations_availability !== false) {
    menuItems.push({
      icon: <MdCalendarToday size={20} />,
      text: "Reservation & Availability",
      path: "/reservations/availability",
      component: "ReservationAvailability",
    });
  }

  if (pageVisibility.booking !== false) {
    menuItems.push({
      icon: <MdCalendarToday size={20} />,
      text: "Booking",
      path: "/reservations/booking",
      component: "Booking",
    });
  }

  // Reception (Room Rack, Room Status, Lost & Found)
  const receptionSubItems = [];
  if (pageVisibility.reception_room_rack !== false) {
    receptionSubItems.push({
      icon: <MdMeetingRoom size={18} />,
      text: "Room Rack",
      path: "/reception/room-rack",
      component: "Room Rack",
    });
  }
  if (pageVisibility.reception_room_status !== false) {
    receptionSubItems.push({
      icon: <MdMeetingRoom size={18} />,
      text: "Room Status",
      path: "/reception/room-status",
      component: "Room Status",
    });
  }
  if (pageVisibility.reception_lost_and_found !== false) {
    receptionSubItems.push({
      icon: <MdFindInPage size={18} />,
      text: "Lost & Found",
      path: "/reception/lost-and-found",
      component: "Lost And Found",
    });
  }
  if (receptionSubItems.length > 0) {
    menuItems.push({
      icon: <MdHotel size={20} />,
      text: "Reception",
      subItems: receptionSubItems,
    });
  }

  // Bookings & Status
  const bookingsSubItems = [];
  if (pageVisibility.bookings_today_booked !== false) {
    bookingsSubItems.push({
      icon: <MdToday size={18} />,
      text: "Today's Booked",
      path: "/bookings/current-day",
      component: "TodayBooked",
    });
  }
  if (pageVisibility.bookings_today_checkin !== false) {
    bookingsSubItems.push({
      icon: <MdLogin size={18} />,
      text: "Today's Check-In",
      path: "/bookings/current-day-checkins",
      component: "TodayCheckIn",
    });
  }
  if (pageVisibility.bookings_advance_reservations !== false) {
    bookingsSubItems.push({
      icon: <MdEventAvailable size={18} />,
      text: "Advance Reservations",
      path: "/bookings/upcoming-checkins",
      component: "UpcomingCheckIns",
    });
  }
  if (pageVisibility.bookings_no_show !== false) {
    bookingsSubItems.push({
      icon: <MdPendingActions size={18} />,
      text: "No-Show Bookings",
      path: "/bookings/no-show",
      component: "PendingCheckIns",
    });
  }
  if (pageVisibility.bookings_today_checkout !== false) {
    bookingsSubItems.push({
      icon: <MdLogout size={18} />,
      text: "Today's Checkout",
      path: "/bookings/today-checkout",
      component: "TodayCheckOut",
    });
  }
  if (pageVisibility.bookings_upcoming_checkouts !== false) {
    bookingsSubItems.push({
      icon: <MdEventBusy size={18} />,
      text: "Upcoming Checkouts",
      path: "/bookings/upcoming-checkouts",
      component: "UpcomingCheckOuts",
    });
  }
  if (pageVisibility.bookings_delayed_checkouts !== false) {
    bookingsSubItems.push({
      icon: <MdTimerOff size={18} />,
      text: "Delayed Checkouts",
      path: "/bookings/delayed-checkouts",
      component: "DelayedCheckOuts",
    });
  }
  if (bookingsSubItems.length > 0) {
    menuItems.push({
      icon: <FiCheckCircle size={20} />,
      text: "Bookings & Status",
      subItems: bookingsSubItems,
    });
  }

  // Guests
  if (pageVisibility.guests !== false) {
    menuItems.push({
      icon: <MdPeopleOutline size={20} />,
      text: "Guests",
      path: "/customers",
      component: "Customers",
    });
  }

  // ---------- Build BOTTOM menu items ----------
  const bottomMenuItems = [];

  // Maintenance
  const maintenanceSubItems = [];
  if (pageVisibility.maintenance_reasons !== false) {
    maintenanceSubItems.push({
      icon: <MdReportProblem size={18} />,
      text: "Maintenance Reasons",
      path: "/maintenance/reasons",
      component: "Maintenance Reasons",
    });
  }
  if (pageVisibility.maintenance_log !== false) {
    maintenanceSubItems.push({
      icon: <MdBuild size={18} />,
      text: "Maintenance",
      path: "/maintenance",
      component: "Maintenance",
    });
  }
  if (maintenanceSubItems.length > 0) {
    bottomMenuItems.push({
      icon: <MdBuild size={20} />,
      text: "Maintenance",
      subItems: maintenanceSubItems,
    });
  }

  // Reports
  const reportsSubItems = [];
  if (pageVisibility.report_invoice !== false) {
    reportsSubItems.push({
      icon: <MdHistory size={18} />,
      text: "Invoice Reports",
      path: "/invoice-report",
      component: "Invoice Reports",
    });
  }
  if (pageVisibility.report_guest_staying !== false) {
    reportsSubItems.push({
      icon: <MdHistory size={18} />,
      text: "Guest Staying Reports",
      path: "/guest-staying-report",
      component: "Guest Staying Reports",
    });
  }
  if (pageVisibility.report_guest !== false) {
    reportsSubItems.push({
      icon: <MdHistory size={18} />,
      text: "Guest Reports",
      path: "/guest-report",
      component: "Guest Reports",
    });
  }
  if (pageVisibility.report_occupancy !== false) {
    reportsSubItems.push({
      icon: <MdFactCheck size={18} />,
      text: "Occupancy Reports",
      path: "/occupancy-report",
      component: "Occupancy Report",
    });
  }
  if (pageVisibility.report_reservation !== false) {
    reportsSubItems.push({
      icon: <MdListAlt size={18} />,
      text: "Reservation Reports",
      path: "/reservation-report",
      component: "Reservation Reports",
    });
  }
  if (reportsSubItems.length > 0) {
    bottomMenuItems.push({
      icon: <MdAssessment size={20} />,
      text: "Reports",
      subItems: reportsSubItems,
    });
  }

  // Settings
  const settingsSubItems = [];

  // Settings -> Manage Properties
  const managePropertiesSubItems = [];
  if (pageVisibility.settings_property !== false) {
    managePropertiesSubItems.push({
      text: "Property",
      path: "/property",
      component: "Property",
    });
  }
  if (pageVisibility.settings_room_types !== false) {
    managePropertiesSubItems.push({
      text: "Room Types",
      path: "/property/room-type",
      component: "RoomType",
    });
  }
  if (pageVisibility.settings_meal_plans !== false) {
    managePropertiesSubItems.push({
      text: "Meal Plans & Rates",
      path: "/meal-plans",
      component: "MealPlans",
    });
  }
  if (pageVisibility.settings_rooms !== false) {
    managePropertiesSubItems.push({
      text: "Rooms",
      path: "/property/rooms",
      component: "Rooms",
    });
  }
  if (pageVisibility.settings_extra_services !== false) {
    managePropertiesSubItems.push({
      text: "Extra Services",
      path: "/property/extra-services",
      component: "Extra Services",
    });
  }
  if (managePropertiesSubItems.length > 0) {
    settingsSubItems.push({
      text: "Manage Properties",
      subItems: managePropertiesSubItems,
    });
  }

  // Settings -> Email Configuration
  const emailConfigSubItems = [];
  if (pageVisibility.settings_email_config !== false) {
    emailConfigSubItems.push({
      text: "Configure & Test Emails",
      path: "/emails/configure",
      component: "Configure & Test",
    });
  }
  if (pageVisibility.settings_email_template !== false) {
    emailConfigSubItems.push({
      text: "Email Template",
      path: "/emails/template",
      component: "Email Template",
    });
  }
  if (emailConfigSubItems.length > 0) {
    settingsSubItems.push({
      text: "Email Configuration",
      subItems: emailConfigSubItems,
    });
  }

  if (settingsSubItems.length > 0) {
    bottomMenuItems.push({
      icon: <MdOutlineSettings size={20} />,
      text: "Settings",
      subItems: settingsSubItems,
    });
  }
  bottomMenuItems.push({
    icon: <MdOutlineWeb size={20} />,
    text: "Page Configuration",
    path: "/settings/page-enable",
    component: "PageEnable",
  });
  const renderMenuItems = (items) => {
    return items.map((item, index) => {
      if (item.subItems) {
        return (
          <SubMenu
            key={index}
            className="menu-item"
            label={
              <div className="menu-link">
                {item.icon && (
                  <span
                    className="menu-link-icon"
                    style={{
                      marginRight: "10px",
                      fontSize: "25px",
                      color: "#555",
                    }}
                  >
                    {item.icon}
                  </span>
                )}
                <span className="menu-link-text">{item.text}</span>
              </div>
            }
          >
            {item.subItems.map((subItem, subIndex) => {
              if (subItem.subItems) {
                return (
                  <SubMenu
                    key={subIndex}
                    className="submenu-item"
                    label={
                      <div className="menu-link">
                        <span className="menu-link-text">{subItem.text}</span>
                        {subItem.badge && <span className="menu-badge">{subItem.badge}</span>}
                      </div>
                    }
                  >
                    {subItem.subItems.map((nestedItem, nestedIndex) => (
                      <MenuItem
                        key={nestedIndex}
                        className="nested-submenu-item"
                        onClick={() => handleNavigation(nestedItem.text, nestedItem.path, nestedItem.component)}
                      >
                        <div className="menu-link">
                          <span className="menu-link-text">{nestedItem.text}</span>
                          {nestedItem.badge && <span className="menu-badge">{nestedItem.badge}</span>}
                        </div>
                      </MenuItem>
                    ))}
                  </SubMenu>
                );
              }
              return (
                <MenuItem
                  key={subIndex}
                  className="submenu-item"
                  onClick={() => handleNavigation(subItem.text, subItem.path, subItem.component)}
                >
                  <div className="menu-link">
                    <span className="menu-link-text">{subItem.text}</span>
                    {subItem.badge && <span className="menu-badge">{subItem.badge}</span>}
                  </div>
                </MenuItem>
              );
            })}
          </SubMenu>
        );
      }

      return (
        <MenuItem
          key={index}
          className="menu-item"
          onClick={() => handleNavigation(item.text, item.path, item.component)}
        >
          <div className="menu-link">
            {item.icon && (
              <span
                className="menu-link-icon"
                style={{
                  marginRight: "10px",
                  fontSize: "25px",
                  color: "#555",
                }}
              >
                {item.icon}
              </span>
            )}
            <span className="menu-link-text">{item.text}</span>
            {item.badge && <span className="menu-badge">{item.badge}</span>}
          </div>
        </MenuItem>
      );
    });
  };

  const linkStyle = {
    color: "var(--side-text-color)",
    fontSize: "20px",
    textDecoration: "none",
  };

  return (
    <>
      <nav className={`sidebar ${isSidebarOpen ? "sidebar-show" : ""} ${isCollapsed ? "sidebar-collapsed" : ""}`} ref={navbarRef}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div style={{ display: "flex", alignItems: "center" }}>
              <img src={logoImage} alt="#" width="60" height="60" />
              <h4 style={{ ...linkStyle, marginLeft: "17px" }}>BuyByeQ</h4>
              <div
                style={{
                  width: "2.3px",
                  height: "24px",
                  backgroundColor: "orange",
                  borderRadius: "8px",
                  margin: "2px 4px 8px 5px",
                }}
              ></div>
              <h5 style={{ ...linkStyle, fontFamily: "cursive" }}>PMS</h5>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={closeSidebar}>
            <MdOutlineClose size={24} />
          </button>
        </div>

        {/* Hide Sidebar Button */}
        <button className="sidebar-hide-btn" onClick={() => handleCollapse(true)}>
          <FiChevronLeft size={18} />
          <span>Hide Sidebar</span>
        </button>

        <div className="sidebar-body">
          <div className="sidebar-menu">
            <Menu className="menu-list" menuItemStyles={menuItemStyles}>
              {renderMenuItems(menuItems)}
            </Menu>
          </div>

          <div className="sidebar-menu sidebar-menu2">
            <Menu className="menu-list" menuItemStyles={menuItemStyles}>
              {renderMenuItems(bottomMenuItems)}
            </Menu>
          </div>
        </div>
      </nav>

      {/* Show Sidebar Button (slide on hover) */}
      <button 
        className={`sidebar-show-btn ${isCollapsed ? "sidebar-show-btn-visible" : ""}`}
        onClick={() => handleCollapse(false)}
      >
        <span>Show Sidebar</span>
        <FiChevronRight size={18} />
      </button>
    </>
  );
};

export default Sidebar;
