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
import { PlusCircle, Edit, Trash2 } from "lucide-react";
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
import { initialStaff, type Staff as StaffType } from "@/lib/data";

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffType[]>(initialStaff);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffType | null>(null);

  const handleAddOrUpdateStaff = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    
    // In a real app, password handling would be much more secure.
    const password = "password123"; 

    if (editingStaff) {
      setStaff(
        staff.map((s) => (s.id === editingStaff.id ? { ...s, name, username } : s))
      );
    } else {
      const newStaff: StaffType = {
        id: `staff-${staff.length + 1}`,
        name,
        username,
        password,
      };
      setStaff([...staff, newStaff]);
    }
    closeDialog();
  };
  
  const handleDeleteStaff = (id: string) => {
    setStaff(staff.filter((s) => s.id !== id));
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Staff Management</CardTitle>
          <CardDescription>
            Create and manage staff login credentials.
          </CardDescription>
        </div>
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Staff
        </Button>
      </CardHeader>
      <CardContent>
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
                    onClick={() => handleDeleteStaff(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddOrUpdateStaff}>
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
               <p className="text-sm text-muted-foreground col-span-4 text-center pt-2">Default password will be assigned. Staff can change it later.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit">{editingStaff ? "Save Changes" : "Add Staff"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
