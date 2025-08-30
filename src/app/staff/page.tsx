
"use client";

import { useState, useEffect, useTransition } from "react";
import type { MenuItem } from "@/lib/data";
import type { Table as TableType } from "@/lib/types";
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
import { getTables } from "@/app/admin/tables/actions";
import { getMenuItems } from "@/app/admin/menu/actions";
import { ActiveSession } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
};

const getTableImage = (category: string) => {
    switch (category) {
        case "American Pool":
            return { src: "https://picsum.photos/seed/pool/600/400", hint: "pool table" };
        case "Mini Snooker":
            return { src: "https://picsum.photos/seed/snooker/600/400", hint: "snooker table" };
        case "Standard":
             return { src: "https://picsum.photos/seed/billiards/600/400", hint: "billiards table" };
        default:
            return { src: "https://picsum.photos/seed/default/600/400", hint: "game table" };
    }
}


export default function StaffDashboard() {
  const [tables, setTables] = useState<TableType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<Record<string, ActiveSession>>({});
  const [activeModalTable, setActiveModalTable] = useState<TableType | null>(
    null
  );
  const [billData, setBillData] = useState<{ session: ActiveSession; table: TableType } | null>(null);
  const [isBillLoading, startBillGeneration] = useTransition();
  const [generatedBill, setGeneratedBill] = useState<string | null>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("All Tables");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedTables, fetchedMenuItems] = await Promise.all([
            getTables(),
            getMenuItems()
        ]);
        setTables(fetchedTables);
        setMenuItems(fetchedMenuItems);
      } catch (error) {
        console.error("Failed to fetch initial data", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load tables and menu. Please check connection and Firestore setup.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  // Timer update effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions((prev) => {
        const newSessions = { ...prev };
        let changed = false;
        Object.keys(newSessions).forEach((tableId) => {
          if (newSessions[tableId]) {
            const session = newSessions[tableId];
            const elapsedSeconds = Math.floor(
              (new Date().getTime() - session.startTime.getTime()) / 1000
            );
            if (session.elapsedSeconds !== elapsedSeconds) {
              newSessions[tableId] = { ...session, elapsedSeconds };
              changed = true;
            }
          }
        });
        return changed ? newSessions : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartSession = (table: TableType) => {
    if (!table.id) return;
    setSessions((prev) => ({
      ...prev,
      [table.id!]: {
        startTime: new Date(),
        elapsedSeconds: 0,
        items: [],
      },
    }));
    setActiveModalTable(table);
  };

  const handleStopSession = (table: TableType) => {
    if (!table.id) return;
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
        setGeneratedBill(`Time: ${formatDuration(session.elapsedSeconds)}\nItems Cost: ₹${itemsCost.toFixed(2)}\nTotal: ₹${totalAmount.toFixed(2)}`);
      }
    });

    setBillData({ session, table });
    setActiveModalTable(null);
  };

  const handleCompletePayment = (paymentMethod: string) => {
    if (!billData || !billData.table.id) return;
    console.log(`Payment of ₹${(
        (billData.session.elapsedSeconds / 3600) * billData.table.rate +
        billData.session.items.reduce((acc, i) => acc + i.price * i.quantity, 0)
      ).toFixed(2)} collected via ${paymentMethod} for ${billData.table.name}`);

    setSessions(prev => {
        const newSessions = {...prev};
        delete newSessions[billData.table.id!];
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
      if (!session) return prev;
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
        if (!session) return prev;
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

  const filteredTables = tables.filter(table => activeTab === 'All Tables' || table.category === activeTab);

  const renderTableCard = (table: TableType) => {
    if (!table.id) return null;
    const session = sessions[table.id];
    const isActive = !!session;
    const imageData = getTableImage(table.category);

    const handleCardClick = () => {
        if (isActive) {
            setActiveModalTable(table);
        } else {
            handleStartSession(table);
        }
    }

    return (
      <Card key={table.id} onClick={handleCardClick} className="overflow-hidden cursor-pointer flex flex-col group">
        <div className="relative">
             <Image src={imageData.src} alt={table.name} width={600} height={400} className="object-cover aspect-[3/2] w-full group-hover:scale-105 transition-transform duration-300" data-ai-hint={imageData.hint}/>
             <Badge className={cn("absolute top-2 right-2", isActive ? "bg-red-500" : "bg-green-500")}>
              {isActive ? `In Use: ${formatDuration(session.elapsedSeconds)}` : "Available"}
            </Badge>
        </div>
        <CardHeader className="p-4">
            <CardTitle>{table.name}</CardTitle>
            <CardDescription>{table.category}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-grow">
             <p className="text-sm text-muted-foreground">{isActive ? 'Click to manage session.' : 'Click to start session.'}</p>
        </CardContent>
      </Card>
    );
  };

  const tableId = activeModalTable?.id;
  const session = tableId ? sessions[tableId] : null;
  const tableCost = session ? (session.elapsedSeconds / 3600) * (activeModalTable?.rate || 0) : 0;
  const itemsCost = session ? session.items.reduce((acc, item) => acc + item.price * item.quantity, 0) : 0;
  const totalCost = tableCost + itemsCost;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading Tables & Menu...</span>
      </div>
    );
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
            <TabsTrigger value="All Tables">All Tables</TabsTrigger>
            <TabsTrigger value="American Pool">American Pool</TabsTrigger>
            <TabsTrigger value="Mini Snooker">Mini Snooker</TabsTrigger>
            <TabsTrigger value="Standard">Standard</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
        {filteredTables.map(renderTableCard)}
      </div>

      {/* Session Management Modal */}
      {activeModalTable && session && tableId && (
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
                    <ScrollArea className="h-full">
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                          {menuItems.map(item => (
                              <Button key={item.id} variant="outline" className="h-20 flex-col" onClick={() => handleAddItem(tableId, item)}>
                                  <span>{item.name}</span>
                                  <span className="text-xs text-muted-foreground">₹{item.price}</span>
                              </Button>
                          ))}
                      </div>
                    </ScrollArea>
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
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItem(tableId, item.id)}><Minus className="h-3 w-3"/></Button>
                                                    {item.quantity}
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddItem(tableId, item)}><Plus className="h-3 w-3"/></Button>
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
