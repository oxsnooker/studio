
"use client";

import { useState, useEffect, useTransition } from "react";
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
  getMembershipPlans,
  getMembers,
  addMembershipPlan,
  addMember,
  type MembershipPlan,
  type Member,
} from "./actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, PlusCircle, Terminal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function MembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedPlans, fetchedMembers] = await Promise.all([
        getMembershipPlans(),
        getMembers(),
      ]);
      setPlans(fetchedPlans);
      setMembers(fetchedMembers);
    } catch (e: any) {
      setError("An error occurred while fetching membership data. Please ensure Firestore is set up correctly.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlanFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await addMembershipPlan(formData);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          await fetchData();
          setIsPlanDialogOpen(false);
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to add plan." });
      }
    });
  };

  const handleMemberFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await addMember(formData);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          await fetchData();
          setIsMemberDialogOpen(false);
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to add member." });
      }
    });
  };

  const renderContent = (content: React.ReactNode) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (error) {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    return content;
  };

  return (
    <>
    <Tabs defaultValue="customers">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="customers">Customer Memberships</TabsTrigger>
          <TabsTrigger value="plans">Membership Plans</TabsTrigger>
        </TabsList>
         <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsMemberDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Member</Button>
            <Button onClick={() => setIsPlanDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Plan</Button>
        </div>
      </div>
      <TabsContent value="customers" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer Memberships</CardTitle>
            <CardDescription>
              View and track active customer memberships from the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent(
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
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="plans" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Membership Plans</CardTitle>
            <CardDescription>
              Define hourly-based membership plans in the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent(
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
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

     {/* Add/Edit Plan Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent>
          <form onSubmit={handlePlanFormSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Membership Plan</DialogTitle>
              <DialogDescription>
                Enter the details for the new plan.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="name">Plan Name</Label>
              <Input id="name" name="name" required />
              <Label htmlFor="price">Price (₹)</Label>
              <Input id="price" name="price" type="number" required />
              <Label htmlFor="totalHours">Total Hours</Label>
              <Input id="totalHours" name="totalHours" type="number" required />
            </div>
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsPlanDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Plan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Member Dialog */}
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent>
          <form onSubmit={handleMemberFormSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
              <DialogDescription>
                Enter the customer's name and select a membership plan.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="name">Customer Name</Label>
              <Input id="name" name="name" required />
              <Label htmlFor="planId">Membership Plan</Label>
              <Select name="planId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id!}>{plan.name} - {plan.totalHours} hrs for ₹{plan.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMemberDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending || plans.length === 0}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
