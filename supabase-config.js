// ============================================================
//  SUPABASE CONFIGURATION — Team Ojas Racing Inventory
// ============================================================
// Replace the values below with your real project keys from:
// https://supabase.com -> Project Settings -> API
// ============================================================

const SUPABASE_URL = "https://rkrtrtmexldflciincdwi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrcnRybWV4bGRmbGNpaW5jZHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0OTY5MzIsImV4cCI6MjEwODA3MjkzMn0.7PvKvM7mJK1LPMffJaq0CupnZyLMwv7Ca7qrohAckCk";

let supabaseClient = null;
let isSupabaseConfigured = false;

try {
  if (
    typeof SUPABASE_URL === "string" &&
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_URL !== "https://YOUR_PROJECT_REF.supabase.co" &&
    typeof SUPABASE_ANON_KEY === "string" &&
    SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY" &&
    typeof window.supabase !== "undefined" &&
    typeof window.supabase.createClient === "function"
  ) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    isSupabaseConfigured = true;
    console.log("Supabase client initialized successfully.");
  } else {
    console.warn("Supabase config contains placeholder values. Running in local storage fallback mode.");
  }
} catch (err) {
  console.error("Supabase initialization failed:", err);
  supabaseClient = null;
  isSupabaseConfigured = false;
}
