
'use server';

import { doc, getDoc, collection, addDoc, writeBatch, runTransaction } from 'firebase/firestore';
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
        await runTransaction(db, async (firestoreTransaction) => {
            // 1. Add the new transaction document
            const transactionRef = doc(collection(db, "transactions"));
            firestoreTransaction.set(transactionRef, transactionData);

            // 2. Decrement stock for each item
            for (const item of transactionData.items) {
                if (item.id) {
                    const itemRef = doc(db, "menuItems", item.id);
                    const itemDoc = await firestoreTransaction.get(itemRef);
                    
                    if (itemDoc.exists()) {
                        const currentStock = itemDoc.data().stock || 0;
                        const newStock = Math.max(0, currentStock - item.quantity);
                        firestoreTransaction.update(itemRef, { stock: newStock });
                    }
                }
            }
        });

        // Revalidate paths to update data on relevant pages
        revalidatePath('/admin/dashboard');
        revalidatePath('/admin/reports');
        revalidatePath('/admin/stock');
        revalidatePath('/admin/menu');
        
        return { success: true, message: "Transaction saved successfully." };

    } catch (error) {
        console.error("Error saving transaction:", error);
        return { success: false, message: "Failed to save transaction." };
    }
}
