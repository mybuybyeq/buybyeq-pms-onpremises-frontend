import { useState, useEffect } from "react";
import axios from "../../../../api/axios";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import EmptyState from "../../../error/EmptyState";

const TABLE_HEADS = ["Unit #", "Property", "Type", "Floor", "Beds", "Max Pax", "Status", "Actions"];

const roomStatuses = ["Active", "Maintenance", "Out of Service"];

const RoomsTable = () => {
  const [tableData, setTableData] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [propertyRoomTypes, setPropertyRoomTypes] = useState({});
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);

  const [newRoom, setNewRoom] = useState({
    unit_number: "",
    property_id: "",
    room_type_id: "",
    floor: "",
    beds: "",
    max_pax: "",
    status: "Active",
    display_seq: "",
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

        await fetchAllRoomTypes(propertiesRes.data);

        const roomsRes = await axios.get(`pms/rooms/getAll/${userData.Group_ID}/${null}`);
        setTableData(roomsRes.data);
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
    const fetchFilteredRooms = async () => {
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      try {
        const url = selectedProperty
          ? `pms/rooms/getAll/${null}/${selectedProperty}`
          : `pms/rooms/getAll/${userData.Group_ID}/${null}`;

        const res = await axios.get(url);
        setTableData(res.data);
      } catch (error) {
        showSnackbar("Error filtering rooms", "error");
        console.error("Error:", error);
      }
    };

    if (!loading) {
      fetchFilteredRooms();
    }
  }, [selectedProperty]);

  const fetchRoomTypesForProperty = async (propertyId) => {
    if (!propertyId) return;

    try {
      setLoadingRoomTypes(true);
      const res = await axios.get(`pms/rooms/roomTypes/${propertyId}`);
      if (res.data.error && res.data.suggestion) {
        showSnackbar(res.data.suggestion, "warning");
        setPropertyRoomTypes((prev) => ({
          ...prev,
          [propertyId]: [],
        }));
      } else {
        setPropertyRoomTypes((prev) => ({
          ...prev,
          [propertyId]: res.data,
        }));
      }
    } catch (error) {
      showSnackbar("Error loading room types", "error");
      console.error("Error:", error);
    } finally {
      setLoadingRoomTypes(false);
    }
  };

  const fetchAllRoomTypes = async (propertiesList) => {
    const roomTypesMap = {};

    for (const property of propertiesList) {
      try {
        const res = await axios.get(`pms/rooms/roomTypes/${property.business_entity_id}`);

        const roomTypes = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];

        roomTypesMap[property.business_entity_id] = roomTypes;
      } catch (error) {
        console.error("Failed to fetch room types for", property.business_entity_id, error);
        roomTypesMap[property.business_entity_id] = [];
      }
    }

    setPropertyRoomTypes(roomTypesMap);
  };

  const handlePropertyChange = (e) => {
    const propertyId = e.target.value;
    setNewRoom((prev) => ({
      ...prev,
      property_id: propertyId,
      room_type_id: "",
    }));

    if (propertyId && !propertyRoomTypes[propertyId]) {
      fetchRoomTypesForProperty(propertyId);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setNewRoom({
      unit_number: room.unit_number,
      property_id: room.property_id,
      room_type_id: room.room_type_id,
      floor: room.floor,
      beds: room.beds,
      max_pax: room.max_pax,
      status: room.status,
      display_seq: room.display_seq || "",
    });

    if (room.property_id && !propertyRoomTypes[room.property_id]) {
      fetchRoomTypesForProperty(room.property_id);
    }

    setIsModalOpen(true);
  };

  const handleDelete = async (room) => {
    if (window.confirm(`Delete room ${room.unit_number}?`)) {
      try {
        await axios.delete(`pms/rooms/delete/${room.id}`);
        setTableData(tableData.filter((r) => r.id !== room.id));
        showSnackbar("Room deleted successfully", "success");
      } catch (error) {
        showSnackbar("Error deleting room", "error");
        console.error("Error:", error);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRoom({
      ...newRoom,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userData = JSON.parse(sessionStorage.getItem("userData"));
    try {
      const roomData = {
        ...newRoom,
        floor: parseInt(newRoom.floor),
        beds: parseInt(newRoom.beds),
        max_pax: parseInt(newRoom.max_pax),
        display_seq: newRoom.display_seq ? parseInt(newRoom.display_seq) : null,
      };

      if (editingRoom) {
        await axios.put(`pms/rooms/update/${editingRoom.id}`, roomData);
        showSnackbar("Room updated successfully", "success");
      } else {
        await axios.post("pms/rooms/add", roomData);
        showSnackbar("Room added successfully", "success");
      }

      const res = await axios.get(
        selectedProperty
          ? `pms/rooms/getAll/${null}/${selectedProperty}`
          : `pms/rooms/getAll/${userData.Group_ID}/${null}`,
      );
      setTableData(res.data);

      handleModalClose();
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Operation failed";
      showSnackbar(errorMsg, "error");
      console.error("Error:", error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    setNewRoom({
      unit_number: "",
      property_id: "",
      room_type_id: "",
      floor: "",
      beds: "",
      max_pax: "",
      status: "Active",
      display_seq: "",
    });
  };

  const getRoomTypeName = (roomTypeId) => {
    if (!roomTypeId) return "Unknown";
    for (const propertyId in propertyRoomTypes) {
      const found = propertyRoomTypes[propertyId].find((rt) => rt.id === roomTypeId);
      if (found) return found.room_type;
    }

    return "Unknown";
  };

  if (loading) {
    return <div className="loading">Loading rooms...</div>;
  }

  return (
    <section className="content-area-table">
      <div className="data-table-info">
        <h4 className="data-table-title">Rooms Management</h4>
      </div>
      <select
        style={{
          width: "20%",
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
          + Add Room
        </button>
      )}
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
              {tableData.map((room) => (
                <tr key={room.id}>
                  <td>{room.unit_number}</td>
                  <td>{room.property_name}</td>
                  <td>{getRoomTypeName(room.room_type_id)}</td>
                  <td>{room.floor}</td>
                  <td>{room.beds}</td>
                  <td>{room.max_pax}</td>
                  <td>{room.status}</td>
                  <td className="actions">
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button onClick={() => handleEdit(room)} className="edit-btn">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(room)} className="delete-btn">
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
          subtitle="No rooms were found."
          description="There are currently no rooms available. You can add a new room to get started."
          actionButton={
            <button className="add-btn" onClick={() => setIsModalOpen(true)}>
              + Add Room
            </button>
          }
        />
      )}

      {/* Room Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="compact-modal">
              <div className="modal-header">
                <h3>{editingRoom ? "Edit Room" : "Add Room"}</h3>
                <button className="close-btn" onClick={handleModalClose}>
                  &times;
                </button>
              </div>
              {editingRoom && (
                <div
                  style={{
                    padding: "10px",
                    backgroundColor: "#FEF3C7",
                    border: "1px solid #FCD34D",
                    color: "#92400E",
                    borderRadius: "8px",
                    textAlign: "center",
                    marginBottom: "10px",
                    fontSize: "11px",
                    fontWeight: "500",
                  }}
                >
                  Property and room types cannot be changed when editing a room.
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Unit Number*</label>
                      <input
                        type="text"
                        name="unit_number"
                        value={newRoom.unit_number}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Property*</label>
                      <select
                        name="property_id"
                        value={newRoom.property_id}
                        onChange={handlePropertyChange}
                        disabled={editingRoom}
                        required
                      >
                        <option value="">Select Property</option>
                        {properties.map((property) => (
                          <option key={property.business_entity_id} value={property.business_entity_id}>
                            {property.business_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Room Type*</label>
                      <select
                        name="room_type_id"
                        value={newRoom.room_type_id}
                        onChange={handleInputChange}
                        required
                        disabled={!newRoom.property_id || loadingRoomTypes || editingRoom}
                      >
                        <option value="">Select Room Type</option>
                        {newRoom.property_id && propertyRoomTypes[newRoom.property_id]
                          ? propertyRoomTypes[newRoom.property_id].map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.room_type}
                              </option>
                            ))
                          : null}
                      </select>
                      {loadingRoomTypes && <div className="text-sm text-gray-500">Loading room types...</div>}
                      {newRoom.property_id && propertyRoomTypes[newRoom.property_id]?.length === 0 && (
                        <div style={{ fontSize: "0.675rem", color: "#ef4444" }}>
                          No room types found for this property.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Floor*</label>
                      <input
                        type="number"
                        name="floor"
                        value={newRoom.floor}
                        onChange={handleInputChange}
                        min="1"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Beds*</label>
                      <input
                        type="number"
                        name="beds"
                        value={newRoom.beds}
                        onChange={handleInputChange}
                        min="1"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Max Pax*</label>
                      <input
                        type="number"
                        name="max_pax"
                        value={newRoom.max_pax}
                        onChange={handleInputChange}
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Status*</label>
                      <select name="status" value={newRoom.status} onChange={handleInputChange} required>
                        {roomStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Display Order</label>
                      <input
                        type="number"
                        name="display_seq"
                        value={newRoom.display_seq}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={handleModalClose}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={!newRoom.room_type_id}>
                    {editingRoom ? "Update" : "Add"} Room
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

export default RoomsTable;
