
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
import { getTables, addTable, updateTable, deleteTable } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { Table as TableType } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TablesPage() {
  const [tables, setTables] = useState<TableType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableType | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    const fetchTables = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedTables = await getTables();
        setTables(fetchedTables);
      } catch (e: any) {
        if (e.code === 'failed-precondition') {
            setError("Your Firestore database has not been created yet. Please go to the Firebase Console, select your 'the-ox-snooker' project, and create a Firestore database.");
        } else if (e.code === 'permission-denied') {
            setError("Your Firestore security rules are blocking access. For development, please go to the Firebase Console and set your rules to allow read/write access.");
        } else {
            setError("An unexpected error occurred while fetching data. Check the console for more details.");
        }
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTables();
  }, []);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(async () => {
      const action = editingTable
        ? updateTable.bind(null, editingTable?.id!)
        : addTable;
        
      try {
        const result = await action(formData);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          const fetchedTables = await getTables();
          setTables(fetchedTables);
          closeDialog();
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (error) {
         toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
      }
    });
  };

  const handleDeleteTable = (id: string) => {
    startTransition(async () => {
      try {
        const result = await deleteTable(id);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          const fetchedTables = await getTables();
          setTables(fetchedTables);
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
      }
    });
  };
  
  const openEditDialog = (table: TableType) => {
    setEditingTable(table);
    setIsDialogOpen(true);
  };
  
  const openAddDialog = () => {
    setEditingTable(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTable(null);
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
                <TableHead>Table Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Rate (per hour)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">{table.name}</TableCell>
                  <TableCell>{table.category}</TableCell>
                  <TableCell>₹{table.rate.toFixed(2)}</TableCell>
                  <TableCell><Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(table)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTable(table.id!)}
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Table Management</CardTitle>
          <CardDescription>
            Add, edit, or delete tables and their hourly rates.
          </CardDescription>
        </div>
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Table
        </Button>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle>{editingTable ? "Edit Table" : "Add New Table"}</DialogTitle>
              <DialogDescription>
                {editingTable ? "Update the details for this table." : "Enter the details for the new table."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input id="name" name="name" defaultValue={editingTable?.name || ""} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select name="category" defaultValue={editingTable?.category} required>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="American Pool">American Pool</SelectItem>
                        <SelectItem value="Mini Snooker">Mini Snooker</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rate" className="text-right">
                  Rate (₹/hr)
                </Label>
                <Input id="rate" name="rate" type="number" step="0.01" defaultValue={editingTable?.rate || ""} className="col-span-3" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTable ? "Save Changes" : "Add Table"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
