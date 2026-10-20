// ============================================================
//  FIREBASE CONFIGURATION — Team Ojas Racing Inventory
// ============================================================
// Replace the values below with your real project keys from:
// https://console.firebase.google.com -> Project Settings (gear icon) -> Web App (</>)
// ============================================================

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

let db = null;
let storage = null;
let isFirebaseConfigured = false;

try {
  // Check if config has been updated with real values
  if (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID" &&
    typeof firebase !== "undefined"
  ) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    storage = firebase.storage();
    isFirebaseConfigured = true;
    console.log("Firebase initialized successfully.");
  } else {
    console.warn("Firebase config contains placeholder values. Running in local storage fallback mode.");
  }
} catch (err) {
  console.error("Firebase initialization failed:", err);
  db = null;
  storage = null;
  isFirebaseConfigured = false;
}
