
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
  CardFooter,
} from "@/components/ui/card";
import {
  getMembershipPlans,
  getMembers,
  addMembershipPlan,
  addMember,
  updateMember,
} from "./actions";
import type { MembershipPlan, Member } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, PlusCircle, Terminal, Crown, Calendar as CalendarIcon, Edit } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";


const planColors = [
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#facc15", // yellow-400
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  "#6366f1", // indigo-500
  "#ef4444", // red-500
  "#64748b", // slate-500
];

function AddPlanForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState(planColors[0]);

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('color', selectedColor);

    startTransition(async () => {
      try {
        const result = await addMembershipPlan(formData);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          onSave();
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to add plan." });
      }
    });
  };

  return (
      <Card className="mb-6">
          <form onSubmit={handleFormSubmit}>
              <CardHeader>
                  <CardTitle>Add New Membership Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="name">Plan Name</Label>
                          <Input id="name" name="name" placeholder="e.g., Diamond" required />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="price">Price (₹)</Label>
                          <Input id="price" name="price" type="number" placeholder="0" required />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="totalHours">Hours Included</Label>
                          <Input id="totalHours" name="totalHours" type="number" placeholder="0" required />
                      </div>
                      <div className="space-y-2">
                          <Label>Color</Label>
                          <div className="flex items-center gap-2">
                            {planColors.map(color => (
                                <button
                                    type="button"
                                    key={color}
                                    className={cn("w-7 h-7 rounded-full border-2", selectedColor === color ? 'border-primary' : 'border-transparent')}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setSelectedColor(color)}
                                />
                            ))}
                          </div>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="Brief description" />
                  </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                  <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Plan
                  </Button>
              </CardFooter>
          </form>
      </Card>
  );
}


export default function MembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [validityDate, setValidityDate] = useState<Date | undefined>();

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
  
  useEffect(() => {
    if(editingMember && editingMember.validityDate) {
        setValidityDate(new Date(editingMember.validityDate))
    } else {
        setValidityDate(undefined);
    }
  }, [editingMember]);

  const handleMemberFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (validityDate) {
        formData.set('validityDate', validityDate.toISOString());
    }
    
    startTransition(async () => {
      try {
        const action = editingMember ? updateMember.bind(null, editingMember.id!) : addMember;
        const result = await action(formData);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          await fetchData();
          closeMemberDialog();
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to save member data." });
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
  
  const openAddMemberDialog = () => {
      setEditingMember(null);
      setIsMemberDialogOpen(true);
  }
  
  const openEditMemberDialog = (member: Member) => {
      setEditingMember(member);
      setIsMemberDialogOpen(true);
  }
  
  const closeMemberDialog = () => {
      setEditingMember(null);
      setIsMemberDialogOpen(false);
      setValidityDate(undefined);
  }

  return (
    <>
    <Tabs defaultValue="plans">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Membership Management</h2>
        <div className="flex items-center gap-4">
          <TabsList>
              <TabsTrigger value="plans">Plans</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>
          <Button onClick={() => setIsAddingPlan(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Plan
          </Button>
        </div>
      </div>

       {isAddingPlan && <AddPlanForm onSave={() => { setIsAddingPlan(false); fetchData(); }} onCancel={() => setIsAddingPlan(false)} />}
      
      <TabsContent value="plans" className="mt-4">
        {renderLoadingError() || (
            plans.length === 0 ? (
                 <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No membership plans created yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <Card key={plan.id} className="flex flex-col" style={{ borderTop: `4px solid ${plan.color || '#ccc'}`}}>
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
            )
        )}
      </TabsContent>
      <TabsContent value="customers" className="mt-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Customer Memberships</CardTitle>
                <CardDescription>
                  View and track active customer memberships.
                </CardDescription>
              </div>
               <Button variant="outline" onClick={openAddMemberDialog}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
             {renderLoadingError() || (
              members.length === 0 ? (
                <p className="text-center text-muted-foreground pt-10 pb-10">No members added yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Mobile Number</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Validity Date</TableHead>
                      <TableHead>Remaining Hours</TableHead>
                      <TableHead className="w-[200px]">Usage</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                          <TableCell>{member.mobileNumber || 'N/A'}</TableCell>
                          <TableCell>{plan?.name || 'Unknown Plan'}</TableCell>
                          <TableCell>
                            {member.validityDate ? format(new Date(member.validityDate), "PPP") : 'N/A'}
                          </TableCell>
                          <TableCell>{member.remainingHours.toFixed(1)} / {plan?.totalHours || '?'} hrs</TableCell>
                          <TableCell>
                            <Progress value={usagePercentage} className="w-full" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEditMemberDialog(member)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

      {/* Add/Edit Member Dialog */}
      <Dialog open={isMemberDialogOpen} onOpenChange={closeMemberDialog}>
        <DialogContent>
          <form onSubmit={handleMemberFormSubmit}>
            <DialogHeader>
              <DialogTitle>{editingMember ? "Edit Member" : "Add New Member"}</DialogTitle>
              <DialogDescription>
                {editingMember ? "Update the customer's details." : "Enter the customer's details and select a membership plan."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input id="name" name="name" defaultValue={editingMember?.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Input id="mobileNumber" name="mobileNumber" defaultValue={editingMember?.mobileNumber} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planId">Membership Plan</Label>
                <Select name="planId" defaultValue={editingMember?.planId} required>
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
              {editingMember && (
                <div className="space-y-2">
                    <Label htmlFor="remainingHours">Remaining Hours</Label>
                    <Input id="remainingHours" name="remainingHours" type="number" defaultValue={editingMember?.remainingHours} required />
                </div>
              )}
               <div className="space-y-2">
                    <Label htmlFor="validityDate">Validity Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !validityDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {validityDate ? format(validityDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={validityDate}
                          onSelect={setValidityDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeMemberDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending || plans.length === 0}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingMember ? "Save Changes" : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
