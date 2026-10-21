import React, { useState, useEffect, useRef } from "react";
import axios from "../../../api/axios";
import { FiFilter, FiChevronDown, FiInfo, FiTool, FiSearch, FiLoader } from "react-icons/fi";
import { Snackbar, Alert } from "@mui/material";
import { format, parseISO } from "date-fns";
import "./room-rack.scss";
import "../../guests/guest.scss";

function formatWithOrdinal(date) {
  const day = format(date, "d");
  const daySuffix =
    day.endsWith("1") && day !== "11"
      ? "st"
      : day.endsWith("2") && day !== "12"
        ? "nd"
        : day.endsWith("3") && day !== "13"
          ? "rd"
          : "th";

  return `${day}${daySuffix} ${format(date, "EEE MMM yyyy")}`;
}

export default function RoomRack() {
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [searchTerm, setSearchTerm] = useState("");
  const [showHotelDropdown, setShowHotelDropdown] = useState(false);
  const hotelDropdownRef = useRef(null);
  const [filters, setFilters] = useState({ floor: "all", status: "all", type: "all" });
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);

  const statusColor = (status) =>
    ({
      clean: "#4CAF50",
      dirty: "#F44336",
      ready: "#2196F3",
      occupied: "#FF9800",
      vacant: "#9E9E9E",
      maintenance: "#607D8B",
    })[status.toLowerCase()] || "#9E9E9E";

  useEffect(() => {
    async function fetchProperties() {
      try {
        const userData = JSON.parse(sessionStorage.getItem("userData"));
        const resp = await axios.get(`businessEntities/getAllBusinessEntities/${userData.Group_ID}`);

        const filteredData = resp.data.filter((business) => business.business_type === "H");

        setProperties(filteredData);
        if (filteredData.length) {
          setSelectedProperty(filteredData[0].business_entity_id);
        }
      } catch (err) {
        showSnackbar("Failed to load properties", "error");
      }
    }

    fetchProperties();
  }, []);

  useEffect(() => {
    if (!selectedProperty) return;
    async function fetchTypes() {
      try {
        const resp = await axios.get(`pms/rooms/roomTypes/${selectedProperty}`);
        setRoomTypes(resp.data.map((rt) => rt.room_type));
      } catch {
        setRoomTypes([]);
      }
    }
    fetchTypes();
  }, [selectedProperty]);

  useEffect(() => {
    if (!selectedProperty) return;
    async function fetchRoomsWithGuests() {
      setLoading(true);
      try {
        const roomsResp = await axios.get(`pms/rooms/status/${selectedProperty}`);
        const allRooms = roomsResp.data;

        const guestsResp = await axios.get(`pms/guests/getAll/${selectedProperty}`, {
          params: { status: "Checked In" },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        const roomsWithGuests = allRooms.map((room) => {
          const guestBooking = guestsResp.data.find((g) =>
            g.bookings?.some((b) => b.status === "Checked In" && b.room_id === room.id),
          );

          return {
            ...room,
            guest: guestBooking
              ? {
                  ...guestBooking,
                  currentBooking: guestBooking.bookings.find((b) => b.status === "Checked In" && b.room_id === room.id),
                }
              : null,
          };
        });

        setRooms(roomsWithGuests);
      } catch (err) {
        console.error("Error fetching data:", err);
        showSnackbar("Failed to load room data", "error");
      }
      setLoading(false);
    }
    fetchRoomsWithGuests();
  }, [selectedProperty]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (hotelDropdownRef.current && !hotelDropdownRef.current.contains(e.target)) {
        setShowHotelDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function showSnackbar(message, severity) {
    setSnackbar({ open: true, message, severity });
  }

  function handleCloseSnackbar() {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }

  async function handleStatusChange(room, newStatus) {
    try {
      await axios.put(`pms/rooms/status/update/${room.id}`, {
        cleanliness_status: newStatus,
        occupancy_status: room.occupancy_status,
      });
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, cleanliness_status: newStatus } : r)));
      setOpenStatusDropdown(null);
      showSnackbar("Room status updated", "success");
    } catch (err) {
      console.error(err.response?.data || err);
      showSnackbar(err.response?.data?.error || "Failed to update room status", "error");
    }
  }

  const selectedHotel = properties.find((p) => p.business_entity_id === selectedProperty) || {};

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      searchTerm === "" ||
      (room.guest &&
        (`${room.guest.firstName} ${room.guest.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          room.guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          room.guest.phone.includes(searchTerm))) ||
      room.unit_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFloor = filters.floor === "all" || room.floor.toString() === filters.floor;

    const roomStatus = (room.cleanliness_status || room.status || "").toLowerCase();
    const matchesStatus = filters.status === "all" || roomStatus === filters.status.toLowerCase();

    const matchesType = filters.type === "all" || room.room_type === filters.type;

    return matchesSearch && matchesFloor && matchesStatus && matchesType;
  });

  return (
    <div className="content-area-table">
      <h4 className="data-table-title">Room Rack & Occupancy</h4>

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
        {properties.map((h) => (
          <option key={h.business_entity_id} value={h.business_entity_id}>
            {h.business_name}
          </option>
        ))}
      </select>

      {/* Search and Filters */}
      <div className="room-rack-controls">
        <div className="search-box" style={{ padding: "10px" }}>
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by room or guest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters">
          {[
            { label: "Floor", key: "floor", opts: ["all", ...new Set(rooms.map((r) => r.floor.toString()))] },
            { label: "Status", key: "status", opts: ["all", "dirty", "clean", "ready"] },
            { label: "Type", key: "type", opts: ["all", ...roomTypes] },
          ].map(({ label, key, opts }) => (
            <div className="filter-group" key={key}>
              <label>
                <FiFilter /> {label}
              </label>
              <select value={filters[key]} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}>
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o === "all" ? "All" : o.charAt(0).toUpperCase() + o.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="loading">
          <FiLoader className="loading-spinner" />
          Loading rooms and guest data...
        </div>
      ) : (
        <div className="room-grid">
          {loading ? (
            <></>
          ) : filteredRooms.length ? (
            filteredRooms.map((room) => (
              <div
                key={room.id}
                className={`room-card ${room.guest ? "occupied" : "vacant"}`}
                style={{
                  borderLeft: `5px solid ${statusColor(room.cleanliness_status || room.status)}`,
                }}
              >
                {room.status === "Maintenance" && (
                  <div className="maintenance-indicator">
                    <FiTool className="maintenance-icon" />
                  </div>
                )}

                <div className="room-header">
                  <span className="room-number">
                    {room.charge_code}
                    {room.unit_number}
                  </span>
                  <div
                    className="room-status"
                    style={{ backgroundColor: statusColor(room.cleanliness_status || room.status) }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenStatusDropdown(openStatusDropdown === room.id ? null : room.id);
                    }}
                  >
                    {room.cleanliness_status || room.status}
                    <FiChevronDown className="dropdown-icon" />
                    {openStatusDropdown === room.id && (
                      <div className="status-dropdown">
                        {["dirty", "clean", "ready"].map((s) => (
                          <div
                            key={s}
                            onClick={() => handleStatusChange(room, s)}
                            className={room.cleanliness_status === s ? "active" : ""}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {room.guest ? (
                  <div
                    className="guest-info"
                    onClick={() => {
                      setSelectedGuest(room.guest);
                      setIsDetailOpen(true);
                    }}
                  >
                    <div className="guest-name">
                      {room.guest.firstName} {room.guest.lastName}
                    </div>
                    {room.guest.currentBooking && (
                      <div className="booking-dates">
                        <div>Until: {formatWithOrdinal(parseISO(room.guest.currentBooking.checkOut))}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="vacant">{room.status === "Maintenance" ? "Under Maintenance" : "Vacant"}</div>
                )}
              </div>
            ))
          ) : (
            <div className="no-results">No rooms match your search/filters</div>
          )}
        </div>
      )}

      {/* Guest Detail Modal */}
      {isDetailOpen && selectedGuest && (
        <div className="modal-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="modal wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {selectedGuest.firstName} {selectedGuest.lastName}
              </h3>
              <button className="close-btn" onClick={() => setIsDetailOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-content">
              <section className="guest-info-section">
                <h4>Personal Information</h4>
                <div className="info-grid">
                  <div>
                    <label>Email</label>
                    <p>{selectedGuest.email || "Not specified"}</p>
                  </div>
                  <div>
                    <label>Phone</label>
                    <p>{selectedGuest.phone || "Not specified"}</p>
                  </div>
                  <div>
                    <label>Nationality</label>
                    <p>{selectedGuest.nationality || "Not specified"}</p>
                  </div>
                  <div>
                    <label>ID Type</label>
                    <p>{selectedGuest.idType || "Not specified"}</p>
                  </div>
                  <div>
                    <label>ID Number</label>
                    <p>{selectedGuest.idNumber || "Not specified"}</p>
                  </div>
                </div>
              </section>

              <section className="guest-bookings-section">
                <h4>Booking History</h4>
                {selectedGuest.bookings?.length > 0 ? (
                  <table className="bookings-table">
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Room</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGuest.bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>{booking.id}</td>
                          <td>{booking.room}</td>
                          <td>{formatWithOrdinal(parseISO(booking.checkIn))}</td>
                          <td>{formatWithOrdinal(parseISO(booking.checkOut))}</td>
                          <td>
                            <span className={`booking-status ${booking.status.toLowerCase().replace(" ", "-")}`}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-bookings">No booking history available</p>
                )}
              </section>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setIsDetailOpen(false)}>
                Close
              </button>
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
}
