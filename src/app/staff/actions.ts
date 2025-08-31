
'use server';

import { doc, getDoc, collection, addDoc, runTransaction, updateDoc, query, where, getDocs, writeBatch, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { Table, Transaction, MenuItem as MenuItemType, Member, ActiveSession } from '@/lib/types';
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

// Active Session Management
export async function getActiveSessions(): Promise<ActiveSession[]> {
    const sessionsCollection = collection(db, 'activeSessions');
    const querySnapshot = await getDocs(sessionsCollection);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ActiveSession);
}

export async function getActiveSessionByTableId(tableId: string): Promise<ActiveSession | null> {
    const sessionRef = doc(db, 'activeSessions', tableId);
    const docSnap = await getDoc(sessionRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ActiveSession;
    }
    return null;
}

export async function updateActiveSession(tableId: string, sessionData: ActiveSession): Promise<{ success: boolean; message: string }> {
    try {
        const sessionRef = doc(db, 'activeSessions', tableId);
        // Remove id from data to avoid storing it in the document
        const dataToSave = { ...sessionData };
        delete dataToSave.id;
        await setDoc(sessionRef, dataToSave, { merge: true });
        return { success: true, message: 'Session updated' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function startActiveSession(tableId: string): Promise<{ success: boolean; message: string; session: ActiveSession | null }> {
    try {
        const newSession: ActiveSession = {
            tableId: tableId,
            startTime: Date.now(),
            elapsedSeconds: 0,
            items: [],
            status: 'running',
            totalPauseDuration: 0,
            customerName: 'Walk-in Customer',
            memberId: null
        };
        const sessionRef = doc(db, 'activeSessions', tableId);
        await setDoc(sessionRef, newSession);
        return { success: true, message: 'Session started', session: newSession };
    } catch (error: any) {
        return { success: false, message: error.message, session: null };
    }
}


export async function deleteActiveSession(tableId: string): Promise<{ success: boolean; message: string }> {
    try {
        const sessionRef = doc(db, 'activeSessions', tableId);
        await deleteDoc(sessionRef);
        return { success: true, message: 'Session deleted' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


export async function saveTransaction(transactionData: Transaction) {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. READ all item documents first if items exist.
      if (transactionData.items.length > 0) {
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
         // 3. WRITE the stock updates.
        for (const { ref, doc, quantity } of itemRefsAndDocs) {
            const currentStock = doc.data().stock;
            const newStock = currentStock - quantity;

            if (newStock < 0) {
            console.warn(`Stock for item ${doc.data().name} (${doc.id}) is now negative (${newStock}).`);
            }
            transaction.update(ref, { stock: newStock });
        }
      }


      // 2. WRITE the new transaction document.
      const transactionRef = doc(collection(db, 'transactions'));
      transaction.set(transactionRef, transactionData);

      // 4. DELETE the active session
      const sessionRef = doc(db, 'activeSessions', transactionData.tableId);
      transaction.delete(sessionRef);
    });

    // Revalidate paths to update data on related pages
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/reports');
    revalidatePath('/admin/stock');
    revalidatePath('/admin/menu');
    revalidatePath('/staff');

    return { success: true, message: 'Transaction saved successfully.' };
  } catch (error: any) {
    console.error('Error saving transaction:', error);
    return { success: false, message: `Failed to save transaction: ${error.message}` };
  }
}

export async function searchMembers(searchTerm: string): Promise<Member[]> {
    if (!searchTerm) return [];

    const membersRef = collection(db, 'members');
    
    // As Firestore doesn't support native full-text search, we query by name and mobile number separately.
    // A more advanced solution might use a dedicated search service like Algolia.
    const nameQuery = query(membersRef, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
    const mobileQuery = query(membersRef, where('mobileNumber', '==', searchTerm));
    
    const [nameSnapshot, mobileSnapshot] = await Promise.all([
        getDocs(nameQuery),
        getDocs(mobileQuery)
    ]);

    const membersMap = new Map<string, Member>();
    nameSnapshot.forEach(doc => {
        membersMap.set(doc.id, { id: doc.id, ...doc.data() } as Member);
    });
    mobileSnapshot.forEach(doc => {
        membersMap.set(doc.id, { id: doc.id, ...doc.data() } as Member);
    });

    return Array.from(membersMap.values());
}


export async function deductHoursFromMember(memberId: string, hoursToDeduct: number, transactionData: Transaction) {
    if (!memberId || hoursToDeduct < 0) {
        return { success: false, message: 'Invalid member ID or hours to deduct.' };
    }

    try {
        await runTransaction(db, async (firestoreTransaction) => {
            const memberRef = doc(db, 'members', memberId);
            const memberDoc = await firestoreTransaction.get(memberRef);

            if (!memberDoc.exists()) {
                throw new Error('Member not found.');
            }

            const member = memberDoc.data() as Member;
            // Round to 4 decimal places to avoid floating point inaccuracies
            const remaining = Math.round(member.remainingHours * 10000) / 10000;
            const toDeduct = Math.round(hoursToDeduct * 10000) / 10000;

            if (remaining < toDeduct) {
                throw new Error('Insufficient hours in membership.');
            }
            
            const newRemainingHours = remaining - toDeduct;

            // 1. Update member's remaining hours
            firestoreTransaction.update(memberRef, { remainingHours: newRemainingHours });
            
            // 2. Save the transaction record
            const transactionRef = doc(collection(db, 'transactions'));
            firestoreTransaction.set(transactionRef, transactionData);

            // 3. Update stock for items sold
            if (transactionData.items.length > 0) {
                const itemRefsAndDocs = await Promise.all(
                    transactionData.items.map(async (item) => {
                      if (!item.id) {
                        throw new Error(`Transaction item '${item.name}' is missing an ID.`);
                      }
                      const itemRef = doc(db, 'menuItems', item.id);
                      // Important: We must use the transaction.get() inside a transaction
                      const itemDoc = await firestoreTransaction.get(itemRef);
                      if (!itemDoc.exists()) {
                        throw new Error(`Item with ID ${item.id} not found!`);
                      }
                      return { ref: itemRef, doc: itemDoc, quantity: item.quantity };
                    })
                );

                for (const { ref, doc, quantity } of itemRefsAndDocs) {
                    const currentStock = doc.data().stock;
                    const newStock = currentStock - quantity;
                    if (newStock < 0) {
                        console.warn(`Stock for item ${doc.data().name} (${doc.id}) is now negative (${newStock}).`);
                    }
                    firestoreTransaction.update(ref, { stock: newStock });
                }
            }

            // 4. DELETE the active session
            const sessionRef = doc(db, 'activeSessions', transactionData.tableId);
            firestoreTransaction.delete(sessionRef);
        });

        // Revalidate paths to update data on related pages
        revalidatePath('/admin/dashboard');
        revalidatePath('/admin/reports');
        revalidatePath('/admin/stock');
        revalidatePath('/admin/menu');
        revalidatePath('/admin/memberships'); // Revalidate memberships to show updated hours
        revalidatePath('/staff');

        return { success: true, message: 'Hours deducted and transaction saved successfully.' };
    } catch (error: any) {
        console.error('Error in membership transaction:', error);
        return { success: false, message: `Failed to complete membership transaction: ${error.message}` };
    }
}
