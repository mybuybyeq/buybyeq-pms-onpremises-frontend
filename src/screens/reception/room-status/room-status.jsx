import React, { useState, useEffect } from "react";
import axios from "../../../api/axios";
import "./room-status.scss";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { FiTool } from "react-icons/fi";

const RoomStatusUpdate = () => {
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [showUpdateAllModal, setShowUpdateAllModal] = useState(false);
  const [selectedCleanliness, setSelectedCleanliness] = useState("Ready");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const userData = JSON.parse(sessionStorage.getItem("userData"));
        const response = await axios.get(`businessEntities/getAllBusinessEntities/${userData.Group_ID}`);
        const filteredData = response.data.filter((business) => business.business_type === "H");

        setProperties(filteredData);
        if (filteredData.length) {
          setSelectedProperty(filteredData[0].business_entity_id);
        }
      } catch (error) {
        showSnackbar("Error loading properties", "error");
        console.error("Error:", error);
      }
    };

    fetchProperties();
  }, []);

  useEffect(() => {
    if (!selectedProperty) return;

    const fetchRooms = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`pms/rooms/status/${selectedProperty}`);
        setRooms(response.data);
      } catch (error) {
        showSnackbar("Error loading rooms", "error");
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [selectedProperty]);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const updateRoomStatus = async (roomId, cleanlinessStatus) => {
    try {
      await axios.put(`pms/rooms/status/update/${roomId}`, {
        cleanliness_status: cleanlinessStatus,
        occupancy_status: rooms.find((r) => r.id === roomId)?.occupancy_status || "Vacant",
      });

      setRooms(rooms.map((room) => (room.id === roomId ? { ...room, cleanliness_status: cleanlinessStatus } : room)));

      showSnackbar("Room status updated successfully", "success");
    } catch (error) {
      showSnackbar("Error updating room status", "error");
      console.error("Error:", error);
    }
  };

  const handleBulkUpdate = async () => {
    try {
      await axios.put(`pms/rooms/status/bulk-update/${selectedProperty}`, { cleanliness_status: selectedCleanliness });

      setRooms(
        rooms.map((room) => ({
          ...room,
          cleanliness_status: selectedCleanliness,
        })),
      );

      showSnackbar("All room statuses updated successfully", "success");
      setShowUpdateAllModal(false);
    } catch (error) {
      showSnackbar("Error updating room statuses", "error");
      console.error("Error:", error);
    }
  };

  const filteredRooms =
    statusFilter === "all" ? rooms : rooms.filter((room) => room.cleanliness_status === statusFilter);

  if (loading && !rooms.length) {
    return <div className="loading">Loading rooms...</div>;
  }

  return (
    <div className="content-area-table">
      <h4 className="data-table-title">View/Update Room Status</h4>
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
      >
        {properties.map((property) => (
          <option key={property.business_entity_id} value={property.business_entity_id}>
            {property.business_name}
          </option>
        ))}
      </select>
      <div className="controls">
        <div
          className="form-group"
          style={{
            paddingTop: "8px",
            paddingRight: "8px",
          }}
        >
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Dirty">Dirty</option>
            <option value="Clean">Clean</option>
            <option value="Ready">Ready</option>
          </select>
        </div>

        <button
          className="submit-btn"
          style={{ marginTop: "8px", marginBottom: "8px" }}
          onClick={() => setShowUpdateAllModal(true)}
          disabled={!rooms.length}
        >
          UPDATE ALL
        </button>
      </div>

      <table className="room-table">
        <thead>
          <tr>
            <th>Room Type</th>
            <th>Room Number</th>
            <th>Occupancy</th>
            <th>Cleanliness Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredRooms.map((room) => (
            <tr
              key={room.id}
              style={{
                backgroundColor: room.status === "Maintenance" ? "#ffebee" : "transparent",
              }}
            >
              <td>{room.room_type}</td>
              <td style={{ position: "relative" }}>
                {room.charge_code} {room.unit_number}
                {room.status === "Maintenance" && (
                  <FiTool
                    style={{
                      color: "#f44336",
                      marginLeft: "8px",
                      verticalAlign: "middle",
                    }}
                  />
                )}
              </td>
              <td className={`status-${room.occupancy_status.toLowerCase()}`}>{room.occupancy_status}</td>
              <td>
                <select value={room.cleanliness_status} onChange={(e) => updateRoomStatus(room.id, e.target.value)}>
                  <option value="Dirty">Dirty</option>
                  <option value="Clean">Clean</option>
                  <option value="Ready">Ready</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showUpdateAllModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>
              Update All Rooms in {properties.find((p) => p.business_entity_id === selectedProperty)?.business_name}
            </h3>

            <div className="form-group">
              <label>Set all rooms to:</label>
              <select value={selectedCleanliness} onChange={(e) => setSelectedCleanliness(e.target.value)}>
                <option value="Dirty">Dirty</option>
                <option value="Clean">Clean</option>
                <option value="Ready">Ready</option>
              </select>
            </div>

            <div className="modal-actions">
              <button onClick={handleBulkUpdate}>Update All</button>
              <button onClick={() => setShowUpdateAllModal(false)}>Cancel</button>
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
    </div>
  );
};

export default RoomStatusUpdate;
