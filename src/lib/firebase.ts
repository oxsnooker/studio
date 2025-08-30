import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "cuebook",
  "appId": "1:620499276681:web:94f6f6c551820e98de4758",
  "storageBucket": "cuebook.firebasestorage.app",
  "apiKey": "AIzaSyD7malQ8EU5lV55RqB67EEPRKE9ZWXgU6w",
  "authDomain": "cuebook.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "620499276681"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
