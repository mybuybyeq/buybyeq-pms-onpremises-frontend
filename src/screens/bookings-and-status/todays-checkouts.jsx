import { useState, useEffect } from "react";
import {
  FiDollarSign,
  FiPrinter,
  FiX,
  FiUser,
  FiPhone,
  FiCreditCard,
  FiLogIn,
  FiRefreshCw,
  FiMoreVertical,
  FiFilter,
  FiSearch,
  FiColumns,
  FiEdit,
  FiPlus,
  FiMinusCircle,
} from "react-icons/fi";

import "./bookings.scss";
import axios from "../../api/axios";
import { format, parseISO } from "date-fns";
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

// const PaymentModal = ({ booking, onClose, onPaymentComplete }) => {
//   const [amount, setAmount] = useState(booking.totalAmount - booking.totalPaid);
//   const [paymentMethod, setPaymentMethod] = useState("Cash");
//   const [processing, setProcessing] = useState(false);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setProcessing(true);

//     try {
//       const response = await axios.post(
//         `/pms/bookings/payment/${booking.id}`,
//         {
//           amount: amount,
//           payment_method: paymentMethod,
//           transaction_reference: `PAY-${Date.now()}`,
//           notes: `Payment for booking ${booking.bookingNumber}`
//         }
//       );

//       onPaymentComplete(
//         booking.id,
//         amount,
//         paymentMethod,
//         response.data.reservation.total_paid,
//         response.data.reservation.balance_due <= 0 ? "Paid" : "Partial"
//       );
//       onClose();
//     } catch (error) {
//       console.error("Payment failed:", error);
//       alert("Payment failed. Please try again.");
//     } finally {
//       setProcessing(false);
//     }
//   };

//   return (
//     <div className="modal-overlay">
//       <div className="modal">
//         <div className="modal-header">
//           <h4>Process Payment for {booking.guestName}</h4>
//           <button className="close-btn" onClick={onClose} disabled={processing}>
//             &times;
//           </button>
//         </div>

//         <div className="modal-content">
//           <div className="payment-info">
//             <div className="info-row">
//               <span>Booking Number:</span>
//               <span>{booking.bookingNumber}</span>
//             </div>
//             <div className="info-row">
//               <span>Room:</span>
//               <span>{booking.roomType} - {booking.roomNumber}</span>
//             </div>
//             <div className="info-row">
//               <span>Total Amount:</span>
//               <span>{BASE_CURRENCY}{booking.totalAmount || '0.00'}</span>
//             </div>
//             <div className="info-row">
//               <span>Amount Paid:</span>
//               <span>{BASE_CURRENCY}{booking.totalPaid || '0.00'}</span>
//             </div>
//             <div className="info-row">
//               <span>Balance Due:</span>
//               <span>{BASE_CURRENCY}{((booking.totalAmount || 0) - (booking.totalPaid || 0))}</span>
//             </div>
//           </div>

//           <form onSubmit={handleSubmit} className="payment-form">
//             <div className="form-group">
//               <label>Payment Amount</label>
//               <div className="input-with-icon">
//                 <FiDollarSign className="input-icon" />
//                 <input
//                   type="number"
//                   value={amount}
//                   onChange={(e) => setAmount(parseFloat(e.target.value))}
//                   min="0.01"
//                   max={booking.totalAmount - (booking.totalPaid || 0)}
//                   step="0.01"
//                   required
//                 />
//               </div>
//             </div>

//             <div className="form-group">
//               <label>Payment Method</label>
//               <div className="input-with-icon">
//                 <FiCreditCard className="input-icon" />
//                 <select
//                   value={paymentMethod}
//                   onChange={(e) => setPaymentMethod(e.target.value)}
//                   required
//                 >
//                   <option value="Cash">Cash</option>
//                   <option value="Credit Card">Credit Card</option>
//                   <option value="Debit Card">Debit Card</option>
//                   <option value="Bank Transfer">Bank Transfer</option>
//                 </select>
//               </div>
//             </div>

//             <div className="form-actions">
//               <button
//                 type="button"
//                 className="cancel-btn"
//                 onClick={onClose}
//                 disabled={processing}
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 className="submit-btn"
//                 disabled={processing}
//               >
//                 {processing ? "Processing..." : "Process Payment"}
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

const PaymentModal = ({ booking, onClose, onPaymentComplete, onRefresh }) => {
  const [amount, setAmount] = useState(booking.totalAmount - booking.totalPaid);
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
  const [gstEnabled, setGstEnabled] = useState(
    Number(booking.is_gst_applied || 0) === 1,
  );
  const [igstMode, setIgstMode] = useState(
    Number(booking.is_gst_applied || 0) === 1 && Number(booking.is_igst || 0) === 1,
  );
  const [gstLoading, setGstLoading] = useState(false);

  const handleApplyDiscount = async () => {
    setIsApplyingDiscount(true);

    try {
      const response = await axios.put(`/reservations/discount/${booking.id}`, {
        discountAmount: computedDiscount,
        discount_note: discountNote,
      });

      alert("Discount applied successfully!");
      if (onRefresh) onRefresh(); // refresh parent
      onClose(); // close modal
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
      console.log(editingRoom.id);
      await axios.put(`/pms/reservationRooms/edit/${editingRoom.id}`, {
        rate: parseFloat(editRoomPrice) - (booking.roomDiscount || 0),
      });

      alert("Room rate updated successfully!");
      setEditingRoom(null);
      if (onRefresh) onRefresh();
      onClose();
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
      console.log("editingService", editingService);
      await axios.put(`/editByService/${editingService.reservation_id}/${editingService.id}`, {
        rate: parseFloat(editPrice) - parseFloat(editingService.discount || 0),
        quantity: editingService.quantity || 1,
        service_date: editingService.date,
      });

      alert("Service updated successfully!");
      setEditingService(null);
      if (onRefresh) onRefresh();

      onClose();
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
      if (onRefresh) onRefresh();
      onClose();
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

      if (onRefresh) onRefresh();
      if (onClose) onClose();
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
      sendEmail({
        reservationId: booking.id,
        templateType: "PAYMENT_RECEIPT",
      });
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
      alert("Payment failed. Please try again.");
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

      if (onRefresh) onRefresh();
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
      const response = await axios.post(`/pms/bookings/add_gst/${booking.id}`, {
        enable_gst: true,
        is_igst: nextIgstMode,
      });
      setIgstMode(nextIgstMode);
      if (response.data?.reservation) {
        const r = response.data.reservation;
        booking.totalAmount = parseFloat(r.total_amount);
        booking.balanceDue = parseFloat(r.balance_due);
        booking.cgst = parseFloat(r.cgst || 0);
        booking.sgst = parseFloat(r.sgst || 0);
        booking.igst = parseFloat(r.igst || 0);
        booking.is_gst_applied = Number(r.is_gst_applied || 0);
        booking.is_igst = Number(r.is_igst || 0);
        setGstEnabled(Number(booking.is_gst_applied || 0) === 1);
        setIgstMode(Number(booking.is_igst || 0) === 1);
        setAmount(Math.max(0, booking.totalAmount - (booking.totalPaid || 0)));
      }
      if (onRefresh) onRefresh();
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
                      {service.price + service.discount}
                    </strong>{" "}
                    ({format(parseISO(service.date), "dd MMM yyyy")})
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
                          if (onRefresh) onRefresh();
                          onClose();
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
                          if (onRefresh) onRefresh();
                          onClose();
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
                <button type="button" className={igstMode ? "cancel-btn" : "submit-btn"} onClick={() => handleTaxModeChange(false)} disabled={gstLoading}>
                  CGST/SGST
                </button>
                <button type="button" className={igstMode ? "submit-btn" : "cancel-btn"} onClick={() => handleTaxModeChange(true)} disabled={gstLoading}>
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
                {(booking.cgst || 0).toFixed(2)}
              </span>
            </div>
          )}

          {gstEnabled && !igstMode && (
            <div className="info-row">
              <span>SGST:</span>
              <span>
                {BASE_CURRENCY}
                {(booking.sgst || 0).toFixed(2)}
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
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
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
              <button type="submit" className="submit-btn" disabled={processing}>
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

const CheckOutModal = ({ booking, onClose, onCheckOut }) => {
  const [processing, setProcessing] = useState(false);

  const handleCheckOut = async () => {
    setProcessing(true);
    try {
      await axios.post(`/pms/bookings/checkout/${booking.id}`);
      onCheckOut(booking.id);
      sendEmail({
        reservationId: booking.id,
        templateType: "CHECK_OUT",
      });
      onClose();
    } catch (error) {
      console.error("Check-out failed:", error);
      alert("Check-out failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h4>Check Out {booking.guestName}</h4>
          <button className="close-btn" onClick={onClose} disabled={processing}>
            &times;
          </button>
        </div>

        <div className="modal-content">
          <div className="checkin-info">
            <p>You are about to check out:</p>
            <div className="info-card">
              <div className="info-row">
                <span>Booking:</span>
                <span>{booking.bookingNumber}</span>
              </div>
              <div className="info-row">
                <span>Room:</span>
                <span>
                  {booking.roomType} - {booking.roomNumber}
                </span>
              </div>
              <div className="info-row">
                <span>Payment Status:</span>
                <span className={`status-badge ${(booking.paymentStatus || "pending").toLowerCase()}`}>
                  {booking.paymentStatus || "Pending"}
                </span>
              </div>
            </div>

            {booking.paymentStatus !== "Paid" && booking.paymentStatus && (
              <div className="payment-warning">
                <p>Note: Full payment has not been received for this booking.</p>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose} disabled={processing}>
              Cancel
            </button>
            <button className="confirm-btn" onClick={handleCheckOut} disabled={processing}>
              {processing ? "Processing..." : "Confirm Check-Out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionsDropdown = ({ booking, setSelectedBooking, setModalType }) => {
  const [open, setOpen] = useState(false);

  const toggleDropdown = () => setOpen(!open);

  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    right: 0,
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderRadius: "6px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    zIndex: 1000,
    minWidth: "160px",
    padding: "8px 0",
  };

  const buttonStyle = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    width: "100%",
    background: "none",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "14px",
    color: "#333",
  };

  const containerStyle = {
    position: "relative",
    display: "inline-block",
  };

  const triggerButtonStyle = {
    padding: "6px 10px",
    fontSize: "16px",
    cursor: "pointer",
    backgroundColor: "#eee",
    border: "1px solid #ccc",
    borderRadius: "4px",
  };

  return (
    <div style={containerStyle}>
      <button onClick={toggleDropdown} style={triggerButtonStyle}>
        <FiMoreVertical />
      </button>

      {open && (
        <div style={dropdownStyle}>
          {booking.status === "Checked In" && (
            <button
              style={buttonStyle}
              onClick={() => {
                setSelectedBooking(booking);
                setModalType("checkout");
                setOpen(false);
              }}
              disabled={booking.status === "Cancelled" || booking.paymentStatus !== "Paid"}
            >
              <FiLogIn /> Check Out
            </button>
          )}

          {(booking.totalAmount || 0) > (booking.totalPaid || 0) && (
            <button
              style={buttonStyle}
              onClick={() => {
                setSelectedBooking(booking);
                setModalType("payment");
                setOpen(false);
              }}
              disabled={booking.status === "Cancelled"}
            >
              <FiDollarSign /> Pay
            </button>
          )}

          <button
            style={buttonStyle}
            onClick={() => {
              setSelectedBooking(booking);
              setModalType("print");
              setOpen(false);
            }}
          >
            <FiPrinter /> Print
          </button>
        </div>
      )}
    </div>
  );
};

const TodaysCheckOuts = () => {
  const [CheckOuts, setCheckOuts] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: "",
    roomType: "",
    status: "",
  });
  const [filteredCheckOuts, setFilteredCheckOuts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    bookingNumber: false,
    guest: true,
    room: true,
    extras: true,
    amount: true,
    paid: true,
    payment: true,
    status: true,
    actions: true,
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Column configuration
  const columns = [
    { id: "bookingNumber", label: "Booking #", defaultVisible: false },
    { id: "guest", label: "Guest", defaultVisible: true },
    { id: "room", label: "Room", defaultVisible: true },
    { id: "extras", label: "Extras", defaultVisible: true },
    { id: "amount", label: "Amount", defaultVisible: true },
    { id: "paid", label: "Paid", defaultVisible: true },
    { id: "payment", label: "Payment", defaultVisible: true },
    { id: "status", label: "Status", defaultVisible: true },
    { id: "actions", label: "Actions", defaultVisible: true },
  ];

  const roomTypes = [...new Set(CheckOuts.map((b) => b.roomType || ""))].filter((t) => t !== "");
  const date = new Date().toISOString().split("T")[0];
  const userData = JSON.parse(sessionStorage.getItem("userData"));
  const groupId = userData.Group_ID;

  const toggleColumnVisibility = (columnId) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  const resetColumns = () => {
    const resetCols = {};
    columns.forEach((col) => {
      resetCols[col.id] = col.defaultVisible;
    });
    setVisibleColumns(resetCols);
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
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaysCheckOuts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (date) {
        params.date = date;
      }

      let endpointUrl;
      if (selectedProperty) {
        endpointUrl = `pms/bookings/today-checkouts/${selectedProperty}/null`;
      } else {
        endpointUrl = `pms/bookings/today-checkouts/null/${groupId}`;
      }

      const response = await axios.get(endpointUrl, {
        params: params,
      });

      const transformedData = response.data.map((booking) => ({
        ...booking,
        guest: {
          name: booking.guestName,
          phone: booking.phone || "N/A",
          email: booking.email || "N/A",
        },
        paymentStatus: booking.paymentStatus || "Pending",
        totalAmount: booking.totalAmount || 0,
        totalPaid: booking.totalPaid || 0,
        status: booking.reservationStatus || booking.status || "Confirmed",
      }));

      setCheckOuts(transformedData);
    } catch (err) {
      setError(err.message || "Failed to fetch today's check-outs");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = (bookingId, amount, method) => {
    setCheckOuts(
      CheckOuts.map((booking) => {
        if (booking.id === bookingId) {
          const newTotalPaid = (booking.totalPaid || 0) + amount;
          const paymentStatus = newTotalPaid >= (booking.totalAmount || 0) ? "Paid" : "Partial";

          return {
            ...booking,
            totalPaid: newTotalPaid,
            paymentStatus,
            lastPayment: {
              amount,
              method,
              date: new Date().toISOString(),
            },
          };
        }
        return booking;
      }),
    );
  };

  const handleCheckOut = (bookingId) => {
    setCheckOuts(
      CheckOuts.map((booking) => (booking.id === bookingId ? { ...booking, status: "Checked In" } : booking)),
    );
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

      // Open in new tab and trigger print
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
        <html>
          <head><title>Invoice</title></head>
          <body style="margin:0">
            <iframe src="${pdfUrl}" frameborder="0" style="width:100%; height:100vh;" onload="this.contentWindow.focus(); this.contentWindow.print();"></iframe>
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

  const closeModal = () => {
    setSelectedBooking(null);
    setModalType(null);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    fetchPropertiesData();
  }, []);

  useEffect(() => {
    fetchTodaysCheckOuts();
  }, [selectedProperty, groupId, date]);

  useEffect(() => {
    let results = [...CheckOuts];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      results = results.filter(
        (booking) =>
          (booking.guest?.name || booking.guestName || "").toLowerCase().includes(term) ||
          (booking.roomNumber || "").toLowerCase().includes(term) ||
          (booking.bookingNumber || "").toLowerCase().includes(term),
      );
    }

    if (filters.roomType) {
      results = results.filter((booking) => booking.roomType === filters.roomType);
    }

    if (filters.status) {
      results = results.filter((booking) => booking.status === filters.status);
    }

    setFilteredCheckOuts(results);
  }, [CheckOuts, filters]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading today's check-outs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">Error: {error}</p>
        <button className="retry-btn" onClick={fetchTodaysCheckOuts}>
          <FiRefreshCw /> Retry
        </button>
      </div>
    );
  }

  return (
    <section className="content-area-table" style={{ paddingBottom: "100px" }}>
      <div className="data-table-info">
        <h4 className="data-table-title">Today's Check-Outs ({formatWithOrdinal(date)})</h4>
        <div className="data-table-actions" style={{ paddingBottom: "10px" }}>
          <select
            value={selectedProperty}
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

          <button className="column-selector-btn" onClick={() => setShowColumnSelector(true)}>
            <FiColumns /> Columns
          </button>

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
      </div>

      <div className="data-table-diagram" style={{ paddingBottom: "160px" }}>
        <table>
          <thead>
            <tr>
              {visibleColumns.bookingNumber && <th>Booking #</th>}
              {visibleColumns.guest && <th>Guest</th>}
              {visibleColumns.room && <th>Room</th>}
              {visibleColumns.extras && <th>Extras</th>}
              {visibleColumns.amount && <th>Amount</th>}
              {visibleColumns.paid && <th>Paid</th>}
              {visibleColumns.payment && <th>Payment</th>}
              {visibleColumns.status && <th>Status</th>}
              {visibleColumns.actions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredCheckOuts.length > 0 ? (
              filteredCheckOuts.map((booking) => (
                <tr key={booking.id}>
                  {visibleColumns.bookingNumber && <td>{booking.bookingNumber}</td>}
                  {visibleColumns.guest && (
                    <td>
                      <div className="guest-info">
                        <div className="guest-name">
                          <FiUser className="icon" />
                          {booking.guest?.name || booking.guestName}
                        </div>
                        {booking.guest?.phone && (
                          <div className="guest-phone">
                            <FiPhone className="icon" />
                            {booking.guest.phone}
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleColumns.room && (
                    <td>
                      {booking.roomType} - {booking.roomNumber || "N/A"}
                    </td>
                  )}
                  {visibleColumns.extras && (
                    <td
                      style={{
                        maxWidth: "200px",
                        whiteSpace: "normal",
                        fontSize: "12px",
                      }}
                    >
                      {booking.services && booking.services.length > 0 ? (
                        <ul style={{ paddingLeft: "16px", margin: 0 }}>
                          {booking.services.map((service) => (
                            <li key={service.id}>
                              {service.name}{" "}
                              <span style={{ fontWeight: "bold" }}>
                                ({BASE_CURRENCY}
                                {service.price.toFixed(2)})
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ fontStyle: "italic", color: "#777" }}>No Extras</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.amount && (
                    <td>
                      {BASE_CURRENCY}
                      {booking.totalAmount || 0}
                    </td>
                  )}
                  {visibleColumns.paid && (
                    <td>
                      {BASE_CURRENCY}
                      {booking.totalPaid || 0}
                    </td>
                  )}
                  {visibleColumns.payment && (
                    <td>
                      <span className={`payment-status ${(booking.paymentStatus || "pending").toLowerCase()}`}>
                        {booking.paymentStatus || "Pending"}
                      </span>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td>
                      <span
                        className={`status-badge ${(booking.status || "confirmed").toLowerCase().replace(" ", "-")}`}
                      >
                        {booking.status || "Confirmed"}
                      </span>
                    </td>
                  )}
                  {visibleColumns.actions && (
                    <td className="actions">
                      <ActionsDropdown
                        booking={booking}
                        setSelectedBooking={setSelectedBooking}
                        setModalType={setModalType}
                      />
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.filter((col) => visibleColumns[col.id]).length} className="no-results">
                  No matching check-ins found for {new Date(date).toLocaleDateString()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Column Selector Modal */}
      {showColumnSelector && (
        <div className="modal-overlay">
          <div className="modal small-modal">
            <div className="modal-header">
              <h4>Select Columns</h4>
              <button className="close-btn" onClick={() => setShowColumnSelector(false)}>
                &times;
              </button>
            </div>
            <div className="modal-content">
              <div className="column-selector">
                {columns.map((column) => (
                  <div key={column.id} className="column-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleColumns[column.id]}
                        onChange={() => toggleColumnVisibility(column.id)}
                      />
                      {column.label}
                    </label>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="reset-btn" onClick={resetColumns}>
                  Reset to Default
                </button>
                <button className="confirm-btn" onClick={() => setShowColumnSelector(false)}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {modalType === "payment" && selectedBooking && (
        <PaymentModal
          booking={selectedBooking}
          onClose={closeModal}
          onPaymentComplete={handlePaymentComplete}
          onRefresh={fetchTodaysCheckOuts}
        />
      )}

      {/* Check-in Modal */}
      {modalType === "checkout" && selectedBooking && (
        <CheckOutModal
          booking={selectedBooking}
          onClose={closeModal}
          onCheckOut={() => {
            handleCheckOut();
            fetchTodaysCheckOuts();
          }}
        />
      )}

      {/* Print Confirmation Modal */}
      {modalType === "print" && selectedBooking && (
        <div className="modal-overlay">
          <div className="modal small-modal">
            <div className="modal-header">
              <h4>Print Documents</h4>
              <button className="close-btn" onClick={closeModal}>
                &times;
              </button>
            </div>
            <div className="modal-content">
              <p>What would you like to print for {selectedBooking.guest?.name || selectedBooking.guestName}?</p>
              <div className="print-options">
                <button
                  className="print-option"
                  onClick={() => handlePrintInvoice(selectedBooking.id, "payment_receipt")}
                >
                  <FiPrinter /> Payment Receipt
                </button>
                <button className="print-option" onClick={() => handlePrintInvoice(selectedBooking.id, "invoice")}>
                  <FiPrinter /> Full Invoice
                </button>
                <button className="print-option" onClick={() => handlePrintInvoice(selectedBooking.id, "voucher")}>
                  <FiPrinter /> Booking Voucher
                </button>
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default TodaysCheckOuts;
