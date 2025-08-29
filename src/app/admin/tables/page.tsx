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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialTables, type Table as TableType } from "@/lib/data";

export default function TablesPage() {
  const [tables, setTables] = useState<TableType[]>(initialTables);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableType | null>(null);

  const handleAddOrUpdateTable = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const rate = parseFloat(formData.get("rate") as string);

    if (editingTable) {
      setTables(
        tables.map((t) => (t.id === editingTable.id ? { ...t, name, rate } : t))
      );
    } else {
      const newTable: TableType = {
        id: `table-${tables.length + 1}`,
        name,
        rate,
      };
      setTables([...tables, newTable]);
    }
    closeDialog();
  };

  const handleDeleteTable = (id: string) => {
    setTables(tables.filter((t) => t.id !== id));
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table Name</TableHead>
              <TableHead>Rate (per hour)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tables.map((table) => (
              <TableRow key={table.id}>
                <TableCell className="font-medium">{table.name}</TableCell>
                <TableCell>₹{table.rate.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(table)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteTable(table.id)}
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
          <form onSubmit={handleAddOrUpdateTable}>
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
                <Label htmlFor="rate" className="text-right">
                  Rate (₹/hr)
                </Label>
                <Input id="rate" name="rate" type="number" step="0.01" defaultValue={editingTable?.rate || ""} className="col-span-3" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit">{editingTable ? "Save Changes" : "Add Table"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
