
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { doc, updateDoc } from 'firebase/firestore';

const profileUpdateSchema = z.object({
  uid: z.string().min(1, 'User ID is required.'),
  name: z.string().min(1, 'Name is required.').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional(),
});

type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export async function updateAdminProfile(input: ProfileUpdateInput): Promise<{ success: boolean; message: string }> {
  try {
    const { uid, name, password } = profileUpdateSchema.parse(input);

    // Update Firebase Auth
    if (name) {
        await adminAuth.updateUser(uid, { displayName: name });
    }
    if (password) {
        await adminAuth.updateUser(uid, { password: password });
    }

    // Update Firestore user document
    const userDocRef = doc(adminDb, 'users', uid);
    if (name) {
        await updateDoc(userDocRef, { name: name });
    }

    revalidatePath('/admin/profile');
    return { success: true, message: 'Profile updated successfully.' };

  } catch (error: any) {
    console.error("Error updating admin profile:", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors.map(e => e.message).join(', ') };
    }
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
