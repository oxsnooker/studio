

"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  FileDown,
  Sheet as ExcelIcon,
  Wallet,
  Smartphone,
  Award,
  Loader2,
  Terminal,
} from "lucide-react";
import { getStaff } from "../staff/actions";
import type { Staff, Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';


type ReportData = {
    totalCash: number;
    totalUpi: number;
    totalSplit: number;
    totalMembership: number;
    grandTotal: number;
    tablePerformance: { name: string; sessions: number; hours: number; revenue: number }[];
    itemSales: { name: string; quantity: number; revenue: number }[];
}

export default function ReportsPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reportData, setReportData] = useState<ReportData>({
    totalCash: 0,
    totalUpi: 0,
    totalSplit: 0,
    totalMembership: 0,
    grandTotal: 0,
    tablePerformance: [],
    itemSales: [],
  });

  // Fetch staff for filter dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const fetchedStaff = await getStaff();
        setStaff(fetchedStaff);
      } catch (e) {
        console.error("Failed to fetch staff for filters", e);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load staff members for filtering.",
        });
      }
    };
    fetchStaff();
  }, [toast]);

  // Fetch and compute report data
  useEffect(() => {
      const fetchTransactions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Default to today's data
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startOfToday = Timestamp.fromDate(today);

            const q = query(
              collection(db, "transactions"),
              where("createdAt", ">=", startOfToday.toMillis()),
              orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            const transactions = querySnapshot.docs.map(doc => doc.data() as Transaction);

            // Compute aggregations
            let totalCash = 0;
            let totalUpi = 0;
            let totalSplit = 0;
            let totalMembership = 0;
            let grandTotal = 0;
            const tablePerf: Record<string, { sessions: number, hours: number, revenue: number }> = {};
            const itemSales: Record<string, { quantity: number, revenue: number }> = {};

            transactions.forEach(tx => {
                grandTotal += tx.totalAmount;
                if (tx.paymentMethod === 'Cash') totalCash += tx.totalAmount;
                else if (tx.paymentMethod === 'UPI') totalUpi += tx.totalAmount;
                else if (tx.paymentMethod === 'Split Pay') totalSplit += tx.totalAmount;
                else if (tx.paymentMethod === 'Membership') totalMembership += tx.totalAmount;

                // Table performance
                if (!tablePerf[tx.tableName]) {
                    tablePerf[tx.tableName] = { sessions: 0, hours: 0, revenue: 0 };
                }
                tablePerf[tx.tableName].sessions += 1;
                tablePerf[tx.tableName].hours += tx.durationSeconds / 3600;
                tablePerf[tx.tableName].revenue += tx.tableCost;

                // Item sales
                tx.items.forEach(item => {
                    if (!itemSales[item.name]) {
                        itemSales[item.name] = { quantity: 0, revenue: 0 };
                    }
                    itemSales[item.name].quantity += item.quantity;
                    itemSales[item.name].revenue += item.quantity * item.price;
                });
            });

            setReportData({
                totalCash,
                totalUpi,
                totalSplit,
                totalMembership,
                grandTotal,
                tablePerformance: Object.entries(tablePerf).map(([name, data]) => ({ name, ...data })).sort((a,b) => b.revenue - a.revenue),
                itemSales: Object.entries(itemSales).map(([name, data]) => ({ name, ...data })).sort((a,b) => b.quantity - a.quantity),
            });

        } catch (e: any) {
            setError("Failed to fetch reports data. Please check Firestore connection.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
      };

      fetchTransactions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Sales Reports</h2>
        <div className="flex items-center gap-2">
          <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            <ExcelIcon className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
          <CardDescription>Select a time period and staff member to generate a report.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="w-full md:w-1/4">
            <label className="text-sm font-medium">Time Period</label>
            <Select defaultValue="today">
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7">Last 7 Days</SelectItem>
                <SelectItem value="last30">Last 30 Days</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-1/4">
            <label className="text-sm font-medium">Staff Member</label>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id!}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
       {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
         <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                    Total Cash
                    </CardTitle>
                    <div className="p-2 bg-green-100 rounded-full">
                    <Wallet className="h-4 w-4 text-green-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                    ₹{reportData.totalCash.toFixed(2)}
                    </div>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                    Total UPI
                    </CardTitle>
                    <div className="p-2 bg-blue-100 rounded-full">
                    <Smartphone className="h-4 w-4 text-blue-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                    ₹{reportData.totalUpi.toFixed(2)}
                    </div>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Membership</CardTitle>
                    <div className="p-2 bg-purple-100 rounded-full">
                    <Award className="h-4 w-4 text-purple-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                    ₹{reportData.totalMembership.toFixed(2)}
                    </div>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Grand Total</CardTitle>
                    <div className="p-2 bg-orange-100 rounded-full">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                    ₹{reportData.grandTotal.toFixed(2)}
                    </div>
                </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                <CardHeader>
                    <CardTitle>Table Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Table</TableHead>
                        <TableHead>Sessions</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Revenue</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.tablePerformance.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">
                            No data available
                            </TableCell>
                        </TableRow>
                        ) : (
                          reportData.tablePerformance.map(table => (
                            <TableRow key={table.name}>
                                <TableCell>{table.name}</TableCell>
                                <TableCell>{table.sessions}</TableCell>
                                <TableCell>{table.hours.toFixed(1)}</TableCell>
                                <TableCell>₹{table.revenue.toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
                </Card>
                <Card>
                <CardHeader>
                    <CardTitle>Item Sales</CardTitle>
                </CardHeader>
                <CardContent>
                    {reportData.itemSales.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground pt-12 pb-12">
                        No items sold
                    </p>
                    ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Revenue</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.itemSales.map(item => (
                                <TableRow key={item.name}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>₹{item.revenue.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    )}
                </CardContent>
                </Card>
            </div>
      </>
    )}
    </div>
  );
}
