import { useEffect, useState } from "react";
import { FiPlus, FiEye, FiCalendar, FiUser, FiHome, FiSearch, FiFilter, FiPrinter } from "react-icons/fi";
import "./bookings.scss";
import axios from "../../api/axios";
import { format, parseISO } from "date-fns";
import { BASE_CURRENCY } from "../../constants/currency";
import { Alert, Snackbar } from "@mui/material";

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

const BookingCard = ({ booking, onAddService, onViewServices, hasServicesAvailable }) => {
  return (
    <div className="booking-card">
      <div className="booking-header">
        <div className="detail-row">
          <FiHome className="icon" />
          <span>
            {booking.roomType} - Room {booking.chargeCode} {booking.roomNumber}
          </span>
        </div>
        {booking.services.length > 0 ? (
          <div className="booking-actions">
            <button className="action-btn view-services" onClick={() => onViewServices(booking)}>
              <FiEye /> View {booking.services.length} Service(s)
            </button>
          </div>
        ) : (
          hasServicesAvailable && (
            <div className="booking-actions">
              <button className="action-btn view-services" onClick={() => onAddService(booking)}>
                <FiPlus /> Add Services
              </button>
            </div>
          )
        )}
      </div>

      <div className="booking-details">
        <div className="detail-row">
          <FiUser className="icon" />
          <span className="guest-name">{booking.guestName}</span>
        </div>
        <div className="detail-row">
          <FiCalendar className="icon" />
          <span>Booking No: {booking.bookingNumber}</span>
        </div>

        <div className="detail-row">
          <span>
            Guests: {booking.adults} Adult{booking.adults !== 1 ? "s" : ""}
          </span>
          {booking.children > 0 && (
            <span>
              , {booking.children} Child
              {booking.children !== 1 ? "ren" : ""}
            </span>
          )}
        </div>

        <div className="detail-row">
          <span>Checkin : {formatWithOrdinal(parseISO(booking.checkIn))}</span>
          <span>Checkout : {formatWithOrdinal(parseISO(booking.checkOut))}</span>
        </div>
      </div>
    </div>
  );
};

const CurrentDayBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [modalType, setModalType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: "",
    reservationNumber: "",
    roomType: "",
    status: "",
  });
  const [roomTypes, setRoomTypes] = useState([]);
  const [extraServices, setExtraServices] = useState([]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // can be 'error', 'warning', 'info', 'success'
  });

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

  const fetchPropertiesData = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error("Error fetching properties:", error);
      showSnackbar("Failed to load properties", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchExtraServices = async (propertyId = null) => {
    try {
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      const url = propertyId
        ? `pms/extra-services/getAll/${null}/${propertyId}`
        : `pms/extra-services/getAll/${userData.Group_ID}/${null}`;

      const res = await axios.get(url);
      setExtraServices(res.data);
    } catch (error) {
      console.error("Error fetching extra services:", error);
      setExtraServices([]);
      showSnackbar("Failed to load services", "error");
    }
  };

  useEffect(() => {
    fetchPropertiesData();
  }, []);

  useEffect(() => {
    const fetchTodayBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = new Date().toISOString().split("T")[0];
        const userData = JSON.parse(sessionStorage.getItem("userData"));
        const groupId = userData.Group_ID;

        let endpointUrl;
        if (selectedProperty) {
          endpointUrl = `pms/bookings/today/${selectedProperty}/null`;
          fetchExtraServices(selectedProperty);
        } else {
          endpointUrl = `pms/bookings/today/null/${groupId}`;
          fetchExtraServices();
        }

        const response = await axios.get(endpointUrl, {
          params: { date: today },
        });

        const todayBookings = response.data;
        setBookings(todayBookings);
        setFilteredBookings(todayBookings);

        const types = [...new Set(todayBookings.map((b) => b.roomType || ""))].filter((t) => t !== "");
        setRoomTypes(types);
      } catch (err) {
        const message = err.response?.data?.error || err.message || "Failed to fetch today's bookings";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayBookings();
  }, [selectedProperty]);

  useEffect(() => {
    if (selectedProperty) {
      fetchExtraServices();
    }
  }, [selectedProperty]);

  useEffect(() => {
    let results = [...bookings];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      results = results.filter(
        (booking) => booking.guestName.toLowerCase().includes(term) || booking.roomNumber.toLowerCase().includes(term),
      );
    }

    if (filters.roomType) {
      results = results.filter((booking) => booking.roomType === filters.roomType);
    }

    if (filters.status) {
      results = results.filter((booking) => booking.status === filters.status);
    }

    setFilteredBookings(results);
  }, [bookings, filters]);

  const handleViewServices = (booking) => {
    setSelectedBooking(booking);
    setModalType("view");
  };

  const handleAddService = (booking) => {
    setSelectedBooking(booking);
    setModalType("add");
  };

  const handleSaveService = (booking, serviceId, serviceDate) => {
    try {
      const selectedService = extraServices.find((s) => s.id === serviceId);
      if (!selectedService) {
        showSnackbar("Service not found", "error");
        return;
      }

      const newService = {
        id: Date.now(),
        name: selectedService.service_name,
        price: selectedService.price,
        date: serviceDate,
        serviceId: selectedService.id,
      };

      const updatedBookings = bookings.map((b) =>
        b.id === booking.id ? { ...b, services: [...b.services, newService] } : b,
      );

      setBookings(updatedBookings);
      setFilteredBookings(updatedBookings.filter((b) => filteredBookings.some((fb) => fb.id === b.id)));

      showSnackbar("Service added successfully!");
    } catch (error) {
      console.error("Error adding service:", error);
      showSnackbar("Failed to add service", "error");
    }
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setModalType(null);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) return <div>Loading bookings...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <section className="content-area-table">
      <h4 className="data-table-title">Today's Room Bookings - (All bookings made today)</h4>
      <div className="data-table-actions" style={{ marginLeft: "20px" }}>
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
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            name="searchTerm"
            placeholder="Search by guest or room..."
            value={filters.searchTerm}
            onChange={handleFilterChange}
          />
        </div>

        <div className="filter-dropdown">
          <FiFilter className="filter-icon" />
          <select name="roomType" value={filters.roomType} onChange={handleFilterChange} className="styled-select">
            <option value="">All Room Types</option>
            {roomTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-dropdown">
          <FiFilter className="filter-icon" />
          <select name="status" value={filters.status} onChange={handleFilterChange} className="styled-select">
            <option value="">All Statuses</option>
            <option value="Checked In">Checked In</option>
            <option value="Checked Out">Checked Out</option>
            <option value="Confirmed">Upcoming</option>
          </select>
        </div>

        <button className="export-btn">
          <FiPrinter /> Export
        </button>
      </div>

      <section className="bookings-container">
        {filteredBookings.length > 0 ? (
          <div className="bookings-grid">
            {filteredBookings.map((booking) => {
              const servicesAvailableForProperty = extraServices.some(
                (service) => service.property_id === booking.property_id,
              );

              return (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onViewServices={handleViewServices}
                  onAddService={handleAddService}
                  hasServicesAvailable={servicesAvailableForProperty}
                />
              );
            })}
          </div>
        ) : (
          <div className="no-results">No bookings found for today that match your filter criteria.</div>
        )}

        {modalType === "view" && selectedBooking && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Services for {selectedBooking.guestName}</h3>
                <button className="close-btn" onClick={closeModal}>
                  &times;
                </button>
              </div>
              <div className="modal-content">
                {selectedBooking.services.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBooking.services.map((service) => (
                        <tr key={service.id}>
                          <td>{service.name}</td>
                          <td>
                            {BASE_CURRENCY}
                            {service.price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-services">No services booked for this stay</p>
                )}
              </div>
              <div className="modal-actions">
                <button
                  className="add-service-btn"
                  onClick={() => {
                    closeModal();
                    handleAddService(selectedBooking);
                  }}
                >
                  <FiPlus /> Add New Service
                </button>
                <button className="cancel-btn" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {modalType === "add" && selectedBooking && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Add Service for {selectedBooking.guestName}</h3>
                <button className="close-btn" onClick={closeModal}>
                  &times;
                </button>
              </div>
              <div className="modal-content">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const serviceId = formData.get("service");
                    const serviceDate = formData.get("serviceDate");
                    handleSaveService(selectedBooking, serviceId, serviceDate);
                    closeModal();
                  }}
                >
                  <div className="form-group">
                    <label>Service</label>
                    <select required>
                      <option value="">Select a service</option>
                      {extraServices.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.service_name} ({BASE_CURRENCY} {service.price})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Service Date</label>
                    <input type="date" required min={selectedBooking.checkIn} max={selectedBooking.checkOut} />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="save-btn">
                      Save Service
                    </button>
                    <button type="button" className="cancel-btn" onClick={closeModal}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </section>
      {/* Snackbar Notification */}
      {snackbar.open && (
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
      )}
    </section>
  );
};

export default CurrentDayBookings;
