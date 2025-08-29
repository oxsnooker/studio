
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import type { Table } from '@/lib/types';

const tableSchema = z.object({
  name: z.string().min(1, 'Table name is required.'),
  rate: z.coerce.number().min(0, 'Rate must be a positive number.'),
});

const getDb = async () => {
  const client = await clientPromise;
  return client.db();
};

export async function getTables(): Promise<Table[]> {
  const db = await getDb();
  const tables = await db.collection('tables').find({}).sort({ name: 1 }).toArray();
  return JSON.parse(JSON.stringify(tables));
}

export async function addTable(formData: FormData) {
  const parsed = tableSchema.parse({
    name: formData.get('name'),
    rate: formData.get('rate'),
  });

  const db = await getDb();
  await db.collection('tables').insertOne({ ...parsed });

  revalidatePath('/admin/tables');
  return { success: true, message: 'Table added successfully.' };
}

export async function updateTable(id: string, formData: FormData) {
    if (!ObjectId.isValid(id)) {
        return { success: false, message: 'Invalid ID.' };
    }

    const parsed = tableSchema.parse({
        name: formData.get('name'),
        rate: formData.get('rate'),
    });

    const db = await getDb();
    await db.collection('tables').updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...parsed } }
    );

    revalidatePath('/admin/tables');
    return { success: true, message: 'Table updated successfully.' };
}

export async function deleteTable(id: string) {
    if (!ObjectId.isValid(id)) {
        return { success: false, message: 'Invalid ID.' };
    }
    
    const db = await getDb();
    await db.collection('tables').deleteOne({ _id: new ObjectId(id) });

    revalidatePath('/admin/tables');
    return { success: true, message: 'Table deleted successfully.' };
}
