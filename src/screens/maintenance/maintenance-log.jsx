import { useState, useEffect } from "react";
import axios from "../../api/axios";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import EmptyState from "../error/EmptyState";

const MaintenancePage = () => {
  const [data, setData] = useState([]);
  const [properties, setProperties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [form, setForm] = useState({
    property_id: "",
    room_id: "",
    category_id: "",
    description: "",
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
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

      // Load all categories initially
      const allCategoriesRes = await axios.get(
        `pms/maintenanceCategories/getAllCategories/${userData.Group_ID}/${null}`,
      );
      setCategories(allCategoriesRes.data);

      // Load all rooms initially
      const allRoomsRes = await axios.get(`pms/rooms/getAll/${userData.Group_ID}/${null}`);
      setRooms(allRoomsRes.data);

      const endp = selectedProperty
        ? `pms/maintenanceRequests/getAllRequests/${userData.Group_ID}/${selectedProperty}`
        : `pms/maintenanceRequests/getAllRequests/${userData.Group_ID}/${null}`;

      const maintenanceRes = await axios.get(endp);
      setData(maintenanceRes.data);
    } catch (error) {
      showSnackbar("Error fetching data", "error");
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProperty]);

  useEffect(() => {
    if (form.property_id) {
      axios
        .get(`pms/rooms/getAll/${null}/${form.property_id}`)
        .then((res) => setRooms(res.data))
        .catch((err) => console.error("Error fetching rooms:", err));
    }
  }, [form.property_id]);

  useEffect(() => {
    if (form.property_id) {
      axios
        .get(`pms/maintenanceCategories/getAllCategories/${null}/${form.property_id}`)
        .then((res) => setCategories(res.data))
        .catch((err) => console.error("Error fetching categories:", err));
    }
  }, [form.property_id]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = editingItem
        ? `pms/maintenanceRequests/updateRequest/${editingItem.id}`
        : "pms/maintenanceRequests/addRequest";

      const method = editingItem ? "put" : "post";

      const response = await axios[method](endpoint, form);

      if (response.status === 201 || response.status === 200) {
        setData((prev) =>
          editingItem
            ? prev.map((item) => (item.id === editingItem.id ? response.data : item))
            : [...prev, response.data],
        );

        fetchData();

        showSnackbar(editingItem ? "Maintenance updated successfully" : "Maintenance added successfully", "success");
        closeModal();
      }
    } catch (error) {
      let errorMessage = editingItem ? "Error updating maintenance" : "Error adding maintenance";

      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = "Missing required fields";
            break;
          case 404:
            errorMessage = editingItem ? "Maintenance request not found" : "Room not found";
            break;
          case 409:
            errorMessage =
              error.response.data.error ||
              (editingItem
                ? "Cannot modify this maintenance request"
                : "Duplicate maintenance request or room already in maintenance");
            break;
          default:
            errorMessage = error.response.data.error || errorMessage;
        }
      } else if (error.request) {
        errorMessage = "Network error - please check your connection";
      }

      showSnackbar(errorMessage, "error");
      console.error("Error:", error);
    }
  };

  const handleComplete = async (id) => {
    try {
      const maintenanceRequest = data.find((item) => item.id === id);
      if (!maintenanceRequest) {
        showSnackbar("Maintenance request not found", "error");
        return;
      }
      const response = await axios.put(`pms/maintenanceRequests/${id}/complete`);
      setData((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "Completed",
                completed_at: response.data.maintenance_request.completed_at,
              }
            : item,
        ),
      );
      if (response.data.room) {
        setRooms((prev) =>
          prev.map((room) =>
            room.id === response.data.room.id ? { ...room, status: response.data.room.status } : room,
          ),
        );
      }
      fetchData();

      showSnackbar(response.data.message || "Maintenance completed successfully", "success");
    } catch (error) {
      let errorMessage = "Error completing maintenance";
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = "Maintenance request not found";
        } else if (error.response.status === 400) {
          errorMessage = error.response.data.error || "Invalid request";
        } else if (error.response.status === 409) {
          errorMessage = error.response.data.error || "Cannot complete this maintenance request";
        } else {
          errorMessage = error.response.data.error || errorMessage;
        }
      }

      showSnackbar(errorMessage, "error");
      console.error("Error completing maintenance:", error.response?.data || error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this maintenance entry?")) {
      try {
        const response = await axios.delete(`pms/maintenanceRequests/deleteRequest/${id}`);
        setData((prev) => prev.filter((item) => item.id !== id));
        if (response.data.room_status_updated) {
          setRooms((prev) =>
            prev.map((room) => (room.id === response.data.room_id ? { ...room, status: "Available" } : room)),
          );
        }
        fetchData();
        showSnackbar("Maintenance request deleted successfully");
      } catch (error) {
        let errorMessage = "Error deleting maintenance request";
        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = "Maintenance request not found";
          } else {
            errorMessage = error.response.data.error || errorMessage;
          }
        }
        showSnackbar(errorMessage, "error");
      }
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setForm({
        property_id: item.property_id,
        room_id: item.room_id,
        category_id: item.category_id,
        description: item.description,
      });
    } else {
      setForm({
        property_id: "",
        room_id: "",
        category_id: "",
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const getPropertyName = (id) => {
    const property = properties.find((p) => p.id === id);
    return property ? property.name : "Unknown";
  };

  const getRoomNumber = (id) => {
    const room = rooms.find((r) => r.id === id);
    if (!room) return "Unknown";
    return `${room.charge_code || ""} ${room.unit_number || ""}`.trim();
  };

  const getCategoryName = (id) => {
    const category = categories.find((c) => c.id === id);
    return category ? category.category : "Unknown";
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <section className="content-area-table">
      <h4 className="data-table-title">Maintenance Entries</h4>
      <div className="flex gap-4">
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
          <option value="">All Properties</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
        {data.length > 0 && (
          <button className="add-btn" onClick={() => openModal()}>
            + Add Maintenance
          </button>
        )}
      </div>

      {data.length > 0 ? (
        <div className="data-table-diagram">
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Room</th>
                <th>Category</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className={item.status === "completed" ? "completed-row" : ""}>
                  <td>{getPropertyName(item.property_id)}</td>
                  <td>{getRoomNumber(item.room_id)}</td>
                  <td>{getCategoryName(item.category_id)}</td>
                  <td>{item.description}</td>
                  <td>
                    <span className={`status-badge ${item.status}`}>{item.status}</span>
                  </td>
                  <td>
                    <div className="actions">
                      {item.status !== "completed" && (
                        <>
                          <button onClick={() => openModal(item)} className="edit-btn">
                            Edit
                          </button>
                          <button onClick={() => handleComplete(item.id)} className="complete-btn">
                            Complete
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDelete(item.id)} className="delete-btn">
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
          title="No maintenance entries"
          description="There are currently no maintenance entries available."
          actionButton={
            <button className="add-btn" onClick={() => openModal()}>
              + Add Maintenance
            </button>
          }
        />
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal compact-modal">
            <div className="modal-header">
              <h3>{editingItem ? "Edit Maintenance" : "Add Maintenance"}</h3>
              <button className="close-btn" onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-scroll-content">
              <div className="form-group">
                <label>Property</label>
                <select name="property_id" value={form.property_id} onChange={handleChange} required>
                  <option value="">Select Property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Room</label>
                <select
                  name="room_id"
                  value={form.room_id}
                  onChange={handleChange}
                  required
                  disabled={!form.property_id}
                >
                  <option value="">Select Room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.charge_code} {room.unit_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Maintenance Reason</label>
                <select
                  name="category_id"
                  value={form.category_id}
                  disabled={!form.property_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Reason</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the issue..."
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingItem ? "Update" : "Add"} Maintenance
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
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <style jsx>{`
        .completed-row {
          background-color: #f0fff0;
          color: #555;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          text-transform: capitalize;
        }
        .status-badge.pending {
          background-color: #fff3cd;
          color: #856404;
        }
        .status-badge.in_progress {
          background-color: #cce5ff;
          color: #004085;
        }
        .status-badge.completed {
          background-color: #d4edda;
          color: #155724;
        }
        .complete-btn {
          background-color: #28a745;
          color: white;
        }
        .complete-btn:hover {
          background-color: #218838;
        }
        .actions {
          display: flex;
          gap: 8px;
          justify-content: center;
        }
      `}</style>
    </section>
  );
};

export default MaintenancePage;
