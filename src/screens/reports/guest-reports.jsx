import { useState, useEffect } from "react";
import { FiDownload, FiColumns, FiLoader } from "react-icons/fi";
import axios from "../../api/axios";

const GuestReports = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15   ,
    total: 0,
  });
  const [totals, setTotals] = useState({});

  // Column configuration with new fields
  const columns = [
    { id: "serial", label: "Sl No", defaultVisible: true },
    { id: "guest_name", label: "Guest Name", defaultVisible: true },
    { id: "age", label: "Age", defaultVisible: true },
    { id: "company_name", label: "Company Name", defaultVisible: true },
    { id: "company_address", label: "Address", defaultVisible: true },
    { id: "phone", label: "Phone", defaultVisible: true },
    { id: "id_type", label: "ID Type", defaultVisible: true },
    { id: "id_number", label: "ID Number", defaultVisible: true },
    { id: "completed_stays", label: "Completed Stays", defaultVisible: true },
    { id: "cancelled_stays", label: "Cancelled Stays", defaultVisible: false },
    {
      id: "total_spend",
      label: "Total Spend",
      defaultVisible: true,
      format: "currency",
    },
    {
      id: "total_paid",
      label: "Total Paid",
      defaultVisible: true,
      format: "currency",
    },
    {
      id: "total_debt",
      label: "Total Debt",
      defaultVisible: true,
      format: "currency",
    },
    {
      id: "last_stay_date",
      label: "Last Stay",
      defaultVisible: true,
      format: "date",
    },
    {
      id: "properties_visited",
      label: "Properties Visited",
      defaultVisible: false,
    },
  ];

  // Initialize visible columns state
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => {
      acc[col.id] = col.defaultVisible;
      return acc;
    }, {})
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);

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
      const propertiesRes = await axios.get(
        `businessEntities/getAllBusinessEntities/${userData.Group_ID}`,
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        }
      );
      const filteredProperties = Array.isArray(propertiesRes.data)
        ? propertiesRes.data.filter(
          (business) => business.business_type === "H"
        )
        : [];

      setProperties(
        filteredProperties.map((property) => ({
          id: property.business_entity_id,
          name: property.business_name,
        }))
      );
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuestReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      };

      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const response = await axios.get(`reports/guests`, { params });

      const processedData = (response.data.data || []).map((guest) => ({
        ...guest,
        guest_name:
          `${guest.first_name || ""} ${guest.last_name || ""}`.trim() || "-",
        company_name: guest.company_name || guest.company || "-",
        company_address: guest.company_address || guest.address || "-",
      }));

      setGuests(processedData);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
      setTotals(response.data.totals || {});
    } catch (err) {
      setError(err.message || "Failed to fetch guest reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const exportReport = async (format) => {
    try {
      setExporting(true);
      const params = {
        format,
      };

      if (format === "json") {
        params.page = pagination.page;
        params.pageSize = pagination.pageSize;
      }

      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      let response;
      if (format === "pdf") {
        response = await axios.get(`reports/guests`, {
          params,
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `guest_report_${new Date().toISOString()}.pdf`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (format === "excel") {
        response = await axios.get(`reports/guests`, {
          params,
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `guest_report_${new Date().toISOString()}.xlsx`
        );
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
      default:
        return value;
    }
  };

  useEffect(() => {
    fetchPropertiesData();
  }, []);

  useEffect(() => {
    fetchGuestReports();
  }, [selectedProperty, dateRange, pagination.page, pagination.pageSize]);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-content">
          <FiLoader className="loading-spinner" />
          <p>Loading guest reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">Error: {error}</p>
        <button className="retry-btn" onClick={fetchGuestReports}>
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
        <h4 className="data-table-title">Guest Reports</h4>
        <div className="data-table-actions">
          <div
            className="date-range-filter"
            style={{
              gap: "8px",
              padding: "8px",
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
            }}
          >
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              placeholder="Start Date"
              style={{
                padding: "6px 10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#555" }}> - </span>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              placeholder="End Date"
              style={{
                padding: "6px 10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          <div className="action-buttons">
            <button
              className="column-toggle-btn"
              onClick={() => setShowColumnSelector(true)}
            >
              <FiColumns /> Columns
            </button>
            <button
              className="export-btn"
              onClick={() => exportReport("excel")}
              disabled={exporting}
            >
              <FiDownload /> Export Excel
            </button>
            <button
              className="export-btn"
              onClick={() => exportReport("pdf")}
              disabled={exporting}
            >
              <FiDownload /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Totals Card */}
      <div className="totals-card" style={{
        backgroundColor: "#f8f9fa",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <div style={{ textAlign: "center" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>Total Spend</h4>
          <p style={{ margin: "0", fontSize: "18px", fontWeight: "bold", color: "#e74c3c" }}>
            ₹{(parseFloat(totals.total_spend) || 0).toFixed(2)}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>Total Paid</h4>
          <p style={{ margin: "0", fontSize: "18px", fontWeight: "bold", color: "#27ae60" }}>
            ₹{(parseFloat(totals.total_paid) || 0).toFixed(2)}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>Total Debt</h4>
          <p style={{ margin: "0", fontSize: "18px", fontWeight: "bold", color: "#f39c12" }}>
            ₹{(parseFloat(totals.total_debt) || 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="data-table-diagram">
        <table>
          <thead>
            <tr>
              {columns.map(
                (column) =>
                  visibleColumns[column.id] && (
                    <th key={column.id}>{column.label}</th>
                  )
              )}
            </tr>
          </thead>
          <tbody>
            {guests.length > 0 ? (
              <>
                {guests.map((guest, index) => (
                  <tr key={guest.id}>
                    {columns.map(
                      (column) =>
                        visibleColumns[column.id] && (
                          <td
                            key={`${guest.id}-${column.id}`}
                            className={
                              column.format ? `format-${column.format}` : ""
                            }
                          >
                            {column.id === "serial"
                              ? (pagination.page - 1) * pagination.pageSize +
                              index +
                              1
                              : formatCellValue(
                                guest[column.id],
                                column.format
                              )}
                          </td>
                        )
                    )}
                  </tr>
                ))}
              </>
            ) : (
              <tr>
                <td
                  colSpan={
                    columns.filter((col) => visibleColumns[col.id]).length
                  }
                  className="no-results"
                >
                  No guest records found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {pagination.total > 0 && (
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of{" "}
              {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={
                pagination.page >=
                Math.ceil(pagination.total / pagination.pageSize)
              }
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Column Selector Modal */}
      {showColumnSelector && (
        <div
          className="modal-overlay"
          onClick={() => setShowColumnSelector(false)}
        >
          <div
            className="modal small-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h4>Select Columns</h4>
              <button
                className="close-btn"
                onClick={() => setShowColumnSelector(false)}
              >
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
                <button
                  className="confirm-btn"
                  onClick={() => setShowColumnSelector(false)}
                >
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

export default GuestReports;
