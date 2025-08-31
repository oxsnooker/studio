
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
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { updateStock } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function StockTable({ initialItems }: { initialItems: MenuItem[] }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    const initialStock: Record<string, number> = {};
    initialItems.forEach(item => {
        if (item.id) {
            initialStock[item.id] = item.stock;
        }
    });
    setStockLevels(initialStock);
    setMenuItems(initialItems);
  }, [initialItems]);

  const handleStockChange = (id: string, value: string) => {
    const newStock = parseInt(value, 10);
    setStockLevels(prev => ({
        ...prev,
        [id]: isNaN(newStock) ? 0 : newStock,
    }));
  };

  const handleSaveStock = (id: string) => {
    startTransition(async () => {
      const newStock = stockLevels[id];
      if (newStock === undefined || isNaN(newStock)) {
          toast({ variant: "destructive", title: "Error", description: "Invalid stock value." });
          return;
      }
      try {
        const result = await updateStock(id, newStock);
        if (result.success) {
          toast({ title: "Success", description: result.message });
          // Optimistically update the UI
          setMenuItems(prevItems => prevItems.map(item => item.id === id ? {...item, stock: newStock} : item));
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update stock." });
      }
    });
  };

  const getStatusBadge = (stock: number) => {
    if (stock <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (stock <= 10) {
      return <Badge className="bg-orange-400 text-white">Low Stock</Badge>;
    }
    return <Badge className="bg-green-500 text-white">In Stock</Badge>;
  };

  return (
     <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Current Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[200px]">Update Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {menuItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>{item.stock}</TableCell>
              <TableCell>{getStatusBadge(item.stock)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={stockLevels[item.id!] ?? ''}
                    onChange={(e) => handleStockChange(item.id!, e.target.value)}
                    className="w-24"
                  />
                  <Button size="sm" onClick={() => handleSaveStock(item.id!)} disabled={isPending}>
                     {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" /> }
                     Save
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );
}
