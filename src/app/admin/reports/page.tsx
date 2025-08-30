
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
} from "lucide-react";
import { getStaff } from "../staff/actions";
import type { Staff } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const { toast } = useToast();

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

  // Placeholder data - replace with real data fetching and logic
  const reportData = {
    totalCash: 0,
    totalUpi: 0,
    totalMembership: 0,
    grandTotal: 0,
    tablePerformance: [],
    itemSales: [],
  };

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
                  <></>
                )
                /* Map over real data here */
                }
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
              <></>
            )
            /* Map over real data here */
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
