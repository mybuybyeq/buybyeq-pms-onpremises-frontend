import { useState, useEffect, useRef } from "react";
import {
  FiSearch,
  FiFilter,
  FiPrinter,
  FiMail,
  FiEye,
  FiLoader,
  FiPlus,
  FiFile,
  FiCreditCard,
  FiDollarSign,
  FiEdit,
  FiMinusCircle,
} from "react-icons/fi";
import axios from "../../api/axios";
import { Snackbar, Alert } from "@mui/material";
import { format, parseISO } from "date-fns";
import { format as formatWithSuffix } from "date-fns";
import { format as formatOrdinal } from "date-fns";
import "./guest.scss";
import { BASE_CURRENCY } from "../../constants/currency";
import { sendEmail } from "../../assets/helpers";

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

const GuestManagement = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    dateRange: "current",
  });
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [guestBilling, setGuestBilling] = useState(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [showHotelDropdown, setShowHotelDropdown] = useState(false);
  const hotelDropdownRef = useRef(null);
  const [properties, setProperties] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showEditGuestModal, setShowEditGuestModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [editLoading, setEditLoading] = useState(false);


  const handleOpenPaymentModal = (booking) => {
    setSelectedBooking(booking);
    setShowPaymentModal(true);
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setShowPaymentModal(false);
  };

  const handlePaymentComplete = () => {
    showSnackbar("Payment completed successfully");
    closeModal();
  };

  const PaymentModal = ({ selectedBooking, onClose, onPaymentComplete }) => {
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
    const [editingRoom, setEditingRoom] = useState(null);
    const [editRoomPrice, setEditRoomPrice] = useState("");
    const [discountType, setDiscountType] = useState("flat"); // 'flat' or 'percent'
    const [discountValue, setDiscountValue] = useState(0);
    const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
    const [showRoomDiscountModal, setShowRoomDiscountModal] = useState(false);
    const [roomDiscountType, setRoomDiscountType] = useState("flat"); // "flat" or "percent"
    const [roomDiscountValue, setRoomDiscountValue] = useState(0);
    const [roomDiscountLoading, setRoomDiscountLoading] = useState(false);
    const [discountingService, setDiscountingService] = useState(null);
    const [serviceDiscountType, setServiceDiscountType] = useState("flat"); // "flat" | "percent"
    const [serviceDiscountValue, setServiceDiscountValue] = useState(0);
    const [isDiscountingService, setIsDiscountingService] = useState(false);
    const [roomDiscountNote, setRoomDiscountNote] = useState("");
    const [serviceDiscountNote, setServiceDiscountNote] = useState("");
    const [discountNote, setDiscountNote] = useState("");
    const [amount, setAmount] = useState(0);
    const [gstEnabled, setGstEnabled] = useState(false);
    const [igstMode, setIgstMode] = useState(false);
    const [gstLoading, setGstLoading] = useState(false);

    useEffect(() => {
      if (booking) {
        setAmount(booking.totalAmount - booking.totalPaid);
      }
    }, [booking]);

    const fetchPaymentDetail = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`pms/guests/payment/${selectedBooking.id}`, {
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
        setLoading(false);
      }
    };
    useEffect(() => {
      fetchPaymentDetail();
    }, []);
    const handleRefresh = async () => {
      await fetchPaymentDetail();
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

    const handleApplyDiscount = async () => {
      setIsApplyingDiscount(true);

      try {
        const response = await axios.put(`/reservations/discount/${booking.id}`, {
          discountAmount: computedDiscount,
          discount_note: discountNote,
        });

        alert("Discount applied successfully!");
        await handleRefresh();
      } catch (error) {
        console.error("Failed to apply discount:", error);
        alert("Failed to apply discount.");
      } finally {
        setIsApplyingDiscount(false);
      }
    };

    const handleEditRoom = () => {
      setEditingRoom({
        id: booking.id,
        name: `${booking.roomType} - ${booking.roomNumber}`,
      });
      setEditRoomPrice(booking.roomRate + booking.roomDiscount || 0);
    };

    const handleSubmitRoomEdit = async () => {
      try {
        await axios.put(`/pms/reservationRooms/edit/${editingRoom.id}`, {
          rate: parseFloat(editRoomPrice) - (booking.roomDiscount || 0),
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
      setEditingService(service);
      setEditPrice(service.price + service.discount || 0);
    };

    const handleSubmitEdit = async () => {
      try {
        await axios.put(`/editByService/${editingService.reservation_id}/${editingService.id}`, {
          rate: parseFloat(editPrice) - parseFloat(editingService.discount || 0),
          quantity: editingService.quantity || 1,
          service_date: editingService.date,
        });

        alert("Service updated successfully!");
        setEditingService(null);
        await handleRefresh();
      } catch (error) {
        console.error("Failed to update service:", error);
        alert("Failed to update service.");
      }
    };

    const handleDeleteService = async (serviceId, reservationId) => {
      if (!window.confirm("Are you sure you want to delete this service?")) return;

      try {
        await axios.delete(`/reservationServices/deleteByService/${reservationId}/${serviceId}`);
        alert("Service deleted successfully!");
        await handleRefresh();
      } catch (error) {
        console.error("Failed to delete service:", error);
        alert("Failed to delete service.");
      }
    };

    const handleAddServiceClick = async () => {
      try {
        const response = await axios.get(`pms/extra-services/getAll/${null}/${booking.property_id}`);
        setAvailableServices(response.data || []);
        setShowServiceModal(true);
      } catch (error) {
        console.error("Failed to fetch extra services", error);
        alert("Could not load extra services.");
      }
    };
    const toggleService = (service) => {
      setSelectedServices((prev) =>
        prev.some((s) => s.id === service.id) ? prev.filter((s) => s.id !== service.id) : [...prev, service],
      );
    };

    const handleAddServices = async () => {
      try {
        for (const service of selectedServices) {
          const servicePayload = {
            reservation_id: booking.id,
            service_id: service.id,
            quantity: 1,
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
      } finally {
        setProcessing(false);
      }
    };
    const computedDiscount = discountType === "percent" ? (booking.totalAmount * discountValue) / 100 : discountValue;

    const discountedSubtotal = Math.max(0, booking.totalAmount - computedDiscount);
    const balanceDue = Math.max(0, discountedSubtotal - booking.totalPaid);
    const handleToggleGst = async () => {
      const newValue = !gstEnabled;
      setGstLoading(true);

      try {
        const response = await axios.post(`/pms/bookings/add_gst/${booking.id}`, {
          enable_gst: newValue,
          is_igst: newValue ? igstMode : false,
        });

        setGstEnabled(newValue);

        if (response.data?.reservation) {
          const r = response.data.reservation;

          booking.totalAmount = parseFloat(r.total_amount);
          booking.totalPaid = r.total_paid !== undefined ? parseFloat(r.total_paid) : booking.totalPaid;

          booking.cgst = r.cgst !== undefined ? parseFloat(r.cgst) : booking.cgst;
          booking.sgst = r.sgst !== undefined ? parseFloat(r.sgst) : booking.sgst;
          booking.igst = r.igst !== undefined ? parseFloat(r.igst) : booking.igst;
          booking.is_gst_applied = r.is_gst_applied !== undefined ? Number(r.is_gst_applied) : booking.is_gst_applied;
          booking.is_igst = r.is_igst !== undefined ? Number(r.is_igst) : booking.is_igst;
          setGstEnabled(Number(booking.is_gst_applied || 0) === 1);
          setIgstMode(Number(booking.is_igst || 0) === 1);

          setAmount(booking.totalAmount - booking.totalPaid);
        }
        
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
        await handleRefresh();
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
                <span>Room:</span>
                <span>
                  {booking.roomType} - {booking.roomNumber}
                </span>
              </div>

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
                    Room Price: - {BASE_CURRENCY}
                    {booking.roomRate + booking.roomDiscount}
                  </span>
                  <button onClick={handleEditRoom} className="icon-button" title="Edit Room Rate">
                    ✏️
                  </button>
                </div>

                <div className="form-group">
                  <button
                    className="submit-btn"
                    onClick={() => {
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

              {/* <div className="info-row">
              <span>Amount Paid:</span>
              <span>{BASE_CURRENCY}{booking.totalPaid || '0.00'}</span>
            </div>
            <div className="info-row">
              <span>Balance Due:</span>
              <span>{BASE_CURRENCY}{((booking.totalAmount || 0) - (booking.totalPaid || 0))}</span>
            </div> */}
            </div>
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
                <button type="button" className="icon-button" onClick={handleAddServiceClick}>
                  <FiPlus />
                </button>
              </div>
            </div>

            {/* Service List */}
            {booking.services?.length > 0 ? (
              <ul className="service-list" style={{ paddingLeft: "16px", marginTop: "8px" }}>
                {booking.services.map((service) => (
                  <li
                    key={service.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <span>
                      {service.name} –{" "}
                      <strong>
                        {BASE_CURRENCY}
                        {(service.price + (service.discount || 0)).toFixed(2)}
                      </strong>
                      {service.date ? ` (${format(parseISO(service.date), "dd MMM yyyy")})` : ""}
                    </span>
                    <span style={{ display: "flex", gap: "10px" }}>
                      <button onClick={() => handleEditService(service)} className="icon-button" title="Edit">
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id, service.reservation_id)}
                        className="icon-button"
                        title="Delete"
                      >
                        🗑️
                      </button>
                      <button
                        onClick={() => {
                          setDiscountingService(service);
                          setServiceDiscountType("flat");
                          setServiceDiscountValue(0);
                        }}
                        className="icon-button"
                        title="Discount"
                      >
                        <FiMinusCircle />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontStyle: "italic", color: "#777" }}>No services added.</p>
            )}
            <hr style={{ margin: "16px 0" }} />
            <div className="info-row">
              <label>
                <strong>Discount Type:</strong>
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                style={{ marginLeft: "10px" }}
              >
                <option value="flat">Fixed Amount</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>

            <div className="info-row">
              <label>
                <strong>Discount {discountType === "percent" ? "(%)" : `(${BASE_CURRENCY})`}:</strong>
              </label>
              <input
                type="number"
                min="0"
                max={discountType === "percent" ? 100 : booking.totalAmount}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                style={{ marginLeft: "10px", width: "100px" }}
              />
            </div>
            <div className="form-group">
              <label>Note (optional, max 90 chars)</label>
              <input
                type="text"
                maxLength="90"
                value={discountNote}
                onChange={(e) => setDiscountNote(e.target.value)}
                placeholder="Enter discount reason"
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "8px",
              }}
            >
              <button
                className="submit-btn"
                onClick={handleApplyDiscount}
                disabled={isApplyingDiscount || computedDiscount <= 0}
              >
                {isApplyingDiscount ? "Applying..." : "Apply Discount"}
              </button>
            </div>

            {editingRoom && (
              <div className="modal-overlay">
                <div className="modal small-modal">
                  <div className="modal-header">
                    <h4>Edit Room Price</h4>
                    <button className="close-btn" onClick={() => setEditingRoom(null)}>
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
                    <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button className="cancel-btn" onClick={() => setEditingRoom(null)}>
                        Cancel
                      </button>
                      <button className="submit-btn" onClick={handleSubmitRoomEdit}>
                        Save
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
                    <button className="close-btn" onClick={() => setShowRoomDiscountModal(false)}>
                      &times;
                    </button>
                  </div>

                  <div className="modal-content">
                    <div className="form-group">
                      <label>Discount Type</label>
                      <select value={roomDiscountType} onChange={(e) => setRoomDiscountType(e.target.value)}>
                        <option value="flat">Flat Amount</option>
                        <option value="percent">Percentage</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Discount Value {roomDiscountType === "percent" ? "(%)" : `(${BASE_CURRENCY})`}</label>
                      <input
                        type="number"
                        value={roomDiscountValue}
                        min="0"
                        max={roomDiscountType === "percent" ? 100 : booking.roomRate}
                        onChange={(e) => setRoomDiscountValue(parseFloat(e.target.value) || 0)}
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

                    <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button className="cancel-btn" onClick={() => setShowRoomDiscountModal(false)}>
                        Cancel
                      </button>
                      <button
                        className="submit-btn"
                        onClick={async () => {
                          setRoomDiscountLoading(true);
                          const discountAmount =
                            roomDiscountType === "percent"
                              ? (booking.roomRate * roomDiscountValue) / 100
                              : roomDiscountValue;

                          try {
                            await axios.put(`pms/reservationRooms/discount/${booking.id}`, {
                              rate: booking.roomRate - discountAmount,
                              note: roomDiscountNote || "",
                            });

                            alert("Room discount applied successfully!");
                            setShowRoomDiscountModal(false);
                            setEditingRoom(null);
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
                    <button className="close-btn" onClick={() => setDiscountingService(null)}>
                      &times;
                    </button>
                  </div>
                  <div className="modal-content">
                    <div className="form-group">
                      <label>Discount Type</label>
                      <select value={serviceDiscountType} onChange={(e) => setServiceDiscountType(e.target.value)}>
                        <option value="flat">Flat Amount</option>
                        <option value="percent">Percentage</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Discount Value {serviceDiscountType === "percent" ? "(%)" : `(${BASE_CURRENCY})`}</label>
                      <input
                        type="number"
                        value={serviceDiscountValue}
                        min="0"
                        max={serviceDiscountType === "percent" ? 100 : parseFloat(discountingService.price)}
                        onChange={(e) => setServiceDiscountValue(parseFloat(e.target.value) || 0)}
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

                    <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button className="cancel-btn" onClick={() => setDiscountingService(null)}>
                        Cancel
                      </button>
                      <button
                        className="submit-btn"
                        onClick={async () => {
                          setIsDiscountingService(true);
                          const originalRate = parseFloat(discountingService.price);
                          const discountAmount =
                            serviceDiscountType === "percent"
                              ? (originalRate * serviceDiscountValue) / 100
                              : serviceDiscountValue;
                          const newRate = Math.max(0, originalRate - discountAmount);

                          try {
                            await axios.put(`/discountByService/${booking.id}/${discountingService.id}`, {
                              rate: newRate,
                              note: serviceDiscountNote || "",
                            });
                            alert("Service discount applied successfully!");
                            setDiscountingService(null);
                            setServiceDiscountValue(0);
                            setServiceDiscountNote("");
                            await handleRefresh();
                          } catch (error) {
                            console.error("Failed to apply service discount:", error);
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
                <small className="gst-note">Enable GST charges for this reservation</small>
              </div>

              <div className="gst-toggle">
                {gstLoading && <span className="gst-loading">Updating…</span>}

                <label className="gst-switch">
                  <input type="checkbox" checked={gstEnabled} onChange={handleToggleGst} disabled={gstLoading} />
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
            <div className="info-row">
              <span>
                <strong>Discount:</strong>
              </span>
              <span>
                <strong>
                  {BASE_CURRENCY}
                  {booking.discount.toFixed(2)}
                </strong>
              </span>
            </div>
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
                  {(booking.totalAmount - booking.totalPaid).toFixed(2)}
                </strong>
              </span>
            </div>
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
                    max={booking.totalAmount - (booking.totalPaid || 0)}
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <div className="input-with-icon">
                  <FiCreditCard className="input-icon" />
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={onClose} disabled={processing}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={processing || booking.totalAmount - booking.totalPaid <= 0}
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
                <button className="close-btn" onClick={() => setShowServiceModal(false)}>
                  &times;
                </button>
              </div>

              <div className="modal-content">
                {availableServices.map((service) => {
                  const isSelected = selectedServices.some((s) => s.id === service.id);
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
                        border: `2px solid ${isAlreadyAdded ? "#ccc" : isSelected ? "#007bff" : "#e0e0e0"}`,
                        borderRadius: "8px",
                        marginBottom: "10px",
                        backgroundColor: isAlreadyAdded ? "#f0f0f0" : isSelected ? "#e6f2ff" : "#f9f9f9",
                        cursor: isAlreadyAdded ? "not-allowed" : "pointer",
                        opacity: isAlreadyAdded ? 0.5 : 1,
                        fontSize: "15px",
                      }}
                    >
                      <span>{service.service_name}</span>
                      <span>
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
                  <button className="submit-btn" onClick={handleAddServices} disabled={selectedServices.length === 0}>
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
                <button className="close-btn" onClick={() => setEditingService(null)}>
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
                <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="cancel-btn" onClick={() => setEditingService(null)}>
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

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

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
    const fetchGuests = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          search: searchTerm,
          status: filters.status,
          dateRange: filters.dateRange,
        };

        const response = await axios.get(`pms/guests/getAll/${selectedProperty}`, {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setGuests(response.data);
      } catch (err) {
        console.error("Error fetching guests:", err);
        setError(err.response?.data?.error || "Failed to fetch guests");
        showSnackbar(err.response?.data?.error || "Failed to fetch guests", "error");
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchGuests();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [selectedProperty, searchTerm, filters.status, filters.dateRange]);

  const handleViewDetails = (guest) => {
    setSelectedGuest(guest);
    setIsDetailOpen(true);
  };
  const EditGuestModal = ({ guest, onClose, onUpdated }) => {
    const [form, setForm] = useState({
      first_name: guest.firstName || "",
      last_name: guest.lastName || "",
      age: guest.age || "",
      email: guest.email || "",
      phone: guest.phone || "",
      country: guest.nationality || "",
      id_type: guest.idType || "",
      id_number: guest.idNumber || "",
      company_name: guest.company_name || "",
      gst_number: guest.gst_number || "",
      address: guest.address || "",
    });

    const handleChange = (e) => {
      setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
      try {
        setEditLoading(true);

        await axios.post(`/pms/guests/edit/${guest.id}`, form);

        showSnackbar("Guest updated successfully");
        onUpdated();
        onClose();
      } catch (err) {
        console.error("Failed to update guest", err);
        showSnackbar(err.response?.data?.error || "Failed to update guest", "error");
      } finally {
        setEditLoading(false);
      }
    };

    return (
      <div className="modal-overlay">
        <div className="modal wide-modal">
          <div className="modal-header">
            <h3>Edit Guest</h3>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>

          <div className="modal-content">
            <div className="form-grid">
              <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="First Name" />
              <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last Name" />
              <input name="age" value={form.age} onChange={handleChange} placeholder="Age" />
              <input name="email" value={form.email} onChange={handleChange} placeholder="Email" />
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" />

              <input name="country" value={form.country} onChange={handleChange} placeholder="Country" />
              <input name="id_type" value={form.id_type} onChange={handleChange} placeholder="ID Type" />
              <input name="id_number" value={form.id_number} onChange={handleChange} placeholder="ID Number" />

              <input name="company_name" value={form.company_name} onChange={handleChange} placeholder="Company Name" />
              <input name="gst_number" value={form.gst_number} onChange={handleChange} placeholder="GST Number" />
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Address"
              />
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={onClose}>Cancel</button>
              <button className="submit-btn" onClick={handleSubmit} disabled={editLoading}>
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const BillingDetailsModal = ({ open, onClose, guestBilling }) => {
    if (!open || !guestBilling) return null;

    return (
      <div className="billing-modal-overlay">
        <div className="billing-modal">
          <div className="billing-modal-header">
            <h4>Guest Billing Details</h4>
            <button className="billing-close-btn" onClick={onClose}>
              &times;
            </button>
          </div>

          <div className="billing-modal-content">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Reservation #</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Balance Due</th>
                  <th>Extra Services</th>
                </tr>
              </thead>
              <tbody>
                {guestBilling.map((res) => (
                  <tr key={res.reservationId}>
                    <td>{res.reservationNumber}</td>
                    <td>{new Date(res.checkInDate).toLocaleDateString()}</td>
                    <td>{new Date(res.checkOutDate).toLocaleDateString()}</td>
                    <td>{res.status}</td>
                    <td>₹{res.totalAmount}</td>
                    <td>₹{res.balanceDue}</td>
                    <td>
                      {res.extraServices.length > 0 ? (
                        <ul className="service-list">
                          {res.extraServices.map((svc) => (
                            <li key={svc.id}>
                              {svc.name} — ₹{svc.rate} × {svc.quantity} = ₹{svc.total}
                              <br />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="billing-no-service">No extra services.</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const handleViewBillingDetails = async (guestId) => {
    try {
      const res = await axios.get(`pms/guests/details/${guestId}`);
      setGuestBilling(res.data);
      setShowBillingModal(true);
    } catch (err) {
      console.error("Failed to fetch billing details", err);
      alert("Could not load billing details.");
    }
  };

  if (loading && guests.length === 0) {
    return (
      <div className="loading-container">
        <FiLoader className="loading-spinner" />
        <p>Loading guests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">Error: {error}</p>
        <button className="retry-btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  const selectedHotel = properties.find((p) => p.business_entity_id === selectedProperty) || {};

  return (
    <>
      <section className="content-area-table">
        <div className="data-table-info">
          <h4 className="data-table-title">Guest Management</h4>

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

          <div className="data-table-actions">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-dropdown">
              <FiFilter className="filter-icon" />
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="styled-select"
              >
                <option value="">All Statuses</option>
                <option value="Checked In">Checked In</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Confirmed">Upcoming</option>
              </select>
            </div>
            <div className="filter-dropdown">
              <FiFilter className="filter-icon" />
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="styled-select"
              >
                <option value="">All Dates</option>
                <option value="current">Current Stays</option>
                <option value="past">Past Stays</option>
                <option value="future">Future Stays</option>
              </select>
            </div>
            <button className="export-btn">
              <FiPrinter /> Export
            </button>
          </div>
        </div>

        <div className="data-table-diagram">
          {loading && guests.length > 0 && (
            <div className="loading-overlay">
              <FiLoader className="loading-spinner" />
            </div>
          )}
          <table>
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Contact</th>
                <th>ID Info</th>
                <th>Current Stay</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.length > 0 ? (
                guests.map((guest) => (
                  <tr key={guest.id}>
                    <td>
                      <div className="guest-name">
                        {guest.firstName} {guest.lastName}
                      </div>
                      {guest.city && (
                        <div className="guest-location">
                          {guest.city}, {guest.country}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="contact-info">
                        <div className="contact-email">{guest.email}</div>
                        <div className="contact-phone">{guest.phone}</div>
                      </div>
                    </td>
                    <td>
                      <div className="id-info">
                        {guest.idType && (
                          <div>
                            <strong>{guest.idType}:</strong> {guest.idNumber}
                          </div>
                        )}

                      </div>
                    </td>
                    <td>
                      {guest.bookings.find((b) => b.status === "Checked In") ? (
                        <div className="current-stay">
                          <div>
                            <strong>Room:</strong> {guest.bookings.find((b) => b.status === "Checked In").room}
                          </div>
                          <div>
                            <strong>Until:</strong>{" "}
                            {formatWithOrdinal(
                              parseISO(guest.bookings.find((b) => b.status === "Checked In").checkOut),
                            )}
                          </div>
                        </div>
                      ) : guest.bookings.find((b) => b.status === "Upcoming") ? (
                        <div className="upcoming-stay">
                          <strong>Arriving:</strong>{" "}
                          {formatWithOrdinal(parseISO(guest.bookings.find((b) => b.status === "Upcoming").checkIn))}
                        </div>
                      ) : (
                        <div className="no-stay">No current stay </div>
                      )}
                    </td>
                    <td className="actions">
                      <button onClick={() => handleViewDetails(guest)} className="view-btn">
                        <FiEye />
                      </button>
                      <button className="email-btn">
                        <FiMail />
                      </button>
                      <button
                        className="edit-btn"
                        title="Edit Guest"
                        onClick={() => {
                          setEditingGuest(guest);
                          setShowEditGuestModal(true);
                        }}
                      >
                        <FiEdit />
                      </button>

                      <button onClick={() => handleViewBillingDetails(guest.id)} className="view-btn">
                        <FiFile />
                      </button>
                      {guest.bookings.some((b) => b.status === "Checked In") && (
                        <button
                          onClick={() => handleOpenPaymentModal(guest.bookings.find((b) => b.status === "Checked In"))}
                          className="pay-btn"
                          title="Pay Bill"
                        >
                          <FiCreditCard />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-results">
                    No guests found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {showEditGuestModal && editingGuest && (
          <EditGuestModal
            guest={editingGuest}
            onClose={() => setShowEditGuestModal(false)}
            onUpdated={() => {
              setShowEditGuestModal(false);
              setEditingGuest(null);
              // refresh guest list
              setSearchTerm((s) => s);
            }}
          />
        )}

        {/* Guest Detail Modal */}
        {isDetailOpen && selectedGuest && (
          <div className="modal-overlay">
            <div className="modal wide-modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h3>
                    {selectedGuest.firstName} {selectedGuest.lastName}
                  </h3>
                  <button className="close-btn" onClick={() => setIsDetailOpen(false)}>
                    &times;
                  </button>
                </div>

                <div className="guest-detail-container">
                  <div className="guest-info-section">
                    <h4>Personal Information</h4>
                    <div className="info-grid">
                      <div>
                        <label>Email</label>
                        <p>{selectedGuest.email}</p>
                      </div>
                      <div>
                        <label>Phone</label>
                        <p>{selectedGuest.phone}</p>
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
                      <div>
                        <label>Address</label>
                        <p>{selectedGuest.address || "Not specified"}</p>
                      </div>
                      <div>
                        <label>City</label>
                        <p>{selectedGuest.city || "Not specified"}</p>
                      </div>
                      <div>
                        <label>Country</label>
                        <p>{selectedGuest.country || "Not specified"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="guest-bookings-section">
                    <h4>Booking History</h4>
                    {selectedGuest.bookings.length > 0 ? (
                      <table className="bookings-table">
                        <thead>
                          <tr>
                            <th>Booking ID</th>
                            <th>Room</th>
                            <th>Check-In</th>
                            <th>Check-Out</th>
                            <th>Guests</th>
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
                                {booking.adults} Adult
                                {booking.adults !== 1 ? "s" : ""},
                                {booking.children > 0 &&
                                  ` ${booking.children} Child${booking.children !== 1 ? "ren" : ""}`}
                                {booking.infants > 0 &&
                                  `, ${booking.infants} Infant${booking.infants !== 1 ? "s" : ""}`}
                              </td>
                              <td>
                                <span className={`booking-status ${booking.status.replace(/\s+/g, "-").toLowerCase()}`}>
                                  {booking.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="no-bookings">No bookings found for this guest</p>
                    )}
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setIsDetailOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
      <BillingDetailsModal
        open={showBillingModal}
        onClose={() => setShowBillingModal(false)}
        guestBilling={guestBilling}
      />
      {showPaymentModal && selectedBooking && (
        <PaymentModal
          selectedBooking={selectedBooking}
          onClose={closeModal}
          onPaymentComplete={handlePaymentComplete}
        />
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
    </>
  );
};

export default GuestManagement;
