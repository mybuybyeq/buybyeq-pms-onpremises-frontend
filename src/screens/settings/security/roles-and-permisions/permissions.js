export const allPermissions = {
  reception: [
    "check-in",
    "check-out",
    "room-assignment",
    "guest-profile-edit",
    "folio-management",
    "payment-processing",
    "room-status-update",
  ],
  housekeeping: [
    "room-cleaning-status",
    "maintenance-requests",
    "housekeeping-assign",
    "inventory-management",
    "lost-and-found",
  ],
  reservations: [
    "booking-create",
    "booking-edit",
    "booking-cancel",
    "rate-management",
    "availability-control",
    "group-reservations",
  ],
  accounting: [
    "daily-reports",
    "financial-reports",
    "invoice-generation",
    "tax-management",
    "payment-reconciliation",
    "refund-processing",
  ],
  administration: [
    "user-management",
    "role-permissions",
    "system-settings",
    "pms-configuration",
    "audit-logs",
    "backup-restore",
  ],
};

export const TABLE_HEADS = ["Role Name", "Permissions", "Created At", "Actions"];
