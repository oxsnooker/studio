"use client";

import { useState, useEffect, useTransition } from "react";
import {
  initialTables,
  initialMenuItems,
  type Table as TableType,
  type MenuItem,
  type ActiveSession,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  PlayCircle,
  Square,
  Plus,
  Minus,
  Printer,
  Loader2,
} from "lucide-react";
import { generateDetailedBill } from "@/ai/flows/generate-detailed-bill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
};

export default function StaffDashboard() {
  const [sessions, setSessions] = useState<Record<string, ActiveSession>>({});
  const [activeModalTable, setActiveModalTable] = useState<TableType | null>(
    null
  );
  const [billData, setBillData] = useState<{ session: ActiveSession; table: TableType } | null>(null);
  const [isBillLoading, startBillGeneration] = useTransition();
  const [generatedBill, setGeneratedBill] = useState<string | null>(null);
  const { toast } = useToast();

  // Timer update effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions((prev) => {
        const newSessions = { ...prev };
        let changed = false;
        Object.keys(newSessions).forEach((tableId) => {
          const session = newSessions[tableId];
          const elapsedSeconds = Math.floor(
            (new Date().getTime() - session.startTime.getTime()) / 1000
          );
          if (session.elapsedSeconds !== elapsedSeconds) {
            newSessions[tableId] = { ...session, elapsedSeconds };
            changed = true;
          }
        });
        return changed ? newSessions : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartSession = (table: TableType) => {
    setSessions((prev) => ({
      ...prev,
      [table.id]: {
        startTime: new Date(),
        elapsedSeconds: 0,
        items: [],
      },
    }));
    setActiveModalTable(table);
  };

  const handleStopSession = (table: TableType) => {
    const session = sessions[table.id];
    if (!session) return;
    
    const tableCost = (session.elapsedSeconds / 3600) * table.rate;
    const itemsCost = session.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    const totalAmount = tableCost + itemsCost;

    startBillGeneration(async () => {
      try {
        const detailedBill = await generateDetailedBill({
          timePlayed: formatDuration(session.elapsedSeconds),
          tableRate: table.rate,
          itemsOrdered: session.items,
          paymentMethod: "Pending",
          totalAmount: totalAmount,
        });
        setGeneratedBill(detailedBill.billSummary);
      } catch (error) {
        console.error("AI Bill Generation Failed:", error);
        toast({
          variant: "destructive",
          title: "AI Error",
          description: "Could not generate detailed bill.",
        });
        // Fallback to a simple bill
        setGeneratedBill(`Time: ${formatDuration(session.elapsedSeconds)}\nItems Cost: ₹${itemsCost.toFixed(2)}\nTotal: ₹${totalAmount.toFixed(2)}`);
      }
    });

    setBillData({ session, table });
    setActiveModalTable(null);
  };

  const handleCompletePayment = (paymentMethod: string) => {
    if (!billData) return;
    // In a real app, this would save the transaction to a database.
    console.log(`Payment of ₹${(
        (billData.session.elapsedSeconds / 3600) * billData.table.rate +
        billData.session.items.reduce((acc, i) => acc + i.price * i.quantity, 0)
      ).toFixed(2)} collected via ${paymentMethod} for ${billData.table.name}`);

    setSessions(prev => {
        const newSessions = {...prev};
        delete newSessions[billData.table.id];
        return newSessions;
    });

    setBillData(null);
    setGeneratedBill(null);
    toast({ title: "Payment Completed", description: "Table is now available." });
  }

  const handleAddItem = (tableId: string, item: MenuItem) => {
    setSessions((prev) => {
      const newSessions = { ...prev };
      const session = newSessions[tableId];
      const existingItem = session.items.find((i) => i.id === item.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        session.items.push({ ...item, quantity: 1 });
      }
      return newSessions;
    });
  };

  const handleRemoveItem = (tableId: string, itemId: string) => {
    setSessions((prev) => {
        const newSessions = { ...prev };
        const session = newSessions[tableId];
        const itemIndex = session.items.findIndex((i) => i.id === itemId);
        if (itemIndex > -1) {
            const item = session.items[itemIndex];
            if (item.quantity > 1) {
                item.quantity -= 1;
            } else {
                session.items.splice(itemIndex, 1);
            }
        }
        return newSessions;
    });
  };

  const renderTableCard = (table: TableType) => {
    const session = sessions[table.id];
    const isActive = !!session;

    return (
      <Card key={table.id}>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            {table.name}
            <Badge variant={isActive ? "destructive" : "secondary"}>
              {isActive ? "In Use" : "Available"}
            </Badge>
          </CardTitle>
          <CardDescription>Rate: ₹{table.rate}/hr</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-mono font-bold">
            {isActive ? formatDuration(session.elapsedSeconds) : "00:00:00"}
          </div>
        </CardContent>
        <CardFooter>
          {isActive ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setActiveModalTable(table)}
            >
              Manage Session
            </Button>
          ) : (
            <Button className="w-full" onClick={() => handleStartSession(table)}>
              <PlayCircle className="mr-2 h-4 w-4" /> Start Session
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  const session = activeModalTable ? sessions[activeModalTable.id] : null;
  const tableCost = session ? (session.elapsedSeconds / 3600) * (activeModalTable?.rate || 0) : 0;
  const itemsCost = session ? session.items.reduce((acc, item) => acc + item.price * item.quantity, 0) : 0;
  const totalCost = tableCost + itemsCost;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {initialTables.map(renderTableCard)}
      </div>

      {/* Session Management Modal */}
      {activeModalTable && session && (
        <Dialog
          open={!!activeModalTable}
          onOpenChange={() => setActiveModalTable(null)}
        >
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Session: {activeModalTable.name}</DialogTitle>
              <DialogDescription>
                Manage items and stop the timer when finished.
              </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-6 flex-1 min-h-0">
                <div className="flex flex-col gap-4">
                    <h3 className="font-semibold">Add Items</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {initialMenuItems.map(item => (
                            <Button key={item.id} variant="outline" className="h-20 flex-col" onClick={() => handleAddItem(activeModalTable.id, item)}>
                                <span>{item.name}</span>
                                <span className="text-xs text-muted-foreground">₹{item.price}</span>
                            </Button>
                        ))}
                    </div>
                     <Separator />
                    <h3 className="font-semibold">Quick Add</h3>
                     <div className="flex gap-4">
                         <Image src="https://picsum.photos/200/200" width={100} height={100} alt="Chips" className="rounded-md" data-ai-hint="chips bag" />
                         <Image src="https://picsum.photos/200/200" width={100} height={100} alt="Drink" className="rounded-md" data-ai-hint="soda can" />
                         <Image src="https://picsum.photos/200/200" width={100} height={100} alt="Water" className="rounded-md" data-ai-hint="water bottle" />
                     </div>
                </div>
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Current Bill</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4 overflow-y-auto">
                        <div className="flex justify-between">
                            <span>Time Played ({formatDuration(session.elapsedSeconds)})</span>
                            <span>₹{tableCost.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <h4 className="font-medium">Items Ordered</h4>
                        {session.items.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No items added yet.</p>
                        ) : (
                          <ScrollArea className="h-48">
                            <Table>
                                <TableBody>
                                    {session.items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItem(activeModalTable.id, item.id)}><Minus className="h-3 w-3"/></Button>
                                                    {item.quantity}
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddItem(activeModalTable.id, item)}><Plus className="h-3 w-3"/></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                          </ScrollArea>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col items-stretch space-y-2 mt-auto pt-4 border-t">
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total</span>
                            <span>₹{totalCost.toFixed(2)}</span>
                        </div>
                         <Button onClick={() => handleStopSession(activeModalTable)} size="lg" >
                            <Square className="mr-2 h-4 w-4" /> Stop Timer & Generate Bill
                        </Button>
                    </CardFooter>
                </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bill/Payment Modal */}
      {billData && (
        <Dialog open={!!billData} onOpenChange={() => { setBillData(null); setGeneratedBill(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Final Bill for {billData.table.name}</DialogTitle>
            </DialogHeader>
            <div className="print-container">
              {isBillLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-4">Generating detailed bill with AI...</p>
                </div>
              ) : (
                <div className="print-content space-y-4">
                  <h3 className="text-center font-bold text-lg font-headline">The Ox Snooker</h3>
                  <pre className="whitespace-pre-wrap font-body text-sm bg-secondary p-4 rounded-md">
                    {generatedBill}
                  </pre>
                </div>
              )}
            </div>
            <DialogFooter className="no-print">
              <div className="w-full space-y-4 pt-4">
                <Select onValueChange={(value) => handleCompletePayment(value)}>
                    <SelectTrigger><SelectValue placeholder="Select Payment Method" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                    </SelectContent>
                </Select>
                <Button className="w-full" variant="outline" onClick={() => window.print()} disabled={isBillLoading}>
                  <Printer className="mr-2 h-4 w-4" /> Print Bill
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
