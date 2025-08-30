
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import type { Table } from '@/lib/types';

const tableSchema = z.object({
  name: z.string().min(1, 'Table name is required.'),
  rate: z.coerce.number().min(0, 'Rate must be a positive number.'),
});

export async function getTables(): Promise<Table[]> {
  const tablesCollection = collection(db, 'tables');
  const q = query(tablesCollection, orderBy('name'));
  const querySnapshot = await getDocs(q);
  const tables = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Table));
  return tables;
}

export async function addTable(formData: FormData) {
  const parsed = tableSchema.parse({
    name: formData.get('name'),
    rate: formData.get('rate'),
  });

  await addDoc(collection(db, 'tables'), parsed);

  revalidatePath('/admin/tables');
  return { success: true, message: 'Table added successfully.' };
}

export async function updateTable(id: string, formData: FormData) {
    if (!id) {
        return { success: false, message: 'Invalid ID.' };
    }

    const parsed = tableSchema.parse({
        name: formData.get('name'),
        rate: formData.get('rate'),
    });
    
    const tableRef = doc(db, 'tables', id);
    await updateDoc(tableRef, { ...parsed });

    revalidatePath('/admin/tables');
    return { success: true, message: 'Table updated successfully.' };
}

export async function deleteTable(id: string) {
    if (!id) {
        return { success: false, message: 'Invalid ID.' };
    }
    
    const tableRef = doc(db, 'tables', id);
    await deleteDoc(tableRef);

    revalidatePath('/admin/tables');
    return { success: true, message: 'Table deleted successfully.' };
}
