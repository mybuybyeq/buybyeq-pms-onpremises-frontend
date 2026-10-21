import { useState, useEffect, useRef } from "react";
import { FiCalendar, FiX, FiShoppingCart, FiSave, FiChevronDown, FiRefreshCw } from "react-icons/fi";
import { DateRange } from "react-date-range";
import { addDays, differenceInCalendarDays, format, eachDayOfInterval, isSameDay, isValid } from "date-fns";
import axios from "../../../api/axios";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "./check-availability.scss";
import { Alert, Snackbar, Switch, FormControlLabel } from "@mui/material";
import { BASE_CURRENCY } from "../../../constants/currency";
import EmptyState from "../../error/EmptyState";
import { sendEmail } from "../../../assets/helpers";

const HotelBookingPage = () => {
  // State for API data
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [availabilityData, setAvailabilityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Booking state
  const [rangeState, setRangeState] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 14),
      key: "selection",
    },
  ]);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingInfo, setBookingInfo] = useState({
    units: 1,
    adults: 1,
    children: 0,
    infants: 0,
    mealPlan: null,
    reservationName: "",
    extraServices: [],
    useBasePrice: true,
    isAC: false,
    checkinTime: "00:00:00",
    checkoutTime: "23:00:00",
  });
  const [cart, setCart] = useState([]);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    firstName: "",
    lastName: "",
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
  const [selectionHint, setSelectionHint] = useState("");

  // UI state
  const [showHotelDropdown, setShowHotelDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const hotelDropdownRef = useRef(null);
  const datePickerRef = useRef(null);

  const [selectionMode, setSelectionMode] = useState(null); // 'checkin' or 'checkout'
  const [tempCheckIn, setTempCheckIn] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Show snackbar
  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar((prev) => ({ ...prev, open: false })), 3000);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (hotelDropdownRef.current && !hotelDropdownRef.current.contains(event.target)) {
        setShowHotelDropdown(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const userData = JSON.parse(sessionStorage.getItem("userData"));
        const propertiesRes = await axios.get(`businessEntities/getAllBusinessEntities/${userData.Group_ID}`);
        const filteredData = propertiesRes.data.filter((business) => business.business_type === "H");

        setProperties(filteredData);
        if (filteredData.length) {
          setSelectedProperty(filteredData[0]);
        }
      } catch (err) {
        showSnackbar("Failed to load properties", "error");
        console.error("Error loading properties:", err);
      }
    };

    fetchProperties();
  }, []);

  // keyboard support for availabilty table
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectionMode && e.key === "Escape") {
        resetSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectionMode]);

  // Fetch all data when property or date range changes
  useEffect(() => {
    if (!selectedProperty) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [roomTypesRes, mealPlansRes, extraServicesRes] = await Promise.all([
          axios.get(`pms/rooms/roomTypes/${selectedProperty.business_entity_id}`),
          axios.get(`pms/mealPlans/getAll/${null}/${selectedProperty.business_entity_id}`),
          axios.get(`pms/extra-services/getAll/${null}/${selectedProperty.business_entity_id}`),
        ]);

        const roomTypesData = Array.isArray(roomTypesRes.data) ? roomTypesRes.data : [];
        const mealPlansData = Array.isArray(mealPlansRes.data) ? mealPlansRes.data : [];
        const extraServicesData = Array.isArray(extraServicesRes.data) ? extraServicesRes.data : [];

        if (roomTypesData.length === 0) {
          showSnackbar("No room types & rooms added for this property", "info");
        }

        const processedRoomTypes = roomTypesData.map((roomType) => ({
          ...roomType,
          base_price: roomType.base_price || 0,
          max_occupancy: roomType.max_occupancy || 2,
        }));

        setRoomTypes(processedRoomTypes);
        setMealPlans(mealPlansData);
        setExtraServices(extraServicesData);

        if (processedRoomTypes.length > 0) {
          await fetchBulkAvailability(processedRoomTypes);
        }
      } catch (err) {
        showSnackbar("Failed to load property data", "error");
        console.error("Error loading property data:", err);
        setRoomTypes([]);
        setMealPlans([]);
        setExtraServices([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchAllData();
  }, [selectedProperty, rangeState]);

  const fetchBulkAvailability = async (roomTypes) => {
    try {
      const roomTypeIds = roomTypes.map((rt) => rt.id).join(",");
      const startDate = format(rangeState[0].startDate, "yyyy-MM-dd");
      const endDate = format(rangeState[0].endDate, "yyyy-MM-dd");

      const availabilityRes = await axios.get(`pms/room-availability/bulk`, {
        params: {
          property_id: selectedProperty.business_entity_id,
          room_type_ids: roomTypeIds,
          start_date: startDate,
          end_date: endDate,
        },
      });

      // Create a date-indexed map for each room type
      const availabilityMap = roomTypes.reduce((acc, roomType) => {
        acc[roomType.id] = {};
        const roomData = availabilityRes.data.data[roomType.id] || {};
        Object.entries(roomData).forEach(([dateStr, availability]) => {
          acc[roomType.id][dateStr] = availability;
        });
        return acc;
      }, {});

      // Generate the matrix with explicit date matching
      const daysArray = eachDayOfInterval({
        start: rangeState[0].startDate,
        end: rangeState[0].endDate,
      });

      const formattedAvailability = roomTypes.map((roomType) => {
        return daysArray.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          return availabilityMap[roomType.id][dayStr] ?? 0; // Use nullish coalescing
        });
      });

      setAvailabilityData(formattedAvailability);
    } catch (err) {
      console.error("Error loading availability:", err);
      const daysCount = differenceInDays(rangeState[0].endDate, rangeState[0].startDate);
      setAvailabilityData(roomTypes.map(() => Array(daysCount).fill(0)));
    }
  };

  // Refresh availability data
  const handleRefresh = async () => {
    setRefreshing(true);
    if (roomTypes.length > 0) {
      await fetchBulkAvailability(roomTypes);
    }
    setRefreshing(false);
  };

  //fetcj rooms for booking modal
  useEffect(() => {
    if (isValid(selStart) && isValid(selEnd)) {
      const startDate = format(selStart, "yyyy-MM-dd");
      const endDate = format(selEnd, "yyyy-MM-dd");

      axios
        .get(`/pms/rooms/getVacantRooms/${null}/${selectedProperty.business_entity_id}`, {
          params: {
            start_date: startDate,
            end_date: endDate,
          },
        })
        .then((response) => {
          setRooms(response.data);
        });
    }
  }, [selStart, selEnd, selectedProperty]);

  const getDefaultMealPlanForRoomType = (roomTypeId) => {
    const applicableMealPlans = mealPlans.filter((mp) => mp.room_type_id === null || mp.room_type_id === roomTypeId);

    if (applicableMealPlans.length === 0) return null;
    const roomTypeSpecific = applicableMealPlans.find((mp) => mp.room_type_id === roomTypeId);
    if (roomTypeSpecific) return roomTypeSpecific;
    return applicableMealPlans[0];
  };

  const getDisplayPrice = (roomType) => {
    const applicableMealPlans = mealPlans.filter((mp) => mp.room_type_id === null || mp.room_type_id === roomType.id);

    let minPrice = roomType.base_price || Infinity;

    applicableMealPlans.forEach((mealPlan) => {
      const mealPlanPrice = mealPlan.base_price || mealPlan.adult_price || Infinity;
      if (mealPlanPrice < minPrice) {
        minPrice = mealPlanPrice;
      }
    });

    return minPrice === Infinity ? 0 : minPrice;
  };

  const differenceInDays = (start, end) => {
    if (!start || !end) return 0;
    const diff = differenceInCalendarDays(end, start);
    return diff <= 0 ? 1 : diff;
  };

  const calculatePrice = (roomType, bookingInfo, nights) => {
    const mealPlan = bookingInfo.mealPlan
      ? mealPlans.find((mp) => mp.id === Number(bookingInfo.mealPlan))
      : getDefaultMealPlanForRoomType(roomType.id);

    let totalPrice = 0;

    if (bookingInfo.useBasePrice) {
      const basePrice = mealPlan?.base_price || roomType.base_price || 0;
      totalPrice = basePrice * nights;
    } else if (mealPlan) {
      const adultPrice = parseFloat(mealPlan.adult_price || mealPlan.base_price || roomType.base_price || 0);
      const childPrice = parseFloat(mealPlan.child_price || mealPlan.base_price / 2 || roomType.base_price / 2 || 0);
      const infantPrice = parseFloat(mealPlan.infant_price || 0);

      totalPrice =
        (adultPrice * bookingInfo.adults + childPrice * bookingInfo.children + infantPrice * bookingInfo.infants) *
        nights;
    } else {
      totalPrice = (roomType.base_price || 0) * bookingInfo.adults * nights;
    }

    const extraServicesTotal = bookingInfo.extraServices.reduce((sum, serviceId) => {
      const service = extraServices.find((s) => s.id === serviceId);
      return sum + (service ? parseFloat(service.price) : 0);
    }, 0);

    return totalPrice + extraServicesTotal;
  };

  const handleCellClick = (rIdx, dIdx) => {
    const roomType = roomTypes[rIdx];
    const day = days[dIdx];
    const isAvailable = availabilityData[rIdx]?.[dIdx] > 0 && getDisplayPrice(roomType) !== 0;

    // Case 1: No room type selected or different room type selected
    if (!selectedRoomType || selectedRoomType.id !== roomType.id) {
      if (!isAvailable) {
        showSnackbar("No rooms available for selected date", "error");
        return;
      }
      setSelectedRoomType(roomType);
      setSelStart(day);
      setSelEnd(null);
      setSelectionHint("Selected check-in date. Now select any checkout date");
      return;
    }

    // Case 2: Selecting check-in date (must be available)
    if (!selStart) {
      if (!isAvailable) {
        showSnackbar("No rooms available for selected check-in date", "error");
        return;
      }
      setSelStart(day);
      setSelEnd(null);
      setSelectionHint("Selected check-in date. Now select any checkout date");
      return;
    }

    // Case 3: Selecting checkout date (can be any date after check-in, regardless of availability)
    if (selStart && !selEnd) {
      if (day < selStart) {
        showSnackbar("Checkout date cannot be before check-in date", "error");
        return;
      }

      setSelEnd(day);
      setShowBookingModal(true);
      setBookingInfo((prev) => ({
        ...prev,
        mealPlan: getDefaultMealPlanForRoomType(selectedRoomType.id)?.id || null,
      }));
      setSelectionHint("");
      return;
    }

    // Case 4: Modifying existing selection
    if (selStart && selEnd) {
      // Clicking same check-in date - reset selection
      if (isSameDay(day, selStart)) {
        if (!isAvailable) {
          showSnackbar("No rooms available for selected check-in date", "error");
          return;
        }
        setSelStart(day);
        setSelEnd(null);
        setSelectionHint("Selected new check-in date. Now select any future checkout date");
        return;
      }

      // Clicking before current start - set new check-in (must be available)
      if (day < selStart) {
        if (!isAvailable) {
          showSnackbar("No rooms available for selected check-in date", "error");
          return;
        }
        setSelStart(day);
        setSelEnd(null);
        setSelectionHint("Selected new check-in date. Now select any future checkout date");
        return;
      }

      // Clicking any date after check-in - set as checkout (no availability check)
      setSelEnd(day);
      setShowBookingModal(true);
      setBookingInfo((prev) => ({
        ...prev,
        mealPlan: getDefaultMealPlanForRoomType(selectedRoomType.id)?.id || null,
      }));
      setSelectionHint("");
    }
  };
  // Convert "02:30 PM" → "14:30"
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

  const formatTo12Hour = (timeStr) => {
    if (!timeStr) return "";
    const [hourStr, minute] = timeStr.split(":");
    let hour = parseInt(hourStr, 10);

    if (Number.isNaN(hour)) return timeStr;

    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;

    return `${hour.toString().padStart(2, "0")}:${minute} ${ampm}`;
  };

  const days = eachDayOfInterval({
    start: rangeState[0].startDate,
    end: rangeState[0].endDate,
  });

  const getMealPlansForRoomType = (roomTypeId) => {
    return mealPlans.filter((mp) => mp.room_type_id === null || mp.room_type_id === roomTypeId);
  };

  const getAvailableRoomsForType = (roomTypeId) => {
    return rooms.filter((room) => room.room_type_id === roomTypeId);
  };

  const addToCart = () => {
    if (!selectedRoom) {
      showSnackbar("Please select a specific room for the guest", "error");
      return;
    }

    if (!selectedRoomType || !selStart || !selEnd) return;

    const totalGuests = bookingInfo.adults + bookingInfo.children + bookingInfo.infants;

    const roomCapacity = selectedRoom?.max_pax || 2;

    if (totalGuests > roomCapacity * bookingInfo.units) {
      showSnackbar(`Total guests exceed room capacity (max ${roomCapacity * bookingInfo.units} guests)`, "error");
      return;
    }

    const hasOverlap = cart.some((item) => {
      if (item.room?.id !== selectedRoom.id) return false;

      return (
        (selStart >= item.start && selStart <= item.end) ||
        (selEnd >= item.start && selEnd <= item.end) ||
        (selStart <= item.start && selEnd >= item.end)
      );
    });

    if (hasOverlap) {
      showSnackbar("This room is already booked for overlapping dates in your cart", "error");
      return;
    }

    if (!bookingInfo.reservationName.trim()) {
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      bookingInfo.reservationName = `${selectedRoomType.charge_code}-${randomCode}`;
    }

    const nights = differenceInDays(selEnd, selStart);
    const total = calculatePrice(selectedRoomType, bookingInfo, nights) * bookingInfo.units;

    const selectedServices = extraServices.filter((service) => bookingInfo.extraServices.includes(service.id));

    setCart((prev) => [
      ...prev,
      {
        roomType: selectedRoomType,
        room: selectedRoom,
        start: selStart,
        end: selEnd,
        ...bookingInfo,
        nights,
        selectedServices,
        total,
        property_id: selectedProperty.business_entity_id,
        isAC: bookingInfo.isAC,
        checkinTime: bookingInfo.checkinTime,
        checkoutTime: bookingInfo.checkoutTime,
      },
    ]);

    setShowBookingModal(false);
    resetSelection();
    showSnackbar("Added to cart successfully!");
  };

  const resetSelection = () => {
    setSelectedRoomType(null);
    setSelectedRoom(null);
    setSelStart(null);
    setSelEnd(null);
    setTempCheckIn(null);
    setSelectionMode(null);
    setHoveredDate(null);
    setSelectionHint("");
    setBookingInfo({
      units: 1,
      adults: 1,
      children: 0,
      infants: 0,
      mealPlan: null,
      reservationName: "",
      extraServices: [],
      useBasePrice: false,
      isAC: false,
      checkinTime: "00:00:00",
      checkoutTime: "23:00:00",
    });
  };

  const removeFromCart = (idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
    showSnackbar("Removed from cart");
  };

  const saveReservation = async () => {
    try {
      const userData = JSON.parse(sessionStorage.getItem("userData"));

      let guestId;
      const newGuestPayload = {
        first_name: guestInfo.firstName,
        last_name: guestInfo.lastName,
        age: guestInfo.age || null,
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

      try {
        const guestResponse = await axios.post("pms/guests/add", newGuestPayload);
        guestId = guestResponse.data.id;
      } catch (guestError) {
        if (
          guestError.response &&
          guestError.response.status === 400 &&
          guestError.response.data?.error === "Phone number already exists"
        ) {
          showSnackbar("Phone number already exists. Please use a different number.", "error");
          setGuestInfo((prev) => ({ ...prev, phone: "" }));

          return;
        } else {
          throw guestError;
        }
      }

      for (const item of cart) {
        const reservationPayload = {
          reservation_number: `${item.reservationName}-${Date.now()}`,
          property_id: item.property_id,
          guest_id: guestId,
          used_baseprice: item.useBasePrice === false ? "No" : "Yes",
          check_in_date: format(item.start, "yyyy-MM-dd"),
          check_out_date: format(item.end, "yyyy-MM-dd"),
          checkin_time: item.checkinTime,
          checkout_time: item.checkoutTime,
          adults: item.adults,
          children: item.children,
          infants: item.infants,
          status: "Confirmed",
          total_amount: item.total,
          balance_due: item.total,
          notes: guestInfo.notes,
          group_id: userData.Group_ID,
        };

        const reservationResponse = await axios.post("pms/reservations/add", reservationPayload);

        const getMealPlanPricing = (mealPlan, fallbackBase = 0) => {
          const base = mealPlan?.base_price ?? fallbackBase;

          return {
            base,
            adult: mealPlan?.adult_price ?? base,
            child: mealPlan?.child_price ?? base / 2,
            infant: mealPlan?.infant_price ?? 0,
          };
        };

        const selectedMealPlan = mealPlans?.find((mp) => mp.id === item.mealPlan);

        const pricing = getMealPlanPricing(selectedMealPlan, item.roomType?.base_price || 0);

        const reservationRoomPayload = {
          reservation_id: reservationResponse.data.id,
          room_type_id: item.roomType.id,
          room_id: item.room?.id || null,
          meal_plan_id: item.mealPlan || getDefaultMealPlanForRoomType(item.roomType.id)?.id || null,
          base_rate: pricing.base,
          adult_rate: pricing.adult || 0,
          child_rate: pricing.child || 0,
          infant_rate: pricing.infant || 0,
          status: "Reserved",
          quantity: item.units,
          is_ac: item.isAC,
        };

        await axios.post("pms/reservationRooms/add", reservationRoomPayload);

        for (const service of item.selectedServices) {
          const servicePayload = {
            reservation_id: reservationResponse.data.id,
            service_id: service.id,
            quantity: 1,
            service_date: format(item.start, "yyyy-MM-dd"),
            rate: service.price,
            notes: "",
          };
          console.log("Adding extra service with payload:", servicePayload);
          await axios.post("pms/reservationServices/add", servicePayload);
        }

        sendEmail({
          reservationId: reservationResponse.data.id,
          templateType: "BOOKING_CONFIRMATION",
        });
      }

      showSnackbar(`Reservation created successfully!`);

      setCart([]);
      setShowGuestModal(false);
      setGuestInfo({
        firstName: "",
        lastName: "",
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

      handleRefresh();
    } catch (error) {
      console.error("Error creating reservation:", error);
      showSnackbar("Failed to create reservation. Please try again.", "error");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading hotel data...</p>
      </div>
    );
  }

  return (
    <section className="content-area-table">
      <div className="booking-container">
        <div className="header-section">
          <h4 className="data-table-title">Room Availability, Reservation & Booking</h4>
          {roomTypes.length !== 0 && (
            <div style={{ display: "flex", gap: "8px" }}>
              {(selStart || selEnd) && (
                <button
                  className="refresh-button clear-selection-button"
                  onClick={() => {
                    setSelStart(null);
                    setSelEnd(null);
                    setSelectionHint("");
                    setSelectedRoomType(null);
                    setSelectedRoom(null);
                    showSnackbar("Selection cleared", "info");
                  }}
                  title="Clear date selection"
                >
                  <FiX />
                  Clear Selection
                </button>
              )}
              <button className="refresh-button" onClick={handleRefresh} disabled={refreshing}>
                <FiRefreshCw className={refreshing ? "spinning" : ""} />
                {refreshing ? "Refreshing..." : "Refresh Availability"}
              </button>

            </div>
          )}
        </div>

        {/* Hotel Selection Dropdown */}
        <div className="hotel-selection" ref={hotelDropdownRef}>
          <div className="hotel-selector" onClick={() => setShowHotelDropdown((prev) => !prev)}>
            <span>{selectedProperty?.business_name}</span>
            <FiChevronDown className={`dropdown-icon ${showHotelDropdown ? "open" : ""}`} />
          </div>
          {showHotelDropdown && (
            <div className="hotel-dropdown">
              {properties.map((property) => (
                <div
                  key={property.business_entity_id}
                  className={`hotel-option ${selectedProperty?.business_entity_id === property.business_entity_id ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedProperty(property);
                    setShowHotelDropdown(false);
                  }}
                >
                  {property.business_name}
                </div>
              ))}
            </div>
          )}
        </div>
        {selectionHint && (
          <div className="selection-hint">
            <Alert severity="info">{selectionHint}</Alert>
          </div>
        )}
        {/* Date Range Picker */}
        {roomTypes.length !== 0 && (
          <div className="date-picker-container" ref={datePickerRef}>
            <div className="date-picker-trigger" onClick={() => setShowDatePicker(!showDatePicker)}>
              <FiCalendar />
              <span>
                {format(rangeState[0].startDate, "MMM d, yyyy")} — {format(rangeState[0].endDate, "MMM d, yyyy")}
              </span>
            </div>

            {showDatePicker && (
              <div className="date-picker-popover">
                <DateRange
                  editableDateInputs
                  ranges={rangeState}
                  onChange={(ranges) => {
                    setRangeState([ranges.selection]);
                    setShowDatePicker(false);
                  }}
                  moveRangeOnFirstSelection={false}
                  months={1}
                />
              </div>
            )}
          </div>
        )}

        {/* Availability Table */}
        {roomTypes.length !== 0 ? (
          <div className="availability-table-container">
            <div className="table-wrapper">
              <table className="availability-table">
                <thead>
                  <tr>
                    <th className="room-header">Room Type</th>
                    {days.map((d) => (
                      <th key={d.toISOString()}>
                        <div className="date-header">
                          <div className="weekday">{format(d, "EEE")}</div>
                          <div className="day">{format(d, "d")}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roomTypes.map((roomType, rIdx) => (
                    <tr key={roomType.id}>
                      <td className="room-cell">
                        <div className="room-info">
                          <div className="room-name">{roomType.room_type}</div>
                          <div className="room-price">
                            {getDisplayPrice(roomType) === 0
                              ? "No room rates added"
                              : `From ${BASE_CURRENCY}${getDisplayPrice(roomType).toLocaleString()}/night`}
                          </div>
                          <div className="room-occupancy">Max {roomType.max_occupancy} guests</div>
                        </div>
                      </td>
                      {days.map((day, dIdx) => {
                        const isAvailable = availabilityData[rIdx]?.[dIdx] > 0 && getDisplayPrice(roomType) !== 0;
                        const isSameRoomType = selectedRoomType?.id === roomType.id;

                        const shouldShowAvailable = isAvailable || (isSameRoomType && selStart && day > selStart);

                        return (
                          <td
                            key={dIdx}
                            className={`
            availability-cell 
            ${!shouldShowAvailable ? "unavailable" : "available"} 
            ${isSameRoomType && selStart && isSameDay(day, selStart) ? "checkin-selected" : ""}
            ${isSameRoomType && selEnd && isSameDay(day, selEnd) ? "checkout-selected" : ""}
            ${isSameRoomType && selStart && selEnd && day > selStart && day < selEnd ? "selected-range" : ""}
          `}
                            onClick={() => handleCellClick(rIdx, dIdx)}
                            title={format(day, "EEE, MMM d, yyyy")}
                          >
                            <div className="cell-content">
                              {shouldShowAvailable ? availabilityData[rIdx][dIdx] : "—"}
                              {isSameRoomType && selStart && isSameDay(day, selStart) && (
                                <div className="selection-indicator checkin">CI</div>
                              )}
                              {isSameRoomType && selEnd && isSameDay(day, selEnd) && (
                                <div className="selection-indicator checkout">CO</div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <EmptyState
              title=""
              subtitle="No Room Types & Rooms Available"
              description="Please add room types and rates to check availability or start booking."
            />
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && selectedRoomType && (
          <div className="modal-overlay">
            <div className="modal booking-modal">
              <div className="modal-header">
                <h3>Book {selectedRoomType.room_type}</h3>
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    resetSelection();
                  }}
                >
                  <FiX />
                </button>
              </div>
              <div className="modal-content">
                <div className="booking-dates">
                  <div className="date-range-display">
                    <FiCalendar />
                    <span>
                      CheckIn On: {format(selStart, "MMM d")} — Checkout On: {format(selEnd, "MMM d")} (
                      {differenceInDays(selEnd, selStart)} nights)
                    </span>
                  </div>
                </div>
                <div className="form-row">
                  {/* CHECK-IN */}
                  <div className="form-group">
                    <label>Check-in Time</label>

                    <select
                      value={convertTo12(bookingInfo.checkinTime)}
                      onChange={(e) =>
                        setBookingInfo((prev) => ({
                          ...prev,
                          checkinTime: convertTo24(e.target.value),
                        }))
                      }
                    >
                      {[
                        "12:00 AM",
                        "12:30 AM",
                        "01:00 AM",
                        "01:30 AM",
                        "02:00 AM",
                        "02:30 AM",
                        "03:00 AM",
                        "03:30 AM",
                        "04:00 AM",
                        "04:30 AM",
                        "05:00 AM",
                        "05:30 AM",
                        "06:00 AM",
                        "06:30 AM",
                        "07:00 AM",
                        "07:30 AM",
                        "08:00 AM",
                        "08:30 AM",
                        "09:00 AM",
                        "09:30 AM",
                        "10:00 AM",
                        "10:30 AM",
                        "11:00 AM",
                        "11:30 AM",
                        "12:00 PM",
                        "12:30 PM",
                        "01:00 PM",
                        "01:30 PM",
                        "02:00 PM",
                        "02:30 PM",
                        "03:00 PM",
                        "03:30 PM",
                        "04:00 PM",
                        "04:30 PM",
                        "05:00 PM",
                        "05:30 PM",
                        "06:00 PM",
                        "06:30 PM",
                        "07:00 PM",
                        "07:30 PM",
                        "08:00 PM",
                        "08:30 PM",
                        "09:00 PM",
                        "09:30 PM",
                        "10:00 PM",
                        "10:30 PM",
                        "11:00 PM",
                        "11:30 PM",
                      ].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CHECK-OUT */}
                  <div className="form-group">
                    <label>Check-out Time</label>

                    <select
                      value={convertTo12(bookingInfo.checkoutTime)}
                      onChange={(e) =>
                        setBookingInfo((prev) => ({
                          ...prev,
                          checkoutTime: convertTo24(e.target.value),
                        }))
                      }
                    >
                      {[
                        "12:00 AM",
                        "12:30 AM",
                        "01:00 AM",
                        "01:30 AM",
                        "02:00 AM",
                        "02:30 AM",
                        "03:00 AM",
                        "03:30 AM",
                        "04:00 AM",
                        "04:30 AM",
                        "05:00 AM",
                        "05:30 AM",
                        "06:00 AM",
                        "06:30 AM",
                        "07:00 AM",
                        "07:30 AM",
                        "08:00 AM",
                        "08:30 AM",
                        "09:00 AM",
                        "09:30 AM",
                        "10:00 AM",
                        "10:30 AM",
                        "11:00 AM",
                        "11:30 AM",
                        "12:00 PM",
                        "12:30 PM",
                        "01:00 PM",
                        "01:30 PM",
                        "02:00 PM",
                        "02:30 PM",
                        "03:00 PM",
                        "03:30 PM",
                        "04:00 PM",
                        "04:30 PM",
                        "05:00 PM",
                        "05:30 PM",
                        "06:00 PM",
                        "06:30 PM",
                        "07:00 PM",
                        "07:30 PM",
                        "08:00 PM",
                        "08:30 PM",
                        "09:00 PM",
                        "09:30 PM",
                        "10:00 PM",
                        "10:30 PM",
                        "11:00 PM",
                        "11:30 PM",
                      ].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Specific Room Selection */}
                <div className="form-group">
                  <label>Select A Room*</label>
                  <select
                    value={selectedRoom?.id || ""}
                    onChange={(e) => {
                      const roomId = e.target.value;
                      if (!roomId) {
                        showSnackbar("Please select a specific room", "error");
                        return;
                      }
                      const room = rooms.find((r) => r.id === parseInt(roomId));
                      setSelectedRoom(room);
                      setBookingInfo((prev) => ({
                        ...prev,
                      }));
                    }}
                    required
                  >
                    <option value="">Select a room</option>
                    {getAvailableRoomsForType(selectedRoomType.id).map((room) => (
                      <option key={`${room.id}-${room.unit_number}`} value={room.id}>
                        {room.charge_code} {room.unit_number} (Floor: {room.floor}, Max Pax: {room.max_pax})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Meal Plan / Rate *</label>
                  <select
                    name="mealPlan"
                    value={bookingInfo.mealPlan || getDefaultMealPlanForRoomType(selectedRoomType.id)?.id || ""}
                    disabled={!selectedRoom}
                    onChange={(e) => {
                      setBookingInfo((prev) => ({
                        ...prev,
                        mealPlan: e.target.value,
                        adults: prev.adults || 1,
                        children: prev.children || 0,
                      }));
                    }}
                  >
                    <option value="">Select a meal plan</option>
                    {getMealPlansForRoomType(selectedRoomType.id).map((mealPlan) => (
                      <option key={mealPlan.id} value={mealPlan.id}>
                        {mealPlan.name} - Adults: {BASE_CURRENCY}
                        {mealPlan.adult_price || mealPlan.base_price || selectedRoomType.base_price}, Children:{" "}
                        {BASE_CURRENCY}
                        {mealPlan.child_price || mealPlan.base_price / 2 || selectedRoomType.base_price / 2}, Infants:{" "}
                        {BASE_CURRENCY}
                        {mealPlan.infant_price || "Free"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Base Price Switch */}
                <div
                  style={{
                    margin: "16px 0",
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
                          setBookingInfo({
                            ...bookingInfo,
                            useBasePrice: e.target.checked,
                          })
                        }
                        sx={{
                          color: "#ff9800",
                          "& .MuiSwitch-track": {
                            backgroundColor: "#ffb74d",
                          },
                        }}
                      />
                    }
                    label="Use Base Price (ignore guest count)"
                    sx={{
                      color: "var(--base-text-color)",
                      mb: 1,
                      "& .MuiFormControlLabel-label": {
                        fontSize: "14px",
                      },
                    }}
                  />

                  <div
                    style={{
                      fontSize: "0.775rem",
                      color: "#bf360c",
                      paddingLeft: "36px",
                      marginTop: "-8px",
                    }}
                  >
                    {bookingInfo.useBasePrice
                      ? "Price will be based on meal plan base price"
                      : "Price will be calculated per person i.e adults, children, infants"}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Adults</label>
                    <input
                      type="number"
                      name="adults"
                      min="1"
                      max={selectedRoom?.max_pax || selectedRoomType.max_occupancy}
                      value={bookingInfo.adults}
                      onChange={(e) => {
                        const adults = parseInt(e.target.value) || 1;
                        const maxPax = selectedRoom?.max_pax || selectedRoomType.max_occupancy;
                        const remainingCapacity =
                          maxPax * bookingInfo.units - adults - bookingInfo.children - bookingInfo.infants;

                        if (remainingCapacity < 0) {
                          showSnackbar(`Exceeds room capacity by ${Math.abs(remainingCapacity)}`, "error");
                          return;
                        }

                        setBookingInfo({
                          ...bookingInfo,
                          adults,
                        });
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Children</label>
                    <input
                      type="number"
                      name="children"
                      min="0"
                      value={bookingInfo.children}
                      onChange={(e) => {
                        const children = parseInt(e.target.value) || 0;
                        const maxPax = selectedRoom?.max_pax || selectedRoomType.max_occupancy;
                        const remainingCapacity =
                          maxPax * bookingInfo.units - bookingInfo.adults - children - bookingInfo.infants;

                        if (remainingCapacity < 0) {
                          showSnackbar(`Exceeds room capacity by ${Math.abs(remainingCapacity)}`, "error");
                          return;
                        }

                        setBookingInfo({
                          ...bookingInfo,
                          children,
                        });
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Infants</label>
                    <input
                      type="number"
                      name="infants"
                      min="0"
                      value={bookingInfo.infants}
                      onChange={(e) => {
                        const infants = parseInt(e.target.value) || 0;
                        const maxPax = selectedRoom?.max_pax || selectedRoomType.max_occupancy;
                        const remainingCapacity =
                          maxPax * bookingInfo.units - bookingInfo.adults - bookingInfo.children - infants;

                        if (remainingCapacity < 0) {
                          showSnackbar(`Exceeds room capacity by ${Math.abs(remainingCapacity)}`, "error");
                          return;
                        }

                        setBookingInfo({
                          ...bookingInfo,
                          infants,
                        });
                      }}
                    />
                  </div>
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
                  <div style={{ fontSize: "0.9rem" }}>Room Type (AC / NON AC):</div>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={bookingInfo.isAC}
                        onChange={(e) => setBookingInfo((b) => ({ ...b, isAC: e.target.checked }))}
                      />
                    }
                    label={bookingInfo.isAC ? "AC Room" : "Non-AC Room"}
                  />
                </div>
                {/* Extra Services Section */}
                {extraServices.length > 0 && (
                  <div className="extra-services-section">
                    <h4>Extra Services</h4>
                    <div className="extra-services-grid">
                      {extraServices.map((service) => (
                        <div key={service.id} className="extra-service-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={bookingInfo.extraServices.includes(service.id)}
                              onChange={() => {
                                const newServices = bookingInfo.extraServices.includes(service.id)
                                  ? bookingInfo.extraServices.filter((id) => id !== service.id)
                                  : [...bookingInfo.extraServices, service.id];
                                setBookingInfo({ ...bookingInfo, extraServices: newServices });
                              }}
                            />
                            <span className="service-name">{service.service_name}</span>
                            <span className="service-price">
                              {BASE_CURRENCY}
                              {service.price.toLocaleString()}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="price-summary">
                  <h4>Price Summary</h4>
                  {(() => {
                    const mealPlan = bookingInfo.mealPlan
                      ? mealPlans.find((mp) => mp.id === bookingInfo.mealPlan)
                      : getDefaultMealPlanForRoomType(selectedRoomType.id);

                    const nights = differenceInDays(selEnd, selStart);

                    if (bookingInfo.useBasePrice) {
                      const basePrice = mealPlan?.base_price || selectedRoomType.base_price || 0;
                      const total = basePrice * nights * bookingInfo.units;

                      return (
                        <div className="price-line">
                          <span>
                            Base Price × {nights} nights × {bookingInfo.units}{" "}
                            {bookingInfo.units > 1 ? "units" : "unit"}
                          </span>
                          <span>
                            {BASE_CURRENCY}
                            {total.toLocaleString()}
                          </span>
                        </div>
                      );
                    } else if (mealPlan) {
                      const adultPrice = parseFloat(
                        mealPlan.adult_price || mealPlan.base_price || selectedRoomType.base_price,
                      );
                      const childPrice = parseFloat(
                        mealPlan.child_price || mealPlan.base_price / 2 || selectedRoomType.base_price / 2,
                      );
                      const infantPrice = parseFloat(mealPlan.infant_price || 0);
                      const adultTotal = bookingInfo.adults * adultPrice * nights;
                      const childTotal = bookingInfo.children * childPrice * nights;
                      const infantTotal = bookingInfo.infants * infantPrice * nights;

                      return (
                        <>
                          <div className="price-line">
                            <span>
                              {bookingInfo.adults} Adults × {BASE_CURRENCY}
                              {adultPrice.toLocaleString()} × {nights} nights
                            </span>
                            <span>
                              {" "}
                              = {BASE_CURRENCY}
                              {adultTotal.toLocaleString()}
                            </span>
                          </div>
                          {bookingInfo.children > 0 && (
                            <div className="price-line">
                              <span>
                                {bookingInfo.children} Children × {BASE_CURRENCY}
                                {childPrice.toLocaleString()} × {nights} nights
                              </span>
                              <span>
                                {" "}
                                = {BASE_CURRENCY}
                                {childTotal.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {bookingInfo.infants > 0 && (
                            <div className="price-line">
                              <span>
                                {bookingInfo.infants} Infants × {BASE_CURRENCY}
                                {infantPrice.toLocaleString()} × {nights} nights
                              </span>
                              <span>
                                {" "}
                                = {BASE_CURRENCY}
                                {infantTotal.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </>
                      );
                    } else {
                      const basePrice = selectedRoomType.base_price || 0;
                      const adultTotal = bookingInfo.adults * basePrice * nights * bookingInfo.units;

                      return (
                        <div className="price-line">
                          <span>
                            {bookingInfo.adults} Adults × {BASE_CURRENCY}
                            {basePrice.toLocaleString()} × {nights} nights × {bookingInfo.units}{" "}
                            {bookingInfo.units > 1 ? "units" : "unit"}
                          </span>
                          <span>
                            {" "}
                            = {BASE_CURRENCY}
                            {adultTotal.toLocaleString()}
                          </span>
                        </div>
                      );
                    }
                  })()}

                  {bookingInfo.extraServices.length > 0 && (
                    <div className="extra-services-summary">
                      <div className="sub-header">Extra Services:</div>
                      {bookingInfo.extraServices.map((serviceId) => {
                        const service = extraServices.find((s) => s.id === serviceId);
                        return service ? (
                          <div key={serviceId} className="price-line">
                            <span>{service.service_name}</span>
                            <span>
                              {" "}
                              : {BASE_CURRENCY}
                              {service.price.toLocaleString()}
                            </span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  <div className="price-line total">
                    <span>Total : </span>
                    <span>
                      {BASE_CURRENCY}
                      {(
                        calculatePrice(selectedRoomType, bookingInfo, differenceInDays(selEnd, selStart)) *
                        bookingInfo.units
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setShowBookingModal(false)}>
                    Cancel
                  </button>
                  <button className="confirm-btn" onClick={addToCart}>
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cart Section */}
        {cart.length > 0 && (
          <div className="cart-section">
            <h2>
              <FiShoppingCart /> Your Cart ({cart.length} {cart.length === 1 ? "item" : "items"})
            </h2>
            <div className="cart-items">
              {cart.map((item, idx) => (
                <div key={idx} className="cart-item">
                  <div className="item-details">
                    <h4>{item.reservationName || "Untitled Reservation"}</h4>
                    <p>
                      {item.roomType.room_type} × {item.units} {item.units > 1 ? "units" : "unit"}
                    </p>
                    {item.room && (
                      <p>
                        Room: {item.room.unit_number} (Floor {item.room.floor})
                      </p>
                    )}
                    {item.mealPlan && <p>Meal Plan: {mealPlans.find((mp) => mp.id === item.mealPlan)?.name}</p>}
                    <p>
                      {format(item.start, "MMM d")} — {format(item.end, "MMM d")} ({item.nights} nights)
                    </p>
                    <p>
                      {item.adults} {item.adults === 1 ? "adult" : "adults"},
                      {item.children > 0 && ` ${item.children} ${item.children === 1 ? "child" : "children"}`}
                      {item.infants > 0 && `, ${item.infants} ${item.infants === 1 ? "infant" : "infants"}`}
                    </p>
                    <p>Pricing Mode: {item.useBasePrice ? "Base Price" : "Per Person"}</p>

                    {item.selectedServices.length > 0 && (
                      <div className="extra-services-in-cart">
                        <p>Extra Services:</p>
                        <ul>
                          {item.selectedServices.map((service) => (
                            <li key={service.id}>
                              {service.service_name} ({BASE_CURRENCY}
                              {service.price.toLocaleString()})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="price">
                      {BASE_CURRENCY} {item.total.toLocaleString()}
                    </p>
                  </div>
                  <button className="remove-btn" onClick={() => removeFromCart(idx)} title="Remove from cart">
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <p>
                Total: {BASE_CURRENCY} {cart.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
              </p>
              <div className="cart-actions">
                <button className="cancel-btn" onClick={() => setCart([])}>
                  Clear Cart
                </button>
                <button className="save-btn" onClick={() => setShowGuestModal(true)}>
                  <FiSave /> Proceed to Checkin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Guest Information Modal */}
        {showGuestModal && (
          <div className="modal-overlay">
            <div className="modal wide-modal guest-modal">
              <div className="modal-header">
                <h3>Guest Information</h3>
                <button onClick={() => setShowGuestModal(false)}>
                  <FiX />
                </button>
              </div>
              <div className="modal-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name*</label>
                    <input
                      name="firstName"
                      value={guestInfo.firstName}
                      onChange={(e) => setGuestInfo({ ...guestInfo, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name*</label>
                    <input
                      name="lastName"
                      value={guestInfo.lastName}
                      onChange={(e) => setGuestInfo({ ...guestInfo, lastName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Age</label>
                    <input
                      type="text"
                      name="age"
                      value={guestInfo.age}
                      onChange={(e) => setGuestInfo({ ...guestInfo, age: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone*</label>
                    <input
                      type="tel"
                      name="phone"
                      value={guestInfo.phone}
                      onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input
                      name="address"
                      value={guestInfo.address}
                      onChange={(e) => setGuestInfo({ ...guestInfo, address: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>ID Type</label>
                    <select
                      name="idType"
                      value={guestInfo.idType}
                      onChange={(e) => setGuestInfo({ ...guestInfo, idType: e.target.value })}
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
                      onChange={(e) => setGuestInfo({ ...guestInfo, idNumber: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Name</label>
                    <input
                      name="company"
                      value={guestInfo.company}
                      onChange={(e) => setGuestInfo((prev) => ({ ...prev, company: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>GST Number</label>
                    <input
                      name="gst"
                      value={guestInfo.gst}
                      onChange={(e) => setGuestInfo((prev) => ({ ...prev, gst: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Special Requests</label>
                  <textarea
                    name="notes"
                    value={guestInfo.notes}
                    onChange={(e) => setGuestInfo({ ...guestInfo, notes: e.target.value })}
                    placeholder="Any special requests or notes..."
                  />
                </div>

                <div className="reservation-summary">
                  <h4>Reservation Summary</h4>
                  {cart.map((item, idx) => (
                    <div key={idx} className="summary-item">
                      <p>
                        <strong>{item.reservationName || "Untitled Reservation"}</strong>
                      </p>
                      <p>
                        {item.roomType.room_type} × {item.units}
                      </p>
                      {item.room && <p>Room: {item.room.unit_number}</p>}
                      <p>
                        {format(item.start, "MMM d, yyyy")} to {format(item.end, "MMM d, yyyy")}
                      </p>
                      <p>
                        Check-in: {formatTo12Hour(item.checkinTime || "00:00")} • Check-out:{" "}
                        {formatTo12Hour(item.checkoutTime || "23:00")}
                      </p>

                      <p>Pricing Mode: {item.useBasePrice ? "Base Price" : "Per Person"}</p>
                      <p className="price">
                        {BASE_CURRENCY} {item.total.toLocaleString()}
                      </p>
                    </div>
                  ))}
                  <div className="summary-total">
                    <p>Total:</p>
                    <p>
                      {BASE_CURRENCY} {cart.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setShowGuestModal(false)}>
                    Cancel
                  </button>
                  <button
                    className="save-btn"
                    onClick={saveReservation}
                    disabled={!guestInfo.firstName || !guestInfo.lastName || !guestInfo.phone}
                  >
                    <FiSave /> Confirm Reservation
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
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
      <style jsx>{`
        .modal {
          background-color: var(--secondary-color);
          border-radius: 8px;
          box-shadow: var(--light-shadow1);
          max-height: 90vh;
          overflow-y: auto;
          width: 600px;
          max-width: 90vw;
        }
      `}</style>
    </section>
  );
};

export default HotelBookingPage;
