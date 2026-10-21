import { useState, useEffect } from "react";
import axios from "../../../api/axios";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import EmptyState from "../../error/EmptyState";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";

const TABLE_HEADS = [
  "#",
  "Logo",
  "Business Name",
  "Manager Name",
  "Email",
  "Contact No",
  "Address",
  "GST Number",
  "CGST",
  "SGST",
  "IGST",
  "Invoice Prefix",
  "Invoice Template",
  "Check-in Time",
  "Check-out Time",
  "Action",
];

const PropertyTable = () => {
  const [tableData, setTableData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState(null);
  const [invoiceTemplates, setInvoiceTemplates] = useState([]);
  const [newProperty, setNewProperty] = useState({
    businessName: "",
    Manager: "",
    Email: "",
    contactNo: "",
    Address: "",
    ManagerEmail: "",
    Business_type: "H",
    GstNumber: "", // optional
    cgst: "", // optional
    sgst: "", // optional
    igst: "", // optional
    invoice_code: "", // optional
    invoice_template: "default",
    check_in_time: null, // default check-in time
    check_out_time: null, // default check-out time
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    fetchProperties();
    fetchInvoiceTemplates();
  }, []);

  const fetchInvoiceTemplates = async () => {
    try {
      const response = await axios.get("pms/invoice-templates");
      const templates = Array.isArray(response.data?.templates)
        ? response.data.templates
        : [];
      setInvoiceTemplates(templates);
    } catch (error) {
      setInvoiceTemplates([{ name: "default", label: "Default" }]);
      console.error("Error fetching invoice templates:", error);
    }
  };

  const fetchProperties = async () => {
    const userData = JSON.parse(sessionStorage.getItem("userData"));
    try {
      const response = await axios.get(
        `businessEntities/getAllBusinessEntities/${userData.Group_ID}`,
      );

      const data = Array.isArray(response.data) ? response.data : [];

      const filteredData = data
        .filter((business) => business.business_type === "H")
        .map((business, index) => ({
          id: business.business_entity_id,
          rowNumber: index + 1,
          businessName: business.business_name,
          Manager: business.name,
          Email: business.email,
          contactNo: business.contact_no,
          Address: business.address,
          ManagerEmail: business.manager_email || business.email,
          logoUrl: business.logo_url || null,
          GstNumber: business.gst_number || "",
          cgst: business.cgst != null ? String(business.cgst) : "",
          sgst: business.sgst != null ? String(business.sgst) : "",
          igst: business.igst != null ? String(business.igst) : "",
          invoice_code: business.invoice_code || "",
          invoice_template: business.invoice_template || "default",
          check_in_time: business.check_in_time ?? null,
          check_out_time: business.check_out_time ?? null,
        }));

      setTableData(filteredData);
    } catch (error) {
      showSnackbar("Error fetching properties", "error");
      console.error("Error fetching data:", error);
    }
  };

  const uploadLogoAndGetUrl = async () => {
    if (!logoFile) return null;
    const formData = new FormData();
    formData.append("logo", logoFile);
    formData.append(
      "businessEntityId",
      editingProperty ? editingProperty.id : "",
    );
    try {
      const res = await axios.post("/registration/updateLogo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return res.data.fileUrl;
    } catch (error) {
      showSnackbar("Image upload failed", "error");
      console.error("Image upload error:", error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userData = JSON.parse(sessionStorage.getItem("userData"));

    try {
      // 🔹 Upload image ONLY if user selected a new file
      if (logoFile) {
        await uploadLogoAndGetUrl();
      }

      // 🔹 Payload only for text / numeric fields
      const payload = {
        businessName: newProperty.businessName,
        Manager: newProperty.Manager,
        Email: newProperty.Email,
        contactNo: newProperty.contactNo,
        Address: newProperty.Address,
        ManagerEmail: newProperty.ManagerEmail,
        Business_type: newProperty.Business_type,
        Group_ID: userData.Group_ID,

        // optional fields
        GstNumber: newProperty.GstNumber?.trim() || undefined,
        cgst: newProperty.cgst !== "" ? Number(newProperty.cgst) : undefined,
        sgst: newProperty.sgst !== "" ? Number(newProperty.sgst) : undefined,
        igst: newProperty.igst !== "" ? Number(newProperty.igst) : undefined,
        invoice_code: newProperty.invoice_code?.trim() || undefined,
        invoice_template: newProperty.invoice_template || "default",
        check_in_time: newProperty.check_in_time,
        check_out_time: newProperty.check_out_time,
      };

      if (editingProperty) {
        await axios.put(
          `businessEntities/editBusinessEntity/${editingProperty.id}`,
          payload,
        );
        showSnackbar("Property updated successfully", "success");
      } else {
        await axios.post("businessEntities/addBusinessEntity", payload);
        showSnackbar("Property added successfully", "success");
      }

      fetchProperties();
      handleModalClose();
    } catch (error) {
      showSnackbar(error.response?.data?.error || "Operation failed", "error");
    }
  };

  const handleEdit = (property) => {
    setEditingProperty(property);

    setNewProperty({
      businessName: property.businessName || "",
      Manager: property.Manager || "",
      Email: property.Email || "",
      contactNo: property.contactNo || "",
      Address: property.Address || "",
      ManagerEmail: property.ManagerEmail || "",
      Business_type: property.business_type || "H",

      GstNumber: property.GstNumber || "",
      cgst: property.cgst ?? "",
      sgst: property.sgst ?? "",
      igst: property.igst ?? "",
      invoice_code: property.invoice_code || "",
      invoice_template: property.invoice_template || "default",
      check_in_time: property.check_in_time || null,
      check_out_time: property.check_out_time || null,
    });

    setLogoFile(null);

    if (property.logoUrl) {
      const fullLogoUrl = property.logoUrl.startsWith("http")
        ? property.logoUrl
        : `${axios.defaults.baseURL}/${property.logoUrl}`;

      setLogoPreview(fullLogoUrl);
      setExistingLogoUrl(property.logoUrl);
    } else {
      setLogoPreview(null);
      setExistingLogoUrl(null);
    }

    setIsModalOpen(true);
  };

  const handleDelete = async (property) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${property.businessName}?`,
    );
    if (confirmDelete) {
      try {
        await axios.delete(
          `businessEntities/deleteBusinessEntity/${property.id}`,
        );
        showSnackbar("Property deleted successfully", "success");
        fetchProperties();
      } catch (error) {
        showSnackbar("Error deleting property", "error");
        console.error("Error deleting property:", error);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProperty((prev) => ({ ...prev, [name]: value }));
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProperty(null);
    setLogoFile(null);
    setLogoPreview(null);
    setNewProperty({
      businessName: "",
      Manager: "",
      Email: "",
      contactNo: "",
      Address: "",
      ManagerEmail: "",
      Business_type: "H",
      GstNumber: "",
      cgst: "",
      sgst: "",
      igst: "",
      invoice_code: "",
      invoice_template: "default",
      check_in_time: null,
      check_out_time: null,
    });
  };

  return (
    <section className="content-area-table">
      <div className="data-table-info">
        <h4 className="data-table-title">Properties Overview</h4>
        {tableData.length > 0 && (
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>
            + Add Property
          </button>
        )}
      </div>

      {tableData.length > 0 ? (
        <div className="data-table-diagram">
          <table>
            <thead>
              <tr>
                {TABLE_HEADS.map((th, index) => (
                  <th key={index}>{th}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((dataItem) => (
                <tr key={dataItem.id}>
                  <td>{dataItem.rowNumber}</td>
                  <td>
                    <img
                      src={
                        dataItem.logoUrl
                          ? `${axios.defaults.baseURL}/${dataItem.logoUrl}`
                          : "/images/default-logo.png"
                      }
                      alt="logo"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "4px",
                        objectFit: "cover",
                      }}
                    />
                  </td>
                  <td>{dataItem.businessName}</td>
                  <td>{dataItem.Manager}</td>
                  <td>{dataItem.Email}</td>
                  <td>{dataItem.contactNo}</td>
                  <td>{dataItem.Address}</td>
                  <td>{dataItem.GstNumber || "-"}</td>
                  <td>{dataItem.cgst !== "" ? dataItem.cgst : "-"}</td>
                  <td>{dataItem.sgst !== "" ? dataItem.sgst : "-"}</td>
                  <td>{dataItem.igst !== "" ? dataItem.igst : "-"}</td>
                  <td>{dataItem.invoice_code || "-"}</td>
                  <td>{dataItem.invoice_template || "default"}</td>
                  <td>{dataItem.check_in_time || "-"}</td>
                  <td>{dataItem.check_out_time || "-"}</td>
                  <td
                    className="dt-cell-action"
                    style={{ textAlign: "center" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        onClick={() => handleEdit(dataItem)}
                        className="edit-btn"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(dataItem)}
                        className="delete-btn"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title=""
          subtitle="No properties were found for this business."
          description="There are currently no properties available. You can add a new property to get started."
          actionButton={
            <button className="add-btn" onClick={() => setIsModalOpen(true)}>
              + Add Property
            </button>
          }
        />
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingProperty ? "Edit Property" : "Add New Property"}</h3>
              <button className="close-btn" onClick={handleModalClose}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {[
                { label: "Property Name", name: "businessName" },
                { label: "Manager Name", name: "Manager" },
                { label: "Manager Email", name: "ManagerEmail", type: "email" },
                { label: "Property Email", name: "Email", type: "email" },
                { label: "Contact No", name: "contactNo" },
                { label: "Address", name: "Address" },
              ].map(({ label, name, type = "text" }) => (
                <div className="form-group" key={name}>
                  <label>{label}:</label>
                  <input
                    type={type}
                    name={name}
                    value={newProperty[name]}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              ))}

              <div className="form-group">
                <label>GST Number:</label>
                <input
                  type="text"
                  name="GstNumber"
                  value={newProperty.GstNumber}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label>CGST (%):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="cgst"
                  value={newProperty.cgst}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label>SGST (%):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="sgst"
                  value={newProperty.sgst}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label>IGST (%):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="igst"
                  value={newProperty.igst}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label>Invoice Prefix:</label>
                <input
                  type="text"
                  name="invoice_code"
                  value={newProperty.invoice_code}
                  onChange={handleInputChange}
                  placeholder="e.g. BBQ, INV, JAM..."
                />
              </div>

              <div className="form-group">
                <label>Invoice Template:</label>
                <select
                  name="invoice_template"
                  value={newProperty.invoice_template}
                  onChange={handleInputChange}
                >
                  {(invoiceTemplates.length > 0
                    ? invoiceTemplates
                    : [{ name: "default", label: "Default" }]
                  ).map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.label || template.name}
                    </option>
                  ))}
                </select>
              </div>

              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <div className="form-row">
                  {/* CHECK-IN */}
                  <div
                    className="form-group"
                    onClick={() => {
                      const input =
                        document.getElementById("checkin-time-input");
                      if (input) input.showPicker();
                    }}
                  >
                    <label>Check-in Time</label>

                    <TimePicker
                      id="checkin-time-input"
                      value={new Date(`1970-01-01T${newProperty.check_in_time}`)}
                      onChange={(newValue) => {
                        if (newValue) {
                          setNewProperty((prev) => ({
                            ...prev,
                            check_in_time: format(newValue, "HH:mm"),
                          }));
                        }
                      }}
                    />
                  </div>

                  {/* CHECK-OUT */}
                  <div className="form-group">
                    <label>Check-out Time</label>
                    <TimePicker
                      id="checkout-time-input"
                      value={new Date(`1970-01-01T${newProperty.check_out_time}`)}
                      onChange={(newValue) => {
                        if (newValue) {
                          setNewProperty((prev) => ({
                            ...prev,
                            check_out_time: format(newValue, "HH:mm"),
                          }));
                        }
                      }}
                    />
                  </div>
                </div>
              </LocalizationProvider>

              <div className="form-group">
                <label>Logo Image:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setLogoFile(file);
                    setLogoPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Preview"
                    style={{
                      width: "80px",
                      height: "80px",
                      marginTop: "8px",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                  />
                )}
              </div>
              {editingProperty && (
                <small style={{ color: "#666" }}>
                  Upload image only if you want to change the existing logo
                </small>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleModalClose}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingProperty ? "Update Property" : "Add Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </section>
  );
};

export default PropertyTable;
