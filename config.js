// ============================================================
//  SITE CONFIGURATION — Edit this file to manage users
// ============================================================

const SITE_CONFIG = {
  // Site name shown in the header / browser tab
  siteName: "Inventory Manager — Ojas",

  // ─── USER WHITELIST ──────────────────────────────────────
  // Add or remove users here.
  // Format: "username": "password"
  // Usernames are case-insensitive; passwords are case-sensitive.
  users: {
    "admin":   "Admin@123",
    "ojas":    "Ojas@2024",
    "Pratyush":    "Pratyush@123",
    // Add more users below:
    // "john":  "John#Pass1",
  },

  // ─── SESSION ─────────────────────────────────────────────
  // How many minutes before the user is auto-logged out (0 = never)
  sessionTimeoutMinutes: 60,
};
