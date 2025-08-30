
'use server';

import { getStaff as getAllStaff } from '../staff/actions';
import type { Staff } from '@/lib/types';
import { collection, query, where, getDocs, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';


export async function getStaffList(): Promise<Staff[]> {
    try {
        const staff = await getAllStaff();
        return staff;
    } catch (error) {
        console.error("Error fetching staff list for reports:", error);
        return [];
    }
}

export async function clearTodaysTransactions() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfToday = Timestamp.fromDate(today);

        const q = query(
          collection(db, "transactions"),
          where("createdAt", ">=", startOfToday.toMillis())
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: true, message: 'No transactions to clear for today.' };
        }
        
        const batch = writeBatch(db);
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        revalidatePath('/admin/reports');
        revalidatePath('/admin/dashboard');

        return { success: true, message: `Successfully deleted ${querySnapshot.size} transaction(s).` };

    } catch (e: any) {
        console.error("Error clearing today's transactions:", e);
        return { success: false, message: 'Failed to clear transactions.' };
    }
}
