// ============================================================
//  FIREBASE CONFIGURATION — Team Ojas Racing Inventory
// ============================================================
// Replace the values below with your real project keys from:
// https://console.firebase.google.com -> Project Settings (gear icon) -> Web App (</>)
// ============================================================


 
  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBFqinsy4FUMv4vI2XKFowP-JQ2xXxcT_Q",
    authDomain: "inventory-team-ojas.firebaseapp.com",
    projectId: "inventory-team-ojas",
    storageBucket: "inventory-team-ojas.firebasestorage.app",
    messagingSenderId: "448020336750",
    appId: "1:448020336750:web:77531a46a864399da6167f",
    measurementId: "G-99GRGHXRSE"
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
