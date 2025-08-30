
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getTableById, getMenuItems } from '@/app/staff/actions';
import type { Table as TableType, MenuItem, ActiveSession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Plus, Minus, Receipt, Play, Pause, Wallet, Smartphone, Split, Award } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';


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
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [cashAmount, setCashAmount] = useState('');
    const [upiAmount, setUpiAmount] = useState('');

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
        setSession(allSessions[tableId] || null);
    }, [tableId]);
    
    // Timer updates
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            if (session?.status === 'running') {
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
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [tableId, session?.status]);


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
        const newSession: ActiveSession = {
            startTime: new Date(),
            elapsedSeconds: 0,
            status: 'running',
            items: [],
            totalPauseDuration: 0,
            customerName: 'Walk-in Customer'
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
    
    const tableCost = useMemo(() => {
        if (!session || !table) return 0;
        return (session.elapsedSeconds / 3600) * table.rate;
    }, [session, table]);

    const itemsCost = useMemo(() => {
        if (!session) return 0;
        return session.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [session]);

    const totalPayable = useMemo(() => {
        return Math.floor(tableCost + itemsCost);
    }, [tableCost, itemsCost]);


    const handleCompletePayment = () => {
        if (!selectedPaymentMethod) {
            toast({ variant: "destructive", title: "Error", description: "Please select a payment method." });
            return;
        }

        if (selectedPaymentMethod === 'Split Pay') {
            const parsedCash = parseFloat(cashAmount) || 0;
            const parsedUpi = parseFloat(upiAmount) || 0;
            if (Math.floor(parsedCash + parsedUpi) !== totalPayable) {
                toast({ variant: "destructive", title: "Error", description: `Split payment amounts (₹${(parsedCash + parsedUpi).toFixed(2)}) must add up to the total payable (₹${totalPayable}).` });
                return;
            }
        }

        if (!tableId) return;
        updateSessionInStorage(null);
        toast({ title: 'Success', description: `Bill settled with ${selectedPaymentMethod}.` });
        router.push('/staff');
    };

    const handleAddItem = (itemToAdd: MenuItem) => {
      setSession(prevSession => {
        if (!prevSession) return null;
    
        const existingItem = prevSession.items.find(i => i.id === itemToAdd.id);
        
        let newItems;
        if (existingItem) {
          newItems = prevSession.items.map(i => 
            i.id === itemToAdd.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        } else {
          newItems = [...prevSession.items, { ...itemToAdd, quantity: 1 }];
        }
        
        const newSession = { ...prevSession, items: newItems };
        updateSessionInStorage(newSession);
        return newSession;
      });
    };
    
    const handleRemoveItem = (itemIdToRemove: string) => {
      setSession(prevSession => {
        if (!prevSession) return null;
    
        const newItems = prevSession.items.map(item => {
          if (item.id === itemIdToRemove) {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        }).filter(item => item.quantity > 0);
    
        const newSession = { ...prevSession, items: newItems };
        updateSessionInStorage(newSession);
        return newSession;
      });
    };
    
    const isSplitPayMismatch = useMemo(() => {
        if (selectedPaymentMethod !== 'Split Pay') return false;
        const parsedCash = parseFloat(cashAmount) || 0;
        const parsedUpi = parseFloat(upiAmount) || 0;
        return Math.floor(parsedCash + parsedUpi) !== totalPayable;
    }, [selectedPaymentMethod, cashAmount, upiAmount, totalPayable]);

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

    const sessionStatus = session?.status || 'idle';

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
                            {session && <Badge className={session.status === 'running' ? 'bg-green-500' : session.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'}>{session.status.charAt(0).toUpperCase() + session.status.slice(1)}</Badge>}
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                <div>
                                    <p className="text-muted-foreground">Timer</p>
                                    <p className="text-2xl font-mono font-bold">{formatDuration(session?.elapsedSeconds || 0)}</p>
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
                                    <p>{session ? new Date(session.startTime).toLocaleTimeString() : 'Not started'}</p>
                                </div>
                                 <div className="col-span-2 text-right text-xs text-muted-foreground">
                                    Current Time: {currentTime.toLocaleTimeString()}
                                 </div>
                            </div>
                        </CardContent>
                        <CardFooter className="grid grid-cols-3 gap-2">
                           <Button onClick={handleStart} disabled={sessionStatus !== 'idle'} className="bg-green-600 hover:bg-green-700">
                               <Play className="mr-2 h-4 w-4" /> Start
                           </Button>
                           <Button onClick={sessionStatus === 'running' ? handlePause : handleResume} disabled={sessionStatus === 'idle' || sessionStatus === 'stopped'} variant="outline">
                                {sessionStatus === 'running' ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                                {sessionStatus === 'running' ? 'Pause' : 'Resume'}
                           </Button>
                           <Button onClick={handleStop} disabled={sessionStatus !== 'running' && sessionStatus !== 'paused'} variant="destructive">Stop</Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Customer Name</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>{session?.customerName || 'Walk-in Customer'}</p>
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
                                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200" onClick={() => handleRemoveItem(item.id!)} disabled={!session}>
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="w-4 text-center font-bold">{session?.items.find(i => i.id === item.id)?.quantity || 0}</span>
                                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full bg-green-100 text-green-600 hover:bg-green-200" onClick={() => handleAddItem(item)} disabled={!session}>
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
                             {!session || session.items.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-8">No items added</p>
                            ) : (
                                <ScrollArea className="h-48 pr-4">
                                    {session.items.map(item => (
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
                                    <span>{session?.customerName || 'Walk-in Customer'}</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className="font-medium text-primary">{session ? (session.status.charAt(0).toUpperCase() + session.status.slice(1)) : 'Not Started'}</span>
                                 </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch space-y-2">
                            <div className="bg-green-50 text-green-800 p-4 rounded-lg flex justify-between items-center">
                                <span className="text-lg font-bold">Total Payable:</span>
                                <span className="text-2xl font-bold">₹{totalPayable}</span>
                            </div>
                            <Button size="lg" onClick={handleSettleBill} disabled={sessionStatus !== 'stopped'}>
                                <Receipt className="mr-2 h-5 w-5" /> Settle Bill
                            </Button>
                             {sessionStatus !== 'stopped' && (
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
                        <DialogTitle>Payment & Bill Settlement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 my-4">
                        <div className="bg-muted/50 rounded-lg p-4">
                            <h4 className="font-semibold mb-3">{table.name} - Bill Summary</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Customer:</span><span>{session?.customerName}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Time Cost:</span><span>₹{tableCost.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Items Cost:</span><span>₹{itemsCost.toFixed(2)}</span></div>
                                <Separator className="my-2"/>
                                <div className="flex justify-between font-bold text-lg"><span>Total Amount:</span><span>₹{totalPayable}</span></div>
                            </div>
                        </div>
                        <div>
                             <h4 className="font-semibold mb-3">Payment Method</h4>
                             <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    variant={selectedPaymentMethod === 'Cash' ? 'default' : 'outline'}
                                    onClick={() => setSelectedPaymentMethod('Cash')}
                                    className={cn("h-20 flex-col gap-2 text-base", selectedPaymentMethod === 'Cash' && 'bg-green-600 hover:bg-green-700')}
                                >
                                    <Wallet /> Cash
                                </Button>
                                <Button 
                                    variant={selectedPaymentMethod === 'UPI' ? 'default' : 'outline'}
                                    onClick={() => setSelectedPaymentMethod('UPI')}
                                    className="h-20 flex-col gap-2 text-base"
                                >
                                    <Smartphone /> UPI
                                </Button>
                                <Button 
                                    variant={selectedPaymentMethod === 'Split Pay' ? 'default' : 'outline'}
                                    onClick={() => setSelectedPaymentMethod('Split Pay')}
                                    className="h-20 flex-col gap-2 text-base"
                                >
                                    <Split /> Split Pay
                                </Button>
                                <Button 
                                    variant={selectedPaymentMethod === 'Membership' ? 'default' : 'outline'}
                                    onClick={() => setSelectedPaymentMethod('Membership')}
                                    className="h-20 flex-col gap-2 text-base"
                                >
                                    <Award /> Membership
                                </Button>
                             </div>
                             {selectedPaymentMethod === 'Split Pay' && (
                                <div className="grid grid-cols-1 gap-4 mt-4 p-4 border rounded-md">
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div className="space-y-2">
                                            <Label htmlFor="cashAmount">Cash Amount</Label>
                                            <Input
                                                id="cashAmount"
                                                type="number"
                                                placeholder="0.00"
                                                value={cashAmount}
                                                onChange={(e) => setCashAmount(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="upiAmount">UPI Amount</Label>
                                            <Input
                                                id="upiAmount"
                                                type="number"
                                                placeholder="0.00"
                                                value={upiAmount}
                                                onChange={(e) => setUpiAmount(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {isSplitPayMismatch && (
                                         <p className="text-xs text-center text-red-500">Cash and UPI amounts must sum to the total of ₹{totalPayable}.</p>
                                    )}
                                </div>
                             )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBillDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={handleCompletePayment} disabled={!selectedPaymentMethod || isSplitPayMismatch}>Settle Bill</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    