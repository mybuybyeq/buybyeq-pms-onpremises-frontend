import { useState, useEffect } from "react";
import { AreaCards, AreaCharts, AreaTop } from "../../components";
import DashboardStats from "../../components/dashboard/areaCards/DashboardStats";
import axios from "../../api/axios";

const Dashboard = () => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("all");

  const userData = JSON.parse(sessionStorage.getItem("userData"));

  const fetchDashboardData = async (propertyId) => {
    try {
      const all = propertyId === "all";
      const response = await axios.get(`pms/dashboard`, {
        params: {
          property_id: all ? "null" : propertyId,
          group_id: all ? userData.Group_ID : "null",
          current_date: new Date().toISOString().split("T")[0],
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw error;
    }
  };

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const resp = await axios.get(
          `businessEntities/getAllBusinessEntities/${userData.Group_ID}`
        );

        const filteredData = resp.data.filter(
          (business) => business.business_type === "H"
        );

        setProperties(filteredData);

        return;
      } catch (err) {
        showSnackbar("Failed to load properties", "error");
      }
    }

    fetchProperties();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const loadData = async () => {
      try {
        if (!selectedProperty) {
          return;
        }

        const data = await fetchDashboardData(selectedProperty);
        // Ensure we have data for all 6 months, filling in zeros for missing months
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({
            month: date.toLocaleString("default", { month: "short" }),
            ym: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
              2,
              "0"
            )}`,
          });
        }

        const monthlyRevenue = months.map((m) => {
          const found = data.monthlyRevenue.find((item) => item.ym === m.ym);
          return found || { ...m, revenue: 0 };
        });

        setDashboardData({
          ...data,
          monthlyRevenue,
        });
      } catch (err) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedProperty]);

  if (loading)
    return (
      <div className="loadingg">
        <div className="loading-spinnehr">Loading dashboard...</div>
      </div>
    );
  if (error)
    return (
      <div className="error-message">Error loading dashboard: {error}</div>
    );
  if (!dashboardData) return <div className="no-data">No data available</div>;

  return (
    <div className="content-area">
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}
      >
        <select
          value={selectedProperty}
          style={{
            width: "20%",
            padding: "8px",
            marginRight: "16px",
            color: "var(--base-text-color)",
            backgroundColor: "var(--background-color)",
            border: "1px solid var(--base-text-color)",
            borderRadius: "4px",
            boxSizing: "border-box",
          }}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="property-filter"
        >
          <option value="all">All Properties</option>
          {properties.map((h) => (
            <option key={h.business_entity_id} value={h.business_entity_id}>
              {h.business_name}
            </option>
          ))}
        </select>
      </div>
      <DashboardStats stats={dashboardData.stats} />
      <div style={{ paddingTop: "20px" }}>
        <AreaCharts
          monthlyRevenue={dashboardData.monthlyRevenue}
          topRooms={dashboardData.topRooms}
          currentRevenue={dashboardData.stats.totalRevenue.amount}
          revenueComparison={dashboardData.stats.totalRevenue.comparison}
        />
      </div>
    </div>
  );
};

export default Dashboard;
