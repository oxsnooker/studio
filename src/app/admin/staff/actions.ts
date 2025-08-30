
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import type { Staff } from '@/lib/types';

const staffSchema = z.object({
  name: z.string().min(1, 'Staff name is required.'),
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

const staffUpdateSchema = z.object({
    name: z.string().min(1, 'Staff name is required.'),
    username: z.string().min(1, 'Username is required.'),
});

export async function getStaff(): Promise<Staff[]> {
  const staffCollection = collection(db, 'staff');
  const q = query(staffCollection, orderBy('name'));
  const querySnapshot = await getDocs(q);
  const staff = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Staff));
  return staff;
}

export async function addStaff(formData: FormData) {
  const data = {
    name: formData.get('name'),
    username: formData.get('username'),
    // In a real app, you would securely generate or have the user set a password.
    // For simplicity, we're using a default one here.
    password: formData.get('password') || 'password123'
  };

  const parsed = staffSchema.parse(data);

  await addDoc(collection(db, 'staff'), parsed);

  revalidatePath('/admin/staff');
  return { success: true, message: 'Staff member added successfully.' };
}

export async function updateStaff(id: string, formData: FormData) {
    if (!id) {
        return { success: false, message: 'Invalid ID.' };
    }

    const parsed = staffUpdateSchema.parse({
        name: formData.get('name'),
        username: formData.get('username'),
    });
    
    const staffRef = doc(db, 'staff', id);
    await updateDoc(staffRef, { ...parsed });

    revalidatePath('/admin/staff');
    return { success: true, message: 'Staff member updated successfully.' };
}

export async function deleteStaff(id: string) {
    if (!id) {
        return { success: false, message: 'Invalid ID.' };
    }
    
    const staffRef = doc(db, 'staff', id);
    await deleteDoc(staffRef);

    revalidatePath('/admin/staff');
    return { success: true, message: 'Staff member deleted successfully.' };
}
