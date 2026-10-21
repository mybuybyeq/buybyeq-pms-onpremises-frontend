import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "../../../api/axios";
import {
  FiFilter,
  FiChevronDown,
  FiTool,
  FiSearch,
  FiLoader,
  FiX,
  FiPrinter,
  FiUsers,
} from "react-icons/fi";
import {
  FiPlus,
  FiSave,
  FiCreditCard,
  FiDollarSign,
  FiEdit,
  FiTag,
} from "react-icons/fi";
import {
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
  LinearProgress,
} from "@mui/material";
import {
  format,
  parseISO,
  addDays,
  isEqual,
  isAfter,
  isBefore,
} from "date-fns";
import "./room-rack.scss";
import "../../guests/guest.scss";
import { BASE_CURRENCY } from "../../../constants/currency";
import { TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import GroupBookingModal from "../group-booking-modal/group-booking-modal";

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

const timeOptions = new Array(24 * 2).fill(0).map(
  (_, i) =>
    `${String(Math.floor((i > 24 ? i - 24 : i) / 2))
      .padStart(2, "0")
      .replace(/^00/, "12")}:${i % 2 === 0 ? "00" : "30"} ${Math.floor(i / 2) < 12 ? "AM" : "PM"
    }`,
);

const toTimeInputValue = (value, fallback = "") => {
  const source = String(value || fallback || "");
  return source ? source.slice(0, 5) : "";
};

const toTimePickerDate = (value, fallback = "00:00") => {
  const normalized = toTimeInputValue(value, fallback) || fallback;
  return new Date(`1970-01-01T${normalized}:00`);
};

const FiveMinuteTimePicker = ({ id, value, fallback, onChange }) => (
  <LocalizationProvider dateAdapter={AdapterDateFns}>
    <TimePicker
      ampm
      closeOnSelect={false}
      format="hh:mm a"
      id={id}
      minutesStep={5}
      views={["hours", "minutes"]}
      value={toTimePickerDate(value, fallback)}
      onChange={(newValue) => {
        if (newValue) onChange(format(newValue, "HH:mm"));
      }}
      slotProps={{
        textField: {
          fullWidth: true,
          size: "small",
        },
      }}
    />
  </LocalizationProvider>
);

const PaymentModal = ({
  selectedBooking,
  onClose,
  onPaymentComplete,
}) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  //const [amount, setAmount] = useState(booking.totalAmount - booking.totalPaid);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [processing, setProcessing] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [editServiceQuantity, setEditServiceQuantity] = useState(1);
  const [editingRoom, setEditingRoom] = useState(null);
  const [discountingRoom, setDiscountingRoom] = useState(null);
  const [editRoomPrice, setEditRoomPrice] = useState("");
  const [showRoomDiscountModal, setShowRoomDiscountModal] = useState(false);
  const [roomDiscountType, setRoomDiscountType] = useState("flat"); // "flat" or "percent"
  const [roomDiscountValue, setRoomDiscountValue] = useState(0);
  const [roomDiscountLoading, setRoomDiscountLoading] = useState(false);
  const [discountingService, setDiscountingService] = useState(null);
  const [serviceDiscountType, setServiceDiscountType] = useState("flat"); // "flat" | "percent"
  const [serviceDiscountValue, setServiceDiscountValue] = useState(0);
  const [isDiscountingService, setIsDiscountingService] = useState(false);
  const [roomDiscountNote, setRoomDiscountNote] = useState("");
  const [showAllRoomsDiscountModal, setShowAllRoomsDiscountModal] =
    useState(false);
  const [allRoomsDiscountType, setAllRoomsDiscountType] = useState("flat");
  const [allRoomsDiscountValue, setAllRoomsDiscountValue] = useState(0);
  const [allRoomsDiscountNote, setAllRoomsDiscountNote] = useState("");
  const [allRoomsDiscountLoading, setAllRoomsDiscountLoading] =
    useState(false);
  const [globalDiscountType, setGlobalDiscountType] = useState("flat");
  const [globalDiscountValue, setGlobalDiscountValue] = useState(0);
  const [globalDiscountNote, setGlobalDiscountNote] = useState("");
  const [isApplyingGlobalDiscount, setIsApplyingGlobalDiscount] =
    useState(false);
  const [serviceDiscountNote, setServiceDiscountNote] = useState("");
  const [amount, setAmount] = useState(0);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [igstMode, setIgstMode] = useState(false);
  const [gstLoading, setGstLoading] = useState(false);

  useEffect(() => {
    if (booking) {
      setAmount(Math.max(0, booking.balanceDue));
    }
  }, [booking]);

  const fetchPaymentDetail = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const res = await axios.get(`pms/guests/payment2/${selectedBooking.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setBooking(res.data);
      const isGstApplied = Number(res.data.is_gst_applied || 0) === 1;
      setGstEnabled(isGstApplied);
      setIgstMode(isGstApplied && Number(res.data.is_igst || 0) === 1);
    } catch (err) {
      console.error("Failed to fetch payment detail", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };
  useEffect(() => {
    fetchPaymentDetail();
  }, []);
  const handleRefresh = async () => {
    await fetchPaymentDetail(false);
  };
  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-content">
            <p>Loading booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const globalDiscountBase =
    Number(booking.roomSubtotal || 0) + Number(booking.serviceSubtotal || 0);
  const computedGlobalDiscount =
    globalDiscountType === "percent"
      ? (globalDiscountBase * globalDiscountValue) / 100
      : globalDiscountValue;
  const clampedGlobalDiscount = Math.min(
    globalDiscountBase,
    Math.max(0, computedGlobalDiscount),
  );

  const handleApplyGlobalDiscount = async () => {
    setIsApplyingGlobalDiscount(true);

    try {
      await axios.put(`/pms/reservations/discount/${booking.id}`, {
        discountAmount: clampedGlobalDiscount,
        discount_type:
          globalDiscountType === "percent" ? "percentage" : "fixed",
        discount_value: globalDiscountValue,
        discount_note: globalDiscountNote,
      });

      alert("Global discount applied successfully!");
      setGlobalDiscountValue(0);
      setGlobalDiscountNote("");
      await handleRefresh();
    } catch (error) {
      console.error("Failed to apply global discount:", error);
      alert(
        error.response?.data?.error ||
        "Failed to apply global discount.",
      );
    } finally {
      setIsApplyingGlobalDiscount(false);
    }
  };

  const handleEditRoom = (room = booking.rooms?.[0]) => {
    if (!room) return;
    setDiscountingService(null);
    setDiscountingRoom(null);
    setEditingService(null);
    setShowRoomDiscountModal(false);
    setShowAllRoomsDiscountModal(false);
    setEditingRoom({
      id: room.id,
      name: `${room.chargeCode}${room.roomNumber} - ${room.roomType}`,
      baseRate: room.baseRate,
    });
    setEditRoomPrice(room.baseRate);
  };

  const handleSubmitRoomEdit = async () => {
    try {
      await axios.put(`/pms/reservationRooms/edit/${booking.id}`, {
        rate: parseFloat(editRoomPrice),
        reservation_room_id: editingRoom.id,
      });

      alert("Room rate updated successfully!");
      setEditingRoom(null);
      await handleRefresh();
    } catch (error) {
      console.error("Failed to update room rate:", error);
      alert("Failed to update room rate.");
    }
  };

  const handleEditService = (service) => {
    setDiscountingService(null);
    setDiscountingRoom(null);
    setEditingRoom(null);
    setShowRoomDiscountModal(false);
    setShowAllRoomsDiscountModal(false);
    setEditingService(service);
    setEditPrice(service.price + service.discount || 0);
    setEditServiceQuantity(service.quantity || 1);
  };

  const handleSubmitEdit = async () => {
    try {
      await axios.put(
        `/pms/editByService/${editingService.reservation_id}/${editingService.reservationServiceId}`,
        {
          rate:
            parseFloat(editPrice) - parseFloat(editingService.discount || 0),
          quantity: editServiceQuantity,
          service_date: format(parseISO(editingService.date), "yyyy-MM-dd"),
        },
      );

      alert("Service updated successfully!");
      setEditingService(null);
      await handleRefresh();
    } catch (error) {
      console.error("Failed to update service:", error);
      alert(
        error.response?.data?.error ||
        "Failed to update service. Please try again.",
      );
    }
  };

  const handleDeleteService = async (serviceId, reservationId) => {
    if (!window.confirm("Are you sure you want to delete this service?"))
      return;

    try {
      await axios.delete(
        `/pms/reservationServices/deleteByService/${reservationId}/${serviceId}`,
      );
      alert("Service deleted successfully!");
      await handleRefresh();
    } catch (error) {
      console.error("Failed to delete service:", error);
      alert("Failed to delete service.");
    }
  };

  const handleAddServiceClick = async () => {
    try {
      const response = await axios.get(
        `pms/extra-services/getAll/${null}/${booking.property_id}`,
      );
      setAvailableServices(response.data || []);
      setShowServiceModal(true);
    } catch (error) {
      console.error("Failed to fetch extra services", error);
      alert("Could not load extra services.");
    }
  };

  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, { ...service, quantity: 1 }],
    );
  };

  const updateSelectedServiceQuantity = (serviceId, quantity) => {
    setSelectedServices((prev) =>
      prev.map((service) =>
        service.id === serviceId
          ? { ...service, quantity: Math.max(1, Number(quantity) || 1) }
          : service,
      ),
    );
  };

  const handleAddServices = async () => {
    try {
      for (const service of selectedServices) {
        const servicePayload = {
          reservation_id: booking.id,
          service_id: service.id,
          quantity: service.quantity || 1,
          service_date: new Date().toISOString().split("T")[0],
          rate: service.price,
          notes: "",
          base_rate: service.price,
        };
        await axios.post("pms/reservationServices/addLater", servicePayload);
      }

      alert("Services added successfully!");
      setShowServiceModal(false);
      setSelectedServices([]);

      await handleRefresh();
    } catch (error) {
      console.error("Failed to add services:", error);
      alert("Failed to add services. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const response = await axios.post(`/pms/bookings/payment/${booking.id}`, {
        amount: amount,
        payment_method: paymentMethod,
        transaction_reference: `PAY-${Date.now()}`,
        notes: `Payment for booking ${booking.bookingNumber}`,
      });
      // sendEmail({
      //   reservationId: booking.id,
      //   templateType: 'PAYMENT_RECEIPT'
      // });
      onPaymentComplete(
        booking.id,
        amount,
        paymentMethod,
        response.data.reservation.total_paid,
        response.data.reservation.balance_due <= 0 ? "Paid" : "Partial",
      );
      onClose();
    } catch (error) {
      console.error("Payment failed:", error);
      alert(error.response?.data?.error || "Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleGst = async () => {
    const newValue = !gstEnabled;
    setGstLoading(true);

    try {
      const response = await axios.post(`/pms/bookings/add_gst/${booking.id}`, {
        enable_gst: newValue,
        is_igst: newValue ? igstMode : false,
      });

      setGstEnabled(newValue);

      if (response.data?.reservation) await fetchPaymentDetail(false);
    } catch (error) {
      console.error("Failed to toggle GST:", error);
      alert("Failed to update GST. Please try again.");
    } finally {
      setGstLoading(false);
    }
  };
  const handleTaxModeChange = async (nextIgstMode) => {
    if (!gstEnabled || gstLoading) return;
    setGstLoading(true);

    try {
      await axios.post(`/pms/bookings/add_gst/${booking.id}`, {
        enable_gst: true,
        is_igst: nextIgstMode,
      });
      setIgstMode(nextIgstMode);
      await fetchPaymentDetail(false);
    } catch (error) {
      console.error("Failed to update GST mode:", error);
      alert("Failed to update GST mode. Please try again.");
    } finally {
      setGstLoading(false);
    }
  };
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h4>Process Payment for {booking.guestName}</h4>
          <button className="close-btn" onClick={onClose} disabled={processing}>
            &times;
          </button>
        </div>

        <div className="modal-content">
          <div className="payment-info">
            <div className="info-row">
              <span>Booking Number:</span>
              <span>{booking.bookingNumber}</span>
            </div>
            <div className="info-row">
              <span>Overall stay:</span>
              <span>{booking.noOfDays} day(s)</span>
            </div>

            {false && (
              <div
                className="info-row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span>
                    Room Price: {BASE_CURRENCY}
                    {booking.roomRate + booking.roomDiscount}
                  </span>
                  <button
                    onClick={handleEditRoom}
                    className="icon-button"
                    title="Edit Room Rate"
                  >
                    ✏️
                  </button>
                </div>

                <div className="form-group">
                  <button
                    className="submit-btn"
                    onClick={() => {
                      const room = booking.rooms?.[0];
                      if (!room) return;
                      setEditingRoom({
                        id: room.id,
                        name: `${room.chargeCode}${room.roomNumber} - ${room.roomType}`,
                        baseRate: room.baseRate,
                      });
                      setShowRoomDiscountModal(true);
                      setRoomDiscountType("flat");
                      setRoomDiscountValue(0);
                    }}
                  // disabled={editRoomPrice !== ''}
                  >
                    Apply Discount
                  </button>
                </div>
              </div>
            )}
          </div>
          <section className="payment-breakdown-section">
            <div className="payment-section-heading">
              <strong>Room charges</strong>
              <button
                type="button"
                className="submit-btn"
                onClick={() => {
                  setAllRoomsDiscountType("flat");
                  setAllRoomsDiscountValue(0);
                  setAllRoomsDiscountNote("");
                  setShowAllRoomsDiscountModal(true);
                }}
              >
                Discount All Rooms
              </button>
              <span>Daily rate × charged days</span>
            </div>
            <div className="payment-room-table">
              <div className="payment-room-row payment-room-head">
                <span>Room and period</span>
                <span>Daily rate</span>
                <span>Days</span>
                <span>Amount</span>
                <span>Actions</span>
              </div>
              {booking.rooms?.map((room) => (
                <div className="payment-room-row" key={room.id}>
                  <span>
                    <strong>{room.chargeCode}{room.roomNumber}</strong>
                    <small>{room.roomType}{room.isAc ? " · AC" : ""}</small>
                    <small>{room.checkIn} to {room.checkOut}</small>
                    {Number(room.totalDiscount || 0) > 0 && (
                      <small>
                        Original {BASE_CURRENCY}{Number(room.originalRate || 0).toFixed(2)}
                        {" / "}Discount {BASE_CURRENCY}{Number(room.totalDiscount || 0).toFixed(2)}
                        {room.discountType === "percentage" && room.discountValue
                          ? ` (${room.discountValue}%)`
                          : ""}
                      </small>
                    )}
                  </span>
                  <span>{BASE_CURRENCY}{room.baseRate.toFixed(2)}</span>
                  <span>{room.days}</span>
                  <span><strong>{BASE_CURRENCY}{room.total.toFixed(2)}</strong></span>
                  <span className="payment-room-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleEditRoom(room)}
                      title="Edit daily room rate"
                    >
                      <FiEdit />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        setEditingRoom(null);
                        setEditingService(null);
                        setDiscountingService(null);
                        setShowAllRoomsDiscountModal(false);
                        setDiscountingRoom({
                          id: room.id,
                          name: `${room.chargeCode}${room.roomNumber} - ${room.roomType}`,
                          baseRate: room.baseRate,
                          days: room.days,
                        });
                        setShowRoomDiscountModal(true);
                        setRoomDiscountType(
                          room.discountType === "percentage" ? "percent" : "flat",
                        );
                        setRoomDiscountValue(
                          room.discountType === "percentage"
                            ? Number(room.discountValue || 0)
                            : Number(room.discountValue || room.totalDiscount || 0),
                        );
                        setRoomDiscountNote(room.discountNote || "");
                      }}
                      title="Apply room discount"
                    >
                      <FiTag />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>
          {/* Services Header with Icons */}
          <div
            className="info-row service-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
            }}
          >
            <strong>Services</strong>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="icon-button"
                onClick={handleAddServiceClick}
              >
                <FiPlus />
              </button>
            </div>
          </div>

          {/* Service List */}
          {booking.services?.length > 0 ? (
            <ul
              className="service-list"
              style={{ paddingLeft: "16px", marginTop: "8px" }}
            >
              {booking.services.map((service) => (
                <li
                  key={service.reservationServiceId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <span>
                    {service.name} · Qty: {service.quantity || 1} ·{" "}
                    <strong>
                      {BASE_CURRENCY}
                      {Number(service.total || service.price).toFixed(2)}
                    </strong>
                    {service.date
                      ? ` (${format(parseISO(service.date), "dd MMM yyyy")})`
                      : ""}
                  </span>
                  <span style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => handleEditService(service)}
                      className="icon-button"
                      title="Edit"
                    >
                      <FiEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteService(
                          service.reservationServiceId,
                          service.reservation_id,
                        )
                      }
                      className="icon-button"
                      title="Delete"
                    >
                      🗑️
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingService(null);
                        setEditingRoom(null);
                        setDiscountingRoom(null);
                        setShowRoomDiscountModal(false);
                        setShowAllRoomsDiscountModal(false);
                        setDiscountingService(service);
                        setServiceDiscountType("flat");
                        setServiceDiscountValue(0);
                        setServiceDiscountNote("");
                      }}
                      className="icon-button"
                      title="Discount"
                    >
                      <FiTag />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontStyle: "italic", color: "#777" }}>
              No services added.
            </p>
          )}
          <hr style={{ margin: "16px 0" }} />
          <section className="payment-breakdown-section" style={{ "padding": "10px" }}>
            <div className="payment-section-heading">
              <strong>Discount</strong>
            </div>
            <div className="info-row "  >
              <label>
                <strong>Discount Type:</strong>
              </label>
              <select
                value={globalDiscountType}
                onChange={(event) =>
                  setGlobalDiscountType(event.target.value)
                }
                style={{ marginLeft: "10px" }}
              >
                <option value="flat">Fixed Amount</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>
            <div className="info-row">
              <label>
                <strong>
                  Discount{" "}
                  {globalDiscountType === "percent"
                    ? "(%)"
                    : `(${BASE_CURRENCY})`}
                  :
                </strong>
              </label>
              <input
                type="number"
                min="0"
                max={
                  globalDiscountType === "percent"
                    ? 100
                    : globalDiscountBase
                }
                value={globalDiscountValue}
                onChange={(event) =>
                  setGlobalDiscountValue(
                    parseFloat(event.target.value) || 0,
                  )
                }
                style={{ marginLeft: "10px", width: "100px" }}
              />
            </div>
            <div className="form-group">
              <label>Note (optional, max 90 chars)</label>
              <input
                type="text"
                maxLength="90"
                value={globalDiscountNote}
                onChange={(event) =>
                  setGlobalDiscountNote(event.target.value)
                }
                placeholder="Enter global discount reason"
              />
            </div>
            {clampedGlobalDiscount > 0 && (
              <div className="info-row">
                <span>Discount to apply:</span>
                <span>
                  {BASE_CURRENCY}
                  {clampedGlobalDiscount.toFixed(2)}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "8px",
              }}
            >
              <button
                type="button"
                className="submit-btn"
                onClick={handleApplyGlobalDiscount}
                disabled={
                  isApplyingGlobalDiscount ||
                  clampedGlobalDiscount <= 0 ||
                  globalDiscountBase <= 0
                }
              >
                {isApplyingGlobalDiscount
                  ? "Applying..."
                  : "Apply Global Discount"}
              </button>
            </div>
          </section>
          {editingRoom && (
            <div className="modal-overlay">
              <div className="modal small-modal">
                <div className="modal-header">
                  <h4>Edit Room Price</h4>
                  <button
                    className="close-btn"
                    onClick={() => setEditingRoom(null)}
                  >
                    &times;
                  </button>
                </div>
                <div className="modal-content">
                  <div className="form-group">
                    <label>Room</label>
                    <input type="text" value={editingRoom.name} disabled />
                  </div>
                  <div className="form-group">
                    <label>New Rate</label>
                    <input
                      type="number"
                      value={editRoomPrice}
                      onChange={(e) => setEditRoomPrice(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div
                    className="modal-actions"
                    style={{ display: "flex", justifyContent: "flex-end" }}
                  >
                    <button
                      className="cancel-btn"
                      onClick={() => setEditingRoom(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="submit-btn"
                      onClick={handleSubmitRoomEdit}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showAllRoomsDiscountModal && (
            <div className="modal-overlay">
              <div className="modal small-modal">
                <div className="modal-header">
                  <h4>Discount All Rooms</h4>
                  <button
                    className="close-btn"
                    onClick={() => setShowAllRoomsDiscountModal(false)}
                  >
                    &times;
                  </button>
                </div>
                <div className="modal-content">
                  <div className="form-group">
                    <label>Discount Type</label>
                    <select
                      value={allRoomsDiscountType}
                      onChange={(event) =>
                        setAllRoomsDiscountType(event.target.value)
                      }
                    >
                      <option value="flat">Fixed Total Amount</option>
                      <option value="percent">Percentage</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      Discount Value{" "}
                      {allRoomsDiscountType === "percent"
                        ? "(%)"
                        : `(${BASE_CURRENCY})`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={
                        allRoomsDiscountType === "percent"
                          ? 100
                          : booking.rooms.reduce(
                            (sum, room) => sum + room.total,
                            0,
                          )
                      }
                      value={allRoomsDiscountValue}
                      onChange={(event) =>
                        setAllRoomsDiscountValue(
                          Number(event.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Note</label>
                    <input
                      type="text"
                      maxLength="100"
                      value={allRoomsDiscountNote}
                      onChange={(event) =>
                        setAllRoomsDiscountNote(event.target.value)
                      }
                      placeholder="Reason for all-room discount"
                    />
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => setShowAllRoomsDiscountModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="submit-btn"
                      disabled={
                        allRoomsDiscountLoading ||
                        allRoomsDiscountValue <= 0
                      }
                      onClick={async () => {
                        try {
                          setAllRoomsDiscountLoading(true);
                          await axios.put(
                            `/pms/reservationRooms/discount-all/${booking.id}`,
                            {
                              discount_type:
                                allRoomsDiscountType === "percent"
                                  ? "percentage"
                                  : "fixed",
                              discount_value: allRoomsDiscountValue,
                              note: allRoomsDiscountNote,
                            },
                          );
                          setShowAllRoomsDiscountModal(false);
                          await handleRefresh();
                        } catch (error) {
                          alert(
                            error.response?.data?.error ||
                            "Failed to discount all rooms.",
                          );
                        } finally {
                          setAllRoomsDiscountLoading(false);
                        }
                      }}
                    >
                      {allRoomsDiscountLoading
                        ? "Applying..."
                        : "Apply to All Rooms"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showRoomDiscountModal && (
            <div className="modal-overlay">
              <div className="modal small-modal">
                <div className="modal-header">
                  <h4>Apply Room Discount</h4>
                  <button
                    className="close-btn"
                    onClick={() => {
                      setShowRoomDiscountModal(false);
                      setDiscountingRoom(null);
                    }}
                  >
                    &times;
                  </button>
                </div>

                <div className="modal-content">
                  <div className="form-group">
                    <label>Discount Type</label>
                    <select
                      value={roomDiscountType}
                      onChange={(e) => setRoomDiscountType(e.target.value)}
                    >
                      <option value="flat">Fixed Total Amount</option>
                      <option value="percent">Percentage</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Discount Value{" "}
                      {roomDiscountType === "percent"
                        ? "(%)"
                        : `(${BASE_CURRENCY})`}
                    </label>
                    <input
                      type="number"
                      value={roomDiscountValue}
                      min="0"
                      max={
                        roomDiscountType === "percent"
                          ? 100
                          : (discountingRoom?.baseRate || 0) *
                          (discountingRoom?.days || 1)
                      }
                      onChange={(e) =>
                        setRoomDiscountValue(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Note (optional, max 90 chars)</label>
                    <input
                      type="text"
                      maxLength="90"
                      value={roomDiscountNote}
                      onChange={(e) => setRoomDiscountNote(e.target.value)}
                      placeholder="Enter a note about the discount"
                    />
                  </div>

                  <div
                    className="modal-actions"
                    style={{ display: "flex", justifyContent: "flex-end" }}
                  >
                    <button
                      className="cancel-btn"
                      onClick={() => {
                        setShowRoomDiscountModal(false);
                        setDiscountingRoom(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="submit-btn"
                      onClick={async () => {
                        setRoomDiscountLoading(true);
                        const discountAmount =
                          roomDiscountType === "percent"
                            ? ((discountingRoom?.baseRate || 0) *
                              roomDiscountValue) /
                            100
                            : roomDiscountValue /
                            Math.max(1, discountingRoom?.days || 1);

                        try {
                          await axios.put(
                            `pms/reservationRooms/discount/${booking.id}`,
                            {
                              reservation_room_id: discountingRoom.id,
                              rate: Math.max(
                                0,
                                discountingRoom.baseRate - discountAmount,
                              ),
                              discount_type:
                                roomDiscountType === "percent"
                                  ? "percentage"
                                  : "fixed",
                              discount_value: roomDiscountValue,
                              note: roomDiscountNote || "",
                            },
                          );

                          alert("Room discount applied successfully!");
                          setShowRoomDiscountModal(false);
                          setDiscountingRoom(null);
                          setRoomDiscountValue(0);
                          setRoomDiscountType("flat");
                          setEditRoomPrice("");
                          setRoomDiscountNote("");
                          await handleRefresh();
                        } catch (error) {
                          console.error("Discount failed:", error);
                          alert("Failed to apply room discount.");
                        } finally {
                          setRoomDiscountLoading(false);
                        }
                      }}
                      disabled={roomDiscountValue <= 0}
                    >
                      {roomDiscountLoading ? "Applying..." : "Apply Discount"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {discountingService && (
            <div className="modal-overlay">
              <div className="modal small-modal">
                <div className="modal-header">
                  <h4>Discount for: {discountingService.name}</h4>
                  <button
                    className="close-btn"
                    onClick={() => setDiscountingService(null)}
                  >
                    &times;
                  </button>
                </div>
                <div className="modal-content">
                  <div className="form-group">
                    <label>Discount Type</label>
                    <select
                      value={serviceDiscountType}
                      onChange={(e) => setServiceDiscountType(e.target.value)}
                    >
                      <option value="flat">Flat Amount</option>
                      <option value="percent">Percentage</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Discount Value{" "}
                      {serviceDiscountType === "percent"
                        ? "(%)"
                        : `(${BASE_CURRENCY})`}
                    </label>
                    <input
                      type="number"
                      value={serviceDiscountValue}
                      min="0"
                      max={
                        serviceDiscountType === "percent"
                          ? 100
                          : parseFloat(discountingService.price)
                      }
                      onChange={(e) =>
                        setServiceDiscountValue(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Note (optional, max 90 chars)</label>
                    <input
                      type="text"
                      maxLength="90"
                      value={serviceDiscountNote}
                      onChange={(e) => setServiceDiscountNote(e.target.value)}
                      placeholder="Enter discount reason"
                    />
                  </div>

                  <div
                    className="modal-actions"
                    style={{ display: "flex", justifyContent: "flex-end" }}
                  >
                    <button
                      className="cancel-btn"
                      onClick={() => setDiscountingService(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="submit-btn"
                      onClick={async () => {
                        setIsDiscountingService(true);
                        const originalRate = parseFloat(
                          discountingService.price,
                        );
                        const discountAmount =
                          serviceDiscountType === "percent"
                            ? (originalRate * serviceDiscountValue) / 100
                            : serviceDiscountValue;
                        const newRate = Math.max(
                          0,
                          originalRate - discountAmount,
                        );

                        try {
                          await axios.put(
                            `/pms/discountByService/${booking.id}/${discountingService.reservationServiceId}`,
                            {
                              rate: newRate,
                              discount_type:
                                serviceDiscountType === "percent"
                                  ? "percentage"
                                  : "fixed",
                              discount_value: serviceDiscountValue,
                              note: serviceDiscountNote || "",
                            },
                          );
                          alert("Service discount applied successfully!");
                          setDiscountingService(null);
                          setServiceDiscountValue(0);
                          setServiceDiscountNote("");
                          await handleRefresh();
                        } catch (error) {
                          console.error(
                            "Failed to apply service discount:",
                            error,
                          );
                          alert("Failed to apply discount.");
                        } finally {
                          setIsDiscountingService(false);
                        }
                      }}
                      disabled={serviceDiscountValue <= 0}
                    >
                      {isDiscountingService ? "Applying..." : "Apply Discount"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="gst-row">
            <div className="gst-label">
              <strong>Apply GST</strong>
              <small className="gst-note">
                GST is calculated only on room charges. Service charges are excluded.
              </small>
            </div>

            <div className="gst-toggle">
              {gstLoading && <span className="gst-loading">Updating…</span>}

              <label className="gst-switch">
                <input
                  type="checkbox"
                  checked={gstEnabled}
                  onChange={handleToggleGst}
                  disabled={gstLoading}
                />
                <span className="gst-slider"></span>
              </label>
            </div>
          </div>

          {gstEnabled && (
            <div className="gst-row">
              <div className="gst-label">
                <strong>GST Type</strong>
                <small className="gst-note">Choose normal GST or IGST for this reservation</small>
              </div>
              <div className="gst-toggle" style={{ gap: "8px" }}>
                <button
                  type="button"
                  className={igstMode ? "cancel-btn" : "submit-btn"}
                  onClick={() => handleTaxModeChange(false)}
                  disabled={gstLoading}
                >
                  CGST/SGST
                </button>
                <button
                  type="button"
                  className={igstMode ? "submit-btn" : "cancel-btn"}
                  onClick={() => handleTaxModeChange(true)}
                  disabled={gstLoading}
                >
                  IGST
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          <hr style={{ margin: "16px 0" }} />
          {gstEnabled && !igstMode && (
            <div className="info-row">
              <span>CGST:</span>
              <span>
                {BASE_CURRENCY}
                {(parseFloat(booking.cgst) || 0).toFixed(2)}
              </span>
            </div>
          )}

          {gstEnabled && !igstMode && (
            <div className="info-row">
              <span>SGST:</span>
              <span>
                {BASE_CURRENCY}
                {(parseFloat(booking.sgst) || 0).toFixed(2)}
              </span>
            </div>
          )}
          {gstEnabled && igstMode && (
            <div className="info-row">
              <span>IGST:</span>
              <span>
                {BASE_CURRENCY}
                {(parseFloat(booking.igst) || 0).toFixed(2)}
              </span>
            </div>
          )}
          <div className="info-row">
            <span>
              <strong>Subtotal:</strong>
            </span>
            <span>
              <strong>
                {BASE_CURRENCY}
                {booking.totalAmount.toFixed(2)}
              </strong>
            </span>
          </div>

          <div className="info-row">
            <span>Paid:</span>
            <span>
              {BASE_CURRENCY}
              {booking.totalPaid.toFixed(2)}
            </span>
          </div>
          <div className="info-row">
            <span>Balance Due:</span>
            <span>
              <strong>
                {BASE_CURRENCY}
                {booking.balanceDue.toFixed(2)}
              </strong>
            </span>
          </div>
          {booking.payments?.length > 0 && (
            <section className="payment-history">
              <div className="payment-section-heading">
                <strong>Transaction history</strong>
                <span>{booking.payments.length} transaction(s)</span>
              </div>
              {booking.payments.map((payment) => (
                <div className="payment-history-row" key={payment.id}>
                  <span>
                    <strong>{payment.method}</strong>
                    <small>
                      {payment.date
                        ? format(new Date(payment.date), "dd MMM yyyy, hh:mm a")
                        : ""}
                    </small>
                  </span>
                  <span>{payment.reference || "-"}</span>
                  <strong>{BASE_CURRENCY}{payment.amount.toFixed(2)}</strong>
                </div>
              ))}
            </section>
          )}
          <form onSubmit={handleSubmit} className="payment-form">
            <div className="form-group">
              <label>Payment Amount</label>
              <div className="input-with-icon">
                <FiDollarSign className="input-icon" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  min="0.01"
                  max={booking.balanceDue}
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <div className="input-with-icon">
                <FiCreditCard className="input-icon" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={onClose}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={
                  processing || booking.balanceDue <= 0
                }
              >
                {processing ? "Processing..." : "Process Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
      {showServiceModal && (
        <div className="modal-overlay">
          <div className="modal small-modal">
            <div className="modal-header">
              <h4>Select Extra Services</h4>
              <button
                className="close-btn"
                onClick={() => setShowServiceModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="modal-content">
              {availableServices.map((service) => {
                const isSelected = selectedServices.some(
                  (s) => s.id === service.id,
                );
                const isAlreadyAdded = booking.services?.some(
                  (s) => s.service_id === service.id || s.id === service.id,
                );

                return (
                  <li
                    key={service.id}
                    onClick={() => {
                      if (!isAlreadyAdded) toggleService(service);
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 16px",
                      border: `2px solid ${isAlreadyAdded
                        ? "#ccc"
                        : isSelected
                          ? "#007bff"
                          : "#e0e0e0"
                        }`,
                      borderRadius: "8px",
                      marginBottom: "10px",
                      backgroundColor: isAlreadyAdded
                        ? "#f0f0f0"
                        : isSelected
                          ? "#e6f2ff"
                          : "#f9f9f9",
                      cursor: isAlreadyAdded ? "not-allowed" : "pointer",
                      opacity: isAlreadyAdded ? 0.5 : 1,
                      fontSize: "15px",
                    }}
                  >
                    <span>{service.service_name}</span>
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      {isSelected && (
                        <label
                          style={{ display: "flex", alignItems: "center", gap: 5 }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          Qty
                          <input
                            type="number"
                            min="1"
                            value={
                              selectedServices.find(
                                (item) => item.id === service.id,
                              )?.quantity || 1
                            }
                            onChange={(event) =>
                              updateSelectedServiceQuantity(
                                service.id,
                                event.target.value,
                              )
                            }
                            style={{ width: 65 }}
                          />
                        </label>
                      )}
                      <strong>
                        {BASE_CURRENCY}
                        {parseFloat(service.price).toFixed(2)}
                      </strong>
                    </span>
                  </li>
                );
              })}

              <div
                className="modal-actions"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  margin: "10px 16px",
                }}
              >
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setSelectedServices([]);
                    setShowServiceModal(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="submit-btn"
                  onClick={handleAddServices}
                  disabled={selectedServices.length === 0}
                >
                  Add Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingService && (
        <div className="modal-overlay">
          <div className="modal small-modal">
            <div className="modal-header">
              <h4>Edit Service</h4>
              <button
                className="close-btn"
                onClick={() => setEditingService(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Service Name</label>
                <input type="text" value={editingService.name} disabled />
              </div>
              <div className="form-group">
                <label>Price</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editServiceQuantity}
                  onChange={(event) =>
                    setEditServiceQuantity(
                      Math.max(1, Number(event.target.value) || 1),
                    )
                  }
                />
              </div>
              <div
                className="modal-actions"
                style={{ display: "flex", justifyContent: "flex-end" }}
              >
                <button
                  className="cancel-btn"
                  onClick={() => setEditingService(null)}
                >
                  Cancel
                </button>
                <button className="submit-btn" onClick={handleSubmitEdit}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default function RoomRack({
  initialProperty = null,
  onRequestBooking = null,
}) {
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(
    initialProperty ? initialProperty.business_entity_id : "",
  );
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showHotelDropdown, setShowHotelDropdown] = useState(false);
  const hotelDropdownRef = useRef(null);
  const [filters, setFilters] = useState({
    floor: "all",
    status: "all",
    type: "all",
  });
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "dd-MM-yyyy"),
  );
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showGroupBooking, setShowGroupBooking] = useState(false);
  const [activeRackTab, setActiveRackTab] = useState("rooms");
  const [bookingRoom, setBookingRoom] = useState(null);
  const [bookingStep, setBookingStep] = useState(1); // 1: booking details, 2: guest info, 3: payment
  const [bookingInfo, setBookingInfo] = useState({
    units: 1,
    adults: 1,
    children: 0,
    infants: 0,
    useBasePrice: true,
    customBasePrice: null,
    mealPlan: null,
    reservationName: "",
    extraServices: [],
    _checkout: null,
    isAC: false,
    checkinTime: "00:00:00",
    checkoutTime: "23:00:00",
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPrintReservation, setSelectedPrintReservation] =
    useState(null);

  // Guest info
  const [guestInfo, setGuestInfo] = useState({
    firstName: "",
    lastName: "",
    fullName: "",
    age: "",
    email: "",
    phone: "",
    address: "",
    idType: "",
    idNumber: "",
    company: "",
    gst: "",
    notes: "",
  });

  const [multipleGuests, setMultipleGuests] = useState([]);
  const [showGuestSelectionModal, setShowGuestSelectionModal] = useState(false);
  const [searchingGuest, setSearchingGuest] = useState(false);

  // Function to search for existing guest by phone
  const searchGuestByPhone = async (phone) => {
    if (!phone || phone.length < 10) {
      setMultipleGuests([]);
      setShowGuestSelectionModal(false);
      return;
    }

    setSearchingGuest(true);
    try {
      const response = await axios.get(
        `/pms/guests/search?phone=${encodeURIComponent(phone)}`,
      );
      if (response.data && response.data.length > 0) {
        if (response.data.length === 1) {
          // Single guest found - auto-populate
          const guest = response.data[0];
          setMultipleGuests([]);
          setShowGuestSelectionModal(false);
          // Auto-populate guest info from existing guest
          setGuestInfo((prev) => ({
            ...prev,
            fullName: `${guest.first_name} ${guest.last_name}`,
            firstName: guest.first_name,
            lastName: guest.last_name,
            age: guest.age || "",
            email: guest.email || "",
            address: guest.address || "",
            idType: guest.id_type || "",
            idNumber: guest.id_number || "",
            company: guest.company || "",
            gst: guest.gst || "",
          }));
        } else {
          // Multiple guests found - show selection modal
          setMultipleGuests(response.data);
          setShowGuestSelectionModal(true);
        }
      } else {
        setMultipleGuests([]);
        setShowGuestSelectionModal(false);
      }
    } catch (error) {
      console.error("Error searching guest:", error);
      setMultipleGuests([]);
      setShowGuestSelectionModal(false);
    } finally {
      setSearchingGuest(false);
    }
  };

  // Function to handle guest selection from modal
  const handleGuestSelection = (guest) => {
    setShowGuestSelectionModal(false);
    setMultipleGuests([]);
    // Auto-populate guest info from selected guest
    setGuestInfo((prev) => ({
      ...prev,
      fullName: `${guest.first_name} ${guest.last_name}`,
      firstName: guest.first_name,
      lastName: guest.last_name,
      age: guest.age || "",
      email: guest.email || "",
      address: guest.address || "",
      idType: guest.id_type || "",
      idNumber: guest.id_number || "",
      company: guest.company || "",
      gst: guest.gst || "",
    }));
  };

  // Payment-related states for step 3
  const [saveLoading, setSaveLoading] = useState(false);
  const [reservationId, setReservationId] = useState(null);
  const [reservationTotal, setReservationTotal] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showGuestListModal, setShowGuestListModal] = useState(false);
  const [selectedRoomForGuests, setSelectedRoomForGuests] = useState(null);
  const [processingCancelId, setProcessingCancelId] = useState(null);
  const [processingCancelBooking, setProcessingCancelBooking] = useState(false);
  const [processingCheckinId, setProcessingCheckinId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showStayModal, setShowStayModal] = useState(false);
  const [selectedStayRoom, setSelectedStayRoom] = useState(null);
  const [stayModalMode, setStayModalMode] = useState("full");
  const [stayCheckinDate, setStayCheckinDate] = useState("");
  const [stayCheckoutDate, setStayCheckoutDate] = useState("");
  const [stayCheckoutTime, setStayCheckoutTime] = useState("");
  const [stayCheckinTime, setStayCheckinTime] = useState("");
  const [reservationRoomStays, setReservationRoomStays] = useState({});
  const [processingCheckoutId, setProcessingCheckoutId] = useState(null);
  const [processingUpdateCheckout, setProcessingUpdateCheckout] =
    useState(false);
  const [showRoomTransfer, setShowRoomTransfer] = useState(false);
  const [transferRooms, setTransferRooms] = useState([]);
  const [transferRoomId, setTransferRoomId] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [transferTime, setTransferTime] = useState("");
  const [transferRate, setTransferRate] = useState("");
  const [transferIsAc, setTransferIsAc] = useState(false);
  const [processingTransfer, setProcessingTransfer] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [addRoomReservation, setAddRoomReservation] = useState(null);
  const [addRoomOptions, setAddRoomOptions] = useState([]);
  const [addRoomId, setAddRoomId] = useState("");
  const [addRoomDate, setAddRoomDate] = useState("");
  const [addRoomTime, setAddRoomTime] = useState("");
  const [addRoomRate, setAddRoomRate] = useState("");
  const [addRoomIsAc, setAddRoomIsAc] = useState(false);
  const [processingAddRoom, setProcessingAddRoom] = useState(false);

  const refreshAllData = () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  const statusColor = (status) =>
    ({
      clean: "#4CAF50",
      dirty: "#F44336",
      ready: "#2196F3",
      occupied: "#FF9800",
      vacant: "#9E9E9E",
      maintenance: "#607D8B",
    })[(status || "").toLowerCase()] || "#9E9E9E";

  useEffect(() => {
    if (initialProperty) {
      setProperties([initialProperty]);
      setSelectedProperty(initialProperty.business_entity_id);
      return;
    }

    async function fetchProperties() {
      try {
        const userData = JSON.parse(sessionStorage.getItem("userData"));
        const resp = await axios.get(
          `businessEntities/getAllBusinessEntities/${userData.Group_ID}`,
        );
        const filteredData = resp.data.filter((b) => b.business_type === "H");
        setProperties(filteredData);
        if (filteredData.length) {
          setSelectedProperty(filteredData[0].business_entity_id);
        }
      } catch (err) {
        console.error("Error fetching properties:", err);
        showSnackbar("Failed to load properties", "error");
      }
    }

    fetchProperties();
  }, [initialProperty]);

  useEffect(() => {
    if (!selectedProperty) return;
    let mounted = true;

    async function fetchMeta() {
      try {
        const [typesResp, mealResp, extraResp] = await Promise.all([
          axios.get(`pms/rooms/roomTypes/${selectedProperty}`),
          axios.get(`pms/mealPlans/getAll/${null}/${selectedProperty}`),
          axios.get(`pms/extra-services/getAll/${null}/${selectedProperty}`),
        ]);

        if (!mounted) return;
        const normalized = Array.isArray(typesResp.data)
          ? typesResp.data.map((rt) => ({
            ...rt,
            base_price: rt.base_price || 0,
            max_occupancy: rt.max_occupancy || 2,
          }))
          : [];
        setRoomTypes(normalized);
        setMealPlans(Array.isArray(mealResp.data) ? mealResp.data : []);
        setExtraServices(Array.isArray(extraResp.data) ? extraResp.data : []);
      } catch (err) {
        console.error("Error fetching meta:", err);
        if (mounted) {
          setRoomTypes([]);
          setMealPlans([]);
          setExtraServices([]);
        }
      }
    }

    fetchMeta();
    return () => {
      mounted = false;
    };
  }, [selectedProperty, refreshKey]);

  useEffect(() => {
    if (!selectedProperty) return;
    if (!selectedDate) return;

    let mounted = true;
    setLoading(true);

    async function fetchRooms() {
      try {
        const apiDate = format(
          parseISO(selectedDate.split("-").reverse().join("-")),
          "yyyy-MM-dd",
        );

        const roomsResp = await axios.get(
          `pms/rooms/status/${selectedProperty}/${apiDate}`,
        );
        const apiRooms = Array.isArray(roomsResp.data) ? roomsResp.data : [];

        if (!mounted) return;

        const normalizedRooms = apiRooms.map((room) => {
          const reservations = Array.isArray(room.reservations)
            ? room.reservations
            : [];
          const guests = Array.isArray(room.guests) ? room.guests : [];

          let primaryReservation = null;
          let primaryGuest = null;

          if (reservations.length > 0) {
            let idx = 0;

            const status = (room.booking_status || "").toLowerCase();
            if (status === "staying") {
              const found = reservations.findIndex(
                (r) => (r.status || "").toLowerCase() === "checked in",
              );
              if (found !== -1) idx = found;
            } else if (status === "booked") {
              const found = reservations.findIndex(
                (r) => (r.status || "").toLowerCase() === "confirmed",
              );
              if (found !== -1) idx = found;
            }

            primaryReservation = reservations[idx] || null;
            primaryGuest = guests[idx] || guests[0] || null;
          }

          return {
            ...room,
            reservation: primaryReservation,
            guest: primaryGuest,
          };
        });

        setRooms(normalizedRooms);
      } catch (err) {
        console.error("Error fetching rooms:", err);
        showSnackbar("Failed to load room data", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchRooms();

    return () => {
      mounted = false;
    };
  }, [selectedProperty, selectedDate, refreshKey]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        hotelDropdownRef.current &&
        !hotelDropdownRef.current.contains(e.target)
      ) {
        setShowHotelDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function showSnackbar(message, severity = "success") {
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
      setRooms((prev) =>
        prev.map((r) =>
          r.id === room.id ? { ...r, cleanliness_status: newStatus } : r,
        ),
      );
      setOpenStatusDropdown(null);
      showSnackbar("Room status updated", "success");
    } catch (err) {
      console.error("Failed updating room status:", err.response?.data || err);
      showSnackbar(
        err.response?.data?.error || "Failed to update room status",
        "error",
      );
    }
  }

  const selectedHotel =
    properties.find((p) => p.business_entity_id === selectedProperty) || {};

  const filteredRooms = rooms.filter((room) => {
    const q = searchTerm.trim().toLowerCase();

    const matchesSearch =
      q === "" ||
      (room.guest &&
        (`${room.guest.firstName || ""} ${room.guest.lastName || ""}`
          .toLowerCase()
          .includes(q) ||
          (room.guest.email || "").toLowerCase().includes(q) ||
          (room.guest.phone || "").toLowerCase().includes(q))) ||
      (room.unit_number || "").toString().toLowerCase().includes(q);

    const matchesFloor =
      filters.floor === "all" ||
      (room.floor !== undefined && room.floor.toString() === filters.floor);

    const bookingStatus = (room.booking_status || "").toLowerCase();
    const matchesStatus =
      filters.status === "all" ||
      bookingStatus === filters.status.toLowerCase();

    const matchesType =
      filters.type === "all" || (room.room_type || "") === filters.type;

    return matchesSearch && matchesFloor && matchesStatus && matchesType;
  });

  const groupedReservations = useMemo(() => {
    const groups = new Map();

    for (const room of filteredRooms) {
      const reservations = Array.isArray(room.reservations) ? room.reservations : [];
      const guests = Array.isArray(room.guests) ? room.guests : [];

      reservations.forEach((reservation, index) => {
        const guest = guests[index] || guests[0] || null;
        const existing = groups.get(reservation.id);
        const roomSummary = {
          id: room.id,
          reservation_room_id: reservation.reservation_room_id,
          unit_number: room.unit_number,
          charge_code: room.charge_code,
          room_type: room.room_type,
          floor: room.floor,
          is_ac: reservation.rr_is_ac === 1,
          base_rate: reservation.base_rate,
          checkIn: reservation.roomCheckIn || reservation.checkIn,
          checkOut: reservation.roomCheckOut || reservation.checkOut,
          checkInTime: reservation.roomCheckInTime || reservation.checkInTime,
          checkOutTime: reservation.roomCheckOutTime || reservation.checkOutTime,
        };

        if (existing) {
          if (!existing.rooms.some((item) => item.id === room.id)) {
            existing.rooms.push(roomSummary);
          }
          return;
        }

        groups.set(reservation.id, {
          ...reservation,
          booking_status: room.booking_status,
          guest,
          rooms: [roomSummary],
        });
      });
    }

    return Array.from(groups.values()).sort((a, b) => {
      const aDate = a.checkIn ? new Date(a.checkIn).getTime() : 0;
      const bDate = b.checkIn ? new Date(b.checkIn).getTime() : 0;
      return aDate - bDate;
    });
  }, [filteredRooms]);

  const getDefaultMealPlanForRoomType = (roomTypeId) => {
    const applicableMealPlans = mealPlans.filter(
      (mp) => mp.room_type_id === null || mp.room_type_id === roomTypeId,
    );
    if (applicableMealPlans.length === 0) return null;
    const roomTypeSpecific = applicableMealPlans.find(
      (mp) => mp.room_type_id === roomTypeId,
    );
    return roomTypeSpecific || applicableMealPlans[0];
  };

  const calculatePrice = (roomTypeObj, bookingInfoLocal, nights) => {
    const mealPlan = bookingInfoLocal.mealPlan
      ? mealPlans.find((mp) => mp.id === Number(bookingInfoLocal.mealPlan))
      : getDefaultMealPlanForRoomType(roomTypeObj?.id);

    let totalPrice = 0;

    if (bookingInfoLocal.useBasePrice) {
      const basePrice =
        bookingInfoLocal.customBasePrice ||
        mealPlan?.base_price ||
        roomTypeObj?.base_price ||
        0;
      totalPrice = basePrice * nights * bookingInfoLocal.units;
    } else if (mealPlan) {
      const adultPrice = parseFloat(
        mealPlan.adult_price ||
        mealPlan.base_price ||
        roomTypeObj?.base_price ||
        0,
      );
      const childPrice = parseFloat(
        mealPlan.child_price ||
        mealPlan.base_price / 2 ||
        roomTypeObj?.base_price / 2 ||
        0,
      );
      const infantPrice = parseFloat(mealPlan.infant_price || 0);

      totalPrice =
        (adultPrice * bookingInfoLocal.adults +
          childPrice * bookingInfoLocal.children +
          infantPrice * bookingInfoLocal.infants) *
        nights *
        bookingInfoLocal.units;
    } else {
      totalPrice =
        (roomTypeObj?.base_price || 0) *
        bookingInfoLocal.adults *
        nights *
        bookingInfoLocal.units;
    }

    const extraServicesTotal = bookingInfoLocal.extraServices.reduce(
      (sum, serviceId) => {
        const service = extraServices.find((s) => s.id === serviceId);
        return sum + (service ? parseFloat(service.price) : 0);
      },
      0,
    );

    return totalPrice + extraServicesTotal;
  };

  const handleRoomClick = (room) => {
    const bookingStatus = (room.booking_status || "").toLowerCase();
    const isVacant =
      !bookingStatus || bookingStatus === "vacant" || room.status === "Vacant";

    if (isVacant) {
      const checkIn = parseISO(selectedDate.split("-").reverse().join("-"));
      const defaultCheckout = addDays(checkIn, 1);

      if (typeof onRequestBooking === "function") {
        onRequestBooking(room, checkIn, defaultCheckout);
        return;
      }

      setBookingRoom(room);

      setBookingInfo((prev) => ({
        ...prev,
        units: 1,
        adults: 1,
        children: 0,
        infants: 0,
        useBasePrice: true,
        mealPlan: getDefaultMealPlanForRoomType(room.room_type_id)?.id || null,
        reservationName: `${room.charge_code}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`,
        extraServices: [],
        _checkout: format(defaultCheckout, "yyyy-MM-dd"),
        isAC: false,
        checkinTime: "00:00:00",
        checkoutTime: "23:00:00",
      }));
      setGuestInfo({
        firstName: "",
        lastName: "",
        fullName: "",
        email: "",
        phone: "",
        address: "",
        idType: "",
        idNumber: "",
        notes: "",
        company: "",
        gst: "",
      });
      setBookingStep(1);
      setShowBookingModal(true);
      return;
    }
    if (bookingStatus === "staying") {
      setStayModalMode("full");
      setSelectedStayRoom(room);
      const currentCheckout = room.reservation?.checkOut
        ? format(parseISO(room.reservation.checkOut), "yyyy-MM-dd")
        : "";
      const currentCheckin = room.reservation?.checkIn
        ? format(parseISO(room.reservation.checkIn), "yyyy-MM-dd")
        : "";
      setStayCheckinDate(currentCheckin);
      setStayCheckoutDate(currentCheckout);
      setStayCheckinTime(room.reservation?.checkInTime || "00:00");
      setStayCheckoutTime(room.reservation?.checkOutTime || "23:00");
      setShowStayModal(true);
      return;
    }
    if (bookingStatus === "booked") {
      setSelectedRoomForGuests(room);
      setShowGuestListModal(true);
    }
  };

  const openReservationStayEditor = (reservation) => {
    const primaryRoom = reservation.rooms[0];
    const formatTimeForInput = (value, fallback) =>
      (value || fallback || "00:00").slice(0, 5);
    setStayModalMode("checkout");
    setSelectedStayRoom({
      ...primaryRoom,
      reservation,
      reservations: [reservation],
      guest: reservation.guest,
    });
    setStayCheckinDate(reservation.checkIn || "");
    setStayCheckoutDate(reservation.checkOut || "");
    const reservationCheckInTime = formatTimeForInput(
      reservation.checkInTime,
      "00:00",
    );
    const reservationCheckOutTime = formatTimeForInput(
      reservation.checkOutTime,
      "23:00",
    );
    setStayCheckinTime(reservationCheckInTime);
    setStayCheckoutTime(reservationCheckOutTime);
    setReservationRoomStays(
      (reservation.rooms || []).reduce((acc, room) => {
        const roomStay = {
          checkInDate: room.checkIn || reservation.checkIn || "",
          checkInTime: formatTimeForInput(room.checkInTime, reservation.checkInTime || "00:00"),
          checkOutDate: room.checkOut || reservation.checkOut || "",
          checkOutTime: formatTimeForInput(room.checkOutTime, reservation.checkOutTime || "23:00"),
        };
        acc[room.reservation_room_id || room.id] = clampRoomStayToReservation(
          roomStay,
          {
            checkInDate: reservation.checkIn || "",
            checkInTime: reservationCheckInTime,
            checkOutDate: reservation.checkOut || "",
            checkOutTime: reservationCheckOutTime,
          },
        );
        return acc;
      }, {}),
    );
    setShowStayModal(true);
  };

  const openReservationRoomTransfer = async (reservation, room) => {
    if ((reservation.status || "").toLowerCase() !== "checked in") {
      showSnackbar("Only a staying guest can change rooms", "error");
      return;
    }

    const roomContext = {
      ...room,
      reservation,
      reservations: [reservation],
      guest: reservation.guest,
    };

    setSelectedStayRoom(roomContext);
    await handleOpenRoomTransfer(roomContext);
  };

  const handleCancelBooking = async (reservationId) => {
    if (!reservationId) return;
    try {
      setProcessingCancelId(reservationId);
      await axios.post(`/pms/bookings/cancel/${reservationId}`);

      showSnackbar("Booking cancelled successfully", "success");

      // refresh room data for current date
      setSelectedDate((prev) => prev);

      // close dialog
      setShowGuestListModal(false);
      setSelectedRoomForGuests(null);
    } catch (err) {
      console.error("Cancel booking failed:", err);
      showSnackbar(
        err.response?.data?.error || "Failed to cancel booking",
        "error",
      );
    } finally {
      setProcessingCancelId(null);
      refreshAllData();
    }
  };

  const handleCancelFromPayment = async () => {
    if (!reservationId) {
      showSnackbar("Invalid reservation", "error");
      return;
    }

    try {
      setProcessingCancelBooking(true);

      await axios.post(`/pms/bookings/cancel/${reservationId}`);

      showSnackbar("Booking cancelled successfully", "success");

      // Close modal and reset booking state
      setShowBookingModal(false);
      setBookingRoom(null);
      setBookingStep(1);

      // Clear reservation/payment state
      setReservationId(null);
      setReservationTotal(0);
      setPaymentAmount(0);

      // Refresh rooms for the same date
      setSelectedDate((prev) => prev);
    } catch (err) {
      console.error("Cancel booking failed:", err);
      showSnackbar(
        err.response?.data?.error || "Failed to cancel booking",
        "error",
      );
    } finally {
      setProcessingCancelBooking(false);
      refreshAllData();
    }
  };

  const canCheckInReservation = (res) => {
    if (!res.checkIn) return false;

    const status = (res.status || "").toLowerCase();
    if (status !== "confirmed") return false;

    const today = new Date();
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const checkIn = parseISO(res.checkIn);
    const checkInDate = new Date(
      checkIn.getFullYear(),
      checkIn.getMonth(),
      checkIn.getDate(),
    );

    return isEqual(todayDate, checkInDate) || isAfter(todayDate, checkInDate);
  };

  const handleCheckinBooking = async (reservationId) => {
    if (!reservationId) return;
    try {
      setProcessingCheckinId(reservationId);
      await axios.post(`/pms/bookings/checkin/${reservationId}`);

      showSnackbar("Checked in successfully", "success");

      // close guest list modal and refresh data
      setShowGuestListModal(false);
      setSelectedRoomForGuests(null);
      setSelectedDate((prev) => prev);
    } catch (err) {
      console.error("Check-in failed:", err);
      showSnackbar(
        err.response?.data?.error || "Failed to check in guest",
        "error",
      );
    } finally {
      setProcessingCheckinId(null);
      refreshAllData();
    }
  };

  const convertTo24 = (time12) => {
    if (!time12) return "";

    let [time, modifier] = time12.split(" ");
    let [hour, minute] = time.split(":");

    hour = parseInt(hour, 10);

    if (modifier === "PM" && hour !== 12) {
      hour += 12;
    }
    if (modifier === "AM" && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, "0")}:${minute}`;
  };

  // Convert 24h "14:30" → "02:30 PM"
  const convertTo12 = (time24) => {
    if (!time24) return "";

    let [hour, minute] = time24.split(":");
    hour = parseInt(hour, 10);

    let modifier = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;

    return `${hour.toString().padStart(2, "0")}:${minute} ${modifier}`;
  };

  const bookingStep1Valid = () => {
    if (!bookingInfo._checkout) return false;
    const checkIn = parseISO(selectedDate.split("-").reverse().join("-"));
    const checkout = parseISO(bookingInfo._checkout);
    if (!(checkout >= checkIn)) return false;

    if (bookingInfo.units < 1) return false;
    if (bookingInfo.adults < 1) return false;

    const maxPax = bookingRoom?.max_pax || 2;
    const totalGuests =
      bookingInfo.adults + bookingInfo.children + bookingInfo.infants;
    if (totalGuests > maxPax * bookingInfo.units) return false;

    return true;
  };

  const saveReservation = async () => {
    try {
      const userData = JSON.parse(sessionStorage.getItem("userData"));

      let guestId;
      if (!guestInfo.phone) {
        showSnackbar("Guest phone is required", "error");
        return;
      }

      const maxPax = bookingRoom?.max_pax || 2;
      const totalGuests =
        bookingInfo.adults + bookingInfo.children + bookingInfo.infants;
      if (totalGuests > maxPax * bookingInfo.units) {
        showSnackbar(
          `Total guests exceed room capacity (max ${maxPax * bookingInfo.units
          })`,
          "error",
        );
        return;
      }

      setSaveLoading(true);

      try {
        const fullName = (guestInfo.fullName || "").trim();
        const parts = fullName.split(" ");

        let firstName = "";
        let lastName = "";

        // Handle splitting
        if (parts.length === 1) {
          firstName = parts[0]; // Only one word => first name
        } else if (parts.length > 1) {
          lastName = parts.pop(); // Last word
          firstName = parts.join(" "); // Remaining words
        }

        const guestPayload = {
          first_name: firstName,
          last_name: lastName,
          age: guestInfo.age,
          email: guestInfo.email || null,
          phone: guestInfo.phone,
          country: "India",
          address: guestInfo.address,
          id_type: guestInfo.idType,
          id_number: guestInfo.idNumber,
          company_name: guestInfo.company,
          gst_number: guestInfo.gst,
          group_id: userData.Group_ID,
        };

        const guestResponse = await axios.post("pms/guests/add", guestPayload);
        guestId = guestResponse.data.id;
      } catch (guestError) {
        if (
          guestError.response &&
          guestError.response.status === 400 &&
          guestError.response.data?.error === "Phone number already exists"
        ) {
          showSnackbar(
            "Phone number already exists. Please use a different number.",
            "error",
          );
          setSaveLoading(false);
          return;
        } else {
          throw guestError;
        }
      }

      const checkIn = format(
        parseISO(selectedDate.split("-").reverse().join("-")),
        "yyyy-MM-dd",
      );
      const checkoutDate = bookingInfo._checkout
        ? format(parseISO(bookingInfo._checkout), "yyyy-MM-dd")
        : format(
          addDays(parseISO(selectedDate.split("-").reverse().join("-")), 1),
          "yyyy-MM-dd",
        );

      const total_amount = calculatePrice(
        roomTypes.find((rt) => rt.id === bookingRoom.room_type_id) || {
          base_price: bookingRoom.base_price || 0,
          id: bookingRoom.room_type_id,
        },
        bookingInfo,
        nightsCount(),
      );

      const reservationPayload = {
        reservation_number: `${bookingInfo.reservationName}-${Date.now()}`,
        property_id: selectedProperty,
        guest_id: guestId,
        used_baseprice: bookingInfo.useBasePrice ? "Yes" : "No",
        check_in_date: checkIn,
        check_out_date: checkoutDate,
        checkin_time: bookingInfo.checkinTime || "00:00:00",
        checkout_time: bookingInfo.checkoutTime || "23:00:00",
        adults: bookingInfo.adults,
        children: bookingInfo.children,
        infants: bookingInfo.infants,
        status: "Confirmed",
        total_amount: total_amount,
        balance_due: total_amount,
        notes: guestInfo.notes,
        group_id: userData.Group_ID,
      };

      const reservationResponse = await axios.post(
        "pms/reservations/add",
        reservationPayload,
      );

      // assign room + services (same as before)
      const roomTypeObjForRates = roomTypes.find(
        (rt) => rt.id === bookingRoom.room_type_id,
      ) || {
        base_price: bookingRoom.base_price || 0,
      };

      const selectedMealPlan = mealPlans?.find(
        (mp) => mp.id === bookingInfo.mealPlan,
      );

      const base =
        bookingInfo.customBasePrice ??
        selectedMealPlan?.base_price ??
        roomTypeObjForRates?.base_price ??
        0;
      const adultRate = selectedMealPlan?.adult_price ?? base;
      const childRate = selectedMealPlan?.child_price ?? base / 2;
      const infantRate = selectedMealPlan?.infant_price ?? 0;

      const reservationRoomPayload = {
        reservation_id: reservationResponse.data.id,
        room_type_id: bookingRoom.room_type_id,
        room_id: bookingRoom.id,
        meal_plan_id:
          bookingInfo.mealPlan ||
          getDefaultMealPlanForRoomType(bookingRoom.room_type_id)?.id ||
          null,
        base_rate: base,
        adult_rate: adultRate || 0,
        child_rate: childRate || 0,
        infant_rate: infantRate || 0,
        status: "Reserved",
        quantity: bookingInfo.units,
        is_ac: bookingInfo.isAC,
      };

      await axios.post("pms/reservationRooms/add", reservationRoomPayload);

      for (const serviceId of bookingInfo.extraServices) {
        const service = extraServices.find((s) => s.id === serviceId);
        if (!service) continue;
        const servicePayload = {
          reservation_id: reservationResponse.data.id,
          service_id: service.id,
          quantity: 1,
          service_date: checkIn,
          rate: service.price,
          notes: "",
        };
        await axios.post("pms/reservationServices/add", servicePayload);
      }

      try {
        if (typeof window !== "undefined" && window.sendEmail) {
          window.sendEmail({
            reservationId: reservationResponse.data.id,
            templateType: "BOOKING_CONFIRMATION",
          });
        }
      } catch (e) {
        /* ignore */
      }
      // Instead of closing the modal, move to payment slide
      setReservationId(reservationResponse.data.id);
      setReservationTotal(reservationResponse.data.total_amount);
      setPaymentAmount(reservationResponse.data.total_amount);
      setBookingStep(3);
      showSnackbar(
        "Reservation created. Proceed to payment or skip.",
        "success",
      );

      // keep modal open and show step 3
    } catch (error) {
      console.error("Error creating reservation:", error);
      showSnackbar(
        error.response?.data?.error ??
        "Failed to create reservation. Please try again.",
        "error",
      );
    } finally {
      setSaveLoading(false);
      refreshAllData();
    }
  };

  const canCheckoutReservation = (res) => {
    if (!res.checkOut) return false;

    const status = (res.status || "").toLowerCase();
    if (status !== "checked in") return false;

    const today = new Date();
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const checkOut = parseISO(res.checkOut);
    const checkOutDate = new Date(
      checkOut.getFullYear(),
      checkOut.getMonth(),
      checkOut.getDate(),
    );

    // Only allow when checkout date == today
    return isEqual(todayDate, checkOutDate);
  };

  const handleCheckoutBooking = async (reservationId) => {
    if (!reservationId) return;

    try {
      setProcessingCheckoutId(reservationId);
      await axios.post(`/pms/bookings/checkout/${reservationId}`);

      showSnackbar("Checked out successfully", "success");

      setShowStayModal(false);
      setSelectedStayRoom(null);
      refreshAllData();
    } catch (err) {
      console.error("Checkout failed:", err);
      showSnackbar(
        err.response?.data?.error || "Failed to checkout guest",
        "error",
      );
    } finally {
      setProcessingCheckoutId(null);
    }
  };

  const updateReservationRoomStay = (roomKey, field, value) => {
    setReservationRoomStays((current) => ({
      ...current,
      [roomKey]: {
        ...(current[roomKey] || {}),
        [field]: value,
      },
    }));
  };

  const normalizeStayTimeForCompare = (value, fallback = "00:00") =>
    (value || fallback || "00:00").slice(0, 5);

  const toStayComparableDateTime = (date, time) =>
    `${date}T${normalizeStayTimeForCompare(time)}`;

  const clampRoomStayToReservation = (roomStay, reservationStay) => {
    if (
      !reservationStay.checkInDate ||
      !reservationStay.checkOutDate ||
      !roomStay
    ) {
      return roomStay;
    }

    const nextStay = { ...roomStay };
    const reservationStart = toStayComparableDateTime(
      reservationStay.checkInDate,
      reservationStay.checkInTime,
    );
    const reservationEnd = toStayComparableDateTime(
      reservationStay.checkOutDate,
      reservationStay.checkOutTime,
    );

    if (reservationEnd <= reservationStart) {
      return nextStay;
    }

    if (
      toStayComparableDateTime(nextStay.checkInDate, nextStay.checkInTime) <
      reservationStart
    ) {
      nextStay.checkInDate = reservationStay.checkInDate;
      nextStay.checkInTime = reservationStay.checkInTime;
    }

    if (
      toStayComparableDateTime(nextStay.checkOutDate, nextStay.checkOutTime) >
      reservationEnd
    ) {
      nextStay.checkOutDate = reservationStay.checkOutDate;
      nextStay.checkOutTime = reservationStay.checkOutTime;
    }

    if (
      toStayComparableDateTime(nextStay.checkOutDate, nextStay.checkOutTime) <=
      toStayComparableDateTime(nextStay.checkInDate, nextStay.checkInTime)
    ) {
      nextStay.checkInDate = reservationStay.checkInDate;
      nextStay.checkInTime = reservationStay.checkInTime;
      nextStay.checkOutDate = reservationStay.checkOutDate;
      nextStay.checkOutTime = reservationStay.checkOutTime;
    }

    return nextStay;
  };

  const updateReservationStayField = (field, value) => {
    const previousReservationStay = {
      checkInDate: stayCheckinDate,
      checkInTime: stayCheckinTime,
      checkOutDate: stayCheckoutDate,
      checkOutTime: stayCheckoutTime,
    };

    const nextReservationStay = {
      ...previousReservationStay,
      [field]: value,
    };

    const setters = {
      checkInDate: setStayCheckinDate,
      checkInTime: setStayCheckinTime,
      checkOutDate: setStayCheckoutDate,
      checkOutTime: setStayCheckoutTime,
    };

    setters[field]?.(value);

    setReservationRoomStays((current) =>
      Object.entries(current).reduce((acc, [roomKey, roomStay]) => {
        let nextRoomStay = { ...roomStay };

        // Always overwrite all room checkout when reservation checkout changes
        if (field === "checkOutDate") {
          nextRoomStay.checkOutDate = value;
        }

        if (field === "checkOutTime") {
          nextRoomStay.checkOutTime = value;
        }

        // If reservation check-in date increased, fix rooms before it
        if (
          field === "checkInDate" &&
          nextRoomStay.checkInDate &&
          nextRoomStay.checkInDate < value
        ) {
          nextRoomStay.checkInDate = value;
        }

        // If same check-in date and room time is earlier, fix room time
        if (
          field === "checkInTime" &&
          nextRoomStay.checkInDate === nextReservationStay.checkInDate &&
          nextRoomStay.checkInTime &&
          nextRoomStay.checkInTime < value
        ) {
          nextRoomStay.checkInTime = value;
        }

        nextRoomStay = clampRoomStayToReservation(
          nextRoomStay,
          nextReservationStay
        );

        acc[roomKey] = nextRoomStay;
        return acc;
      }, {})
    );
  };

  const handleUpdateCheckoutDate = async () => {
    if (!selectedStayRoom?.reservation?.id) return;

    if (!stayCheckinDate || !stayCheckoutDate) {
      showSnackbar("Both check-in and check-out dates are required", "error");
      return;
    }

    if (stayCheckoutDate < stayCheckinDate) {
      showSnackbar("Checkout must be after check-in", "error");
      return;
    }

    const reservationStart = toStayComparableDateTime(
      stayCheckinDate,
      stayCheckinTime,
    );
    const reservationEnd = toStayComparableDateTime(
      stayCheckoutDate,
      stayCheckoutTime,
    );

    if (reservationEnd <= reservationStart) {
      showSnackbar("Reservation checkout must be after check-in", "error");
      return;
    }

    const roomPayload = (selectedStayRoom.reservation.rooms || []).map((room) => {
      const roomKey = room.reservation_room_id || room.id;
      const roomStay = reservationRoomStays[roomKey] || {};
      const roomLabel = `${room.charge_code || ""}${room.unit_number || ""}`;
      return {
        reservation_room_id: room.reservation_room_id,
        room_label: roomLabel || "Room",
        check_in_date: roomStay.checkInDate || room.checkIn || stayCheckinDate,
        checkin_time: roomStay.checkInTime || room.checkInTime || stayCheckinTime,
        check_out_date: roomStay.checkOutDate || room.checkOut || stayCheckoutDate,
        checkout_time: roomStay.checkOutTime || room.checkOutTime || stayCheckoutTime,
      };
    });

    for (const room of roomPayload) {
      const roomStart = toStayComparableDateTime(
        room.check_in_date,
        room.checkin_time,
      );
      const roomEnd = toStayComparableDateTime(
        room.check_out_date,
        room.checkout_time,
      );
      if (
        roomStart < reservationStart ||
        roomEnd > reservationEnd ||
        roomEnd <= roomStart
      ) {
        showSnackbar(
          `${room.room_label} stay must be within the reservation stay date and time`,
          "error",
        );
        return;
      }
    }

    try {
      setProcessingUpdateCheckout(true);

      await axios.post(
        `/pms/reservations/${selectedStayRoom.reservation.id}/update_checkout_date`,
        {
          new_check_in_date: stayCheckinDate,
          new_check_in_time: stayCheckinTime,
          new_check_out_date: stayCheckoutDate,
          new_check_out_time: stayCheckoutTime,
          rooms: roomPayload,
        },
      );

      showSnackbar("Stay dates updated successfully", "success");
      setShowStayModal(false);
      setSelectedStayRoom(null);
      refreshAllData();
    } catch (err) {
      console.error("Update stay dates failed:", err);
      showSnackbar(
        err.response?.data?.error || "Failed to update stay dates",
        "error",
      );
    } finally {
      setProcessingUpdateCheckout(false);
      setShowStayModal(false);
      refreshAllData();
    }
  };

  const loadTransferRooms = async (startDate, roomContext = selectedStayRoom) => {
    const reservation = roomContext?.reservation;
    if (!reservation || !startDate) return;

    const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    const response = await axios.get(
      `/pms/rooms/getVacantRooms/${userData.Group_ID || "null"}/${selectedProperty}`,
      {
        params: {
          start_date: startDate,
          end_date: reservation.checkOut,
        },
      },
    );
    setTransferRooms(
      (response.data || []).filter((room) => room.id !== roomContext.id),
    );
  };

  const handleOpenRoomTransfer = async (roomContext = selectedStayRoom) => {
    const reservation = roomContext?.reservation;
    if (!reservation) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const initialDate =
      today < reservation.checkIn
        ? reservation.checkIn
        : today > reservation.checkOut
          ? reservation.checkOut
          : today;
    setTransferDate(initialDate);
    setTransferTime(format(new Date(), "HH:mm"));
    setTransferRoomId("");
    setTransferRate("");
    setTransferIsAc(false);

    try {
      await loadTransferRooms(initialDate, roomContext);
      setShowRoomTransfer(true);
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Failed to load available rooms",
        "error",
      );
    }
  };

  const handleTransferRoom = async () => {
    const reservation = selectedStayRoom?.reservation;
    const reservationRoomId =
      selectedStayRoom?.reservation_room_id ||
      reservation?.reservation_room_id;
    if (!reservationRoomId || !transferRoomId || !transferDate || !transferRate) {
      showSnackbar("Select a room, transfer date/time, and room rate", "error");
      return;
    }

    try {
      setProcessingTransfer(true);
      await axios.post(
        `/pms/reservations/${reservation.id}/transfer-room`,
        {
          reservation_room_id: reservationRoomId,
          new_room_id: Number(transferRoomId),
          transfer_date: transferDate,
          transfer_time: transferTime || "00:00:00",
          new_base_rate: Number(transferRate),
          is_ac: transferIsAc,
        },
      );
      showSnackbar("Room changed successfully", "success");
      setShowRoomTransfer(false);
      setShowStayModal(false);
      setSelectedStayRoom(null);
      refreshAllData();
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Failed to change room",
        "error",
      );
    } finally {
      setProcessingTransfer(false);
    }
  };

  const loadAddRoomOptions = async (reservation, startDate) => {
    if (!reservation || !startDate) return;

    const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    const response = await axios.get(
      `/pms/rooms/getVacantRooms/${userData.Group_ID || "null"}/${selectedProperty}`,
      {
        params: {
          start_date: startDate,
          end_date: reservation.checkOut,
        },
      },
    );
    setAddRoomOptions(response.data || []);
  };

  const handleOpenAddRoom = async (reservation) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const initialDate =
      reservation.status === "Checked In" && today > reservation.checkIn
        ? today
        : reservation.checkIn;

    setAddRoomReservation(reservation);
    setAddRoomDate(initialDate);
    setAddRoomTime(
      reservation.status === "Checked In"
        ? format(new Date(), "HH:mm")
        : (reservation.checkInTime || "00:00").slice(0, 5),
    );
    setAddRoomId("");
    setAddRoomRate("");
    setAddRoomIsAc(false);

    try {
      await loadAddRoomOptions(reservation, initialDate);
      setShowAddRoom(true);
    } catch (error) {
      setAddRoomReservation(null);
      showSnackbar(
        error.response?.data?.error || "Failed to load available rooms",
        "error",
      );
    }
  };

  const handleAddRoom = async () => {
    if (
      !addRoomReservation ||
      !addRoomId ||
      !addRoomDate ||
      addRoomRate === ""
    ) {
      showSnackbar("Select a room, start date/time, and room rate", "error");
      return;
    }

    try {
      setProcessingAddRoom(true);
      await axios.post(
        `/pms/reservations/${addRoomReservation.id}/add-room`,
        {
          room_id: Number(addRoomId),
          check_in_date: addRoomDate,
          checkin_time: addRoomTime || "00:00:00",
          base_rate: Number(addRoomRate),
          is_ac: addRoomIsAc,
        },
      );
      showSnackbar("Room added successfully", "success");
      setShowAddRoom(false);
      setAddRoomReservation(null);
      refreshAllData();
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || "Failed to add room",
        "error",
      );
    } finally {
      setProcessingAddRoom(false);
    }
  };

  function nightsCount() {
    try {
      const checkIn = parseISO(selectedDate.split("-").reverse().join("-"));
      const checkout = parseISO(
        bookingInfo._checkout || format(addDays(checkIn, 1), "yyyy-MM-dd"),
      );
      const ms =
        new Date(checkout).setHours(0, 0, 0, 0) -
        new Date(checkIn).setHours(0, 0, 0, 0);
      return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
    } catch (e) {
      return 1;
    }
  }

  const handleSkipPayment = async () => {
    // If no reservation (shouldn't happen) just cleanup and return
    if (!reservationId) {
      setShowBookingModal(false);
      setBookingRoom(null);
      setBookingInfo({
        units: 1,
        adults: 1,
        children: 0,
        infants: 0,
        useBasePrice: true,
        mealPlan: null,
        reservationName: "",
        extraServices: [],
        _checkout: null,
        isAC: false,
        checkinTime: "00:00:00",
        checkoutTime: "23:00:00",
      });
      setGuestInfo({
        firstName: "",
        lastName: "",
        fullName: "",
        age: "",
        email: "",
        phone: "",
        address: "",
        idType: "",
        idNumber: "",
        notes: "",
        company: "",
        gst: "",
      });
      setBookingStep(1);
      setSelectedDate((prev) => prev);
      return;
    }

    setProcessingPayment(true);
    try {
      // Call check-in API for the reservation we just created
      await axios.post(`/pms/bookings/checkin/${reservationId}`);

      showSnackbar("Checked in successfully", "success");

      // reset modal & booking state
      setShowBookingModal(false);
      setBookingRoom(null);
      setBookingInfo({
        units: 1,
        adults: 1,
        children: 0,
        infants: 0,
        useBasePrice: true,
        mealPlan: null,
        reservationName: "",
        extraServices: [],
        _checkout: null,
        isAC: false,
        checkinTime: "00:00:00",
        checkoutTime: "23:00:00",
      });
      setGuestInfo({
        firstName: "",
        lastName: "",
        fullName: "",
        email: "",
        phone: "",
        address: "",
        idType: "",
        idNumber: "",
        notes: "",
        company: "",
        gst: "",
      });
      setBookingStep(1);

      // refresh rooms
      setSelectedDate((prev) => prev);

      // clear reservation state
      setReservationId(null);
      setReservationTotal(0);
      setPaymentAmount(0);
    } catch (error) {
      console.error("Check-in failed:", error);
      showSnackbar("Check-in failed. Please try again.", "error");
    } finally {
      setProcessingPayment(false);
      refreshAllData();
    }
  };

  const handleProcessPayment = async () => {
    if (!reservationId) return showSnackbar("Invalid reservation", "error");
    if (!paymentAmount || paymentAmount <= 0)
      return showSnackbar("Enter a valid payment amount", "error");

    try {
      setProcessingPayment(true);

      // 1) Process payment
      const response = await axios.post(
        `/pms/bookings/payment/${reservationId}`,
        {
          amount: paymentAmount,
          payment_method: paymentMethod,
          transaction_reference: `PAY-${Date.now()}`,
          notes: `Payment for reservation ${reservationId}`,
        },
      );

      // Payment succeeded
      showSnackbar("Payment processed successfully", "success");

      // 2) Immediately attempt check-in for the reservation
      try {
        await axios.post(`/pms/bookings/checkin/${reservationId}`);
        // NOTE: per your request we skip sending check-in email here
        showSnackbar("Checked in successfully", "success");
      } catch (checkinErr) {
        // Payment succeeded but check-in failed — warn user (we still proceed to close/reset so you can refresh UI)
        console.error("Check-in after payment failed:", checkinErr);
        showSnackbar(
          "Payment succeeded but check-in failed. Please try to check-in manually.",
          "warning",
        );
      }

      // 3) close modal and reset
      setShowBookingModal(false);
      setBookingRoom(null);
      setBookingStep(1);
      setReservationId(null);
      setReservationTotal(0);
      setPaymentAmount(0);
      // refresh rooms
      setSelectedDate((prev) => prev);
    } catch (err) {
      console.error("Payment failed", err);
      showSnackbar("Payment failed. Please try again.", "error");
    } finally {
      setProcessingPayment(false);
      refreshAllData();
    }
  };

  const handlePrintInvoice = async (reservationId, invoice_type) => {
    try {
      const response = await axios.post(
        "pms/pdf/generate-document",
        {
          reservation_id: reservationId,
          document_type: invoice_type,
        },
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        },
      );

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
        <html>
          <head><title>Invoice</title></head>
          <body style="margin:0">
            <iframe src="${pdfUrl}" frameborder="0"
              style="width:100%; height:100vh;"
              onload="this.contentWindow.focus(); this.contentWindow.print();">
            </iframe>
          </body>
        </html>
      `);
        printWindow.document.close();
      } else {
        alert("Popup blocked! Please allow popups for this site.");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate invoice. Please try again.");
    }
  };

  return (
    <div className="content-area-table room-rack-component">
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
      <button
        type="button"
        className="group-booking-launch-button"
        onClick={() => setShowGroupBooking(true)}
        disabled={!selectedProperty}
      >
        <FiUsers />
        Booking
      </button>
      <div className="room-rack-controls">
        <div
          className="search-box"
          style={{
            padding: "10px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by room or guest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <input
            type="date"
            value={format(
              parseISO(selectedDate.split("-").reverse().join("-")),
              "yyyy-MM-dd",
            )}
            min={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => {
              const picked = e.target.value;
              const formatted = format(parseISO(picked), "dd-MM-yyyy");
              setSelectedDate(formatted);
            }}
            style={{ padding: "5px" }}
          />
        </div>

        <div className="filters">
          {[
            {
              label: "Floor",
              key: "floor",
              opts: [
                "all",
                ...new Set(
                  rooms.map((r) =>
                    r.floor !== undefined ? r.floor.toString() : "",
                  ),
                ).values(),
              ].filter(Boolean),
            },
            {
              label: "Status",
              key: "status",
              opts: ["all", "booked", "staying", "vacant"],
            },
            {
              label: "Type",
              key: "type",
              opts: ["all", ...roomTypes.map((rt) => rt.room_type)],
            },
          ].map(({ label, key, opts }) => (
            <div className="filter-group" key={key}>
              <label>
                <FiFilter /> {label}
              </label>
              <select
                value={filters[key]}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, [key]: e.target.value }))
                }
              >
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o === "all"
                      ? "All"
                      : o.charAt(0).toUpperCase() + o.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="room-rack-tabs">
        <button
          type="button"
          className={activeRackTab === "rooms" ? "is-active" : ""}
          onClick={() => setActiveRackTab("rooms")}
        >
          Rooms
          <span>{filteredRooms.length}</span>
        </button>
        <button
          type="button"
          className={activeRackTab === "reservations" ? "is-active" : ""}
          onClick={() => setActiveRackTab("reservations")}
        >
          Reservations
          <span>{groupedReservations.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <FiLoader className="loading-spinner" />
          Loading rooms and guest data...
        </div>
      ) : activeRackTab === "rooms" ? (
        <div className="room-grid">
          {filteredRooms.length ? (
            filteredRooms.map((room) => {
              const hasStayOrBooking =
                room.booking_status && room.booking_status !== "Vacant";
              return (
                <div
                  key={room.id}
                  className={`room-card ${hasStayOrBooking ? "occupied" : "vacant"
                    }`}
                  style={{
                    borderLeft: `5px solid ${statusColor(
                      room.cleanliness_status || room.status,
                    )}`,
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
                      style={{
                        backgroundColor: statusColor(
                          room.cleanliness_status || room.status,
                        ),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenStatusDropdown(
                          openStatusDropdown === room.id ? null : room.id,
                        );
                      }}
                      role="button"
                      aria-haspopup="true"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          setOpenStatusDropdown(
                            openStatusDropdown === room.id ? null : room.id,
                          );
                      }}
                    >
                      {room.cleanliness_status || room.status || "Unknown"}
                      <FiChevronDown className="dropdown-icon" />
                      {openStatusDropdown === room.id && (
                        <div className="status-dropdown">
                          {["dirty", "clean", "ready"].map((s) => (
                            <div
                              key={s}
                              onClick={() => handleStatusChange(room, s)}
                              className={
                                (
                                  room.cleanliness_status || ""
                                ).toLowerCase() === s
                                  ? "active"
                                  : ""
                              }
                            >
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {hasStayOrBooking && room.guest && room.reservation ? (
                    <div className="guest-info">
                      <div className="guest-name">
                        {room.guest.firstName} {room.guest.lastName}
                      </div>

                      <div className="booking-dates">
                        <div>
                          {format(parseISO(room.reservations[0]?.checkIn), "MMM d")} -{" "}
                          {formatWithOrdinal(parseISO(room.reservations[0]?.checkOut))}
                        </div>

                        <span
                          className={`booking-status ${room.reservations[0]?.isDelayed
                            ? "delayed-staying"
                            : room.booking_status.toLowerCase().replace(" ", "-")
                            }`}
                        >
                          {room.reservations[0]?.isDelayed
                            ? "Delayed Staying"
                            : room.booking_status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="vacant">
                      {room.status === "Maintenance"
                        ? "Under Maintenance"
                        : "Vacant"}
                    </div>
                  )}
                  {room.reservation?.rr_is_ac == 1 && (
                    <div className="ac-badge">AC</div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="no-results">No rooms match your search/filters</div>
          )}
        </div>
      ) : (
        <div className="reservation-list">
          {groupedReservations.length ? (
            groupedReservations.map((reservation) => {
              const displayStatus = reservation.isDelayed
                ? "Delayed Staying"
                : reservation.status === "Checked In"
                  ? "Staying"
                  : reservation.status;
              const status = (displayStatus || "").toLowerCase();
              const isBooked = reservation.booking_status === "Booked";
              const canCheckIn = canCheckInReservation(reservation);
              const canCheckout = canCheckoutReservation(reservation);

              return (
                <article key={reservation.id} className="reservation-card">
                  <div className="reservation-card-header">
                    <div>
                      <span className="reservation-card-label">Guest</span>
                      <h3>
                        {reservation.guest
                          ? `${reservation.guest.firstName || ""} ${reservation.guest.lastName || ""}`.trim()
                          : "Unknown Guest"}
                      </h3>
                      <div className="reservation-guest-meta">
                        {reservation.guest?.phone && <span>{reservation.guest.phone}</span>}
                        {reservation.guest?.email && <span>{reservation.guest.email}</span>}
                        <span>Reservation #{reservation.reservation_number || reservation.id}</span>
                      </div>
                    </div>
                    <span className={`reservation-status-badge ${status.replaceAll(" ", "-")}`}>
                      {displayStatus}
                    </span>
                  </div>

                  <div className="reservation-stay-summary">
                    <div>
                      <span>Check-in</span>
                      <strong>
                        {reservation.checkIn
                          ? format(parseISO(reservation.checkIn), "MMM d, yyyy")
                          : "-"}
                      </strong>
                      <small>{reservation.checkInTime || ""}</small>
                    </div>
                    <div>
                      <span>Check-out</span>
                      <strong>
                        {reservation.checkOut
                          ? format(parseISO(reservation.checkOut), "MMM d, yyyy")
                          : "-"}
                      </strong>
                      <small>{reservation.checkOutTime || ""}</small>
                    </div>
                    <div>
                      <span>Rooms</span>
                      <strong>{reservation.rooms.length}</strong>
                    </div>
                  </div>

                  <div className="reservation-room-list">
                    {reservation.rooms.map((room) => (
                      <button
                        key={room.reservation_room_id || room.id}
                        type="button"
                        className="reservation-room-item"
                        onClick={() => openReservationRoomTransfer(reservation, room)}
                        title={
                          reservation.status === "Checked In"
                            ? "Change this room"
                            : "Room change is available after check-in"
                        }
                      >
                        <strong>{room.charge_code}{room.unit_number}</strong>
                        <span>{room.room_type}</span>
                        <span>Floor {room.floor ?? "-"}</span>
                        {room.is_ac && <span className="reservation-ac-badge">AC</span>}
                      </button>
                    ))}
                  </div>

                  <div className="reservation-actions">
                    {isBooked ? (
                      <>
                        <button
                          type="button"
                          className="reservation-action checkin"
                          disabled={!canCheckIn || processingCheckinId === reservation.id}
                          onClick={() => handleCheckinBooking(reservation.id)}
                        >
                          {processingCheckinId === reservation.id
                            ? "Confirming..."
                            : canCheckIn
                              ? "Confirm"
                              : "Cannot Confirm Yet"}
                        </button>
                        <button
                          type="button"
                          className="reservation-action cancel"
                          disabled={processingCancelId === reservation.id}
                          onClick={() => handleCancelBooking(reservation.id)}
                        >
                          {processingCancelId === reservation.id
                            ? "Cancelling..."
                            : "Cancel"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="reservation-action add-room"
                          onClick={() => handleOpenAddRoom(reservation)}
                        >
                          <FiPlus /> Add Room
                        </button>
                        <button
                          type="button"
                          className="reservation-action print"
                          onClick={() => {
                            setSelectedPrintReservation(reservation.id);
                            setShowPrintModal(true);
                          }}
                        >
                          <FiPrinter /> Print
                        </button>
                        <button
                          type="button"
                          className="reservation-action payment"
                          onClick={() => {
                            setSelectedPaymentBooking(reservation);
                            setShowPaymentModal(true);
                          }}
                        >
                          <FiCreditCard /> Process Payment
                        </button>
                        <button
                          type="button"
                          className="reservation-action update"
                          onClick={() => openReservationStayEditor(reservation)}
                        >
                          Update Checkout
                        </button>
                        <button
                          type="button"
                          className="reservation-action checkout"
                          disabled={!canCheckout || processingCheckoutId === reservation.id}
                          onClick={() => handleCheckoutBooking(reservation.id)}
                        >
                          {processingCheckoutId === reservation.id
                            ? "Checking out..."
                            : "Checkout"}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="no-results">No reservations match your search, date, or filters</div>
          )}
        </div>
      )}

      {showBookingModal && bookingRoom && (
        <div className="modal-overlay">
          <div className="modal booking-modal">
            <div className="modal-header">
              <h3>
                Book {bookingRoom.room_type || "Room"} {bookingRoom.charge_code}
                {bookingRoom.unit_number}
              </h3>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setBookingRoom(null);
                }}
              >
                {/* close */}
                <FiX />
              </button>
            </div>

            {/* Top progress & save loading indicator */}
            <div style={{ padding: "0 16px" }}>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.85rem",
                      marginBottom: "4px",
                    }}
                  >
                    <div style={{ opacity: bookingStep === 1 ? 1 : 0.6 }}>
                      1. Booking Details
                    </div>
                    <div style={{ opacity: bookingStep === 2 ? 1 : 0.6 }}>
                      2. Guest Info
                    </div>
                    <div style={{ opacity: bookingStep === 3 ? 1 : 0.6 }}>
                      3. Payment
                    </div>
                  </div>
                  <LinearProgress
                    variant="determinate"
                    value={
                      bookingStep === 1 ? 33 : bookingStep === 2 ? 66 : 100
                    }
                  />
                </div>
              </div>
              {saveLoading && <LinearProgress sx={{ marginTop: 1 }} />}
            </div>

            <div className="modal-content">
              {bookingStep === 1 && (
                <>
                  <div className="booking-dates">
                    <div className="date-range-display">
                      <div>
                        CheckIn:{" "}
                        {format(
                          parseISO(selectedDate.split("-").reverse().join("-")),
                          "MMM d, yyyy",
                        )}
                      </div>
                      <div>
                        Checkout:
                        <input
                          type="date"
                          min={format(
                            addDays(
                              parseISO(
                                selectedDate.split("-").reverse().join("-"),
                              ),
                              0,
                            ),
                            "yyyy-MM-dd",
                          )}
                          value={
                            bookingInfo._checkout ||
                            format(
                              addDays(
                                parseISO(
                                  selectedDate.split("-").reverse().join("-"),
                                ),
                                1,
                              ),
                              "yyyy-MM-dd",
                            )
                          }
                          onChange={(e) =>
                            setBookingInfo((b) => ({
                              ...b,
                              _checkout: e.target.value,
                            }))
                          }
                          style={{ marginLeft: "8px" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      margin: "12px 0",
                      padding: "12px",
                      borderRadius: "8px",
                      backgroundColor: "transparent",
                      border: "1px solid #ffcc80",
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={bookingInfo.useBasePrice}
                          onChange={(e) =>
                            setBookingInfo((b) => ({
                              ...b,
                              useBasePrice: e.target.checked,
                            }))
                          }
                        />
                      }
                      label="Use Base Price (ignore guest count)"
                    />
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#666",
                        paddingLeft: "36px",
                        marginTop: "-8px",
                      }}
                    >
                      {bookingInfo.useBasePrice
                        ? "Price based on meal plan / base price"
                        : "Price calculated per person"}
                    </div>
                    {bookingInfo.useBasePrice && (
                      <div style={{ marginTop: "12px", paddingLeft: "36px" }}>
                        <label
                          style={{
                            fontSize: "0.9rem",
                            color: "#333",
                            display: "block",
                            marginBottom: "4px",
                          }}
                        >
                          Room tariff (optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Leave empty for default"
                          value={bookingInfo.customBasePrice || ""}
                          onChange={(e) =>
                            setBookingInfo((b) => ({
                              ...b,
                              customBasePrice: e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            }))
                          }
                          style={{
                            width: "200px",
                            padding: "8px",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            fontSize: "0.9rem",
                          }}
                        />
                      </div>
                    )}
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
                          value={
                            new Date(`1970-01-01T${bookingInfo.checkinTime}`)
                          }
                          onChange={(newValue) => {
                            if (newValue) {
                              setBookingInfo((prev) => ({
                                ...prev,
                                checkinTime: format(newValue, "HH:mm"),
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
                          value={
                            new Date(`1970-01-01T${bookingInfo.checkoutTime}`)
                          }
                          onChange={(newValue) => {
                            if (newValue) {
                              setBookingInfo((prev) => ({
                                ...prev,
                                checkoutTime: format(newValue, "HH:mm"),
                              }));
                            }
                          }}
                        />
                      </div>
                    </div>
                  </LocalizationProvider>
                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        Adults (Max Person Allowed: {bookingRoom.max_pax})
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={bookingInfo.adults}
                        onChange={(e) =>
                          setBookingInfo((b) => ({
                            ...b,
                            adults: Math.max(1, parseInt(e.target.value) || 1),
                          }))
                        }
                        max={bookingRoom?.max_pax}
                      />
                    </div>
                    <div className="form-group">
                      <label>Children</label>
                      <input
                        type="number"
                        min={0}
                        value={bookingInfo.children}
                        onChange={(e) =>
                          setBookingInfo((b) => ({
                            ...b,
                            children: Math.max(
                              0,
                              parseInt(e.target.value) || 0,
                            ),
                          }))
                        }
                        max={bookingRoom?.max_pax}
                      />
                    </div>
                    <div className="form-group">
                      <label>Infants</label>
                      <input
                        type="number"
                        min={0}
                        value={bookingInfo.infants}
                        onChange={(e) =>
                          setBookingInfo((b) => ({
                            ...b,
                            infants: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        max={bookingRoom?.max_pax}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Meal Plan / Rate</label>
                    <select
                      value={
                        bookingInfo.mealPlan ||
                        getDefaultMealPlanForRoomType(bookingRoom.room_type_id)
                          ?.id ||
                        ""
                      }
                      onChange={(e) =>
                        setBookingInfo((b) => ({
                          ...b,
                          mealPlan: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select meal plan</option>
                      {mealPlans
                        .filter(
                          (mp) =>
                            mp.room_type_id === null ||
                            mp.room_type_id === bookingRoom.room_type_id,
                        )
                        .map((mp) => (
                          <option key={mp.id} value={mp.id}>
                            {mp.name} - Adults: {BASE_CURRENCY}
                            {mp.adult_price ||
                              mp.base_price ||
                              roomTypes.find(
                                (rt) => rt.id === bookingRoom.room_type_id,
                              )?.base_price ||
                              0}
                            Children: {BASE_CURRENCY}
                            {mp.child_price ||
                              mp.base_price / 2 ||
                              roomTypes.base_price / 2}
                            , Infants: {BASE_CURRENCY}
                            {mp.infant_price || "Free"}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div
                    style={{
                      margin: "12px 0",
                      padding: "12px",
                      borderRadius: "8px",
                      backgroundColor: "transparent",
                      border: "1px solid #bbdefb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div style={{ fontSize: "0.9rem" }}>
                      Room Type (AC / NON AC):
                    </div>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={bookingInfo.isAC}
                          onChange={(e) =>
                            setBookingInfo((b) => ({
                              ...b,
                              isAC: e.target.checked,
                            }))
                          }
                        />
                      }
                      label={bookingInfo.isAC ? "AC Room" : "Non-AC Room"}
                    />
                  </div>

                  {extraServices.length > 0 && (
                    <div className="extra-services-section">
                      <h4>Extra Services</h4>
                      <div className="extra-services-grid">
                        {extraServices.map((service) => (
                          <div key={service.id} className="extra-service-item">
                            <label>
                              <input
                                type="checkbox"
                                checked={bookingInfo.extraServices.includes(
                                  service.id,
                                )}
                                onChange={() => {
                                  const newServices =
                                    bookingInfo.extraServices.includes(
                                      service.id,
                                    )
                                      ? bookingInfo.extraServices.filter(
                                        (id) => id !== service.id,
                                      )
                                      : [
                                        ...bookingInfo.extraServices,
                                        service.id,
                                      ];
                                  setBookingInfo((b) => ({
                                    ...b,
                                    extraServices: newServices,
                                  }));
                                }}
                              />
                              <span className="service-name">
                                {service.service_name}
                              </span>
                              <span className="service-price">
                                {BASE_CURRENCY}
                                {Number(service.price).toLocaleString()}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="price-summary">
                    <h4>Price Summary</h4>
                    <div className="price-line">
                      <span>Night(s):</span>
                      <span>{nightsCount()}</span>
                    </div>
                    <div className="price-line total">
                      <span>Total : </span>
                      <span>
                        {BASE_CURRENCY}
                        {calculatePrice(
                          roomTypes.find(
                            (rt) => rt.id === bookingRoom.room_type_id,
                          ) || {
                            base_price: bookingRoom.base_price || 0,
                            id: bookingRoom.room_type_id,
                          },
                          bookingInfo,
                          nightsCount(),
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button
                      className="cancel-btn"
                      onClick={() => {
                        setShowBookingModal(false);
                        setBookingRoom(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="confirm-btn"
                      onClick={() => {
                        if (bookingStep1Valid()) setBookingStep(2);
                      }}
                      disabled={!bookingStep1Valid()}
                    >
                      Proceed to Guest Info
                    </button>
                  </div>
                </>
              )}

              {bookingStep === 2 && (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Phone*</label>
                      <input
                        type="tel"
                        name="phone"
                        value={guestInfo.phone}
                        onChange={(e) => {
                          const phone = e.target.value;
                          setGuestInfo((prev) => ({
                            ...prev,
                            phone: phone,
                          }));
                          searchGuestByPhone(phone);
                        }}
                        required
                      />
                      {searchingGuest && (
                        <div className="guest-search-indicator">
                          <FiLoader className="spin" /> Searching...
                        </div>
                      )}
                      {!searchingGuest && multipleGuests.length > 0 && (
                        <div className="guest-status multiple-guests">
                          <span className="status-indicator">●</span>
                          {multipleGuests.length} Guests Found - Please Select
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={guestInfo.email}
                        onChange={(e) =>
                          setGuestInfo((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label>Full Name*</label>{" "}
                      <input
                        name="fullName"
                        value={guestInfo.fullName}
                        onChange={(e) =>
                          setGuestInfo((prev) => ({
                            ...prev,
                            fullName: e.target.value,
                          }))
                        }
                        required
                      />{" "}
                    </div>

                    <div className="form-group">
                      <label>Age*</label>{" "}
                      <input
                        name="age"
                        value={guestInfo.age}
                        onChange={(e) =>
                          setGuestInfo((prev) => ({
                            ...prev,
                            age: e.target.value,
                          }))
                        }
                        required
                      />{" "}
                    </div>

                    <div className="form-group">
                      <label>Address</label>
                      <input
                        name="address"
                        value={guestInfo.address}
                        onChange={(e) =>
                          setGuestInfo((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>ID Type</label>
                      <select
                        name="idType"
                        value={guestInfo.idType}
                        onChange={(e) =>
                          setGuestInfo((prev) => ({
                            ...prev,
                            idType: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select ID Type</option>
                        <option value="Passport">Passport</option>
                        <option value="National ID">National ID</option>
                        <option value="Driver License">Driver License</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>ID Number</label>
                      <input
                        name="idNumber"
                        value={guestInfo.idNumber}
                        onChange={(e) =>
                          setGuestInfo((prev) => ({
                            ...prev,
                            idNumber: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Company Name</label>
                      <input
                        name="company"
                        value={guestInfo.company}
                        onChange={(e) =>
                          setGuestInfo((prev) => ({
                            ...prev,
                            company: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>GST Number</label>
                      <input
                        name="gst"
                        value={guestInfo.gst}
                        onChange={(e) =>
                          setGuestInfo((prev) => ({
                            ...prev,
                            gst: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Special Requests</label>
                    <textarea
                      name="notes"
                      value={guestInfo.notes}
                      onChange={(e) =>
                        setGuestInfo((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Any special requests or notes..."
                    />
                  </div>

                  <div className="reservation-summary">
                    <h4>Reservation Summary</h4>

                    <div className="summary-item">
                      <p>
                        <strong>{bookingInfo.reservationName}</strong>
                      </p>
                      <p>
                        {bookingRoom.room_type} × {bookingInfo.units}
                      </p>
                      {
                        <p>
                          Room:({bookingRoom.charge_code}
                          {bookingRoom.unit_number})
                        </p>
                      }
                      <p>
                        {format(
                          parseISO(selectedDate.split("-").reverse().join("-")),
                          "MMM d, yyyy",
                        )}{" "}
                        to{" "}
                        {format(parseISO(bookingInfo._checkout), "MMM d, yyyy")}
                      </p>
                      <p>
                        Pricing Mode:{" "}
                        {bookingInfo.useBasePrice ? "Base Price" : "Per Person"}
                      </p>
                    </div>

                    {bookingInfo.extraServices.length > 0 && (
                      <div className="extra-services-summary">
                        <div className="sub-header">Extra Services:</div>
                        {bookingInfo.extraServices.map((serviceId) => {
                          const service = extraServices.find(
                            (s) => s.id === serviceId,
                          );
                          return service ? (
                            <div key={serviceId} className="price-line">
                              <span>{service.service_name}</span>
                              <span>
                                {" "}
                                : {BASE_CURRENCY}
                                {Number(service.price).toLocaleString()}
                              </span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}

                    <div className="summary-total">
                      <p>Total:</p>
                      <p>
                        {BASE_CURRENCY}
                        {calculatePrice(
                          roomTypes.find(
                            (rt) => rt.id === bookingRoom.room_type_id,
                          ) || {
                            base_price: bookingRoom.base_price || 0,
                            id: bookingRoom.room_type_id,
                          },
                          bookingInfo,
                          nightsCount(),
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button
                      className="cancel-btn"
                      onClick={() => {
                        setBookingStep(1);
                      }}
                    >
                      Back
                    </button>
                    <button
                      className="save-btn"
                      disabled={
                        !guestInfo.fullName || !guestInfo.phone || saveLoading
                      }
                      onClick={saveReservation}
                    >
                      <FiSave />{" "}
                      {saveLoading ? "Saving..." : "Confirm Reservation"}
                    </button>
                  </div>
                </>
              )}

              {bookingStep === 3 && (
                <>
                  <div className="payment-step">
                    <h4>Payment for Reservation</h4>
                    <p>
                      Reservation ID: <strong>{reservationId}</strong>
                    </p>
                    <div className="form-group">
                      <label>Total Amount</label>
                      <div>
                        {BASE_CURRENCY}
                        {Number(reservationTotal).toLocaleString()}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Payment Amount</label>
                      <input
                        type="number"
                        min="0"
                        max={reservationTotal}
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) =>
                          setPaymentAmount(Number(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label>Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Check">Check</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="modal-actions">
                      <button
                        style={{
                          backgroundColor: "#e53935", // red
                          color: "white",
                          padding: "10px 18px",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor:
                            processingPayment || processingCancelBooking
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            processingPayment || processingCancelBooking
                              ? 0.6
                              : 1,
                          transition: "0.2s",
                        }}
                        onClick={handleCancelFromPayment}
                        disabled={processingPayment || processingCancelBooking}
                      >
                        {processingCancelBooking
                          ? "Cancelling..."
                          : "Cancel Booking"}
                      </button>

                      <button
                        style={{
                          backgroundColor: "#c28616ff",
                          color: "white",
                          padding: "10px 18px",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor:
                            processingPayment || processingCancelBooking
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            processingPayment || processingCancelBooking
                              ? 0.6
                              : 1,
                          transition: "0.2s",
                        }}
                        onClick={handleSkipPayment}
                        disabled={processingPayment || processingCancelBooking}
                      >
                        Check In
                      </button>

                      <button
                        style={{
                          backgroundColor: "#1b7b03ff", // red
                          color: "white",
                          padding: "10px 18px",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor:
                            processingPayment || processingCancelBooking
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            processingPayment || processingCancelBooking
                              ? 0.6
                              : 1,
                          transition: "0.2s",
                        }}
                        onClick={handleProcessPayment}
                        disabled={
                          processingPayment ||
                          processingCancelBooking ||
                          paymentAmount <= 0
                        }
                      >
                        {processingPayment
                          ? "Processing..."
                          : "Process Check In & Payment"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {showGuestListModal && selectedRoomForGuests && (
        <div className="modal-overlay">
          <div className="modal booking-modal">
            <div className="modal-header">
              <h3>
                Booked Guests – {selectedRoomForGuests.room_type || "Room"}{" "}
                {selectedRoomForGuests.charge_code}
                {selectedRoomForGuests.unit_number}
              </h3>
              <button
                onClick={() => {
                  setShowGuestListModal(false);
                  setSelectedRoomForGuests(null);
                }}
              >
                <FiX />
              </button>
            </div>

            <div className="modal-content">
              {(!selectedRoomForGuests.reservations ||
                !selectedRoomForGuests.reservations.length) && (
                  <div>No bookings found for this room on selected date.</div>
                )}

              {selectedRoomForGuests.reservations &&
                selectedRoomForGuests.reservations.map((res, idx) => {
                  const guest =
                    (selectedRoomForGuests.guests || [])[idx] || null;
                  const isCancelable =
                    (res.status || "").toLowerCase() === "confirmed";
                  const canCheckInNow = canCheckInReservation(res);

                  return (
                    <div
                      key={res.id}
                      className="guest-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        marginBottom: "8px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      <div
                        className="guest-main"
                        style={{ flex: 1, marginRight: "12px" }}
                      >
                        <div
                          className="guest-name"
                          style={{
                            fontWeight: 600,
                            marginBottom: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {guest
                            ? `${guest.firstName || ""} ${guest.lastName || ""
                              }`.trim() || "Unknown Guest"
                            : "Unknown Guest"}
                          <span
                            style={{
                              fontSize: "0.75rem",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              backgroundColor:
                                (res.status || "").toLowerCase() === "confirmed"
                                  ? "#e3f2fd"
                                  : (res.status || "").toLowerCase() ===
                                    "checked in"
                                    ? "#e8f5e9"
                                    : "#fbe9e7",
                              color:
                                (res.status || "").toLowerCase() === "confirmed"
                                  ? "#1565c0"
                                  : (res.status || "").toLowerCase() ===
                                    "checked in"
                                    ? "#2e7d32"
                                    : "#d84315",
                            }}
                          >
                            {res.status || "Unknown"}
                          </span>
                        </div>

                        <div
                          className="guest-meta"
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "8px",
                            fontSize: "0.85rem",
                            color: "#555",
                          }}
                        >
                          {guest?.phone && <span>📞 {guest.phone}</span>}
                          {guest?.email && <span>✉️ {guest.email}</span>}
                          {res.checkIn && res.checkOut && (
                            <span>
                              📅 {format(parseISO(res.checkIn), "MMM d, yyyy")}{" "}
                              – {format(parseISO(res.checkOut), "MMM d, yyyy")}
                            </span>
                          )}
                          {res.reservation_number && (
                            <span>🧾 {res.reservation_number}</span>
                          )}
                        </div>
                      </div>

                      <div
                        className="guest-actions"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          minWidth: 170,
                        }}
                      >
                        <button
                          onClick={() => handleCheckinBooking(res.id)}
                          disabled={
                            !canCheckInNow || processingCheckinId === res.id
                          }
                          style={{
                            backgroundColor: canCheckInNow
                              ? "#2e7d32"
                              : "#c8e6c9",
                            color: canCheckInNow ? "#fff" : "#555",
                            padding: "6px 10px",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor:
                              !canCheckInNow || processingCheckinId === res.id
                                ? "not-allowed"
                                : "pointer",
                            opacity: processingCheckinId === res.id ? 0.7 : 1,
                          }}
                        >
                          {processingCheckinId === res.id
                            ? "Checking in..."
                            : canCheckInNow
                              ? "Check In"
                              : "Cannot Check In Yet"}
                        </button>

                        <button
                          className="cancel-btn"
                          disabled={
                            !isCancelable || processingCancelId === res.id
                          }
                          onClick={() => handleCancelBooking(res.id)}
                          style={{
                            minWidth: "130px",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            backgroundColor: isCancelable
                              ? "#e53935"
                              : "#ffcdd2",
                            color: isCancelable ? "#fff" : "#555",
                            cursor:
                              !isCancelable || processingCancelId === res.id
                                ? "not-allowed"
                                : "pointer",
                            opacity: processingCancelId === res.id ? 0.7 : 1,
                          }}
                        >
                          {processingCancelId === res.id
                            ? "Cancelling..."
                            : isCancelable
                              ? "Cancel Booking"
                              : "Not Cancellable"}
                        </button>
                        <button
                          className="cancel-btn"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent opening booking/stay modal
                            setSelectedPrintReservation(res.id);
                            setShowPrintModal(true);
                          }}
                          style={{
                            minWidth: "130px",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            backgroundColor: "#e49712ff",
                            color: "#fff",
                          }}
                        >
                          <FiPrinter /> Print
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {showStayModal && selectedStayRoom && (
        <div className="modal-overlay">
          <div className="modal booking-modal">
            <div className="modal-header">
              <h3>
                Staying Guest – {selectedStayRoom.room_type || "Room"}{" "}
                {selectedStayRoom.charge_code}
                {selectedStayRoom.unit_number}
              </h3>
              <button
                onClick={() => {
                  setShowStayModal(false);
                  setSelectedStayRoom(null);
                }}
              >
                <FiX />
              </button>
            </div>

            <div className="modal-content">
              {selectedStayRoom.reservation && selectedStayRoom.guest ? (
                <>
                  <div
                    style={{
                      marginBottom: "12px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(0,0,0,0.08)",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                        {selectedStayRoom.guest.firstName}{" "}
                        {selectedStayRoom.guest.lastName}
                      </div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          backgroundColor: "#e8f5e9",
                          color: "#2e7d32",
                        }}
                      >
                        {selectedStayRoom.reservation.status || "Checked in"}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        fontSize: "0.85rem",
                        color: "#555",
                      }}
                    >
                      {selectedStayRoom.guest.phone && (
                        <span>📞 {selectedStayRoom.guest.phone}</span>
                      )}
                      {selectedStayRoom.guest.email && (
                        <span>✉️ {selectedStayRoom.guest.email}</span>
                      )}
                      {selectedStayRoom.reservation.checkIn &&
                        selectedStayRoom.reservation.checkOut && (
                          <span>
                            📅{" "}
                            {format(
                              parseISO(selectedStayRoom.reservation.checkIn),
                              "MMM d, yyyy",
                            )}{" "}
                            –{" "}
                            {format(
                              parseISO(selectedStayRoom.reservation.checkOut),
                              "MMM d, yyyy",
                            )}
                          </span>
                        )}
                      {selectedStayRoom.reservation.reservation_number && (
                        <span>
                          🧾 {selectedStayRoom.reservation.reservation_number}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="stay-editor-section-title">
                    <span>Reservation stay</span>
                    <small>Overall check-in/check-out for this reservation.</small>
                  </div>

                  {/* Change Stay Dates */}
                  <div className="form-group">
                    <label>Check-in Date</label>
                    <input
                      type="date"
                      value={stayCheckinDate}
                      max={stayCheckoutDate || undefined}
                      onChange={(e) =>
                        updateReservationStayField("checkInDate", e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Check-in Time</label>
                    <FiveMinuteTimePicker
                      id="stay-checkin-time-input"
                      value={stayCheckinTime}
                      fallback="00:00"
                      onChange={(value) =>
                        updateReservationStayField("checkInTime", value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Check-out Date</label>
                    <input
                      type="date"
                      value={stayCheckoutDate}
                      min={stayCheckinDate || undefined}
                      onChange={(e) =>
                        updateReservationStayField("checkOutDate", e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Check-out Time</label>
                    <FiveMinuteTimePicker
                      id="stay-checkout-time-input"
                      value={stayCheckoutTime}
                      fallback="23:00"
                      onChange={(value) =>
                        updateReservationStayField("checkOutTime", value)
                      }
                    />
                  </div>

                  {stayModalMode === "checkout" &&
                    selectedStayRoom.reservation.rooms?.length > 0 && (
                      <div className="reservation-room-stay-editor">
                        <div className="reservation-room-stay-editor-header">
                          <span>Room-wise stay</span>
                          <small>
                            Set the exact check-in/check-out period for each room.
                          </small>
                        </div>

                        {selectedStayRoom.reservation.rooms.map((room) => {
                          const roomKey = room.reservation_room_id || room.id;
                          const roomStay = reservationRoomStays[roomKey] || {};
                          const roomLabel = `${room.charge_code || ""}${room.unit_number || ""}`;

                          return (
                            <div
                              key={roomKey}
                              className="reservation-room-stay-card"
                            >
                              <div className="reservation-room-stay-title">
                                <strong>{roomLabel || "Room"}</strong>
                                <span>{room.room_type || "Room"}</span>
                                {room.is_ac ? (
                                  <span className="reservation-ac-badge">AC</span>
                                ) : null}
                              </div>

                              <label>
                                Check-in date
                                <input
                                  type="date"
                                  min={stayCheckinDate || undefined}
                                  max={
                                    roomStay.checkOutDate ||
                                    stayCheckoutDate ||
                                    undefined
                                  }
                                  value={roomStay.checkInDate || ""}
                                  onChange={(e) =>
                                    updateReservationRoomStay(
                                      roomKey,
                                      "checkInDate",
                                      e.target.value,
                                    )
                                  }
                                />
                              </label>

                              <label>
                                Check-in time
                                <FiveMinuteTimePicker
                                  id={`room-${roomKey}-checkin-time`}
                                  value={roomStay.checkInTime}
                                  fallback="00:00"
                                  onChange={(value) =>
                                    updateReservationRoomStay(
                                      roomKey,
                                      "checkInTime",
                                      value,
                                    )
                                  }
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  <div style={{ fontSize: "0.8rem", color: "#666" }}>
                    Current Stay:{" "}
                    {selectedStayRoom.reservation.checkIn &&
                      format(
                        parseISO(selectedStayRoom.reservation.checkIn),
                        "MMM d, yyyy",
                      )}{" "}
                    –{" "}
                    {selectedStayRoom.reservation.checkOut &&
                      format(
                        parseISO(selectedStayRoom.reservation.checkOut),
                        "MMM d, yyyy",
                      )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                      marginTop: 16,
                    }}
                  >
                    {stayModalMode === "full" && (
                      <>
                        <button
                          className="cancel-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPrintReservation(
                              selectedStayRoom.reservation.id,
                            );
                            setShowPrintModal(true);
                          }}
                        >
                          <FiPrinter /> Print
                        </button>
                        <button
                          type="button"
                          className="submit-btn"
                          onClick={() => {
                            if (!selectedStayRoom?.reservations?.length) return;
                            setSelectedPaymentBooking(
                              selectedStayRoom.reservations[0],
                            );
                            setShowPaymentModal(true);
                            setShowStayModal(false);
                            setSelectedStayRoom(null);
                          }}
                          disabled={!selectedStayRoom?.reservations?.length}
                        >
                          Process Payment
                        </button>
                        <button
                          type="button"
                          className="submit-btn"
                          onClick={() => handleOpenRoomTransfer()}
                        >
                          Change Room
                        </button>
                      </>
                    )}

                    <button
                      style={{
                        padding: "8px 14px",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        backgroundColor: "#1976d2",
                        color: "#fff",
                        cursor: processingUpdateCheckout
                          ? "not-allowed"
                          : "pointer",
                        opacity: processingUpdateCheckout ? 0.7 : 1,
                      }}
                      onClick={handleUpdateCheckoutDate}
                    >
                      {processingUpdateCheckout
                        ? "Updating..."
                        : "Update Checkout Date"}
                    </button>

                    {stayModalMode === "full" && (
                      <button
                        className="cancel-btn"
                        disabled={
                          !canCheckoutReservation(selectedStayRoom.reservation) ||
                          processingCheckoutId === selectedStayRoom.reservation.id
                        }
                        onClick={() =>
                          handleCheckoutBooking(selectedStayRoom.reservation.id)
                        }
                      >
                        {processingCheckoutId === selectedStayRoom.reservation.id
                          ? "Checking out..."
                          : "Checkout"}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div>No staying guest data found for this room.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRoomTransfer && selectedStayRoom && (
        <div className="modal-overlay">
          <div className="modal small-modal">
            <div className="modal-header">
              <h4>Change Room</h4>
              <button
                className="close-btn"
                onClick={() => setShowRoomTransfer(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-content">
              <div className="transfer-current-room">
                Current room:{" "}
                <strong>
                  {selectedStayRoom.charge_code}{selectedStayRoom.unit_number}
                </strong>
              </div>
              <div className="form-group">
                <label>Transfer Date</label>
                <input
                  type="date"
                  value={transferDate}
                  min={selectedStayRoom.reservation.checkIn}
                  max={selectedStayRoom.reservation.checkOut}
                  onChange={async (event) => {
                    const date = event.target.value;
                    setTransferDate(date);
                    setTransferRoomId("");
                    setTransferRate("");
                    try {
                      await loadTransferRooms(date);
                    } catch (error) {
                      showSnackbar(
                        error.response?.data?.error ||
                        "Failed to refresh available rooms",
                        "error",
                      );
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label>Transfer Time</label>
                <FiveMinuteTimePicker
                  id="stay-checkin-time-input"
                  value={transferTime}
                  fallback="00:00"
                  onChange={(value) =>
                    setTransferTime(value)
                  }
                />
              </div>
              <div className="form-group">
                <label>New Room</label>
                <select
                  value={transferRoomId}
                  onChange={(event) => {
                    const roomId = event.target.value;
                    setTransferRoomId(roomId);
                    const room = transferRooms.find(
                      (item) => String(item.id) === roomId,
                    );
                    const mealPlan = room
                      ? getDefaultMealPlanForRoomType(room.room_type_id)
                      : null;
                    const roomType = roomTypes.find(
                      (item) => item.id === room?.room_type_id,
                    );
                    setTransferRate(
                      mealPlan?.base_price || roomType?.base_price || "",
                    );
                  }}
                >
                  <option value="">Select available room</option>
                  {transferRooms.map((room) => (
                    <option value={room.id} key={room.id}>
                      {room.charge_code}{room.unit_number} - {room.room_type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>New Room Daily Rate</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={transferRate}
                  onChange={(event) => setTransferRate(event.target.value)}
                />
              </div>
              <FormControlLabel
                control={
                  <Switch
                    checked={transferIsAc}
                    onChange={(event) => setTransferIsAc(event.target.checked)}
                  />
                }
                label="AC Room"
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowRoomTransfer(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="submit-btn"
                  disabled={processingTransfer}
                  onClick={handleTransferRoom}
                >
                  {processingTransfer ? "Changing..." : "Confirm Room Change"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddRoom && addRoomReservation && (
        <div className="modal-overlay">
          <div className="modal small-modal">
            <div className="modal-header">
              <h4>Add Room</h4>
              <button
                className="close-btn"
                onClick={() => {
                  setShowAddRoom(false);
                  setAddRoomReservation(null);
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-content">
              <div className="transfer-current-room">
                Reservation:{" "}
                <strong>
                  {addRoomReservation.reservation_number ||
                    addRoomReservation.id}
                </strong>
              </div>
              <div className="form-group">
                <label>Room Start Date</label>
                <input
                  type="date"
                  value={addRoomDate}
                  min={addRoomReservation.checkIn}
                  max={addRoomReservation.checkOut}
                  onChange={async (event) => {
                    const date = event.target.value;
                    setAddRoomDate(date);
                    setAddRoomId("");
                    setAddRoomRate("");
                    try {
                      await loadAddRoomOptions(addRoomReservation, date);
                    } catch (error) {
                      showSnackbar(
                        error.response?.data?.error ||
                        "Failed to refresh available rooms",
                        "error",
                      );
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label>Room Start Time</label>
                <FiveMinuteTimePicker
                  id="stay-checkin-time-input"
                  value={addRoomTime}
                  fallback="00:00"
                  onChange={(value) =>
                    setAddRoomTime(value)
                  }
                />
              </div>
              <div className="form-group">
                <label>New Room</label>
                <select
                  value={addRoomId}
                  onChange={(event) => {
                    const roomId = event.target.value;
                    setAddRoomId(roomId);
                    const room = addRoomOptions.find(
                      (item) => String(item.id) === roomId,
                    );
                    const mealPlan = room
                      ? getDefaultMealPlanForRoomType(room.room_type_id)
                      : null;
                    const roomType = roomTypes.find(
                      (item) => item.id === room?.room_type_id,
                    );
                    setAddRoomRate(
                      mealPlan?.base_price || roomType?.base_price || "",
                    );
                  }}
                >
                  <option value="">Select available room</option>
                  {addRoomOptions.map((room) => (
                    <option value={room.id} key={room.id}>
                      {room.charge_code}
                      {room.unit_number} - {room.room_type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Room Daily Rate</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addRoomRate}
                  onChange={(event) => setAddRoomRate(event.target.value)}
                />
              </div>
              <FormControlLabel
                control={
                  <Switch
                    checked={addRoomIsAc}
                    onChange={(event) =>
                      setAddRoomIsAc(event.target.checked)
                    }
                  />
                }
                label="AC Room"
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddRoom(false);
                    setAddRoomReservation(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="submit-btn"
                  disabled={processingAddRoom}
                  onClick={handleAddRoom}
                >
                  {processingAddRoom ? "Adding..." : "Add Room"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPaymentModal && (
        <PaymentModal
          selectedBooking={selectedPaymentBooking}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPaymentBooking(null);
            refreshAllData();
          }}
          onPaymentComplete={() => {
            setShowPaymentModal(false);
            setSelectedPaymentBooking(null);
            refreshAllData();
          }}
        />
      )}
      {showPrintModal && selectedPrintReservation && (
        <div className="modal-overlay">
          <div className="modal small-modal">
            <div className="modal-header">
              <h4>Print Documents</h4>
              <button
                className="close-btn"
                onClick={() => {
                  setShowPrintModal(false);
                  setSelectedPrintReservation(null);
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-content">
              <p>
                What would you like to print for reservation{" "}
                <strong>{selectedPrintReservation.id}</strong>?
              </p>

              <div className="print-options">
                <button
                  className="print-option"
                  onClick={() =>
                    handlePrintInvoice(
                      selectedPrintReservation,
                      "payment_receipt",
                    )
                  }
                >
                  <FiPrinter /> Payment Receipt
                </button>
                <button
                  className="print-option"
                  onClick={() =>
                    handlePrintInvoice(selectedPrintReservation, "invoice")
                  }
                >
                  <FiPrinter /> Full Invoice
                </button>
                <button
                  className="print-option"
                  onClick={() =>
                    handlePrintInvoice(selectedPrintReservation, "voucher")
                  }
                >
                  <FiPrinter /> Booking Voucher
                </button>
              </div>

              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowPrintModal(false);
                    setSelectedPrintReservation(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGuestSelectionModal && (
        <div className="modal-overlay">
          <div className="modal small-modal">
            <div className="modal-header">
              <h4>Select Guest</h4>
              <button
                className="close-btn"
                onClick={() => {
                  setShowGuestSelectionModal(false);
                  setMultipleGuests([]);
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-content">
              <p>
                Multiple guests found with this phone number. Please select the
                correct guest:
              </p>
              <div className="guest-selection-list">
                {multipleGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="guest-selection-item"
                    onClick={() => handleGuestSelection(guest)}
                  >
                    <div className="guest-info">
                      <strong>
                        {guest.first_name} {guest.last_name}
                      </strong>
                      {guest.email && (
                        <div className="guest-detail">📧 {guest.email}</div>
                      )}
                      {guest.address && (
                        <div className="guest-detail">📍 {guest.address}</div>
                      )}
                      {guest.company && (
                        <div className="guest-detail">🏢 {guest.company}</div>
                      )}
                    </div>
                    <button className="select-btn">Select</button>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowGuestSelectionModal(false);
                    setMultipleGuests([]);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGroupBooking && selectedProperty && (
        <GroupBookingModal
          open={showGroupBooking}
          onClose={() => setShowGroupBooking(false)}
          property={properties.find(
            (item) => String(item.business_entity_id) === String(selectedProperty),
          )}
          dateRange={{
            startDate: parseISO(selectedDate.split("-").reverse().join("-")),
            endDate: addDays(
              parseISO(selectedDate.split("-").reverse().join("-")),
              1,
            ),
          }}
          roomTypes={roomTypes}
          mealPlans={mealPlans}
          extraServices={extraServices}
          showSnackbar={showSnackbar}
          onCreated={refreshAllData}
        />
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
    </div>
  );
}
