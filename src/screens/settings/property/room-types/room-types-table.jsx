import { useState, useEffect } from "react";
import axios from "../../../../api/axios";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import EmptyState from "../../../error/EmptyState";

const TABLE_HEADS = ["Room Type", "Property", "Charge Code", "Overbooking Limit", "Actions"];

const RoomTypesTable = () => {
  const [tableData, setTableData] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [newRoom, setNewRoom] = useState({
    property_id: "",
    room_type: "",
    charge_code: "",
    overbooking_limit: 0,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = JSON.parse(sessionStorage.getItem("userData"));

        const propertiesResponse = await axios.get(`businessEntities/getAllBusinessEntities/${userData.Group_ID}`, {
          headers: { "Content-Type": "application/json" },
        });

        const hotelProperties = Array.isArray(propertiesResponse.data)
          ? propertiesResponse.data.filter((p) => p.business_type === "H")
          : [];

        setProperties(hotelProperties);

        const roomTypesResponse = await axios.get(`pms/roomTypes/getAllRoomTypes/${userData.Group_ID}`, {
          headers: { "Content-Type": "application/json" },
        });

        setTableData(Array.isArray(roomTypesResponse.data) ? roomTypesResponse.data : []);
      } catch (error) {
        showSnackbar("Error fetching data", "error");
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setNewRoom({
      property_id: room.property_id,
      room_type: room.room_type,
      charge_code: room.charge_code,
      overbooking_limit: room.overbooking_limit,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (room) => {
    const confirmDelete = window.confirm(`Delete room type ${room.room_type}?`);

    if (!confirmDelete) return;

    try {
      await axios.delete(`pms/roomTypes/deleteRoomType/${room.id}`);
      setTableData(tableData.filter((item) => item.id !== room.id));
      showSnackbar("Room type deleted successfully", "success");
    } catch (error) {
      if (error.response && error.response.status === 400) {
        showSnackbar("Cannot delete - there are rooms linked to this type", "error");
      } else {
        showSnackbar("Error deleting room type", "error");
      }
      console.error("Error:", error);
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
        overbooking_limit: parseInt(newRoom.overbooking_limit),
      };

      if (editingRoom) {
        await axios.put(`pms/roomTypes/updateRoomType/${editingRoom.id}`, roomData);
        showSnackbar("Room type updated successfully", "success");
      } else {
        await axios.post("pms/roomTypes/addRoomType", roomData);
        showSnackbar("Room type added successfully", "success");
      }
      const response = await axios.get(`pms/roomTypes/getAllRoomTypes/${userData.Group_ID}`);
      setTableData(Array.isArray(response.data) ? response.data : []);

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
      property_id: "",
      room_type: "",
      charge_code: "",
      overbooking_limit: 0,
    });
  };

  const getPropertyName = (propertyId) => {
    return properties.find((p) => p.business_entity_id === propertyId)?.business_name || "Unknown";
  };

  if (loading) {
    return <div className="loading">Loading room types...</div>;
  }

  return (
    <section className="content-area-table">
      <div className="data-table-info">
        <h4 className="data-table-title">Room Types</h4>
        {tableData.length > 0 && (
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>
            + Add Room Type
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
              {tableData.map((room) => (
                <tr key={room.id}>
                  <td>{room.room_type}</td>
                  <td>{getPropertyName(room.property_id)}</td>
                  <td>{room.charge_code}</td>
                  <td>{room.overbooking_limit}</td>
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
          subtitle="No room types were found."
          description="There are currently no room types available. You can add a new room type to get started."
          actionButton={
            <button className="add-btn" onClick={() => setIsModalOpen(true)}>
              + Add Room Type
            </button>
          }
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="compact-modal">
              <div className="modal-header">
                <h3>{editingRoom ? "Edit Room Type" : "Add Room Type"}</h3>
                <button className="close-btn" onClick={handleModalClose}>
                  &times;
                </button>
              </div>

              <div className="modal-scroll-content">
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Property</label>
                      <select name="property_id" value={newRoom.property_id} onChange={handleInputChange} required>
                        <option value="">Select Property</option>
                        {properties.map((p) => (
                          <option key={p.business_entity_id} value={p.business_entity_id}>
                            {p.business_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Room Type</label>
                      <input
                        type="text"
                        name="room_type"
                        value={newRoom.room_type}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Standard, Deluxe"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Charge Code</label>
                      <input
                        type="text"
                        name="charge_code"
                        value={newRoom.charge_code}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., STD, DLX"
                      />
                    </div>
                    <div className="form-group">
                      <label>Overbooking Limit</label>
                      <input
                        type="number"
                        name="overbooking_limit"
                        value={newRoom.overbooking_limit}
                        onChange={handleInputChange}
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="cancel-btn" onClick={handleModalClose}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      {editingRoom ? "Update" : "Add"} Room Type
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar for notifications */}
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

export default RoomTypesTable;
