
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { App, getApp, getApps, initializeApp } from "firebase-admin/app";

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


export { adminAuth, adminDb };
