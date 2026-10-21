import React, { useState, useEffect } from "react";
import axios from "../../../api/axios";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import EmptyState from "../../error/EmptyState";
import "./lost-and-found.scss";

const LostAndFound = () => {
  const [items, setItems] = useState([]);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [formData, setFormData] = useState({
    description: "",
    location_found: "",
    date_found: new Date().toISOString().split("T")[0],
    contact_info: "",
    room_id: "",
    property_id: "",
    status: "not_claimed",
  });

  const fetchProperties = async () => {
    try {
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      const response = await axios.get(`businessEntities/getAllBusinessEntities/${userData.Group_ID}`, {
        headers: { "Content-Type": "application/json" },
        withCredentials: false,
      });
      const hotelProperties = Array.isArray(response.data)
        ? response.data.filter((business) => business.business_type === "H")
        : [];

      setProperties(
        hotelProperties.map((property) => ({
          id: property.business_entity_id,
          name: property.business_name,
        })),
      );

      if (hotelProperties.length > 0) {
        setFormData((prev) => ({
          ...prev,
          property_id: hotelProperties[0].business_entity_id,
        }));
      }
    } catch (error) {
      showSnackbar("Error fetching properties", "error");
      console.error("Error fetching properties:", error);
    }
  };

  const fetchRooms = async (propertyId) => {
    if (!propertyId) return;
    try {
      const response = await axios.get(`pms/rooms/getAll/${null}/${propertyId}`);
      setRooms(response.data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      const endpoint =
        selectedProperty !== "all"
          ? `pms/lostAndFound/getAllItems/${userData.Group_ID}/${selectedProperty}`
          : `pms/lostAndFound/getAllItems/${userData.Group_ID}/${null}`;

      const response = await axios.get(endpoint);
      setItems(response.data);
    } catch (error) {
      showSnackbar("Error fetching lost and found items", "error");
      console.error("Error fetching items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (formData.property_id) {
      fetchRooms(formData.property_id);
    }
  }, [formData.property_id]);

  useEffect(() => {
    fetchItems();
  }, [selectedProperty]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = editingItem ? `pms/lostAndFound/updateItem/${editingItem.id}` : "pms/lostAndFound/addItem";

      const method = editingItem ? "put" : "post";

      const response = await axios[method](endpoint, formData);

      if (response.status === 201 || response.status === 200) {
        showSnackbar(editingItem ? "Item updated successfully" : "Item added successfully", "success");
        fetchItems();
        closeModal();
      }
    } catch (error) {
      let errorMessage = editingItem ? "Error updating item" : "Error adding item";

      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = "Missing required fields";
            break;
          case 404:
            errorMessage = editingItem ? "Item not found" : "Property or room not found";
            break;
          default:
            errorMessage = error.response.data.error || errorMessage;
        }
      }
      showSnackbar(errorMessage, "error");
      console.error("Error:", error);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const response = await axios.put(`pms/lostAndFound/updateStatus`, { id: id, status: newStatus });
      console.log(response.data);
      setItems((prev) => prev.map((item) => (item.id === id ? response.data : item)));
      fetchItems();
      showSnackbar("Status updated successfully", "success");
    } catch (error) {
      showSnackbar("Error updating status", "error");
      console.error("Error updating status:", error);
    }
  };

  const deleteItem = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await axios.delete(`pms/lostAndFound/deleteItem/${id}`);
        setItems((prev) => prev.filter((item) => item.id !== id));
        fetchItems();
        showSnackbar("Item deleted successfully", "success");
      } catch (error) {
        showSnackbar("Error deleting item", "error");
        console.error("Error deleting item:", error);
      }
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      description: item.description,
      location_found: item.location_found,
      date_found: item.date_found.split("T")[0],
      contact_info: item.contact_info,
      room_id: item.room_id || "",
      property_id: item.property_id,
      status: item.status,
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setFormData({
      description: "",
      location_found: "",
      date_found: new Date().toISOString().split("T")[0],
      contact_info: "",
      room_id: "",
      property_id: properties[0]?.id || "",
      status: "not_claimed",
    });
  };

  const getPropertyName = (id) => {
    const property = properties.find((p) => p.id === id);
    return property ? property.name : "Unknown";
  };

  const getRoomNumber = (id) => {
    if (!id) return "N/A";
    const room = rooms.find((r) => r.id === id);
    return room ? `${room.charge_code || ""} ${room.unit_number || ""}`.trim() : "Unknown";
  };

  const filteredItems = items.filter((item) => {
    if (selectedProperty !== "all" && item.property_id !== Number(selectedProperty)) {
      return false;
    }
    if (statusFilter !== "all" && item.status !== statusFilter) {
      return false;
    }
    if (
      searchTerm &&
      !item.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !getRoomNumber(item.room_id).toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="content-area-table">
      <h4 className="data-table-title">Lost & Found Items</h4>
      <div className="controls">
        <div className="filter-controls">
          <div className="form-group">
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              aria-label="Filter by property"
            >
              <option value="all">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="not_claimed">Not Claimed</option>
              <option value="claimed">Claimed</option>
              <option value="disposed">Disposed</option>
            </select>
          </div>

          <div className="form-group">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search lost and found items"
            />
          </div>
        </div>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          + Add New Item
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title=""
          subtitle="No lost and found items"
          description="There are currently no items matching your criteria."
          actionButton={
            <button className="add-btn" onClick={() => setShowAddModal(true)}>
              + Add New Item
            </button>
          }
        />
      ) : (
        <div className="items-container">
          <table className="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Location Found</th>
                <th>Date</th>
                <th>Room</th>
                <th>Property</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.location_found}</td>
                  <td>{new Date(item.date_found).toLocaleDateString()}</td>
                  <td>{getRoomNumber(item.room_id)}</td>
                  <td>{getPropertyName(item.property_id)}</td>
                  <td>
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item.id, e.target.value)}
                      className={`status-select ${item.status}`}
                    >
                      <option value="not_claimed">Not Claimed</option>
                      <option value="claimed">Claimed</option>
                      <option value="disposed">Disposed</option>
                    </select>
                  </td>
                  <td>
                    <div className="actions">
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button onClick={() => openEditModal(item)} className="edit-btn">
                          Edit
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="delete-btn">
                          Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingItem ? "Edit" : "Add"} Lost & Found Item</h2>
              <button onClick={closeModal} className="close-btn" aria-label="Close modal">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="description">Description*</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="location_found">Location Found*</label>
                <input
                  type="text"
                  id="location_found"
                  name="location_found"
                  value={formData.location_found}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date_found">Date Found*</label>
                  <input
                    type="date"
                    id="date_found"
                    name="date_found"
                    value={formData.date_found}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact_info">Contact Info*</label>
                  <input
                    type="text"
                    id="contact_info"
                    name="contact_info"
                    value={formData.contact_info}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="property_id">Property*</label>
                  <select
                    id="property_id"
                    name="property_id"
                    value={formData.property_id}
                    onChange={handleInputChange}
                    required
                  >
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="room_id">Room Number</label>
                  <select
                    id="room_id"
                    name="room_id"
                    value={formData.room_id}
                    onChange={handleInputChange}
                    disabled={!formData.property_id}
                  >
                    <option value="">Not Applicable</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.charge_code} {room.unit_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editingItem && (
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select id="status" name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="not_claimed">Not Claimed</option>
                    <option value="claimed">Claimed</option>
                    <option value="disposed">Disposed</option>
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingItem ? "Update" : "Add"} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx>{`
        .modal {
          background-color: var(--secondary-color);
          border-radius: 8px;
          box-shadow: var(--light-shadow1);
          max-height: 90vh;
          overflow-y: auto;
          width: 600px;
          max-width: 90vw;
        }
      `}</style>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default LostAndFound;
