
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy, where, writeBatch } from 'firebase/firestore';
import type { Staff } from '@/lib/types';
import { UserRecord } from 'firebase-admin/auth';

const staffSchema = z.object({
  name: z.string().min(1, 'Staff name is required.'),
  email: z.string().email('A valid email is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

const staffUpdateSchema = z.object({
    name: z.string().min(1, 'Staff name is required.'),
    email: z.string().email('A valid email is required.'),
});

export async function getStaff(): Promise<Staff[]> {
  // We'll get users from Firebase Auth and then enrich with data from Firestore
  const usersCollection = collection(adminDb, 'users');
  const q = query(usersCollection, where('role', '==', 'staff'), orderBy('name'));
  const querySnapshot = await getDocs(q);

  const staff = querySnapshot.docs.map(doc => ({
    id: doc.id, // The doc ID is the Firebase Auth UID
    ...doc.data()
  } as Staff));
  
  return staff;
}

export async function addStaff(formData: FormData) {
  const parsed = staffSchema.parse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password')
  });

  try {
    // 1. Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: parsed.email,
      password: parsed.password,
      displayName: parsed.name,
      emailVerified: true, // Or send a verification email
      disabled: false,
    });
    
    // 2. Set role as custom claim
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'staff' });
    
    // 3. Create a corresponding document in Firestore 'users' collection
    const userDocRef = doc(adminDb, 'users', userRecord.uid);
    await setDoc(userDocRef, {
        name: parsed.name,
        email: parsed.email,
        role: 'staff',
        createdAt: Date.now()
    });

    revalidatePath('/admin/staff');
    return { success: true, message: 'Staff member added successfully.' };

  } catch (error: any) {
    console.error("Error adding staff:", error);
    if (error.code === 'auth/email-already-exists') {
        return { success: false, message: 'This email is already in use.' };
    }
    return { success: false, message: 'Failed to add staff member.' };
  }
}

export async function updateStaff(id: string, formData: FormData) {
    if (!id) {
        return { success: false, message: 'Invalid ID.' };
    }

    const parsed = staffUpdateSchema.parse({
        name: formData.get('name'),
        email: formData.get('email'),
    });
    
    try {
        // Update Firebase Auth user
        await adminAuth.updateUser(id, {
            email: parsed.email,
            displayName: parsed.name,
        });

        // Update Firestore user document
        const userDocRef = doc(adminDb, 'users', id);
        await updateDoc(userDocRef, { name: parsed.name, email: parsed.email });

        revalidatePath('/admin/staff');
        return { success: true, message: 'Staff member updated successfully.' };
    } catch(error: any) {
        console.error("Error updating staff:", error);
        if (error.code === 'auth/email-already-exists') {
            return { success: false, message: 'This email is already in use by another account.' };
        }
        return { success: false, message: 'Failed to update staff member.' };
    }
}

export async function deleteStaff(id: string) {
    if (!id) {
        return { success: false, message: 'Invalid ID.' };
    }
    
    try {
        // Delete from Firebase Auth
        await adminAuth.deleteUser(id);

        // Delete from Firestore
        const userDocRef = doc(adminDb, 'users', id);
        await deleteDoc(userDocRef);

        revalidatePath('/admin/staff');
        return { success: true, message: 'Staff member deleted successfully.' };
    } catch(error) {
        console.error("Error deleting staff:", error);
        return { success: false, message: 'Failed to delete staff member.' };
    }
}

// Function to run once to migrate existing staff to Firebase Auth
// This is an example and might need to be adapted
export async function migrateStaffToAuth() {
    const staffCollection = collection(adminDb, 'staff');
    const staffSnapshot = await getDocs(staffCollection);
    const existingStaff = staffSnapshot.docs.map(d => ({ id: d.id, ...d.data() as any}));

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    const batch = writeBatch(adminDb);

    for (const staff of existingStaff) {
        try {
            const email = `${staff.username}@yourapp.com`; // Create a placeholder email

            // 1. Create Auth user
            const userRecord = await adminAuth.createUser({
                email: email,
                password: staff.password, // This assumes passwords were stored in plaintext, which is insecure.
                displayName: staff.name,
                disabled: false
            });

            // 2. Set custom claim
            await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'staff' });
            
            // 3. Create new user doc
            const userDocRef = doc(adminDb, 'users', userRecord.uid);
            batch.set(userDocRef, {
                name: staff.name,
                email: email,
                role: 'staff',
                createdAt: Date.now(),
                legacyId: staff.id
            });

            // 4. Delete old staff doc
            const oldStaffRef = doc(adminDb, 'staff', staff.id);
            batch.delete(oldStaffRef);

            successCount++;
        } catch (e: any) {
            console.error(`Failed to migrate ${staff.name}:`, e.message);
            errorCount++;
            errors.push({ name: staff.name, error: e.message });
        }
    }

    if (successCount > 0) {
        await batch.commit();
    }
    
    return {
        message: `Migration complete. ${successCount} migrated successfully, ${errorCount} failed.`,
        errors: errors
    };
}
