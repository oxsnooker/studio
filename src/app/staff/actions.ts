
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
      // ** Fix Starts here **
      // 1. READ all item documents first.
      const itemRefsAndDocs = await Promise.all(
        transactionData.items.map(async (item) => {
          if (!item.id) {
            throw new Error(`Transaction item '${item.name}' is missing an ID.`);
          }
          const itemRef = doc(db, 'menuItems', item.id);
          const itemDoc = await transaction.get(itemRef);
          if (!itemDoc.exists()) {
            throw new Error(`Item with ID ${item.id} not found!`);
          }
          return { ref: itemRef, doc: itemDoc, quantity: item.quantity };
        })
      );

      // 2. WRITE the new transaction document.
      const transactionRef = doc(collection(db, 'transactions'));
      transaction.set(transactionRef, transactionData);

      // 3. WRITE the stock updates.
      for (const { ref, doc, quantity } of itemRefsAndDocs) {
        const currentStock = doc.data().stock;
        const newStock = currentStock - quantity;

        if (newStock < 0) {
          console.warn(`Stock for item ${doc.data().name} (${doc.id}) is now negative (${newStock}).`);
        }
        transaction.update(ref, { stock: newStock });
      }
      // ** Fix Ends here **
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
