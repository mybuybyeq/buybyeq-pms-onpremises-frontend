import { useState, useEffect } from "react";
import { FiDownload, FiColumns, FiLoader, FiFilter, FiCalendar } from "react-icons/fi";
import axios from "../../api/axios";

const ReservationReports = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15,
    total: 0,
  });
  const [totals, setTotals] = useState({});

  // Enhanced column configuration for reservations
  const columns = [
    { id: "reservation_number", label: "Reservation #", defaultVisible: true },
    { id: "property_name", label: "Property", defaultVisible: true },
    { id: "guest_name", label: "Guest", defaultVisible: true },
    {id: "age", label: "Age", defaultVisible: true},
    { id: "check_in_date", label: "Check-In", defaultVisible: true, format: "date" },
    { id: "check_out_date", label: "Check-Out", defaultVisible: true, format: "date" },
    { id: "nights", label: "Nights", defaultVisible: true },
    // { id: 'room_types', label: 'Room Types', defaultVisible: true },
    { id: "adults", label: "Adults", defaultVisible: false },
    { id: "children", label: "Children", defaultVisible: false },
    { id: "infants", label: "Infants", defaultVisible: false },
    { id: "status", label: "Status", defaultVisible: true },
    { id: "total_amount", label: "Total Amount", defaultVisible: true, format: "currency" },
    { id: "balance_due", label: "Balance Due", defaultVisible: true, format: "currency" },
    { id: "created_at", label: "Created At", defaultVisible: false, format: "datetime" },
    { id: "payment_status", label: "Payment Status", defaultVisible: true },
    { id: "payment_methods", label: "Payment Methods", defaultVisible: false },
    { id: "total_paid", label: "Total Paid", defaultVisible: true, format: "currency" },
    { id: "notes", label: "Notes", defaultVisible: false },
  ];

  // Initialize visible columns state
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => {
      acc[col.id] = col.defaultVisible;
      return acc;
    }, {}),
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const toggleColumnVisibility = (columnId) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  const resetColumns = () => {
    const resetCols = {};
    columns.forEach((col) => {
      resetCols[col.id] = col.defaultVisible;
    });
    setVisibleColumns(resetCols);
  };

  const fetchPropertiesData = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      const propertiesRes = await axios.get(`businessEntities/getAllBusinessEntities/${userData.Group_ID}`, {
        headers: { "Content-Type": "application/json" },
        withCredentials: false,
      });
      const filteredProperties = Array.isArray(propertiesRes.data)
        ? propertiesRes.data.filter((business) => business.business_type === "H")
        : [];

      setProperties(
        filteredProperties.map((property) => ({
          id: property.business_entity_id,
          name: property.business_name,
        })),
      );
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservationReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      };

      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (selectedProperty) params.propertyId = selectedProperty;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await axios.get(`reports/reservations`, { params });

      // Process the data to include calculated fields
      const processedData = response.data.data.map((reservation) => ({
        ...reservation,
        guest_name: `${reservation.guest_first_name} ${reservation.guest_last_name}`,
        property_name: reservation.property_name || "N/A",
        nights: Math.ceil(
          (new Date(reservation.check_out_date) - new Date(reservation.check_in_date)) / (1000 * 60 * 60 * 24),
        ),
        payment_status:
          reservation.balance_due <= 0
            ? "Paid in Full"
            : reservation.balance_due < reservation.total_amount
              ? "Partially Paid"
              : "Unpaid",
        room_types: reservation.room_types || "N/A",
        payment_methods: reservation.payment_methods || "None",
      }));

      setReservations(processedData || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
      setTotals(response.data.totals || {});
    } catch (err) {
      setError(err.message || "Failed to fetch reservation reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const handlePropertyChange = (e) => {
    setSelectedProperty(e.target.value);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const resetFilters = () => {
    setSelectedProperty("");
    setStatusFilter("all");
    setDateRange({
      startDate: "",
      endDate: "",
    });
    setTotals({});
  };

  const exportReport = async (format) => {
    try {
      setExporting(true);
      const params = {
        format,
        page: pagination.page,
        pageSize: pagination.pageSize,
      };

      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (selectedProperty) params.propertyId = selectedProperty;
      if (statusFilter !== "all") params.status = statusFilter;

      let response;
      if (format === "pdf") {
        response = await axios.get(`reports/reservations`, {
          params,
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `reservation_report_${new Date().toISOString()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (format === "excel") {
        response = await axios.get(`reports/reservations`, {
          params,
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `reservation_report_${new Date().toISOString()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const formatCellValue = (value, format) => {
    if (value === null || value === undefined) return "-";

    switch (format) {
      case "currency":
        return `$${parseFloat(value).toFixed(2)}`;
      case "date":
        return new Date(value).toLocaleDateString();
      case "datetime":
        return new Date(value).toLocaleString();
      default:
        return value;
    }
  };

  useEffect(() => {
    fetchPropertiesData();
  }, []);

  useEffect(() => {
    fetchReservationReports();
  }, [selectedProperty, statusFilter, dateRange, pagination.page, pagination.pageSize]);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-content">
          <FiLoader className="loading-spinner" />
          <p>Loading reservation reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">Error: {error}</p>
        <button className="retry-btn" onClick={fetchReservationReports}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="content-area-table">
      {/* Export Loading Overlay */}
      {exporting && (
        <div className="export-overlay">
          <div className="export-loading">
            <FiLoader className="loading-spinner" />
            <p>Generating report...</p>
          </div>
        </div>
      )}

      <div className="data-table-info">
        <h4 className="data-table-title">Reservation Reports</h4>
        <div className="data-table-actions">
          <div className="action-buttons">
            <button className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
              <FiFilter /> {showFilters ? "Hide Filters" : "Show Filters"}
            </button>
            <button className="column-toggle-btn" onClick={() => setShowColumnSelector(true)}>
              <FiColumns /> Columns
            </button>
            <button className="export-btn" onClick={() => exportReport("excel")} disabled={exporting}>
              <FiDownload /> Export Excel
            </button>
            <button className="export-btn" onClick={() => exportReport("pdf")} disabled={exporting}>
              <FiDownload /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Property:</label>
            <select value={selectedProperty} onChange={handlePropertyChange}>
              <option value="">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="all">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked In">Checked In</option>
              <option value="Checked Out">Checked Out</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date Range:</label>
            <div className="date-range-inputs">
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                placeholder="Start Date"
              />
              <span>to</span>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                placeholder="End Date"
              />
            </div>
          </div>

          <button className="reset-filters-btn" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      )}

      {/* Totals Card */}
      {reservations.length > 0 && Object.keys(totals).length > 0 && (
        <div className="totals-card" style={{
          backgroundColor: "#f8f9fa",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "6px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#2c3e50", fontSize: "14px" }}>Total Spend</h4>
            <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: "#e74c3c" }}>
              ₹{(totals.total_amount || 0).toFixed(2)}
            </p>
          </div>
          <div style={{
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "6px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#2c3e50", fontSize: "14px" }}>Total Paid</h4>
            <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: "#27ae60" }}>
              ₹{(totals.total_paid || 0).toFixed(2)}
            </p>
          </div>
          <div style={{
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "6px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#2c3e50", fontSize: "14px" }}>Total Debt</h4>
            <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: "#f39c12" }}>
              ₹{(totals.balance_due || 0).toFixed(2)}
            </p>
          </div>
          <div style={{
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "6px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#2c3e50", fontSize: "14px" }}>Total Reservations</h4>
            <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: "#3498db" }}>
              {pagination.total || 0}
            </p>
          </div>
        </div>
      )}

      <div className="data-table-diagram">
        <table>
          <thead>
            <tr>{columns.map((column) => visibleColumns[column.id] && <th key={column.id}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {reservations.length > 0 ? (
              <>
                {reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    {columns.map(
                      (column) =>
                        visibleColumns[column.id] && (
                          <td
                            key={`${reservation.id}-${column.id}`}
                            className={column.format ? `format-${column.format}` : ""}
                            data-label={column.label}
                          >
                            {formatCellValue(reservation[column.id], column.format)}
                          </td>
                        ),
                    )}
                  </tr>
                ))}
              </>
            ) : (
              <tr>
                <td colSpan={columns.filter((col) => visibleColumns[col.id]).length} className="no-results">
                  No reservation records found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {pagination.total > 0 && (
          <div className="pagination-controls">
            <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
              Previous
            </button>
            <span>
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Column Selector Modal */}
      {showColumnSelector && (
        <div className="modal-overlay" onClick={() => setShowColumnSelector(false)}>
          <div className="modal small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Select Columns</h4>
              <button className="close-btn" onClick={() => setShowColumnSelector(false)}>
                &times;
              </button>
            </div>
            <div className="modal-content">
              <div className="column-selector">
                {columns.map((column) => (
                  <div key={column.id} className="column-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleColumns[column.id]}
                        onChange={() => toggleColumnVisibility(column.id)}
                      />
                      {column.label}
                    </label>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="reset-btn" onClick={resetColumns}>
                  Reset to Default
                </button>
                <button className="confirm-btn" onClick={() => setShowColumnSelector(false)}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ReservationReports;
