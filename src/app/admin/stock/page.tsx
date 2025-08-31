
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
import { Loader2, Terminal, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getMenuItems } from "../menu/actions";
import { updateStock } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function StockPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedItems = await getMenuItems();
      setMenuItems(fetchedItems);
      const initialStock: Record<string, number> = {};
      fetchedItems.forEach(item => {
        initialStock[item.id!] = item.stock;
      });
      setStockLevels(initialStock);
    } catch (e: any) {
      setError("An error occurred while fetching stock data. Please ensure your Firestore database is set up correctly.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchItems();
  }, []);

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
          // Optimistically update the UI, or refetch
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
      );
    }
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
                  <form action={() => handleSaveStock(item.id!)} className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={stockLevels[item.id!] ?? ''}
                      onChange={(e) => handleStockChange(item.id!, e.target.value)}
                      className="w-24"
                    />
                    <Button size="sm" type="submit" disabled={isPending}>
                      <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Management</CardTitle>
        <CardDescription>View and update item inventory levels.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
