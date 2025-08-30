
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getTableById, getMenuItems } from '@/app/staff/actions';
import type { Table as TableType, MenuItem, ActiveSession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Plus, Minus, Receipt, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
};

export default function SessionPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const tableId = params.tableId as string;

    const [table, setTable] = useState<TableType | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [session, setSession] = useState<ActiveSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);

    // Load table and menu data
    useEffect(() => {
        const fetchData = async () => {
            if (!tableId) return;
            setIsLoading(true);
            try {
                const [tableData, menuData] = await Promise.all([
                    getTableById(tableId),
                    getMenuItems()
                ]);
                setTable(tableData);
                setMenuItems(menuData);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load session data.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [tableId, toast]);

    // Load session from localStorage
    useEffect(() => {
        const allSessions: Record<string, ActiveSession> = JSON.parse(localStorage.getItem('activeSessions') || '{}', (key, value) => {
            if (['startTime', 'pauseTime'].includes(key) && value) return new Date(value);
            return value;
        });
        if (allSessions[tableId]) {
            setSession(allSessions[tableId]);
        }
    }, [tableId]);
    
    // Timer updates
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            setSession(prev => {
                if (!prev || prev.status !== 'running') return prev;
                
                const elapsed = Math.floor((new Date().getTime() - new Date(prev.startTime).getTime()) / 1000) - prev.totalPauseDuration;
                if(prev.elapsedSeconds === elapsed) return prev;

                const newSession = { ...prev, elapsedSeconds: elapsed };
                
                const allSessions = JSON.parse(localStorage.getItem('activeSessions') || '{}');
                allSessions[tableId] = newSession;
                localStorage.setItem('activeSessions', JSON.stringify(allSessions));

                return newSession;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [tableId]);


    const updateSessionInStorage = (newSession: ActiveSession | null) => {
        const allSessions = JSON.parse(localStorage.getItem('activeSessions') || '{}');
        if (newSession) {
            allSessions[tableId] = newSession;
        } else {
            delete allSessions[tableId];
        }
        localStorage.setItem('activeSessions', JSON.stringify(allSessions));
        setSession(newSession);
    };

    const handleStart = () => {
        if (!table) return;

        const newSession: ActiveSession = {
            startTime: new Date(),
            elapsedSeconds: 0,
            status: 'running',
            items: session?.items || [], // Keep items if they were added before starting
            totalPauseDuration: 0,
            customerName: session?.customerName || 'Walk-in Customer'
        };
        updateSessionInStorage(newSession);
    };

    const handlePause = () => { 
        setSession(prev => {
            if (!prev || prev.status !== 'running') return prev;
            const newSession = { ...prev, status: 'paused' as 'paused', pauseTime: new Date() };
            updateSessionInStorage(newSession);
            return newSession;
        });
    };
    
    const handleStop = () => {
        setSession(prev => {
            if (!prev) return prev;
            let finalElapsed = prev.elapsedSeconds;
            if (prev.status === 'running') {
                 finalElapsed = Math.floor((new Date().getTime() - new Date(prev.startTime).getTime())/1000) - prev.totalPauseDuration;
            }
            const newSession = { ...prev, status: 'stopped' as 'stopped', elapsedSeconds: finalElapsed };
            updateSessionInStorage(newSession);
            return newSession;
        });
    }

    const handleResume = () => {
        setSession(prev => {
            if (!prev || prev.status !== 'paused' || !prev.pauseTime) return prev;
            const pauseDuration = Math.floor((new Date().getTime() - new Date(prev.pauseTime).getTime()) / 1000);
            const newSession = {
                ...prev,
                status: 'running' as 'running',
                totalPauseDuration: prev.totalPauseDuration + pauseDuration,
                pauseTime: undefined,
            };
            updateSessionInStorage(newSession);
            return newSession;
        });
    };

    const handleSettleBill = () => {
        if (session?.status !== 'stopped') {
            toast({ variant: 'destructive', title: 'Error', description: 'Please stop the timer before settling the bill.' });
            return;
        }
        setIsBillDialogOpen(true);
    };
    
    const handleCompletePayment = (paymentMethod: string) => {
        if (!tableId) return;
        updateSessionInStorage(null);
        toast({ title: 'Success', description: `Bill settled with ${paymentMethod}.` });
        router.push('/staff');
    };

    const handleAddItem = (item: MenuItem) => {
        setSession(prev => {
            const currentSession = prev || {
                startTime: new Date(),
                elapsedSeconds: 0,
                status: 'not-started',
                items: [],
                totalPauseDuration: 0,
                customerName: 'Walk-in Customer'
            };

            const existingItem = currentSession.items.find(i => i.id === item.id);
            let newItems;
            if (existingItem) {
                newItems = currentSession.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            } else {
                newItems = [...currentSession.items, { ...item, quantity: 1 }];
            }
            const newSession = { ...currentSession, items: newItems };
            updateSessionInStorage(newSession);
            return newSession;
        });
    };
    
    const handleRemoveItem = (itemId: string) => {
        setSession(prev => {
            if (!prev) return prev;
            const existingItem = prev.items.find(i => i.id === itemId);
            let newItems;
            if (existingItem && existingItem.quantity > 1) {
                newItems = prev.items.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
            } else {
                newItems = prev.items.filter(i => i.id !== itemId);
            }
            const newSession = { ...prev, items: newItems };
            updateSessionInStorage(newSession);
            return newSession;
        });
    };

    const effectiveSession = useMemo(() => session || {
        startTime: new Date(),
        elapsedSeconds: 0,
        status: 'not-started',
        items: [],
        totalPauseDuration: 0,
        customerName: 'Walk-in Customer',
    }, [session]);

    const tableCost = useMemo(() => {
        if (!effectiveSession || !table) return 0;
        return (effectiveSession.elapsedSeconds / 3600) * table.rate;
    }, [effectiveSession, table]);

    const itemsCost = useMemo(() => {
        if (!effectiveSession) return 0;
        return effectiveSession.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [effectiveSession]);

    const totalPayable = tableCost + itemsCost;

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!table) {
        return <div className="flex h-screen items-center justify-center">Table not found.</div>;
    }

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Link href="/staff" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Tables
            </Link>
            <h1 className="text-3xl font-bold mb-6">{table.name}</h1>
            
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                             <div>
                                <CardTitle className="text-lg">{table.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{table.category} Table</p>
                            </div>
                            {effectiveSession.status !== 'not-started' && <Badge className={effectiveSession.status === 'running' ? 'bg-green-500' : 'bg-yellow-500'}>{effectiveSession.status.charAt(0).toUpperCase() + effectiveSession.status.slice(1)}</Badge>}
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                <div>
                                    <p className="text-muted-foreground">Timer</p>
                                    <p className="text-2xl font-mono font-bold">{formatDuration(effectiveSession.elapsedSeconds)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Price per hour</p>
                                    <p className="text-2xl font-bold">₹{table.rate.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Current Cost</p>
                                    <p className="text-2xl font-bold text-green-600">₹{tableCost.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Started At:</p>
                                    <p>{effectiveSession.status === 'not-started' ? 'Not started' : new Date(effectiveSession.startTime).toLocaleTimeString()}</p>
                                </div>
                                 <div className="col-span-2 text-right text-xs text-muted-foreground">
                                    Current Time: {currentTime.toLocaleTimeString()}
                                 </div>
                            </div>
                        </CardContent>
                        <CardFooter className="grid grid-cols-2 gap-2">
                           {effectiveSession.status === 'not-started' && <Button onClick={handleStart} className="col-span-2 bg-green-600 hover:bg-green-700"><Play className="mr-2 h-4 w-4"/>Start</Button>}
                           {effectiveSession.status === 'running' && <Button onClick={handlePause} variant="destructive">Pause</Button>}
                           {effectiveSession.status === 'paused' && <Button onClick={handleResume} variant="outline">Resume</Button>}
                           {effectiveSession.status !== 'not-started' && <Button onClick={handleStop} disabled={effectiveSession.status === 'stopped'} variant={effectiveSession.status === 'running' ? 'outline': 'destructive'}>Stop</Button>}
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Customer Name</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>{effectiveSession.customerName}</p>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Center Column */}
                <div className="lg:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>Snacks &amp; Drinks</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-[50vh] pr-4">
                                <div className="space-y-2">
                                {menuItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                                        <div>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{item.category} - ₹{item.price.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200" onClick={() => handleRemoveItem(item.id)}>
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="w-4 text-center font-bold">{effectiveSession.items.find(i => i.id === item.id)?.quantity || 0}</span>
                                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full bg-green-100 text-green-600 hover:bg-green-200" onClick={() => handleAddItem(item)}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>Checkout Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {effectiveSession.items.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-8">No items added</p>
                            ) : (
                                <ScrollArea className="h-48 pr-4">
                                    {effectiveSession.items.map(item => (
                                        <div key={item.id} className="flex justify-between text-sm mb-2">
                                            <span>{item.quantity} x {item.name}</span>
                                            <span>₹{(item.quantity * item.price).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </ScrollArea>
                            )}

                            <Separator />

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Time Cost:</span>
                                    <span>₹{tableCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Items Total:</span>
                                    <span>₹{itemsCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span>{effectiveSession.customerName}</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className="font-medium text-primary">{effectiveSession.status.charAt(0).toUpperCase() + effectiveSession.status.slice(1)}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch space-y-2">
                            <div className="bg-green-50 text-green-800 p-4 rounded-lg flex justify-between items-center">
                                <span className="text-lg font-bold">Total Payable:</span>
                                <span className="text-2xl font-bold">₹{totalPayable.toFixed(2)}</span>
                            </div>
                            <Button size="lg" onClick={handleSettleBill} disabled={effectiveSession.status !== 'stopped'}>
                                <Receipt className="mr-2 h-5 w-5" /> Settle Bill
                            </Button>
                             {effectiveSession.status !== 'stopped' && effectiveSession.status !== 'not-started' &&(
                                <p className="text-xs text-center text-red-500">Please 'Stop' the timer to settle the bill.</p>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </div>

             {/* Bill Settlement Dialog */}
            <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bill for {table.name}</DialogTitle>
                        <DialogDescription>Select payment method to complete the transaction.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 my-4">
                        <Card className="p-4">
                            <h4 className="font-semibold mb-2">Bill Summary</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Customer:</span><span>{effectiveSession.customerName}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Time Cost:</span><span>₹{tableCost.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Items Cost:</span><span>₹{itemsCost.toFixed(2)}</span></div>
                                <Separator className="my-2"/>
                                <div className="flex justify-between font-bold text-base"><span >Total:</span><span>₹{totalPayable.toFixed(2)}</span></div>
                            </div>
                        </Card>
                        <div>
                             <h4 className="font-semibold mb-2">Payment Method</h4>
                             <Select onValueChange={(value) => handleCompletePayment(value)}>
                                <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="Card">Card</SelectItem>
                                    <SelectItem value="Membership">Membership</SelectItem>
                                </SelectContent>
                             </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBillDialogOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
