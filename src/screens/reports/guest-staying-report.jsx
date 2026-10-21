import { useState, useEffect } from "react";
import { FiDownload, FiColumns, FiLoader } from "react-icons/fi";
import axios from "../../api/axios";

const CurrentStayingReport = () => {
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15,
    total: 0,
  });

  // Column configuration for staying guests
  const columns = [
    { id: "serial", label: "Sl No", defaultVisible: true },
    { id: "guest_name", label: "Guest Name", defaultVisible: true },
    { id: "age", label: "Age", defaultVisible: true },
    { id: "company_name", label: "Company Name", defaultVisible: true },
    { id: "company_address", label: "Address", defaultVisible: true },
    { id: "phone", label: "Phone", defaultVisible: true },
    { id: "id_type", label: "ID Type", defaultVisible: true },
    { id: "id_number", label: "ID Number", defaultVisible: true },
    { id: "room_type", label: "Room Type", defaultVisible: true },
    {
      id: "check_in_date",
      label: "Check-In",
      defaultVisible: true,
      format: "date",
    },
    {
      id: "check_out_date",
      label: "Check-Out",
      defaultVisible: true,
      format: "date",
    },
    // { id: "total_amount", label: "Total Amount", defaultVisible: true, format: "currency" },
    // { id: "total_paid", label: "Total Paid", defaultVisible: true, format: "currency" },
    // { id: "balance_due", label: "Balance Due", defaultVisible: true, format: "currency" }
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
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStayingReports = async () => {
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

      const response = await axios.get(`reports/staying-guests`, { params });

      // Fetch guest details for each stay
      const staysWithGuestInfo = await Promise.all(
        (response.data.data || []).map(async (stay) => {
          let guestInfo = {};

          // Try to fetch guest details if guest_id exists
          if (stay.guest_id) {
            try {
              const guestResponse = await axios.get(
                `pms/guests/${stay.guest_id}`
              );
              guestInfo = guestResponse.data;
            } catch (err) {
              console.error(`Failed to fetch guest ${stay.guest_id}:`, err);
            }
          }

          return {
            ...stay,
            guest_name:
              `${guestInfo.first_name ||
                stay.guest_first_name ||
                stay.first_name ||
                ""
                } ${guestInfo.last_name ||
                stay.guest_last_name ||
                stay.last_name ||
                ""
                }`.trim() || "-",
                
            company_name:
              guestInfo.company_name ||
              stay.company_name ||
              stay.company ||
              "-",
            company_address:
              guestInfo.company_address ||
              stay.company_address ||
              stay.address ||
              "-",
          };
        })
      );

      setStays(staysWithGuestInfo);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch staying guest reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
    // when filter changes, reset to page 1
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePropertyChange = (e) => {
    setSelectedProperty(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const exportReport = async (format) => {
    try {
      setExporting(true);
      const params = {
        format,
        // No need to send page/pageSize – backend uses ALL data for excel/pdf
      };

      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (selectedProperty) params.propertyId = selectedProperty;

      const response = await axios.get(`reports/staying-guests`, {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const ts = new Date().toISOString();

      if (format === "pdf") {
        link.setAttribute("download", `current_staying_report_${ts}.pdf`);
      } else if (format === "excel") {
        link.setAttribute("download", `current_staying_report_${ts}.xlsx`);
      }

      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const formatCellValue = (value, format) => {
    if (value === null || value === undefined || value === "") return "-";

    switch (format) {
      case "currency":
        return `₹${parseFloat(value).toFixed(2)}`;
      case "date": {
        const dt = new Date(value);
        if (isNaN(dt.getTime())) return "-";
        return new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(dt);
      }
      default:
        return value;
    }
  };

  useEffect(() => {
    fetchPropertiesData();
  }, []);

  useEffect(() => {
    fetchStayingReports();
  }, [selectedProperty, dateRange, pagination.page, pagination.pageSize]);

  if (loading && !exporting && stays.length === 0) {
    return (
      <div className="loading-overlay">
        <div className="loading-content">
          <FiLoader className="loading-spinner" />
          <p>Loading current staying reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">Error: {error}</p>
        <button className="retry-btn" onClick={fetchStayingReports}>
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
        <h4 className="data-table-title">Current Staying Report</h4>
        <div className="data-table-actions">
          {/* Property filter */}
          <div
            className="property-filter"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginRight: "10px",
            }}
          >
            <label
              style={{
                fontSize: "14px",
                color: "#555",
              }}
            >
              Property:
            </label>
            <select
              value={selectedProperty}
              onChange={handlePropertyChange}
              style={{
                padding: "6px 10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              <option value="">All</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range filter */}
          <div
            className="date-range-filter"
            style={{
              display: "flex",
              alignItems: "center",
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
            {stays.length > 0 ? (
              <>
                {stays.map((stay, index) => (
                  <tr key={stay.reservation_id}>
                    {columns.map(
                      (column) =>
                        visibleColumns[column.id] && (
                          <td
                            key={`${stay.reservation_id}-${column.id}`}
                            className={
                              column.format ? `format-${column.format}` : ""
                            }
                          >
                            {column.id === "serial"
                              ? (pagination.page - 1) * pagination.pageSize +
                              index +
                              1
                              : formatCellValue(stay[column.id], column.format)}
                          </td>
                        )
                    )}
                  </tr>
                ))}
                <tr style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                  {columns.map(
                    (column) =>
                      visibleColumns[column.id] && (
                        <td
                          key={`total-${column.id}`}
                          className={
                            column.format ? `format-${column.format}` : ""
                          }
                        >
                          {column.format === "currency"
                            ? `₹${stays
                              .reduce(
                                (acc, stay) =>
                                  acc + (parseFloat(stay[column.id]) || 0),
                                0
                              )
                              .toFixed(2)}`
                            : column.id === "serial"
                              ? "Total"
                              : ""}
                        </td>
                      )
                  )}
                </tr>
              </>
            ) : (
              <tr>
                <td
                  colSpan={
                    columns.filter((col) => visibleColumns[col.id]).length
                  }
                  className="no-results"
                >
                  No staying guests found
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

export default CurrentStayingReport;
