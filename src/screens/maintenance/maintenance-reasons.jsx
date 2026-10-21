import { useState, useEffect } from "react";
import axios from "../../api/axios";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import EmptyState from "../error/EmptyState";

const TABLE_HEADS = ["Property", "Maintenance Category", "Actions"];

const MaintenanceReasons = () => {
  const [tableData, setTableData] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    property_id: "",
    category: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [selectedProperty, setSelectedProperty] = useState("");

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const fetchMaintenanceCategories = async () => {
    try {
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      setIsLoading(true);

      const categoriesResponse = await axios.get(
        selectedProperty
          ? `pms/maintenanceCategories/getAllCategories/${null}/${selectedProperty}`
          : `pms/maintenanceCategories/getAllCategories/${userData.Group_ID}/${null}`,
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        },
      );

      setTableData(Array.isArray(categoriesResponse.data) ? categoriesResponse.data : []);
    } catch (error) {
      console.error("Error fetching maintenance categories:", error);
      showSnackbar("Error fetching maintenance categories", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const userData = JSON.parse(sessionStorage.getItem("userData"));
        const propertiesResponse = await axios.get(`businessEntities/getAllBusinessEntities/${userData.Group_ID}`, {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        });

        const filteredProperties = Array.isArray(propertiesResponse.data)
          ? propertiesResponse.data.filter((business) => business.business_type === "H")
          : [];

        setProperties(
          filteredProperties.map((property) => ({
            id: property.business_entity_id,
            name: property.business_name,
          })),
        );
      } catch (error) {
        console.error("Error fetching properties:", error);
        showSnackbar("Error fetching properties", "error");
      }
    };

    fetchProperties();
  }, []);

  useEffect(() => {
    fetchMaintenanceCategories();
  }, [selectedProperty]);

  const handleEdit = (item) => {
    setEditingItem(item);
    setNewItem({
      property_id: item.property_id,
      category: item.category,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Delete maintenance category "${item.category}"?`)) {
      try {
        await axios.delete(`pms/maintenanceCategories/deleteCategory/${item.id}`, {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        });

        await fetchMaintenanceCategories();
        showSnackbar("Maintenance reason deleted successfully");
      } catch (error) {
        console.error("Error deleting category:", error);
        showSnackbar("Error deleting Maintenance reason", "error");
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({
      ...newItem,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...newItem,
        property_id: parseInt(newItem.property_id),
      };

      if (editingItem) {
        await axios.put(`pms/maintenanceCategories/updateCategory/${editingItem.id}`, payload, {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        });
        showSnackbar("Maintenance reason updated successfully");
      } else {
        await axios.post("pms/maintenanceCategories/addCategory", payload, {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        });
        showSnackbar("Maintenance reason added successfully");
      }

      await fetchMaintenanceCategories();
      closeModal();
    } catch (error) {
      console.error("Error submitting category:", error);
      showSnackbar(editingItem ? "Error updating Maintenance reason" : "Error adding Maintenance reason", "error");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setNewItem({ property_id: "", category: "" });
  };

  const getPropertyName = (propertyId) => {
    return properties.find((p) => p.id === propertyId)?.name || "Unknown";
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <section className="content-area-table">
      <h4 className="data-table-title">Maintenance Reasons</h4>
      <div className="flex gap-4">
        <select
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
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="property-filter"
        >
          <option value="">All Properties</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>

        {tableData.length > 0 && (
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>
            + Add Maintenance Reason
          </button>
        )}
      </div>

      {tableData.length > 0 ? (
        <div className="data-table-diagram">
          <table>
            <thead>
              <tr>
                {TABLE_HEADS.map((head, idx) => (
                  <th key={idx}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((item) => (
                <tr key={item.id}>
                  <td>{getPropertyName(item.property_id)}</td>
                  <td>{item.category}</td>
                  <td className="actions">
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <button onClick={() => handleEdit(item)} className="edit-btn">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(item)} className="delete-btn">
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
          subtitle="No maintenance reasons added."
          description="There are currently no maintenance reasons available."
          actionButton={
            <button className="add-btn" onClick={() => setIsModalOpen(true)}>
              + Add Maintenance Reason
            </button>
          }
        />
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal compact-modal">
            <div className="modal-header">
              <h3>{editingItem ? "Edit Maintenance Reason" : "Add Maintenance Reason"}</h3>
              <button className="close-btn" onClick={closeModal}>
                &times;
              </button>
            </div>
            <div className="modal-scroll-content">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Property</label>
                  <select name="property_id" value={newItem.property_id} onChange={handleInputChange} required>
                    <option value="">Select Property</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Maintenance Reason</label>
                  <input
                    type="text"
                    name="category"
                    value={newItem.category}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Plumbing, Electrical, HVAC"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    {editingItem ? "Update" : "Add"} Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </section>
  );
};

export default MaintenanceReasons;
