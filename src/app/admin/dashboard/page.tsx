
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Clock, Utensils, AppWindow, Calendar as CalendarIcon } from "lucide-react";
import { dailyRevenue } from "@/lib/data";

export default function DashboardPage() {
  // Mock data - replace with real data fetching
  const activeTables = 0;
  const totalTables = 8;

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Today's Overview</h2>
        <Button variant="outline">
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>30/08/2025</span>
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
              ₹{dailyRevenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
               ₹{dailyRevenue.tableTime.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                ₹{(dailyRevenue.chips + dailyRevenue.drinks).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">No transactions yet today.</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">No items sold yet.</p>
              </CardContent>
          </Card>
       </div>
    </div>
  );
}
