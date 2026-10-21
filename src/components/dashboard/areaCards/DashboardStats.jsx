// src/components/dashboard/areaCards/DashboardStats.jsx
import { Link, useNavigate } from "react-router-dom";
import IconCard from "./IconCard";
import { useTabContext } from "../../../context/TabContext";

const DashboardStats = ({ stats }) => {
  const { openTab } = useTabContext();
  const navigate = useNavigate();

  const handleNavigation = (title, path, component) => {
    if (!path) return;
    openTab({ title, path, component });
    navigate(path, { state: { component } });
  };

  const statsData = [
    {
      icon: "delayed",
      colors: ["#e74c3c"],
      value: stats.delayedCheckout,
      title: "Delayed Checkout",
      path: "/bookings/delayed-checkouts",
    },
    {
      icon: "pending",
      colors: ["#f39c12"],
      value: stats.pendingCheckIn,
      title: "Pending Check-In",
      path: "/bookings/current-day-checkins",
    },
    {
      icon: "upcoming",
      colors: ["#3498db"],
      value: stats.upcomingCheckIn,
      title: "Upcoming Check-In",
      path: "/bookings/upcoming-checkins",
    },
    {
      icon: "checkout",
      colors: ["#9b59b6"],
      value: stats.upcomingCheckout,
      title: "Upcoming Checkout",
      path: "/bookings/upcoming-checkouts",
    },
    {
      icon: "booked",
      colors: ["#2ecc71"],
      value: stats.todaysBookedRooms,
      title: "Today's Booked Rooms",
      path: "/bookings/current-day",
    },
    { icon: "available", colors: ["#1abc9c"], value: stats.availableRooms, title: "Available Rooms", path: "" },
    { icon: "active", colors: ["#e67e22"], value: stats.activeBookings, title: "Active Bookings", path: "" },
    { icon: "total", colors: ["#34495e"], value: stats.totalBookings, title: "Total Bookings", path: "" },
  ];

  return (
    <div className="cards-grid">
      {statsData.map((stat, index) =>
        stat.path ? (
          <Link
            to={stat.path}
            key={index}
            className="iconcard-link"
            onClick={() => handleNavigation(stat.title, stat.path, stat.component)}
          >
            <IconCard
              icon={stat.icon}
              colors={stat.colors}
              cardInfo={{
                value: stat.value,
                title: stat.title,
              }}
            />
          </Link>
        ) : (
          <div key={index} className="iconcard-link" style={{ cursor: "default" }}>
            <IconCard
              icon={stat.icon}
              colors={stat.colors}
              cardInfo={{
                value: stat.value,
                title: stat.title,
              }}
            />
          </div>
        ),
      )}
      <style jsx>{`
        .iconcard-link {
          text-decoration: none;
        }
      `}</style>
    </div>
  );
};

export default DashboardStats;
