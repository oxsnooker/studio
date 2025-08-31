
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import type { MenuItem } from '@/lib/types';

const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required.'),
  category: z.string().min(1, 'Category is required.'),
  price: z.coerce.number().min(0, 'Price must be a positive number.'),
  stock: z.coerce.number().min(0, 'Stock must be a positive number.'),
});

export async function getMenuItems(): Promise<MenuItem[]> {
  const menuItemsCollection = collection(adminDb, 'menuItems');
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
    category: formData.get('category'),
    price: formData.get('price'),
    stock: formData.get('stock'),
  });

  await addDoc(collection(adminDb, 'menuItems'), parsed);

  revalidatePath('/admin/menu');
  return { success: true, message: 'Menu item added successfully.' };
}

export async function updateMenuItem(id: string, formData: FormData) {
    if (!id) {
        return { success: false, message: 'Invalid ID.' };
    }

    const parsed = menuItemSchema.parse({
        name: formData.get('name'),
        category: formData.get('category'),
        price: formData.get('price'),
        stock: formData.get('stock'),
    });
    
    const menuItemRef = doc(adminDb, 'menuItems', id);
    await updateDoc(menuItemRef, { ...parsed });

    revalidatePath('/admin/menu');
    return { success: true, message: 'Menu item updated successfully.' };
}

export async function deleteMenuItem(id: string) {
    if (!id) {
        return { success: false, message: 'Invalid ID.' };
    }
    
    const menuItemRef = doc(adminDb, 'menuItems', id);
    await deleteDoc(menuItemRef);

    revalidatePath('/admin/menu');
    return { success: true, message: 'Menu item deleted successfully.' };
}
