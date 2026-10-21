import { useState, useEffect } from "react";
import { FiDownload, FiColumns, FiLoader } from "react-icons/fi";
import axios from "../../api/axios";

const OccupancyReports = () => {
  const [occupancies, setOccupancies] = useState([]);
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

  // Column configuration for occupancy reports
  const columns = [
    { id: "property_name", label: "Property", defaultVisible: true },
    { id: "unit_label", label: "Unit No.", defaultVisible: true },
    { id: "room_type", label: "Room Type", defaultVisible: true },
    { id: "status", label: "Room Status", defaultVisible: true },
    { id: "occupancy_status", label: "Occupancy Status", defaultVisible: true },
    { id: "cleanliness_status", label: "Cleanliness", defaultVisible: true },
    { id: "floor", label: "Floor", defaultVisible: false },
    { id: "beds", label: "Number of Beds", defaultVisible: false },
    { id: "max_pax", label: "Max Occupancy", defaultVisible: false },
    { id: "occupancy_count", label: "Occupancy Count", defaultVisible: true },
  ];

  // Initialize visible columns state
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => {
      acc[col.id] = col.defaultVisible;
      return acc;
    }, {}),
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

  const fetchOccupancyReports = async () => {
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

      const response = await axios.get(`reports/occupancy`, { params });

      setOccupancies(response.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
    } catch (err) {
      setError(err.message || "Failed to fetch occupancy reports");
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

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
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

      let response;
      if (format === "pdf") {
        response = await axios.get(`reports/occupancy`, {
          params,
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `occupancy_report_${new Date().toISOString()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (format === "excel") {
        response = await axios.get(`reports/occupancy`, {
          params,
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `occupancy_report_${new Date().toISOString()}.xlsx`);
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
    fetchOccupancyReports();
  }, [selectedProperty, dateRange, pagination.page, pagination.pageSize]);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-content">
          <FiLoader className="loading-spinner" />
          <p>Loading occupancy reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">Error: {error}</p>
        <button className="retry-btn" onClick={fetchOccupancyReports}>
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
        <h4 className="data-table-title">Occupancy Reports</h4>
        <div className="data-table-actions">
          <div
            className="filters-container"
            style={{
              display: "flex",
              gap: "8px",
              padding: "8px",
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
            }}
          >
            {/* <select
                            value={selectedProperty}
                            onChange={handlePropertyChange}
                            style={{
                                padding: '6px 10px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '14px',
                            }}
                        >
                            <option value="">All Properties</option>
                            {properties.map(property => (
                                <option key={property.id} value={property.id}>
                                    {property.name}
                                </option>
                            ))}
                        </select> */}

            <div className="date-range-filter">
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
          </div>

          <div className="action-buttons">
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

      <div className="data-table-diagram">
        <table>
          <thead>
            <tr>{columns.map((column) => visibleColumns[column.id] && <th key={column.id}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {occupancies.length > 0 ? (
              occupancies.map((occupancy) => (
                <tr key={`${occupancy.room_id}-${occupancy.property_name}`}>
                  {columns.map(
                    (column) =>
                      visibleColumns[column.id] && (
                        <td
                          key={`${occupancy.room_id}-${column.id}`}
                          className={column.format ? `format-${column.format}` : ""}
                        >
                          {formatCellValue(occupancy[column.id], column.format)}
                        </td>
                      ),
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.filter((col) => visibleColumns[col.id]).length} className="no-results">
                  No occupancy records found
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

export default OccupancyReports;
