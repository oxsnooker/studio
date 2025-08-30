
'use server';

import { doc, getDoc, collection, addDoc, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Table, Transaction, MenuItem as MenuItemType } from '@/lib/types';
import { getMenuItems as getAllMenuItems } from '@/app/admin/menu/actions';
import { revalidatePath } from 'next/cache';

export async function getTableById(id: string): Promise<Table | null> {
  if (!id) return null;
  const tableRef = doc(db, 'tables', id);
  const tableSnap = await getDoc(tableRef);

  if (!tableSnap.exists()) {
    return null;
  }

  return { id: tableSnap.id, ...tableSnap.data() } as Table;
}


export async function getMenuItems(): Promise<MenuItemType[]> {
    return getAllMenuItems();
}


export async function saveTransaction(transactionData: Transaction) {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Add the new transaction document
      const transactionRef = doc(collection(db, 'transactions'));
      transaction.set(transactionRef, transactionData);

      // 2. Decrement stock for each item
      for (const item of transactionData.items) {
          if (!item.id) {
            console.error(`Transaction item '${item.name}' is missing an ID. Skipping stock update.`);
            continue; // Skip this item if it has no ID
          }
        const itemRef = doc(db, 'menuItems', item.id);
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists()) {
          throw new Error(`Item with ID ${item.id} not found!`);
        }

        const currentStock = itemDoc.data().stock;
        const newStock = currentStock - item.quantity;
        
        if (newStock < 0) {
            // This could be an issue, but for now we'll allow it and maybe it can be reconciled later.
            console.warn(`Stock for item ${item.name} (${item.id}) is now negative (${newStock}).`);
        }

        transaction.update(itemRef, { stock: newStock });
      }
    });

    // Revalidate paths to update data on related pages
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/reports');
    revalidatePath('/admin/stock');
    revalidatePath('/admin/menu');

    return { success: true, message: 'Transaction saved successfully.' };
  } catch (error: any) {
    console.error('Error saving transaction:', error);
    return { success: false, message: `Failed to save transaction: ${error.message}` };
  }
}
