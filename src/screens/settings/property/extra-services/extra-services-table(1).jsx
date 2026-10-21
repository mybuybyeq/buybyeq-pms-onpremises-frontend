import { useState, useEffect } from "react";
import axios from "../../../../api/axios";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import EmptyState from "../../../error/EmptyState";
import { BASE_CURRENCY } from "../../../../constants/currency";

const TABLE_HEADS = ["Service Name", "Property", "Service Code", "Price", "Actions"];

const ExtraServices = () => {
  const [tableData, setTableData] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    property_id: "",
    service_name: "",
    service_code: "",
    price: "",
  });
  const [selectedProperty, setSelectedProperty] = useState("");
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = JSON.parse(sessionStorage.getItem("userData"));

        const propertiesRes = await axios.get(`businessEntities/getAllBusinessEntities/${userData.Group_ID}`);
        const filteredData = propertiesRes.data.filter((business) => business.business_type === "H");

        setProperties(filteredData);
        if (filteredData.length) {
          setSelectedProperty(filteredData[0].business_entity_id);
        }

        const servicesRes = await axios.get(`pms/extra-services/getAll/${userData.Group_ID}/${null}`);

        setTableData(servicesRes.data);
      } catch (error) {
        showSnackbar("Error loading data", "error");
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchFilteredServices = async () => {
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      try {
        const url = selectedProperty
          ? `pms/extra-services/getAll/${null}/${selectedProperty}`
          : `pms/extra-services/getAll/${userData.Group_ID}/${null}`;

        const res = await axios.get(url);
        setTableData(res.data);
      } catch (error) {
        showSnackbar("Error filtering services", "error");
        console.error("Error:", error);
      }
    };

    if (!loading) {
      fetchFilteredServices();
    }
  }, [selectedProperty]);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setNewItem({
      property_id: item.property_id,
      service_name: item.service_name,
      service_code: item.service_code,
      price: item.price,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Delete service ${item.service_name}?`)) {
      try {
        await axios.delete(`pms/extra-services/delete/${item.id}`);
        setTableData(tableData.filter((i) => i.id !== item.id));
        showSnackbar("Service deleted successfully", "success");
      } catch (error) {
        showSnackbar("Error deleting service", "error");
        console.error("Error:", error);
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
    const userData = JSON.parse(sessionStorage.getItem("userData"));
    try {
      const payload = {
        ...newItem,
        price: parseFloat(newItem.price),
        property_id: parseInt(newItem.property_id),
      };

      if (editingItem) {
        await axios.put(`pms/extra-services/update/${editingItem.id}`, payload);
        showSnackbar("Service updated successfully", "success");
      } else {
        await axios.post("pms/extra-services/add", payload);
        showSnackbar("Service added successfully", "success");
      }

      // Refresh data
      const res = await axios.get(
        selectedProperty
          ? `pms/extra-services/getAll/${null}/${selectedProperty}`
          : `pms/extra-services/getAll/${userData.Group_ID}/${null}`,
      );
      setTableData(res.data);

      closeModal();
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Operation failed";
      showSnackbar(errorMsg, "error");
      console.error("Error:", error);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setNewItem({ property_id: "", service_name: "", service_code: "", price: "" });
  };

  const getPropertyName = (propertyId) => {
    return properties.find((p) => p.business_entity_id === propertyId)?.business_name || "Unknown";
  };

  if (loading) {
    return <div className="loading">Loading services...</div>;
  }

  return (
    <section className="content-area-table">
      <div className="data-table-info">
        <h4 className="data-table-title">Extra Services</h4>
      </div>
      <select
        style={{
          width: "30%",
          padding: "8px",
          marginRight: "10px",
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
          <option key={property.business_entity_id} value={property.business_entity_id}>
            {property.business_name}
          </option>
        ))}
      </select>
      {tableData.length > 0 && (
        <button className="add-btn" onClick={() => setIsModalOpen(true)}>
          + Add Extra Service
        </button>
      )}
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
                  <td>{item.service_name}</td>
                  <td>{getPropertyName(item.property_id)}</td>
                  <td>{item.service_code}</td>
                  <td>
                    {BASE_CURRENCY} {item.price}
                  </td>
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
          subtitle="No extra services configured"
          description="There are currently no extra-services offered by this business."
          actionButton={
            <button className="add-btn" onClick={() => setIsModalOpen(true)}>
              + Add Extra Service
            </button>
          }
        />
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal compact-modal">
            <div className="modal-header">
              <h3>{editingItem ? "Edit Extra Service" : "Add Extra Service"}</h3>
              <button className="close-btn" onClick={closeModal}>
                &times;
              </button>
            </div>
            <div className="modal-scroll-content">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Property</label>
                    <select name="property_id" value={newItem.property_id} onChange={handleInputChange} required>
                      <option value="">Select Property</option>
                      {properties.map((p) => (
                        <option key={p.business_entity_id} value={p.business_entity_id}>
                          {p.business_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Service Name</label>
                    <input
                      type="text"
                      name="service_name"
                      value={newItem.service_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Service Code</label>
                    <input
                      type="text"
                      name="service_code"
                      value={newItem.service_code}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., APUP, BBFT"
                    />
                  </div>
                  <div className="form-group">
                    <label>Price({BASE_CURRENCY})</label>
                    <input
                      type="number"
                      step="0.01"
                      name="price"
                      value={newItem.price}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    {editingItem ? "Update" : "Add"} Extra Service
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

export default ExtraServices;
