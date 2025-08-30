
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import type { MenuItem } from '@/lib/types';

const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required.'),
  price: z.coerce.number().min(0, 'Price must be a positive number.'),
});

export async function getMenuItems(): Promise<MenuItem[]> {
  const menuItemsCollection = collection(db, 'menuItems');
  const q = query(menuItemsCollection, orderBy('name'));
  const querySnapshot = await getDocs(q);
  const menuItems = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as MenuItem));
  return menuItems;
}

export async function addMenuItem(formData: FormData) {
  const parsed = menuItemSchema.parse({
    name: formData.get('name'),
    price: formData.get('price'),
  });

  await addDoc(collection(db, 'menuItems'), parsed);

  revalidatePath('/admin/menu');
  return { success: true, message: 'Menu item added successfully.' };
}

export async function updateMenuItem(id: string, formData: FormData) {
    if (!id) {
        return { success: false, message: 'Invalid ID.' };
    }

    const parsed = menuItemSchema.parse({
        name: formData.get('name'),
        price: formData.get('price'),
    });
    
    const menuItemRef = doc(db, 'menuItems', id);
    await updateDoc(menuItemRef, { ...parsed });

    revalidatePath('/admin/menu');
    return { success: true, message: 'Menu item updated successfully.' };
}

export async function deleteMenuItem(id: string) {
    if (!id) {
        return { success: false, message: 'Invalid ID.' };
    }
    
    const menuItemRef = doc(db, 'menuItems', id);
    await deleteDoc(menuItemRef);

    revalidatePath('/admin/menu');
    return { success: true, message: 'Menu item deleted successfully.' };
}
