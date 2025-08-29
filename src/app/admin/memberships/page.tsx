"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  initialMembershipPlans,
  initialMembers,
  type MembershipPlan,
  type Member,
} from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function MembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>(initialMembershipPlans);
  const [members, setMembers] = useState<Member[]>(initialMembers);

  return (
    <Tabs defaultValue="customers">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="customers">Customer Memberships</TabsTrigger>
          <TabsTrigger value="plans">Membership Plans</TabsTrigger>
        </TabsList>
        {/* Placeholder for future "Add" buttons */}
      </div>
      <TabsContent value="customers" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer Memberships</CardTitle>
            <CardDescription>
              View and track active customer memberships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Remaining Hours</TableHead>
                  <TableHead className="w-[200px]">Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const plan = plans.find((p) => p.id === member.planId);
                  if (!plan) return null;
                  const usagePercentage =
                    (member.remainingHours / plan.totalHours) * 100;
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{plan.name}</TableCell>
                      <TableCell>{member.remainingHours.toFixed(1)} / {plan.totalHours} hrs</TableCell>
                      <TableCell>
                        <Progress value={usagePercentage} className="w-full" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="plans" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Membership Plans</CardTitle>
            <CardDescription>
              Define hourly-based membership plans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total Included Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>₹{plan.price.toLocaleString()}</TableCell>
                    <TableCell>{plan.totalHours} hours</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
