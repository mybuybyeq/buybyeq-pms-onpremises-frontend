import { useEffect, useMemo, useState } from "react";

/**
 * Key used to store page visibility settings in localStorage
 */
const STORAGE_KEY = "pmsPageVisibility";

/**
 * Master list of all pages that appear in Sidebar + Routes
 * Make sure `id` is UNIQUE and `path` matches your routes.
 */
const PAGE_CONFIG = [
  // ===== Top Menu =====
  {
    id: "dashboard",
    label: "Dashboard",
    path: "",
    section: "Main",
  },
  {
    id: "reservations_availability",
    label: "Reservation & Availability",
    path: "/reservations/availability",
    section: "Main",
  },
  {
    id: "booking",
    label: "Booking",
    path: "/reservations/booking",
    section: "Main",
  },
  {
    id: "guests",
    label: "Guests",
    path: "/customers",
    section: "Main",
  },

  // ===== Bookings & Status =====
  {
    id: "bookings_today_booked",
    label: "Today's Booked",
    path: "/bookings/current-day",
    section: "Bookings & Status",
  },
  {
    id: "bookings_today_checkin",
    label: "Today's Check-In",
    path: "/bookings/current-day-checkins",
    section: "Bookings & Status",
  },
  {
    id: "bookings_advance_reservations",
    label: "Advance Reservations",
    path: "/bookings/upcoming-checkins",
    section: "Bookings & Status",
  },
  {
    id: "bookings_no_show",
    label: "No-Show Bookings",
    path: "/bookings/no-show",
    section: "Bookings & Status",
  },
  {
    id: "bookings_today_checkout",
    label: "Today's Checkout",
    path: "/bookings/today-checkout",
    section: "Bookings & Status",
  },
  {
    id: "bookings_upcoming_checkouts",
    label: "Upcoming Checkouts",
    path: "/bookings/upcoming-checkouts",
    section: "Bookings & Status",
  },
  {
    id: "bookings_delayed_checkouts",
    label: "Delayed Checkouts",
    path: "/bookings/delayed-checkouts",
    section: "Bookings & Status",
  },

  // ===== Reception =====
  {
    id: "reception_room_rack",
    label: "Room Rack",
    path: "/reception/room-rack",
    section: "Reception",
  },
  {
    id: "reception_room_status",
    label: "Room Status",
    path: "/reception/room-status",
    section: "Reception",
  },
  {
    id: "reception_lost_and_found",
    label: "Lost & Found",
    path: "/reception/lost-and-found",
    section: "Reception",
  },

  // ===== Maintenance =====
  {
    id: "maintenance_reasons",
    label: "Maintenance Reasons",
    path: "/maintenance/reasons",
    section: "Maintenance",
  },
  {
    id: "maintenance_log",
    label: "Maintenance Log",
    path: "/maintenance",
    section: "Maintenance",
  },

  // ===== Reports =====
  {
    id: "report_invoice",
    label: "Invoice Reports",
    path: "/invoice-report",
    section: "Reports",
  },
  {
    id: "report_guest_staying",
    label: "Guest Stying Reports",
    path: "/guest-staying-report",
    section: "Reports",
  },
  {
    id: "report_guest",
    label: "Guest Reports",
    path: "/guest-report",
    section: "Reports",
  },
  {
    id: "report_occupancy",
    label: "Occupancy Reports",
    path: "/occupancy-report",
    section: "Reports",
  },
  {
    id: "report_reservation",
    label: "Reservation Reports",
    path: "/reservation-report",
    section: "Reports",
  },

  // ===== Settings → Manage Properties =====
  {
    id: "settings_property",
    label: "Property",
    path: "/property",
    section: "Settings • Manage Properties",
  },
  {
    id: "settings_room_types",
    label: "Room Types",
    path: "/property/room-type",
    section: "Settings • Manage Properties",
  },
  {
    id: "settings_meal_plans",
    label: "Meal Plans & Rates",
    path: "/meal-plans",
    section: "Settings • Manage Properties",
  },
  {
    id: "settings_rooms",
    label: "Rooms",
    path: "/property/rooms",
    section: "Settings • Manage Properties",
  },
  {
    id: "settings_extra_services",
    label: "Extra Services",
    path: "/property/extra-services",
    section: "Settings • Manage Properties",
  },

  // ===== Settings → Email Configuration =====
  {
    id: "settings_email_config",
    label: "Configure & Test Emails",
    path: "/emails/configure",
    section: "Settings • Email Configuration",
  },
  {
    id: "settings_email_template",
    label: "Email Template",
    path: "/emails/template",
    section: "Settings • Email Configuration",
  },
];

/**
 * Safely reads localStorage and returns initial visibility map.
 * By default, all pages are enabled (true).
 */
const getInitialVisibility = () => {
  if (typeof window === "undefined") return {};

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (err) {
    console.error("Failed to read page visibility from localStorage:", err);
  }

  // Default: enable everything
  const initial = {};
  PAGE_CONFIG.forEach((page) => {
    initial[page.id] = true;
  });
  return initial;
};

const PageEnable = () => {
  const [visibility, setVisibility] = useState(getInitialVisibility);

  // Persist to localStorage whenever visibility changes
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
      // Optional: broadcast change so Sidebar can listen to "storage" event
    } catch (err) {
      console.error("Failed to save page visibility:", err);
    }
  }, [visibility]);

  // Group pages by section for nicer UI
  const sections = useMemo(() => {
    const grouped = {};
    PAGE_CONFIG.forEach((page) => {
      if (!grouped[page.section]) grouped[page.section] = [];
      grouped[page.section].push(page);
    });
    return grouped;
  }, []);

  const handleTogglePage = (pageId) => {
    setVisibility((prev) => ({
      ...prev,
      [pageId]: !prev[pageId],
    }));
  };

  const handleToggleSection = (sectionName, value) => {
    const sectionPages = PAGE_CONFIG.filter((page) => page.section === sectionName);
    setVisibility((prev) => {
      const updated = { ...prev };
      sectionPages.forEach((page) => {
        updated[page.id] = value;
      });
      return updated;
    });
  };

  const handleEnableAll = () => {
    const allTrue = {};
    PAGE_CONFIG.forEach((page) => {
      allTrue[page.id] = true;
    });
    setVisibility(allTrue);
  };

  const handleDisableAll = () => {
    const allFalse = {};
    PAGE_CONFIG.forEach((page) => {
      allFalse[page.id] = false;
    });
    setVisibility(allFalse);
  };

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <h2 style={{ marginBottom: "8px" }}>Page & Menu Visibility</h2>
      <p style={{ marginBottom: "24px", opacity: 0.8 }}>
        Turn pages on/off. Disabled pages will be hidden from the sidebar and should also be excluded from your routes.
      </p>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={handleEnableAll}
          style={{
            padding: "6px 12px",
            borderRadius: "4px",
            border: "1px solid var(--primary-color, #1976d2)",
            background: "var(--primary-color, #1976d2)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Enable All
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {Object.entries(sections).map(([sectionName, pages]) => {
          const allOn = pages.every((p) => visibility[p.id] !== false);
          const allOff = pages.every((p) => visibility[p.id] === false);

          return (
            <div
              key={sectionName}
              style={{
                border: "1px solid var(--border-color, #e0e0e0)",
                borderRadius: "8px",
                padding: "16px",
                background: "var(--secondary-color, #fafafa)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "16px" }}>{sectionName}</h3>
                <div style={{ display: "flex", gap: "8px", fontSize: "12px" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleSection(sectionName, true)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      background: allOn ? "var(--primary-color, #1976d2)" : "#fff",
                      color: allOn ? "#fff" : "inherit",
                      cursor: "pointer",
                    }}
                  >
                    Enable section
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSection(sectionName, false)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      background: allOff ? "#f5f5f5" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Disable section
                  </button>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px dashed var(--border-color, #ddd)",
                  marginTop: "8px",
                  paddingTop: "8px",
                }}
              >
                {pages.map((page) => (
                  <label
                    key={page.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{page.label}</div>
                      <div
                        style={{
                          fontSize: "12px",
                          opacity: 0.7,
                          fontFamily: "monospace",
                        }}
                      >
                        {page.path}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={visibility[page.id] !== false}
                      onChange={() => handleTogglePage(page.id)}
                      style={{ opacity: 1 }}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={handleEnableAll}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid var(--primary-color, #1976d2)",
              background: "var(--primary-color, #1976d2)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Enable All
          </button>

          {/* Save + Refresh Button */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid green",
              background: "green",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Save & Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageEnable;

/**
 * Helper function you can reuse in Sidebar/App:
 *
 * import { getPageVisibility } from "path/to/page-enable";
 *
 * const visibility = getPageVisibility();
 * if (visibility["dashboard"] !== false) { ...show dashboard... }
 */
export const getPageVisibility = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error("Failed to read page visibility:", err);
  }
  // default: all on
  const initial = {};
  PAGE_CONFIG.forEach((page) => {
    initial[page.id] = true;
  });
  return initial;
};
