// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCsgyr_HRVU5fwve142HUgmHDn-rubXEWs",
  authDomain: "kanban---app.firebaseapp.com",
  projectId: "kanban---app",
  storageBucket: "kanban---app.firebasestorage.app",
  messagingSenderId: "700449679731",
  appId: "1:700449679731:web:a204027933b232e4b8fd06",
  measurementId: "G-E3MEP6XN5H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app); // Initialize analytics
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export default app;
