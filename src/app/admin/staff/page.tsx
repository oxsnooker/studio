
"use client";

import { useState, useTransition, useEffect } from "react";
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
import { PlusCircle, Edit, Trash2, Loader2, Terminal } from "lucide-react";
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
import { getStaff, addStaff, updateStaff, deleteStaff } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { Staff as StaffType } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffType | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    const fetchStaff = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedStaff = await getStaff();
        setStaff(fetchedStaff);
      } catch (e: any) {
        setError("An error occurred while fetching staff data. Please ensure your Firestore database is set up correctly.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(async () => {
      const action = editingStaff
        ? updateStaff.bind(null, editingStaff.id)
        : addStaff;
        
      try {
        const result = await action(formData);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          const fetchedStaff = await getStaff();
          setStaff(fetchedStaff);
          closeDialog();
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (error) {
         toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
      }
    });
  };

  const handleDeleteStaff = (id: string) => {
    startTransition(async () => {
      try {
        const result = await deleteStaff(id);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          const fetchedStaff = await getStaff();
          setStaff(fetchedStaff);
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
      }
    });
  };

  const openEditDialog = (staffMember: StaffType) => {
    setEditingStaff(staffMember);
    setIsDialogOpen(true);
  };
  
  const openAddDialog = () => {
    setEditingStaff(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingStaff(null);
  };

  const renderContent = () => {
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
        )
    }

    return (
       <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.username}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(s)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteStaff(s.id!)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Staff Management</CardTitle>
            <CardDescription>
              Create and manage staff login credentials from the database.
            </CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Staff
          </Button>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add New Staff"}</DialogTitle>
              <DialogDescription>
                {editingStaff ? "Update staff details." : "Enter details for the new staff member."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input id="name" name="name" defaultValue={editingStaff?.name || ""} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input id="username" name="username" defaultValue={editingStaff?.username || ""} className="col-span-3" required />
              </div>
               {!editingStaff && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password"className="text-right">Password</Label>
                    <Input id="password" name="password" type="password" placeholder="Default: password123" className="col-span-3" />
                </div>
               )}
               <p className="text-sm text-muted-foreground col-span-4 text-center pt-2">
                {editingStaff ? "Password cannot be changed here." : "Provide a password or leave blank for default."}
               </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingStaff ? "Save Changes" : "Add Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
