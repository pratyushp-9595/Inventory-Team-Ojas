// ============================================================
//  SUPABASE CONFIGURATION — Team Ojas Racing Inventory
// ============================================================
// Replace the values below with your real project keys from:
// https://supabase.com -> Project Settings -> API
// ============================================================

const SUPABASE_URL = "https://rkrtrtmexldflciincdwi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Hhz7VOya_tYQ51Bq2fYmGA_YYcMVopB";

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
