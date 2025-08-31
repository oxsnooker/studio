'use server';

import { adminAuth, adminDb } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export async function setupAdmin() {
  const adminEmail = 'admin@yourapp.com';
  const adminPassword = 'password'; 

  try {
    // Check if the user already exists in Auth
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(adminEmail);
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    if (!userRecord) {
      // Create user in Firebase Auth
      userRecord = await adminAuth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: 'Admin User',
        emailVerified: true,
        disabled: false,
      });
      console.log('Successfully created new admin user in Auth:', userRecord.uid);
    } else {
        console.log('Admin user already exists in Auth:', userRecord.uid);
    }

    // Set custom claim for 'admin' role
    const currentClaims = userRecord.customClaims || {};
    if (currentClaims.role !== 'admin') {
      await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
      console.log('Set custom claim "admin" for user:', userRecord.uid);
    }

    // Check if the user doc exists in Firestore
    const userDocRef = doc(adminDb, 'users', userRecord.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create a corresponding document in Firestore 'users' collection
      await setDoc(userDocRef, {
        name: userRecord.displayName || 'Admin User',
        email: adminEmail,
        role: 'admin',
        createdAt: Date.now(),
      });
      console.log('Created Firestore document for admin user:', userRecord.uid);
    } else {
        // Ensure the role is correct in firestore as well
        const userData = userDoc.data();
        if (userData.role !== 'admin') {
            await setDoc(userDocRef, { role: 'admin' }, { merge: true });
            console.log('Updated Firestore role for admin user:', userRecord.uid);
        }
    }

    return { success: true, message: `Admin user ${adminEmail} is configured.` };

  } catch (error: any) {
    console.error("Error setting up admin user:", error);
    // Don't re-throw, as we don't want to crash the server on startup
    return { success: false, message: `Failed to set up admin user: ${error.message}` };
  }
}
