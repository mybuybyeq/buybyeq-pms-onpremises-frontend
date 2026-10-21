import { Fragment, useEffect, useMemo, useState } from "react";
import { FiSave, FiUsers, FiX } from "react-icons/fi";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "../../../api/axios";
import { BASE_CURRENCY } from "../../../constants/currency";
import "./group-booking-modal.scss";

const initialGuest = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
  idType: "",
  idNumber: "",
  address: "",
  company: "",
  gst: "",
  notes: "",
};

const getInitialStay = (dateRange) => {
  const checkIn = dateRange?.startDate || new Date();
  return {
    checkInDate: format(checkIn, "yyyy-MM-dd"),
    checkInTime: "12:00",
    checkOutDate: format(addDays(checkIn, 1), "yyyy-MM-dd"),
    checkOutTime: "11:00",
  };
};

const formatPayloadTime = (time) => (time?.length === 5 ? `${time}:00` : time);

const timeToSeconds = (value = "00:00:00") => {
  const [hours = 0, minutes = 0, seconds = 0] = String(value).split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

const getTimeValue = (value = "00:00") => {
  const [hours = "00", minutes = "00"] = value.split(":");
  return new Date(1970, 0, 1, Number(hours), Number(minutes));
};

const StayTimePicker = ({ id, label, value, onChange }) => {
  return (
    <div className="group-booking-stay-field">
      <label htmlFor={id}>{label}</label>
      <TimePicker
        id={id}
        value={getTimeValue(value)}
        format="hh:mm a"
        onChange={(newValue) => {
          if (newValue) onChange(format(newValue, "HH:mm"));
        }}
        slotProps={{
          textField: {
            size: "small",
            fullWidth: true,
            inputProps: { id, "aria-label": label },
          },
        }}
      />
    </div>
  );
};

const GroupBookingModal = ({
  open,
  onClose,
  property,
  dateRange,
  roomTypes = [],
  mealPlans = [],
  extraServices = [],
  showSnackbar,
  onCreated,
}) => {
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [preparedPayload, setPreparedPayload] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState(null);
  const [guestInfo, setGuestInfo] = useState(initialGuest);
  const [matchingGuests, setMatchingGuests] = useState([]);
  const [searchingGuest, setSearchingGuest] = useState(false);
  const [stayInfo, setStayInfo] = useState(() => getInitialStay(dateRange));
  const [serviceQuantities, setServiceQuantities] = useState({});
  const [roomRates, setRoomRates] = useState({});
  const [roomAcFlags, setRoomAcFlags] = useState({});
  const [roomStayInfo, setRoomStayInfo] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [bookingInfo, setBookingInfo] = useState({
    mealPlanId: "",
    adults: 1,
    children: 0,
    infants: 0,
  });

  const nights = Math.max(
    1,
    stayInfo.checkInDate && stayInfo.checkOutDate
      ? differenceInCalendarDays(parseISO(stayInfo.checkOutDate), parseISO(stayInfo.checkInDate))
      : 1,
  );
  const businessCheckoutTime = property?.check_out_time || "23:00:00";
  const extraDayCharged =
    timeToSeconds(stayInfo.checkOutTime) > timeToSeconds(businessCheckoutTime);
  const chargeableDays = nights + (extraDayCharged ? 1 : 0);

  useEffect(() => {
    if (open) {
      setStayInfo(getInitialStay(dateRange));
      setActiveStep(0);
    }
  }, [open, dateRange?.startDate]);

  useEffect(() => {
    const phone = guestInfo.phone.trim();
    if (phone.length < 10) {
      setMatchingGuests([]);
      setSearchingGuest(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingGuest(true);
        const response = await axios.get(
          `/pms/guests/search?phone=${encodeURIComponent(phone)}`,
        );
        const guests = Array.isArray(response.data) ? response.data : [];
        if (guests.length === 1) {
          const [guest] = guests;
          setGuestInfo((current) => ({
            ...current,
            firstName: guest.first_name || "",
            lastName: guest.last_name || "",
            email: guest.email || "",
            address: guest.address || "",
            country: guest.country || "",
            idType: guest.id_type || "",
            idNumber: guest.id_number || "",
            company: guest.company || guest.company_name || "",
            gst: guest.gst || guest.gst_number || "",
          }));
          setMatchingGuests([]);
        } else {
          setMatchingGuests(guests);
        }
      } catch (error) {
        console.error("Failed to search guests by phone:", error);
        setMatchingGuests([]);
      } finally {
        setSearchingGuest(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [guestInfo.phone]);

  useEffect(() => {
    if (
      !open ||
      !property?.business_entity_id ||
      !stayInfo.checkInDate ||
      !stayInfo.checkOutDate ||
      stayInfo.checkOutDate < stayInfo.checkInDate
    ) return;

    const fetchAvailableRooms = async () => {
      try {
        setLoadingRooms(true);
        setAvailableRooms([]);
        setSelectedRoomIds([]);
        setServiceQuantities({});
        setRoomRates({});
        setRoomAcFlags({});
        setRoomStayInfo({});
        setPreparedPayload(null);

        const response = await axios.get(
          `/pms/rooms/getVacantRooms/${null}/${property.business_entity_id}`,
          {
            params: {
              start_date: stayInfo.checkInDate,
              end_date: stayInfo.checkOutDate,
            },
          },
        );

        setAvailableRooms(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to load rooms for group booking:", error);
        showSnackbar?.("Failed to load available rooms", "error");
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchAvailableRooms();
  }, [
    open,
    property?.business_entity_id,
    stayInfo.checkInDate,
    stayInfo.checkOutDate,
    showSnackbar,
  ]);

  const selectedRooms = useMemo(
    () => availableRooms.filter((room) => selectedRoomIds.includes(room.id)),
    [availableRooms, selectedRoomIds],
  );

  const getRoomType = (roomTypeId) => roomTypes.find((roomType) => roomType.id === roomTypeId);

  const getMealPlan = (roomTypeId) => {
    const selected = mealPlans.find(
      (mealPlan) =>
        mealPlan.id === Number(bookingInfo.mealPlanId) &&
        (mealPlan.room_type_id === null || mealPlan.room_type_id === roomTypeId),
    );
    if (selected) return selected;
    return (
      mealPlans.find((mealPlan) => mealPlan.room_type_id === roomTypeId) ||
      mealPlans.find((mealPlan) => mealPlan.room_type_id === null) ||
      null
    );
  };

  const getRoomStay = (roomId) =>
    roomStayInfo[roomId] || {
      checkInDate: stayInfo.checkInDate,
      checkInTime: stayInfo.checkInTime,
      checkOutDate: stayInfo.checkOutDate,
      checkOutTime: stayInfo.checkOutTime,
    };

  const getRoomChargeableDays = (roomId) => {
    const roomStay = getRoomStay(roomId);
    const roomNights = Math.max(
      1,
      roomStay.checkInDate && roomStay.checkOutDate
        ? differenceInCalendarDays(parseISO(roomStay.checkOutDate), parseISO(roomStay.checkInDate))
        : 1,
    );
    return (
      roomNights +
      (timeToSeconds(roomStay.checkOutTime) > timeToSeconds(businessCheckoutTime) ? 1 : 0)
    );
  };

  const calculateRoomAmount = (room) => {
    return getRoomRate(room) * getRoomChargeableDays(room.id);
  };

  const getRoomRate = (room) => {
    const roomType = getRoomType(room.room_type_id);
    const mealPlan = getMealPlan(room.room_type_id);
    const defaultRate = Number(mealPlan?.base_price || roomType?.base_price || 0);
    return roomRates[room.id] ?? defaultRate;
  };

  const estimatedTotal = selectedRooms.reduce((sum, room) => sum + calculateRoomAmount(room), 0);
  const servicesTotal = extraServices.reduce(
    (sum, service) =>
      sum + Number(service.price || 0) * Number(serviceQuantities[service.id] || 0),
    0,
  );
  const grandTotal = estimatedTotal + servicesTotal;
  const totalCapacity = selectedRooms.reduce((sum, room) => sum + Number(room.max_pax || 0), 0);
  const totalGuests = bookingInfo.adults + bookingInfo.children + bookingInfo.infants;

  const toggleRoom = (roomId) => {
    setSelectedRoomIds((current) => {
      if (current.includes(roomId)) {
        setRoomRates((rates) => {
          const next = { ...rates };
          delete next[roomId];
          return next;
        });
        setRoomAcFlags((flags) => {
          const next = { ...flags };
          delete next[roomId];
          return next;
        });
        setRoomStayInfo((stays) => {
          const next = { ...stays };
          delete next[roomId];
          return next;
        });
        return current.filter((id) => id !== roomId);
      }

      setRoomStayInfo((stays) => ({
        ...stays,
        [roomId]: {
          checkInDate: stayInfo.checkInDate,
          checkInTime: stayInfo.checkInTime,
          checkOutDate: stayInfo.checkOutDate,
          checkOutTime: stayInfo.checkOutTime,
        },
      }));
      return [...current, roomId];
    });
    setPreparedPayload(null);
  };

  const selectGuest = (guest) => {
    setGuestInfo((current) => ({
      ...current,
      phone: guest.phone || current.phone,
      firstName: guest.first_name || "",
      lastName: guest.last_name || "",
      email: guest.email || "",
      address: guest.address || "",
      country: guest.country || "",
      idType: guest.id_type || "",
      idNumber: guest.id_number || "",
      company: guest.company || guest.company_name || "",
      gst: guest.gst || guest.gst_number || "",
    }));
    setMatchingGuests([]);
    setPreparedPayload(null);
  };

  const toggleService = (serviceId) => {
    setServiceQuantities((current) => {
      const next = { ...current };
      if (next[serviceId]) delete next[serviceId];
      else next[serviceId] = 1;
      return next;
    });
    setPreparedPayload(null);
  };

  const updateServiceQuantity = (serviceId, value) => {
    setServiceQuantities((current) => ({
      ...current,
      [serviceId]: Math.max(1, Number(value) || 1),
    }));
    setPreparedPayload(null);
  };

  const updateRoomRate = (roomId, value) => {
    setRoomRates((current) => ({
      ...current,
      [roomId]: Math.max(0, Number(value) || 0),
    }));
    setPreparedPayload(null);
  };

  const updateRoomAc = (roomId, isAc) => {
    setRoomAcFlags((current) => ({
      ...current,
      [roomId]: isAc,
    }));
    setPreparedPayload(null);
  };

  const updateRoomStay = (roomId, field, value) => {
    setRoomStayInfo((current) => ({
      ...current,
      [roomId]: {
        ...getRoomStay(roomId),
        [field]: value,
      },
    }));
    setPreparedPayload(null);
  };

  const updateGuest = (field, value) => {
    setGuestInfo((current) => ({ ...current, [field]: value }));
    setPreparedPayload(null);
  };

  const updateStay = (field, value) => {
    setStayInfo((current) => {
      const next = { ...current, [field]: value };
      if (field === "checkInDate" && value) {
        next.checkOutDate = format(addDays(parseISO(value), 1), "yyyy-MM-dd");
      }
      setRoomStayInfo((currentRooms) => {
        const updated = {};
        Object.entries(currentRooms).forEach(([roomId, roomStay]) => {
          updated[roomId] = { ...roomStay };
          if (field === "checkInDate") {
            updated[roomId].checkInDate = value;
            updated[roomId].checkOutDate = next.checkOutDate;
          } else if (field === "checkOutDate") {
            updated[roomId].checkOutDate = value;
          } else if (field === "checkInTime") {
            updated[roomId].checkInTime = value;
          } else if (field === "checkOutTime") {
            updated[roomId].checkOutTime = value;
          }
        });
        return updated;
      });
      return next;
    });
    setPreparedPayload(null);
  };

  const validateStep = (step) => {
    if (step === 0) {
      if (!stayInfo.checkInDate || !stayInfo.checkOutDate || !stayInfo.checkInTime || !stayInfo.checkOutTime) {
        showSnackbar?.("Select the check-in and check-out dates and times", "error");
        return false;
      }
      if (stayInfo.checkOutDate < stayInfo.checkInDate) {
        showSnackbar?.("Check-out date cannot be before check-in date", "error");
        return false;
      }
      if (
        stayInfo.checkOutDate === stayInfo.checkInDate &&
        stayInfo.checkOutTime <= stayInfo.checkInTime
      ) {
        showSnackbar?.("Check-out time must be after check-in time", "error");
        return false;
      }
      if (!selectedRooms.length) {
        showSnackbar?.("Select at least one available room", "error");
        return false;
      }
      for (const room of selectedRooms) {
        const roomStay = getRoomStay(room.id);
        if (
          roomStay.checkInDate < stayInfo.checkInDate ||
          roomStay.checkOutDate > stayInfo.checkOutDate ||
          roomStay.checkOutDate < roomStay.checkInDate ||
          (roomStay.checkOutDate === roomStay.checkInDate &&
            roomStay.checkOutTime <= roomStay.checkInTime)
        ) {
          showSnackbar?.(
            `Check room stay dates for ${room.charge_code}${room.unit_number}`,
            "error",
          );
          return false;
        }
      }
    }

    if (step === 2) {
      if (!guestInfo.firstName.trim() || !guestInfo.lastName.trim() || !guestInfo.phone.trim()) {
        showSnackbar?.("First name, last name and phone are required", "error");
        return false;
      }
    }

    return true;
  };

  const goToStep = (nextStep) => {
    if (nextStep < activeStep) {
      setActiveStep(nextStep);
      return;
    }

    for (let step = activeStep; step < nextStep; step += 1) {
      if (!validateStep(step)) return;
    }
    setActiveStep(nextStep);
  };

  const createGroupBooking = async (reservationStatus) => {
    if (!validateStep(0) || !validateStep(2)) return;

    const isBookNow = reservationStatus === "Checked In";
    const payload = {
      reservation_number: `GRP-${Date.now()}`,
      property_id: property.business_entity_id,
      check_in_date: stayInfo.checkInDate,
      check_out_date: stayInfo.checkOutDate,
      checkin_time: formatPayloadTime(stayInfo.checkInTime),
      checkout_time: formatPayloadTime(stayInfo.checkOutTime),
      guest: {
        first_name: guestInfo.firstName.trim(),
        last_name: guestInfo.lastName.trim(),
        email: guestInfo.email.trim() || null,
        phone: guestInfo.phone.trim(),
        address: guestInfo.address.trim() || null,
        country: guestInfo.country.trim() || null,
        id_type: guestInfo.idType || null,
        id_number: guestInfo.idNumber.trim() || null,
        company_name: guestInfo.company.trim() || null,
        gst_number: guestInfo.gst.trim() || null,
      },
      booking: {
        used_baseprice: "Yes",
        status: reservationStatus,
        adults: bookingInfo.adults,
        children: bookingInfo.children,
        infants: bookingInfo.infants,
        nights: chargeableDays,
        notes: guestInfo.notes.trim() || null,
        rooms_amount: Number(estimatedTotal.toFixed(2)),
        services_amount: Number(servicesTotal.toFixed(2)),
        total_amount: Number(grandTotal.toFixed(2)),
        balance_due: Number(grandTotal.toFixed(2)),
      },
      services: extraServices
        .filter((service) => serviceQuantities[service.id])
        .map((service) => {
          const quantity = Number(serviceQuantities[service.id]);
          const rate = Number(service.price || 0);
          return {
            service_id: service.id,
            service_name: service.service_name,
            quantity,
            service_date: stayInfo.checkInDate,
            rate,
            amount: Number((rate * quantity).toFixed(2)),
          };
        }),
      rooms: selectedRooms.map((room) => {
        const roomType = getRoomType(room.room_type_id);
        const mealPlan = getMealPlan(room.room_type_id);
        const baseRate = getRoomRate(room);
        const roomStay = getRoomStay(room.id);

        return {
          room_id: room.id,
          room_type_id: room.room_type_id,
          room_type: room.room_type || roomType?.room_type || null,
          unit_number: room.unit_number,
          floor: room.floor,
          max_pax: room.max_pax,
          meal_plan_id: mealPlan?.id || null,
          base_rate: baseRate,
          adult_rate: Number(mealPlan?.adult_price ?? baseRate),
          child_rate: Number(mealPlan?.child_price ?? baseRate / 2),
          infant_rate: Number(mealPlan?.infant_price ?? 0),
          check_in_date: roomStay.checkInDate,
          check_out_date: roomStay.checkOutDate,
          checkin_time: formatPayloadTime(roomStay.checkInTime),
          checkout_time: formatPayloadTime(roomStay.checkOutTime),
          is_ac: Boolean(roomAcFlags[room.id]),
          estimated_amount: Number(calculateRoomAmount(room).toFixed(2)),
          status: isBookNow ? "Checked In" : "Reserved",
        };
      }),
    };

    setPreparedPayload(payload);
    console.log("GROUP BOOKING PAYLOAD", payload);

    try {
      setSubmitting(true);
      setSubmitAction(reservationStatus);
      const response = await axios.post("/pms/reservations/group-booking", payload);
      showSnackbar?.(
        isBookNow
          ? `Group booking ${response.data.reservation_number} checked in successfully`
          : `Group booking ${response.data.reservation_number} reserved successfully`,
        "success",
      );
      onCreated?.(response.data);
      onClose();
    } catch (error) {
      console.error("Failed to create group booking:", error);
      showSnackbar?.(
        error.response?.data?.error || "Failed to create group booking",
        "error",
      );
    } finally {
      setSubmitting(false);
      setSubmitAction(null);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay group-booking-overlay">
      <div className="group-booking-dialog">
        <div className="group-booking-header">
          <div>
            <h3><FiUsers />Booking</h3>
            <p>Select rooms and enter the primary guest details.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close group booking">
            <FiX />
          </button>
        </div>

        <div className="group-booking-tabs">
          {["Stay & Rooms", "Room Services", "Guest Details", "Review"].map((label, index) => (
            <button
              key={label}
              type="button"
              className={activeStep === index ? "is-active" : activeStep > index ? "is-complete" : ""}
              onClick={() => goToStep(index)}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </div>

        <div className="group-booking-body">
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            {activeStep === 0 && (
              <div className="group-booking-step">
                <div className="group-booking-stay">
                  <div className="group-booking-property">
                    <span className="group-booking-stay-label">Property</span>
                    <strong>{property.business_name}</strong>
                  </div>
                  <div className="group-booking-stay-field">
                    <label htmlFor="group-check-in-date">Check-in date</label>
                    <input
                      id="group-check-in-date"
                      type="date"
                      value={stayInfo.checkInDate}
                      onChange={(event) => updateStay("checkInDate", event.target.value)}
                    />
                  </div>
                  <StayTimePicker
                    id="group-check-in-time"
                    label="From time"
                    value={stayInfo.checkInTime}
                    onChange={(value) => updateStay("checkInTime", value)}
                  />
                  <div className="group-booking-stay-field">
                    <label htmlFor="group-check-out-date">Check-out date</label>
                    <input
                      id="group-check-out-date"
                      type="date"
                      min={stayInfo.checkInDate}
                      value={stayInfo.checkOutDate}
                      onChange={(event) => updateStay("checkOutDate", event.target.value)}
                    />
                  </div>
                  <StayTimePicker
                    id="group-check-out-time"
                    label="To time"
                    value={stayInfo.checkOutTime}
                    onChange={(value) => updateStay("checkOutTime", value)}
                  />
                  <span className="group-booking-night-badge">
                    {chargeableDays} day{chargeableDays === 1 ? "" : "s"}
                    {extraDayCharged ? " (late checkout)" : ""}
                  </span>
                </div>
                <section className="group-booking-panel group-booking-room-panel">
                  <div className="group-booking-section-heading">
                    <div>
                      <span>Step 1</span>
                      <h4>Select Available Rooms</h4>
                    </div>
                    <strong>{selectedRooms.length} selected</strong>
                  </div>
                  {loadingRooms ? (
                    <div className="group-booking-empty">Loading available rooms...</div>
                  ) : availableRooms.length === 0 ? (
                    <div className="group-booking-empty">No rooms are available for the selected dates.</div>
                  ) : (
                    <div className="group-booking-table-wrap">
                      <table className="group-booking-table">
                        <thead>
                          <tr>
                            <th aria-label="Select room"></th>
                            <th>Room</th>
                            <th>Type</th>
                            <th>Floor</th>
                            <th>Pax</th>
                            <th>AC</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {availableRooms.map((room) => {
                            const isSelected = selectedRoomIds.includes(room.id);
                            const roomStay = getRoomStay(room.id);

                            return (
                              <Fragment key={room.id}>
                                <tr
                                  className={isSelected ? "is-selected" : ""}
                                  onClick={() => toggleRoom(room.id)}
                                >
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onClick={(event) => event.stopPropagation()}
                                      onChange={() => toggleRoom(room.id)}
                                    />
                                  </td>
                                  <td>{room.charge_code} {room.unit_number}</td>
                                  <td>{room.room_type || getRoomType(room.room_type_id)?.room_type || "-"}</td>
                                  <td>{room.floor ?? "-"}</td>
                                  <td>{room.max_pax ?? "-"}</td>
                                  <td>
                                    {isSelected ? (
                                      <label className="group-booking-ac-toggle" onClick={(event) => event.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          checked={Boolean(roomAcFlags[room.id])}
                                          onChange={(event) => updateRoomAc(room.id, event.target.checked)}
                                        />
                                        <span>{roomAcFlags[room.id] ? "AC" : "Non-AC"}</span>
                                      </label>
                                    ) : (
                                      <span>-</span>
                                    )}
                                  </td>
                                  <td>
                                    {isSelected ? (
                                      <label className="group-booking-rate-input">
                                        <span>{BASE_CURRENCY}</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          aria-label={`Nightly rate for room ${room.unit_number}`}
                                          value={getRoomRate(room)}
                                          onClick={(event) => event.stopPropagation()}
                                          onChange={(event) => updateRoomRate(room.id, event.target.value)}
                                        />
                                      </label>
                                    ) : (
                                      <span>{BASE_CURRENCY}{getRoomRate(room).toFixed(2)}</span>
                                    )}
                                  </td>
                                </tr>
                                {isSelected && (
                                  <tr className="group-booking-room-stay-row">
                                    <td colSpan={7} onClick={(event) => event.stopPropagation()}>
                                      <div className="group-booking-room-stay-card">
                                        <div className="group-booking-room-title">
                                          Room stay for <strong>{room.charge_code} {room.unit_number}</strong>
                                        </div>

                                        <label className="group-booking-stay-control">
                                          <span>Check-in date</span>
                                          <input
                                            type="date"
                                            min={stayInfo.checkInDate}
                                            max={roomStay.checkOutDate}
                                            value={roomStay.checkInDate}
                                            onChange={(event) =>
                                              updateRoomStay(room.id, "checkInDate", event.target.value)
                                            }
                                          />
                                        </label>

                                        <div className="group-booking-stay-control">
                                          <StayTimePicker
                                            id={`room-${room.id}-check-in-time`}
                                            label="CHECK-IN TIME"
                                            value={roomStay.checkInTime}
                                            onChange={(value) =>
                                              updateRoomStay(room.id, "checkInTime", value)
                                            }
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}
          </LocalizationProvider>

          {activeStep === 1 && (
            <div className="group-booking-step">
              <section className="group-booking-panel">
                <div className="group-booking-section-heading">
                  <div>
                    <span>Step 2</span>
                    <h4>Select Extra Services</h4>
                  </div>
                  <strong>
                    {Object.keys(serviceQuantities).length} selected
                  </strong>
                </div>
                <div className="group-booking-meal-plan">
                  <label htmlFor="group-booking-meal-plan">Meal Plan / Rate</label>
                  <select
                    id="group-booking-meal-plan"
                    value={bookingInfo.mealPlanId}
                    onChange={(event) => {
                      setBookingInfo((current) => ({
                        ...current,
                        mealPlanId: event.target.value,
                      }));
                      setPreparedPayload(null);
                    }}
                  >
                    <option value="">Use default meal plan for each room type</option>
                    {mealPlans.map((mealPlan) => (
                      <option key={mealPlan.id} value={mealPlan.id}>
                        {mealPlan.name}
                        {mealPlan.base_price != null ? ` - ${BASE_CURRENCY}${Number(mealPlan.base_price).toFixed(2)}` : ""}
                      </option>
                    ))}
                  </select>
                  <small>Changing the meal plan updates rooms whose rates were not manually edited.</small>
                </div>
                <div className="group-booking-services">
                  {extraServices.length ? (
                    <div className="group-booking-services-list">
                      {extraServices.map((service) => {
                        const quantity = Number(serviceQuantities[service.id] || 0);
                        const isSelected = quantity > 0;
                        return (
                          <div
                            key={service.id}
                            className={`group-booking-service-row ${isSelected ? "is-selected" : ""}`}
                          >
                            <label>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleService(service.id)}
                              />
                              <span>
                                <strong>{service.service_name}</strong>
                                <small>{BASE_CURRENCY}{Number(service.price || 0).toFixed(2)} each</small>
                              </span>
                            </label>
                            <div className="group-booking-service-quantity">
                              <label htmlFor={`service-quantity-${service.id}`}>Quantity</label>
                              <input
                                id={`service-quantity-${service.id}`}
                                type="number"
                                min="1"
                                value={isSelected ? quantity : 1}
                                disabled={!isSelected}
                                onChange={(event) => updateServiceQuantity(service.id, event.target.value)}
                              />
                            </div>
                            <strong className="group-booking-service-subtotal">
                              {BASE_CURRENCY}{(Number(service.price || 0) * quantity).toFixed(2)}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="group-booking-service-empty">No extra services are configured.</div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeStep === 2 && (
            <div className="group-booking-step">
              <section className="group-booking-panel group-booking-guest-panel">
                <div className="group-booking-section-heading">
                  <div>
                    <span>Step 3</span>
                    <h4>Primary Guest Details</h4>
                  </div>
                </div>
                <div className="form-group group-booking-phone">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    value={guestInfo.phone}
                    onChange={(e) => updateGuest("phone", e.target.value)}
                  />
                  {searchingGuest && <small className="group-booking-guest-status">Searching guests...</small>}
                  {!searchingGuest && guestInfo.phone.trim().length >= 10 && matchingGuests.length === 0 && (
                    <small className="group-booking-guest-status">Guest details will fill automatically when found.</small>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input value={guestInfo.firstName} onChange={(e) => updateGuest("firstName", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input value={guestInfo.lastName} onChange={(e) => updateGuest("lastName", e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={guestInfo.email} onChange={(e) => updateGuest("email", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input value={guestInfo.country} onChange={(e) => updateGuest("country", e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input value={guestInfo.address} onChange={(e) => updateGuest("address", e.target.value)} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>ID Type</label>
                    <select value={guestInfo.idType} onChange={(e) => updateGuest("idType", e.target.value)}>
                      <option value="">Select ID Type</option>
                      <option value="Passport">Passport</option>
                      <option value="National ID">National ID</option>
                      <option value="Driver License">Driver License</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>ID Number</label>
                    <input value={guestInfo.idNumber} onChange={(e) => updateGuest("idNumber", e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Adults</label>
                    <input
                      type="number"
                      min="1"
                      value={bookingInfo.adults}
                      onChange={(e) => setBookingInfo((current) => ({ ...current, adults: Math.max(1, Number(e.target.value) || 1) }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Children</label>
                    <input
                      type="number"
                      min="0"
                      value={bookingInfo.children}
                      onChange={(e) => setBookingInfo((current) => ({ ...current, children: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Infants</label>
                    <input
                      type="number"
                      min="0"
                      value={bookingInfo.infants}
                      onChange={(e) => setBookingInfo((current) => ({ ...current, infants: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Company Details</label>
                    <input
                      value={guestInfo.company}
                      onChange={(e) => updateGuest("company", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>GST Number</label>
                    <input
                      value={guestInfo.gst}
                      onChange={(e) => updateGuest("gst", e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea rows="3" value={guestInfo.notes} onChange={(e) => updateGuest("notes", e.target.value)} />
                </div>

                <div className="group-booking-summary">
                  <div className="price-line"><span>Selected rooms</span><strong>{selectedRooms.length}</strong></div>
                  <div className="price-line"><span>Total guests</span><strong>{totalGuests}</strong></div>
                  <div className="price-line"><span>Total capacity</span><strong>{totalCapacity}</strong></div>
                  <div className="price-line"><span>Extra services</span><strong>{BASE_CURRENCY}{servicesTotal.toFixed(2)}</strong></div>
                  <div className="price-line total">
                    <span>Estimated total</span>
                    <strong>{BASE_CURRENCY}{grandTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeStep === 3 && (
            <div className="group-booking-step">
              <section className="group-booking-panel group-booking-review">
                <div className="group-booking-section-heading">
                  <div>
                    <span>Step 4</span>
                    <h4>Review Group Booking</h4>
                  </div>
                </div>
                <div className="group-booking-review-grid">
                  <div>
                    <span>Stay</span>
                    <strong>{stayInfo.checkInDate} {format(getTimeValue(stayInfo.checkInTime), "hh:mm a")}</strong>
                    <small>to {stayInfo.checkOutDate} {format(getTimeValue(stayInfo.checkOutTime), "hh:mm a")}</small>
                    {extraDayCharged && <small>Includes one extra day after {businessCheckoutTime}</small>}
                  </div>
                  <div>
                    <span>Primary guest</span>
                    <strong>{guestInfo.firstName} {guestInfo.lastName}</strong>
                    <small>{guestInfo.phone}</small>
                  </div>
                  <div>
                    <span>Rooms</span>
                    <strong>{selectedRooms.length} selected</strong>
                    <small>
                      {selectedRooms
                        .map((room) => {
                          const roomStay = getRoomStay(room.id);
                          return `${room.charge_code} ${room.unit_number}: ${roomStay.checkInDate} ${format(
                            getTimeValue(roomStay.checkInTime),
                            "hh:mm a",
                          )} to ${roomStay.checkOutDate} ${format(
                            getTimeValue(roomStay.checkOutTime),
                            "hh:mm a",
                          )}`;
                        })
                        .join(" | ")}
                    </small>
                  </div>
                  <div>
                    <span>Guests</span>
                    <strong>{totalGuests} total</strong>
                    <small>{bookingInfo.adults} adults, {bookingInfo.children} children, {bookingInfo.infants} infants</small>
                  </div>
                </div>
                <div className="group-booking-summary">
                  <div className="price-line"><span>Rooms</span><strong>{BASE_CURRENCY}{estimatedTotal.toFixed(2)}</strong></div>
                  <div className="price-line"><span>Extra services</span><strong>{BASE_CURRENCY}{servicesTotal.toFixed(2)}</strong></div>
                  <div className="price-line total"><span>Estimated total</span><strong>{BASE_CURRENCY}{grandTotal.toFixed(2)}</strong></div>
                </div>
                {preparedPayload && (
                  <div className="group-booking-payload">
                    <h4>Prepared Payload</h4>
                    <pre>{JSON.stringify(preparedPayload, null, 2)}</pre>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        <div className="group-booking-actions">
          <div>
            <span>Estimated total</span>
            <strong>{BASE_CURRENCY}{grandTotal.toFixed(2)}</strong>
          </div>
          {activeStep === 0 ? (
            <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
          ) : (
            <button className="btn-secondary" type="button" onClick={() => setActiveStep((step) => step - 1)}>Back</button>
          )}
          {activeStep < 3 ? (
            <button className="btn-primary" type="button" onClick={() => goToStep(activeStep + 1)}>Next</button>
          ) : (
            <>
              <button
                className="btn-primary reserve-booking-btn"
                type="button"
                onClick={() => createGroupBooking("Confirmed")}
                disabled={submitting}
              >
                <FiSave />{" "}
                {submitting && submitAction === "Confirmed"
                  ? "Reserving..."
                  : "Reserve Booking"}
              </button>
              <button
                className="btn-primary book-now-btn"
                type="button"
                onClick={() => createGroupBooking("Checked In")}
                disabled={submitting}
              >
                <FiSave />{" "}
                {submitting && submitAction === "Checked In"
                  ? "Checking In..."
                  : "Book Now"}
              </button>
            </>
          )}
        </div>
      </div>

      {matchingGuests.length > 1 && (
        <div className="group-booking-guest-dialog-overlay">
          <div
            className="group-booking-guest-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-booking-select-guest-title"
          >
            <div className="group-booking-guest-dialog-header">
              <h4 id="group-booking-select-guest-title">Select Guest</h4>
              <button
                type="button"
                aria-label="Close guest selection"
                onClick={() => setMatchingGuests([])}
              >
                <FiX />
              </button>
            </div>

            <div className="group-booking-guest-dialog-body">
              <p>Multiple guests found with this phone number. Please select the correct guest:</p>
              <div className="group-booking-guest-dialog-list">
                {matchingGuests.map((guest) => (
                  <div key={guest.id} className="group-booking-guest-dialog-item">
                    <div>
                      <strong>{guest.first_name} {guest.last_name}</strong>
                      {guest.email && <span>{guest.email}</span>}
                      {guest.address && <span>{guest.address}</span>}
                      {guest.company && <span>{guest.company}</span>}
                    </div>
                    <button type="button" onClick={() => selectGuest(guest)}>Select</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="group-booking-guest-dialog-footer">
              <button type="button" onClick={() => setMatchingGuests([])}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupBookingModal;
