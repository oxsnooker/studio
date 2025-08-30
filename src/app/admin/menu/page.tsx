
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
import { getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem as MenuItemType } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedItems = await getMenuItems();
        setMenuItems(fetchedItems);
      } catch (e: any) {
        setError("An error occurred while fetching menu items. Please ensure your Firestore database is set up correctly and security rules allow access.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(async () => {
      const action = editingItem
        ? updateMenuItem.bind(null, editingItem?.id!)
        : addMenuItem;
        
      try {
        const result = await action(formData);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          const fetchedItems = await getMenuItems();
          setMenuItems(fetchedItems);
          closeDialog();
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (error) {
         toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
      }
    });
  };

  const handleDeleteItem = (id: string) => {
    startTransition(async () => {
      try {
        const result = await deleteMenuItem(id);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          const fetchedItems = await getMenuItems();
          setMenuItems(fetchedItems);
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
      }
    });
  };

  const openEditDialog = (item: MenuItemType) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };
  
  const openAddDialog = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
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
              <TableHead>Item Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menuItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>₹{item.price.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteItem(item.id!)}
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
          <CardTitle>Menu & Price Management</CardTitle>
          <CardDescription>
            Add, edit, or remove snacks and drinks from the menu.
          </CardDescription>
        </div>
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
        </Button>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Menu Item" : "Add New Item"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update the details for this item." : "Enter the details for the new menu item."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input id="name" name="name" defaultValue={editingItem?.name || ""} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Price (₹)
                </Label>
                <Input id="price" name="price" type="number" step="0.01" defaultValue={editingItem?.price || ""} className="col-span-3" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
