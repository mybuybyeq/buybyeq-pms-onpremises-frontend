import { useState, useEffect } from "react";
import { FiDownload, FiColumns, FiLoader, FiFilter } from "react-icons/fi";
import axios from "../../api/axios";

const InvoiceDetailsReport = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [reportSummary, setReportSummary] = useState({});

  // GST-only mode
  const [isGstReport, setIsGstReport] = useState(false);

  // Column config
  const columns = [
    { id: "serial", label: "Sl.", defaultVisible: true },
    {
      id: "invoice_date",
      label: "Invoice Date",
      defaultVisible: true,
      format: "date",
    },
    { id: "invoice_id", label: "Invoice ID", defaultVisible: true },
    { id: "payment_mode", label: "Payment Mode", defaultVisible: true },
    { id: "company_name", label: "Company Name", defaultVisible: true },
    { id: "gst_number", label: "GST No", defaultVisible: true },
    {
      id: "check_in_date",
      label: "Check-In Date",
      defaultVisible: true,
      format: "date",
    },
    {
      id: "check_out_date",
      label: "Check-Out Date",
      defaultVisible: true,
      format: "date",
    },
    {
      id: "room_charges",
      label: "Room Charges",
      defaultVisible: true,
      format: "currency",
    },
    {
      id: "additional_charges",
      label: "Additional Charges",
      defaultVisible: true,
      format: "currency",
    },
    {
      id: "sub_total",
      label: "Sub Total",
      defaultVisible: true,
      format: "currency",
    },
    {
      id: "is_gst_applied",
      label: "GST Applied",
      defaultVisible: false,
      format: "boolean",
    },
    { id: "cgst", label: "CGST", defaultVisible: true, format: "currency" },
    { id: "sgst", label: "SGST", defaultVisible: true, format: "currency" },
    { id: "igst", label: "IGST", defaultVisible: true, format: "currency" },
    {
      id: "discount",
      label: "Discount",
      defaultVisible: true,
      format: "currency",
    },
    {
      id: "discount_type",
      label: "Discount Type",
      defaultVisible: false,
    },
    {
      id: "discount_value",
      label: "Discount Value",
      defaultVisible: false,
      format: "currency",
    },
    {
      id: "grand_total",
      label: "Grand Total",
      defaultVisible: true,
      format: "currency",
    },
    { id: "actions", label: "Actions", defaultVisible: true },
  ];

  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => {
      // Hide GST break-up columns by default (only show in GST mode)
      if (["cgst", "sgst", "igst"].includes(col.id)) {
        acc[col.id] = false;
      } else {
        acc[col.id] = col.defaultVisible;
      }
      return acc;
    }, {})
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Invoice re-download modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [customInvoiceData, setCustomInvoiceData] = useState({
    document_type: "invoice",
    invoice_date: "",
    check_in_date: "",
    check_out_date: "",
    room_base_rate: "",
    discount: "",
    enable_gst: undefined,
    is_igst: undefined,
    gst_rate: undefined,
    amount_paid_custom: "",
  });
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  // Columns used in GST-only mode
  const gstColumnIds = [
    "serial",
    "invoice_date",
    "invoice_id",
    "company_name",
    "gst_number",
    "check_out_date",
    "grand_total",
    "is_gst_applied",
    "cgst",
    "sgst",
    "igst",
    "actions",
  ];

  const getDisplayedColumns = () => {
    if (isGstReport) {
      return columns.filter((col) => gstColumnIds.includes(col.id));
    }
    // Filter out GST break-up columns when not in GST mode
    return columns.filter((col) => !["cgst", "sgst", "igst"].includes(col.id));
  };

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

  const syncColumnsForGstMode = (gstMode) => {
    const newVisibleColumns = {};
    if (gstMode) {
      // In GST mode, show only GST columns
      columns.forEach((col) => {
        newVisibleColumns[col.id] = gstColumnIds.includes(col.id);
      });
    } else {
      // In normal mode, show all columns except GST break-up columns
      columns.forEach((col) => {
        if (["cgst", "sgst", "igst"].includes(col.id)) {
          newVisibleColumns[col.id] = false;
        } else {
          newVisibleColumns[col.id] = col.defaultVisible;
        }
      });
    }
    setVisibleColumns(newVisibleColumns);
  };

  // Utilities
  const formatCellValue = (value, format) => {
    if (value === null || value === undefined) return "-";

    switch (format) {
      case "currency":
        return `₹${parseFloat(value).toFixed(2)}`;

      case "date":
        try {
          // Handle DD/MM/YYYY format
          if (typeof value === "string" && value.includes("/")) {
            const [day, month, year] = value.split("/");
            const date = new Date(`${year}-${month}-${day}`);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString();
            }
          }
          return new Date(value).toLocaleDateString();
        } catch {
          return value;
        }

      case "datetime":
        return new Date(value).toLocaleString();
      case "boolean":
        return Number(value || 0) === 1 ? "Yes" : "No";
      default:
        return value;
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return null;
    try {
      // Handle DD/MM/YYYY format
      if (typeof dateString === "string" && dateString.includes("/")) {
        const [day, month, year] = dateString.split("/");
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
        return null;
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const handlePropertyChange = (e) => {
    setSelectedProperty(e.target.value);
    // optionally reset to page 1
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePaymentModeFilterChange = (e) => {
    setPaymentModeFilter(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const resetFilters = () => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedProperty("");
    setPaymentModeFilter("all");
    setDateRange({
      startDate: today,
      endDate: today,
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
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

  const fetchInvoiceReports = async () => {
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
      if (paymentModeFilter !== "all") params.paymentMode = paymentModeFilter;
      if (isGstReport) params.gst = true; // 👈 IMPORTANT: tell backend to return only GST invoices

      const response = await axios.get(`reports/invoices`, { params });

      // Fetch guest details for each invoice if guest_id exists
      const invoicesWithGuestInfo = await Promise.all(
        (response.data.data || []).map(async (invoice) => {
          let guestInfo = {};

          // Try to fetch guest details if guest_id exists
          if (invoice.guest_id) {
            try {
              const guestResponse = await axios.get(
                `pms/guests/${invoice.guest_id}`
              );
              guestInfo = guestResponse.data;
            } catch (err) {
              console.error(`Failed to fetch guest ${invoice.guest_id}:`, err);
            }
          }

          return {
            ...invoice,
            company_name:
              guestInfo.company_name ||
              invoice.company_name ||
              invoice.guest_company_name ||
              "-",
            gst_number:
              guestInfo.gst_number ||
              invoice.gst_number ||
              invoice.guest_gst_number ||
              invoice.gstin ||
              "-",
          };
        })
      );

      setInvoices(invoicesWithGuestInfo);
      setReportSummary(response.data.summary || {});
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch invoice reports");
    } finally {
      setLoading(false);
    }
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
      if (paymentModeFilter !== "all") params.paymentMode = paymentModeFilter;
      if (isGstReport) params.gst = true; // export GST-only data when in GST mode

      const response = await axios.get(`reports/invoices`, {
        params,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `invoice_report_${new Date().toISOString()}.${format === "pdf" ? "pdf" : "xlsx"
        }`
      );
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

  const handleOpenInvoiceModal = (invoice) => {
    setSelectedInvoice(invoice);
    setCustomInvoiceData({
      document_type: "invoice",
      invoice_date: "",
      check_in_date: "",
      check_out_date: "",
      room_base_rate: "",
      discount: "",
      enable_gst: undefined,
      is_igst: undefined,
      gst_rate: undefined,
      amount_paid_custom: ""
    });
    setShowInvoiceModal(true);
  };

  const handleCloseInvoiceModal = () => {
    setShowInvoiceModal(false);
    setSelectedInvoice(null);
    setCustomInvoiceData({
      document_type: "invoice",
      invoice_date: "",
      check_in_date: "",
      check_out_date: "",
      room_base_rate: "",
      discount: "",
      enable_gst: undefined,
      is_igst: undefined,
      gst_rate: undefined,
      amount_paid_custom: ""
    });
  };

  const handleDownloadInvoice = async () => {
    if (!selectedInvoice?.reservation_id) {
      alert("No reservation ID found for this invoice.");
      return;
    }

    try {
      setDownloadingInvoice(true);

      const payload = {
        reservation_id: selectedInvoice.reservation_id,
        document_type: customInvoiceData.document_type,
      };

      // Only add optional fields if they have values
      if (customInvoiceData.invoice_date)
        payload.invoice_date = customInvoiceData.invoice_date;
      if (customInvoiceData.check_in_date)
        payload.check_in_date = customInvoiceData.check_in_date;
      if (customInvoiceData.check_out_date)
        payload.check_out_date = customInvoiceData.check_out_date;
      if (customInvoiceData.room_base_rate)
        payload.room_base_rate = parseFloat(customInvoiceData.room_base_rate);
      if (customInvoiceData.discount)
        payload.discount = parseFloat(customInvoiceData.discount);

      // Match the booking-page invoice by default. Only send a GST override
      // when the user explicitly changes the GST option in this dialog.
      if (customInvoiceData.enable_gst !== undefined)
        payload.enable_gst = customInvoiceData.enable_gst;
      if (customInvoiceData.is_igst !== undefined)
        payload.is_igst = customInvoiceData.is_igst;
      if (customInvoiceData.gst_rate !== undefined && customInvoiceData.gst_rate !== "")
        payload.gst_rate = parseFloat(customInvoiceData.gst_rate);
      if (customInvoiceData.amount_paid_custom) payload.amount_paid_custom = parseFloat(customInvoiceData.amount_paid_custom);

      const response = await axios.post("pms/pdf/generate-document", payload, {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      });

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
        <html>
          <head><title>${customInvoiceData.document_type} - ${selectedInvoice.invoice_id}</title></head>
          <body style="margin:0">
            <iframe src="${pdfUrl}" frameborder="0"
              style="width:100%; height:100vh;"
              onload="this.contentWindow.focus();">
            </iframe>
          </body>
        </html>
      `);
        printWindow.document.close();
      } else {
        alert("Popup blocked! Please allow popups for this site.");
      }

      handleCloseInvoiceModal();
    } catch (err) {
      console.error("Invoice download failed:", err);
      alert("Failed to generate invoice. Please try again.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  useEffect(() => {
    fetchPropertiesData();
  }, []);

  useEffect(() => {
    fetchInvoiceReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedProperty,
    paymentModeFilter,
    dateRange,
    pagination.page,
    pagination.pageSize,
    isGstReport, // 👈 when toggling GST, refetch from backend with gst=true/false
  ]);

  const displayedColumns = getDisplayedColumns();

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-content">
          <FiLoader className="loading-spinner" />
          <p>Loading invoice reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">Error: {error}</p>
        <button className="retry-btn" onClick={fetchInvoiceReports}>
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
            <p>Generating invoice report...</p>
          </div>
        </div>
      )}

      <div className="data-table-info">
        <h4 className="data-table-title">
          {isGstReport ? "GST Invoice Reports" : "Invoice Reports"}
        </h4>
        <div className="data-table-actions">
          <div className="action-buttons">
            <button
              className="filter-toggle-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FiFilter /> {showFilters ? "Hide Filters" : "Show Filters"}
            </button>

            <button
              className={`filter-toggle-btn ${isGstReport ? "active" : ""}`}
              onClick={() => {
                // toggle GST mode & reset to page 1
                const newGstMode = !isGstReport;
                setIsGstReport(newGstMode);
                syncColumnsForGstMode(newGstMode);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              {isGstReport ? "Show All Invoices" : "Show GST Only"}
            </button>

            <button
              className="column-toggle-btn"
              onClick={() => setShowColumnSelector(true)}
              disabled={isGstReport} // can't change columns in GST-only mode
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
            <label>Payment Mode:</label>
            <select
              value={paymentModeFilter}
              onChange={handlePaymentModeFilterChange}
            >
              <option value="all">All</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date Range (Invoice Date):</label>
            <div className="date-range-inputs">
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
              />
              <span>to</span>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
              />
            </div>
          </div>

          <button className="reset-filters-btn" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      )}

      {/* Summary Card */}
      {reportSummary && Object.keys(reportSummary).length > 0 && (
        <div className="summary-card" style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <strong style={{ color: '#7f8c8d' }}>Total Invoices</strong><br />
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {reportSummary.total_invoices || 0}
            </span>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <strong style={{ color: '#7f8c8d' }}>Total Amount</strong><br />
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
              ₹{(reportSummary.total_grand || 0).toFixed(2)}
            </span>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <strong style={{ color: '#7f8c8d' }}>Sub Total</strong><br />
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
              ₹{(reportSummary.total_sub_total || 0).toFixed(2)}
            </span>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <strong style={{ color: '#7f8c8d' }}>GST</strong><br />
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#e74c3c' }}>
              ₹{((reportSummary.total_cgst || 0) + (reportSummary.total_sgst || 0) + (reportSummary.total_igst || 0)).toFixed(2)}
            </span>
          </div>
          {reportSummary.payment_mode_totals && Object.keys(reportSummary.payment_mode_totals).length > 0 && (
            <div style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '5px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              gridColumn: '1 / -1'
            }}>
              <strong style={{ color: '#7f8c8d' }}>Payment Mode Breakdown</strong><br />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                {Object.entries(reportSummary.payment_mode_totals).map(([mode, amount]) => (
                  <span key={mode} style={{
                    backgroundColor: '#3498db',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '3px',
                    fontSize: '14px'
                  }}>
                    {mode}: ₹{parseFloat(amount || 0).toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="data-table-diagram">
        <table>
          <thead>
            <tr>
              {displayedColumns.map((column) => {
                if (!isGstReport && !visibleColumns[column.id]) return null;
                return <th key={column.id}>{column.label}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? (
              <>
                {invoices.map((invoice, index) => (
                  <tr key={invoice.id || `${invoice.invoice_id}-${index}`}>
                    {displayedColumns.map((column) => {
                      if (!isGstReport && !visibleColumns[column.id])
                        return null;

                      const cellValue =
                        column.id === "serial"
                          ? (pagination.page - 1) * pagination.pageSize +
                          index +
                          1
                          : column.id === "actions"
                            ? null
                            : formatCellValue(invoice[column.id], column.format);

                      return (
                        <td
                          key={`${invoice.id || invoice.invoice_id}-${column.id
                            }`}
                          className={
                            column.format ? `format-${column.format}` : ""
                          }
                          data-label={column.label}
                        >
                          {column.id === "actions" ? (
                            <button
                              onClick={() => handleOpenInvoiceModal(invoice)}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#4CAF50",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                              }}
                            >
                              <FiDownload style={{ marginRight: "4px" }} />
                              Download
                            </button>
                          ) : (
                            cellValue
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ) : (
              <tr>
                <td
                  colSpan={
                    displayedColumns.filter((col) =>
                      isGstReport ? true : visibleColumns[col.id]
                    ).length
                  }
                  className="no-results"
                >
                  {isGstReport
                    ? "No GST invoice records found"
                    : "No invoice records found"}
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
                        disabled={isGstReport}
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

      {/* Invoice Re-download Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="modal-overlay" onClick={handleCloseInvoiceModal}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px" }}
          >
            <div className="modal-header">
              <h4>Download Invoice - {selectedInvoice.invoice_id}</h4>
              <button className="close-btn" onClick={handleCloseInvoiceModal}>
                &times;
              </button>
            </div>
            <div className="modal-content">
              <p style={{ marginBottom: "20px", color: "#666" }}>
                Customize the invoice details below or leave fields empty to use
                original values.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: "500",
                    }}
                  >
                    Document Type
                  </label>
                  <select
                    value={customInvoiceData.document_type}
                    onChange={(e) =>
                      setCustomInvoiceData({
                        ...customInvoiceData,
                        document_type: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                    }}
                  >
                    <option value="invoice">Invoice</option>
                    <option value="payment_receipt">Payment Receipt</option>
                    <option value="voucher">Voucher</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: "500",
                    }}
                  >
                    Invoice Date
                    {formatDateForDisplay(selectedInvoice?.invoice_date) && (
                      <span
                        style={{
                          color: "#666",
                          fontWeight: "normal",
                          fontSize: "0.9em",
                        }}
                      >
                        {" "}
                        (Original:{" "}
                        {formatDateForDisplay(selectedInvoice.invoice_date)})
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={customInvoiceData.invoice_date}
                    onChange={(e) =>
                      setCustomInvoiceData({
                        ...customInvoiceData,
                        invoice_date: e.target.value,
                      })
                    }
                    placeholder="Leave empty for original"
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "500",
                      }}
                    >
                      Check-In Date
                      {formatDateForDisplay(selectedInvoice?.check_in_date) && (
                        <span
                          style={{
                            color: "#666",
                            fontWeight: "normal",
                            fontSize: "0.9em",
                          }}
                        >
                          {" "}
                          (Orig:{" "}
                          {formatDateForDisplay(selectedInvoice.check_in_date)})
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={customInvoiceData.check_in_date}
                      onChange={(e) =>
                        setCustomInvoiceData({
                          ...customInvoiceData,
                          check_in_date: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "500",
                      }}
                    >
                      Check-Out Date
                      {formatDateForDisplay(
                        selectedInvoice?.check_out_date
                      ) && (
                          <span
                            style={{
                              color: "#666",
                              fontWeight: "normal",
                              fontSize: "0.9em",
                            }}
                          >
                            {" "}
                            (Orig:{" "}
                            {formatDateForDisplay(selectedInvoice.check_out_date)}
                            )
                          </span>
                        )}
                    </label>
                    <input
                      type="date"
                      value={customInvoiceData.check_out_date}
                      onChange={(e) =>
                        setCustomInvoiceData({
                          ...customInvoiceData,
                          check_out_date: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "500",
                      }}
                    >
                      Room Base Rate (per night)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Leave empty for original"
                      value={customInvoiceData.room_base_rate}
                      onChange={(e) =>
                        setCustomInvoiceData({
                          ...customInvoiceData,
                          room_base_rate: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "500",
                      }}
                    >
                      Discount
                      {selectedInvoice?.discount && (
                        <span
                          style={{
                            color: "#666",
                            fontWeight: "normal",
                            fontSize: "0.9em",
                          }}
                        >
                          {" "}
                          (Original: ₹
                          {parseFloat(selectedInvoice.discount).toFixed(2)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Leave empty for original"
                      value={customInvoiceData.discount}
                      onChange={(e) =>
                        setCustomInvoiceData({
                          ...customInvoiceData,
                          discount: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                      Edit Amount Recieved
                      {selectedInvoice?.amount_paid_custom && (
                        <span style={{ color: "#666", fontWeight: "normal", fontSize: "0.9em" }}>
                          {" "}
                          (Original Grand Total: ₹{parseFloat(selectedInvoice.grand_total).toFixed(2)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Leave empty for original"
                      value={customInvoiceData.amount_paid_custom}
                      onChange={(e) => setCustomInvoiceData({ ...customInvoiceData, amount_paid_custom: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "4px",
                      fontWeight: "500",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        customInvoiceData.enable_gst ??
                        (Number(selectedInvoice?.is_gst_applied || 0) === 1)
                      }
                      onChange={(e) =>
                        setCustomInvoiceData({
                          ...customInvoiceData,
                          enable_gst: e.target.checked,
                        })
                      }
                      style={{
                        width: "auto",
                        cursor: "pointer",
                      }}
                    />
                    Enable GST
                  </label>
                </div>

                {(customInvoiceData.enable_gst ??
                  (Number(selectedInvoice?.is_gst_applied || 0) === 1)) && (
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "500",
                        }}
                      >
                        GST Type
                      </label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomInvoiceData({
                              ...customInvoiceData,
                              is_igst: false,
                            })
                          }
                          style={{
                            padding: "8px 12px",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            background:
                              (customInvoiceData.is_igst ?? Number(selectedInvoice?.is_igst || 0) === 1) ? "#fff" : "#007ACC",
                            color:
                              (customInvoiceData.is_igst ?? Number(selectedInvoice?.is_igst || 0) === 1) ? "#333" : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          CGST/SGST
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomInvoiceData({
                              ...customInvoiceData,
                              is_igst: true,
                            })
                          }
                          style={{
                            padding: "8px 12px",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            background:
                              (customInvoiceData.is_igst ?? Number(selectedInvoice?.is_igst || 0) === 1) ? "#007ACC" : "#fff",
                            color:
                              (customInvoiceData.is_igst ?? Number(selectedInvoice?.is_igst || 0) === 1) ? "#fff" : "#333",
                            cursor: "pointer",
                          }}
                        >
                          IGST
                        </button>
                      </div>
                    </div>
                  )}

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: "500",
                    }}
                  >
                    GST Rate (%)
                    {(() => {
                      const useIgst = customInvoiceData.is_igst ?? Number(selectedInvoice?.is_igst || 0) === 1;
                      const cgst = parseFloat(selectedInvoice?.property_cgst || "");
                      const sgst = parseFloat(selectedInvoice?.property_sgst || "");
                      const igst = parseFloat(selectedInvoice?.property_igst || "");
                      const totalGst = useIgst
                        ? (!isNaN(igst) ? igst : 0)
                        : (!isNaN(cgst) ? cgst : 0) + (!isNaN(sgst) ? sgst : 0);
                      if (totalGst > 0) {
                        return (
                          <span
                            style={{
                              color: "#666",
                              fontWeight: "normal",
                              fontSize: "0.9em",
                            }}
                          >
                            {" "}
                            (Original: {totalGst.toFixed(2)}%)
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Leave empty for original"
                    value={customInvoiceData.gst_rate ?? ""}
                    onChange={(e) =>
                      setCustomInvoiceData({
                        ...customInvoiceData,
                        gst_rate: e.target.value === "" ? undefined : e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                    }}
                  />
                </div>
              </div>

              <div
                className="modal-actions"
                style={{ marginTop: "24px", display: "flex", gap: "12px" }}
              >
                <button
                  className="cancel-btn"
                  onClick={handleCloseInvoiceModal}
                  disabled={downloadingInvoice}
                >
                  Cancel
                </button>
                <button
                  className="confirm-btn"
                  onClick={handleDownloadInvoice}
                  disabled={downloadingInvoice}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {downloadingInvoice ? (
                    <>
                      <FiLoader
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <FiDownload />
                      Download Invoice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default InvoiceDetailsReport;
