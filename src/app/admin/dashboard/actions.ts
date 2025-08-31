
'use server';

import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type { Transaction } from "@/lib/types";

export async function getDashboardData() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfToday = Timestamp.fromDate(today);

        const q = query(
          collection(adminDb, "transactions"),
          where("createdAt", ">=", startOfToday.toMillis())
        );
        const querySnapshot = await getDocs(q);

        let totalRev = 0;
        let tableRev = 0;
        let itemsRev = 0;
        const itemsCounter: Record<string, number> = {};
        
        const transactionsData: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data() as Transaction;
            const id = doc.id;
            transactionsData.push({ id, ...data });

            totalRev += data.totalAmount;
            tableRev += data.tableCost;
            itemsRev += data.itemsCost;

            data.items.forEach(item => {
                itemsCounter[item.name] = (itemsCounter[item.name] || 0) + item.quantity;
            });
        });

        const sortedTransactions = transactionsData.sort((a, b) => b.createdAt - a.createdAt);
        const recentTransactions = sortedTransactions.slice(0, 5);

        const sortedItems = Object.entries(itemsCounter).sort(([, a], [, b]) => b - a);
        const topItems = Object.fromEntries(sortedItems.slice(0,5));

        const revenue = { total: totalRev, tableTime: tableRev, items: itemsRev };

        return { revenue, recentTransactions, topItems };

      } catch (e: any) {
        console.error("Failed to fetch dashboard data:", e);
        // Throw the error to be caught by the page
        throw new Error("Failed to fetch dashboard data. Please check Firestore connection and permissions.");
      }
}
