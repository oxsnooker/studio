
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Clock, Utensils, AppWindow, Calendar as CalendarIcon, Loader2, Terminal, Receipt } from "lucide-react";
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { Transaction } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function DashboardPage() {
  const [revenue, setRevenue] = useState({
    total: 0,
    tableTime: 0,
    items: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [topItems, setTopItems] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const activeTables = 0; // This would be fetched from localStorage or another real-time source
  const totalTables = 8; // This could be fetched from the 'tables' collection count

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfToday = Timestamp.fromDate(today);

        const q = query(
          collection(db, "transactions"),
          where("createdAt", ">=", startOfToday)
        );
        const querySnapshot = await getDocs(q);

        let totalRev = 0;
        let tableRev = 0;
        let itemsRev = 0;
        const itemsCounter: Record<string, number> = {};
        
        const transactionsData: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data() as Transaction;
            transactionsData.push({ id: doc.id, ...data });
            totalRev += data.totalAmount;
            tableRev += data.tableCost;
            itemsRev += data.itemsCost;

            data.items.forEach(item => {
                itemsCounter[item.name] = (itemsCounter[item.name] || 0) + item.quantity;
            });
        });

        setRevenue({ total: totalRev, tableTime: tableRev, items: itemsRev });

        const sortedTransactions = transactionsData.sort((a, b) => b.createdAt - a.createdAt);
        setRecentTransactions(sortedTransactions.slice(0, 5));

        const sortedItems = Object.entries(itemsCounter).sort(([, a], [, b]) => b - a);
        setTopItems(Object.fromEntries(sortedItems.slice(0,5)));

      } catch (e: any) {
        setError("Failed to fetch dashboard data. Please check Firestore connection and permissions.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }


  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Today's Overview</h2>
        <Button variant="outline">
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{new Date().toLocaleDateString('en-GB')}</span>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <div className="p-2 bg-green-100 rounded-full">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Table Time Revenue
            </CardTitle>
             <div className="p-2 bg-blue-100 rounded-full">
                <Clock className="h-4 w-4 text-blue-600" />
             </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               ₹{revenue.tableTime.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Revenue</CardTitle>
            <div className="p-2 bg-orange-100 rounded-full">
                <Utensils className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                ₹{revenue.items.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Tables
            </CardTitle>
            <div className="p-2 bg-purple-100 rounded-full">
                <AppWindow className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeTables}/{totalTables}
            </div>
            <p className="text-xs text-muted-foreground">Live</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-4 md:grid-cols-2">
          <Card>
              <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Today's latest transactions.</CardDescription>
              </CardHeader>
              <CardContent>
                 {recentTransactions.length > 0 ? (
                    <div className="space-y-4">
                        {recentTransactions.map(tx => (
                            <div key={tx.id} className="flex items-center">
                                <div className="p-2 bg-muted rounded-full mr-3">
                                    <Receipt className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{tx.tableName} - {tx.customerName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(tx.createdAt).toLocaleTimeString()} &middot; {tx.paymentMethod}
                                    </p>
                                </div>
                                <p className="font-bold">₹{tx.totalAmount.toLocaleString('en-IN')}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No transactions yet today.</p>
                )}
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Top Selling Items</CardTitle>
                  <CardDescription>Today's most popular items.</CardDescription>
              </CardHeader>
              <CardContent>
                 {Object.keys(topItems).length > 0 ? (
                     <div className="space-y-4">
                        {Object.entries(topItems).map(([name, count]) => (
                            <div key={name} className="flex justify-between items-center text-sm">
                                <p className="font-medium">{name}</p>
                                <p className="text-muted-foreground font-bold">{count} sold</p>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <p className="text-sm text-muted-foreground">No items sold yet.</p>
                 )}
              </CardContent>
          </Card>
       </div>
    </div>
  );
}
