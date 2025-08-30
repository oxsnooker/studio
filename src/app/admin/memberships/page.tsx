
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
import { Loader2, PlusCircle, Terminal, Crown } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";


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

  const renderLoadingError = () => {
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
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  return (
    <>
    <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Membership Management</h2>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsMemberDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
            </Button>
            <Button onClick={() => setIsPlanDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Plan
            </Button>
        </div>
    </div>
    <Tabs defaultValue="plans">
      <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
      </TabsList>
      <TabsContent value="plans" className="mt-4">
        {renderLoadingError() || (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                     <Card key={plan.id} className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                    <CardDescription>{plan.description}</CardDescription>
                                </div>
                                <div className="p-3 bg-muted rounded-full">
                                    <Crown className="h-6 w-6 text-muted-foreground" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1" />
                        <CardFooter className="flex justify-between items-end">
                            <div>
                                <p className="text-sm text-muted-foreground">Price</p>
                                <p className="text-3xl font-bold">₹{plan.price.toLocaleString()}</p>
                            </div>
                             <div>
                                <p className="text-sm text-muted-foreground">Hours</p>
                                <p className="text-3xl font-bold">{plan.totalHours} hrs</p>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )}
      </TabsContent>
      <TabsContent value="customers" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer Memberships</CardTitle>
            <CardDescription>
              View and track active customer memberships.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {renderLoadingError() || (
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
                        <TableCell>{plan?.name || 'Unknown Plan'}</TableCell>
                        <TableCell>{member.remainingHours.toFixed(1)} / {plan?.totalHours || '?'} hrs</TableCell>
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
               <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="e.g., Perfect for casual players" />
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
