
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import admin from 'firebase-admin';

const firebaseConfig = {
  "projectId": "cuebook",
  "appId": "1:620499276681:web:94f6f6c551820e98de4758",
  "storageBucket": "cuebook.firebasestorage.app",
  "apiKey": "AIzaSyD7malQ8EU5lV55RqB67EEPRKE9ZWXgU6w",
  "authDomain": "cuebook.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "620499276681"
};

// Initialize Firebase client app
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);


// Initialize Firebase Admin SDK for server-side operations
if (!admin.apps.length) {
    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(serviceAccount)),
            });
        } else {
             admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
        }
    } catch (e: any) {
        if (e.code !== 'already-exists') {
             console.error('Firebase admin initialization error:', e.stack);
        }
    }
}


const adminAuth = admin.auth();
const adminDb = admin.firestore();


export { app, db, auth, adminAuth, adminDb };
