
"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
    getTableById, 
    getMenuItems, 
    saveTransaction, 
    searchMembers, 
    deductHoursFromMember,
    getActiveSessionByTableId,
    updateActiveSession,
    startActiveSession,
    deleteActiveSession
} from '@/app/staff/actions';
import type { Table as TableType, MenuItem, ActiveSession, Transaction, OrderItem, Member, MembershipPlan } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Plus, Minus, Receipt, Play, Pause, Wallet, Smartphone, Split, Award, Search, UserCheck, StopCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getMembershipPlans } from '@/app/admin/memberships/actions';
import { format } from "date-fns";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


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
    const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
    const [session, setSession] = useState<ActiveSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [cashAmount, setCashAmount] = useState('');
    const [upiAmount, setUpiAmount] = useState('');

    // Membership state
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [searchedMembers, setSearchedMembers] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [isSearching, setIsSearching] = useState(false);


    // Load initial data
    useEffect(() => {
        const fetchData = async () => {
            if (!tableId) return;
            setIsLoading(true);
            try {
                const [tableData, menuData, plansData, sessionData] = await Promise.all([
                    getTableById(tableId),
                    getMenuItems(),
                    getMembershipPlans(),
                    getActiveSessionByTableId(tableId)
                ]);
                setTable(tableData);
                setMenuItems(menuData);
                setMembershipPlans(plansData);
                setSession(sessionData);

                if (sessionData?.memberId) {
                    // Pre-fetch the member details if a member is already associated with the session
                    const memberDetails = await getDoc(doc(db, 'members', sessionData.memberId));
                    if(memberDetails.exists()) {
                            setSelectedMember({id: memberDetails.id, ...memberDetails.data()} as Member);
                    }
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load session data.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [tableId, toast]);
    
    // Timer updates
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            setSession(prev => {
                if (!prev || prev.status !== 'running') return prev;
                
                const elapsed = Math.floor((Date.now() - prev.startTime) / 1000) - prev.totalPauseDuration;
                if(prev.elapsedSeconds === elapsed) return prev;

                return { ...prev, elapsedSeconds: elapsed };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);


    const handleStart = async () => {
        if (session) return;
        const result = await startActiveSession(tableId);
        if (result.success && result.session) {
            setSession(result.session);
            toast({title: "Success", description: "Session started!"});
        } else {
            toast({variant: 'destructive', title: 'Error', description: 'Failed to start session.'});
        }
    };

    const handlePause = async () => { 
        if (!session || session.status !== 'running') return;
        // Calculate the exact elapsed time at the moment of pausing
        const elapsed = Math.floor((Date.now() - session.startTime) / 1000) - session.totalPauseDuration;
        const newSession = { ...session, status: 'paused' as 'paused', pauseTime: Date.now(), elapsedSeconds: elapsed };
        setSession(newSession);
        await updateActiveSession(tableId, newSession);
    };
    
    const handleStop = async () => {
        if (!session) return;
        startTransition(async () => {
            let finalElapsed = session.elapsedSeconds;
            if (session.status === 'running') {
                finalElapsed = Math.floor((Date.now() - session.startTime)/1000) - session.totalPauseDuration;
            }
            const newSession = { ...session, status: 'stopped' as 'stopped', elapsedSeconds: finalElapsed };
            setSession(newSession);
            await updateActiveSession(tableId, newSession);
        });
    }

    const handleResume = async () => {
        if (!session || !['paused', 'stopped'].includes(session.status)) return;
    
        let newSession: ActiveSession;
    
        if (session.status === 'paused' && session.pauseTime) {
            const pauseDuration = Math.floor((Date.now() - session.pauseTime) / 1000);
            newSession = {
                ...session,
                status: 'running' as 'running',
                totalPauseDuration: session.totalPauseDuration + pauseDuration,
                pauseTime: undefined,
            };
        } else if (session.status === 'stopped') {
            // When resuming from a stopped state, recalculate startTime based on the frozen elapsedSeconds
            const newStartTime = Date.now() - (session.elapsedSeconds * 1000);
            newSession = {
                ...session,
                startTime: newStartTime,
                status: 'running' as 'running',
                totalPauseDuration: 0, // Reset pause duration as startTime is new
            };
        } else {
            return;
        }
        
        setSession(newSession);
        await updateActiveSession(tableId, newSession);
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
        if (selectedPaymentMethod === 'Membership') {
            return Math.floor(itemsCost);
        }
        return Math.floor(tableCost + itemsCost);
    }, [tableCost, itemsCost, selectedPaymentMethod]);

    const generateInvoicePdf = (transaction: Transaction) => {
        if (!table) return;

        const doc = new jsPDF();
        const billingDate = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
        const memberPlan = selectedMember ? membershipPlans.find(p => p.id === selectedMember.planId) : null;

        // Title
        doc.setFontSize(22);
        doc.text("INVOICE", doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
        doc.setFontSize(16);
        doc.text(`${table.category} : ${table.name}`, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

        // Customer Details
        const customerDetails = [
            { title: 'Customer Name', value: transaction.customerName },
            { title: 'Phone', value: selectedMember?.mobileNumber || 'N/A' },
            { title: 'Payment Method', value: transaction.paymentMethod },
            { title: 'Billing Date', value: billingDate },
        ];
        if (selectedMember) {
            customerDetails.push(
                { title: 'Subscription Status', value: selectedMember ? 'Active' : 'N/A' },
                { title: 'Subscription End Date', value: selectedMember?.validityDate ? format(new Date(selectedMember.validityDate), "PP") : 'N/A' },
                { title: 'Plan', value: memberPlan?.name || 'N/A' },
                { title: 'Plan Cost', value: memberPlan ? `₹${memberPlan.price}` : 'N/A' },
                { title: 'Subscription Time', value: memberPlan ? `${memberPlan.totalHours} hrs` : 'N/A' },
                { title: 'Remaining Time', value: selectedMember ? `${selectedMember.remainingHours.toFixed(2)} hrs` : 'N/A' }
            );
        }

        autoTable(doc, {
            startY: 40,
            head: [['Customer Details', '']],
            body: customerDetails.map(d => [d.title, d.value]),
            theme: 'striped',
            headStyles: { fillColor: [22, 163, 74] },
            didParseCell: (data) => {
                if (data.section === 'head') {
                    data.cell.styles.halign = 'center';
                }
                if(data.column.index === 0) {
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        // Purchased Items
        let finalY = (doc as any).lastAutoTable.finalY + 10;
        if (transaction.items.length > 0) {
            autoTable(doc, {
                startY: finalY,
                head: [['Item', 'Quantity', 'Price per Unit (Rs)', 'Total Price (Rs)']],
                body: transaction.items.map(i => [i.name, i.quantity, i.price.toFixed(2), (i.price * i.quantity).toFixed(2)]),
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235] },
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;
        }

        // Timer Details
        const timerDetails = [
            { title: 'Started At', value: new Date(transaction.startTime).toLocaleString() },
            { title: 'Ended At', value: new Date(transaction.endTime).toLocaleString() },
            { title: 'Timer Duration', value: formatDuration(transaction.durationSeconds) },
            { title: 'Timer Price (Rs)', value: transaction.tableCost.toFixed(2) },
        ];
        autoTable(doc, {
            startY: finalY,
            head: [['Timer Details', '']],
            body: timerDetails.map(d => [d.title, d.value]),
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11] },
             didParseCell: (data) => {
                if (data.section === 'head') {
                    data.cell.styles.halign = 'center';
                }
                 if(data.column.index === 0) {
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
        
        // Summary
        finalY = (doc as any).lastAutoTable.finalY + 10;
        const summaryDetails = [
            { title: 'Time Benefit Applied', value: transaction.paymentMethod === 'Membership' ? 'Yes' : 'No' },
            { title: 'Total Amount (Rs)', value: `₹${transaction.totalAmount.toFixed(2)}` },
        ];
        autoTable(doc, {
            startY: finalY,
            head: [['Summary', '']],
            body: summaryDetails.map(d => [d.title, d.value]),
            theme: 'striped',
            headStyles: { fillColor: [220, 38, 38] },
             didParseCell: (data) => {
                if (data.section === 'head') {
                    data.cell.styles.halign = 'center';
                }
                 if(data.column.index === 0) {
                    data.cell.styles.fontStyle = 'bold';
                }
                if (data.row.index === 1 && data.column.index === 1) {
                     data.cell.styles.fontStyle = 'bold';
                     data.cell.styles.fontSize = 14;
                }
            }
        });

        doc.save(`invoice-${transaction.tableName}-${new Date().getTime()}.pdf`);
    };


    const handleCompletePayment = () => {
        if (!selectedPaymentMethod || !session || !table) {
            toast({ variant: "destructive", title: "Error", description: "Payment method or session data is missing." });
            return;
        }
        
        const startTimeDate = new Date(session.startTime);
        if (isNaN(startTimeDate.getTime())) {
            toast({ variant: "destructive", title: "Error", description: "Invalid session start time." });
            return;
        }

        const parsedCash = parseFloat(cashAmount) || 0;
        const parsedUpi = parseFloat(upiAmount) || 0;

        if (selectedPaymentMethod === 'Split Pay') {
            if (Math.floor(parsedCash + parsedUpi) !== totalPayable) {
                toast({ variant: "destructive", title: "Error", description: `Split payment amounts (₹${(parsedCash + parsedUpi).toFixed(2)}) must add up to the total payable (₹${totalPayable}).` });
                return;
            }
        }

        const transaction: Transaction = {
            tableId: table.id,
            tableName: table.name,
            startTime: startTimeDate.getTime(),
            endTime: new Date().getTime(),
            durationSeconds: session.elapsedSeconds,
            tableCost: parseFloat(tableCost.toFixed(2)),
            itemsCost: parseFloat(itemsCost.toFixed(2)),
            totalAmount: totalPayable,
            paymentMethod: selectedPaymentMethod,
            cashAmount: selectedPaymentMethod === 'Split Pay' ? parsedCash : undefined,
            upiAmount: selectedPaymentMethod === 'Split Pay' ? parsedUpi : undefined,
            items: session.items.map(item => ({...item})), // Create a clean copy
            customerName: selectedMember ? selectedMember.name : session.customerName,
            createdAt: Date.now()
        };
        
        startTransition(async () => {
            let result;
            if (selectedPaymentMethod === 'Membership') {
                if (!selectedMember) {
                    toast({ variant: 'destructive', title: 'Error', description: 'No member selected.'});
                    return;
                }
                const hoursToDeduct = session.elapsedSeconds / 3600;
                result = await deductHoursFromMember(selectedMember.id, hoursToDeduct, transaction);
            } else {
                result = await saveTransaction(transaction);
            }

            if (result.success) {
                generateInvoicePdf(transaction);
                setSession(null);
                toast({ title: 'Success', description: `Bill settled with ${selectedPaymentMethod}.` });
                router.push('/staff');
            } else {
                toast({ variant: "destructive", title: "Save Error", description: result.message });
            }
        });
    };
    
    const handleAddItem = useCallback((itemToAdd: MenuItem) => {
        if (!session) return;

        const newItems = [...session.items];
        const existingItemIndex = newItems.findIndex(item => item.id === itemToAdd.id);

        if (existingItemIndex > -1) {
            newItems[existingItemIndex] = {
                ...newItems[existingItemIndex],
                quantity: newItems[existingItemIndex].quantity + 1,
            };
        } else {
            newItems.push({ ...itemToAdd, quantity: 1 });
        }
        
        const newSession = { ...session, items: newItems };
        setSession(newSession);
        updateActiveSession(tableId, newSession);
    }, [session, tableId]);

    const handleRemoveItem = useCallback((itemIdToRemove: string) => {
        if (!session) return;

        const existingItem = session.items.find(item => item.id === itemIdToRemove);
        if (!existingItem) return;

        let newItems;
        if (existingItem.quantity > 1) {
            newItems = session.items.map(item => 
                item.id === itemIdToRemove ? { ...item, quantity: item.quantity - 1 } : item
            );
        } else {
            newItems = session.items.filter(item => item.id !== itemIdToRemove);
        }
    
        const newSession = { ...session, items: newItems };
        setSession(newSession);
        updateActiveSession(tableId, newSession);
    }, [session, tableId]);
    
    const isSplitPayMismatch = useMemo(() => {
        if (selectedPaymentMethod !== 'Split Pay') return false;
        const parsedCash = parseFloat(cashAmount) || 0;
        const parsedUpi = parseFloat(upiAmount) || 0;
        return Math.floor(parsedCash + parsedUpi) !== totalPayable;
    }, [selectedPaymentMethod, cashAmount, upiAmount, totalPayable]);

    const handleMemberSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!memberSearchTerm.trim()) return;
        setIsSearching(true);
        setSearchedMembers([]);
        setSelectedMember(null);
        try {
            const members = await searchMembers(memberSearchTerm);
            setSearchedMembers(members);
            if (members.length === 0) {
                 toast({ variant: 'destructive', title: 'Not Found', description: 'No members found with that name or mobile number.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to search for members.' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectMember = (member: Member) => {
        if (!session) return;
        setSelectedMember(member);
        setSearchedMembers([]);
        setMemberSearchTerm('');
        const newSession = { ...session, customerName: member.name, memberId: member.id };
        setSession(newSession);
        updateActiveSession(tableId, newSession);
    };
    
    const playedHours = useMemo(() => session ? session.elapsedSeconds / 3600 : 0, [session]);
    const hasSufficientHours = useMemo(() => {
        if (!selectedMember) return false;
        return selectedMember.remainingHours >= playedHours;
    }, [selectedMember, playedHours]);
    
    useEffect(() => {
        if (selectedPaymentMethod !== 'Membership' && session?.memberId) {
            if (selectedMember) {
                setSelectedMember(null);
                const newSession = { ...session, customerName: 'Walk-in Customer', memberId: null };
                setSession(newSession);
                updateActiveSession(tableId, newSession);
            }
        }
    }, [selectedPaymentMethod, session, tableId, selectedMember]);


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
    const memberPlan = selectedMember ? membershipPlans.find(p => p.id === selectedMember.planId) : null;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Link href="/staff" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 no-print">
                <ArrowLeft className="h-4 w-4" />
                Back to Tables
            </Link>
            
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                             <div>
                                <CardTitle className="text-lg">{table.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{table.category} Table</p>
                            </div>
                            {session && <Badge className={cn("no-print", session.status === 'running' ? 'bg-green-500' : session.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500')}>{session.status.charAt(0).toUpperCase() + session.status.slice(1)}</Badge>}
                        </CardHeader>
                        <CardContent>
                           {session ? (
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
                                    <p>{new Date(session.startTime).toLocaleTimeString()}</p>
                                </div>
                                 <div className="col-span-2 text-right text-xs text-muted-foreground">
                                    Current Time: {currentTime.toLocaleTimeString()}
                                 </div>
                            </div>
                           ) : (
                             <div className="text-center py-10">
                                 <p className="text-muted-foreground">This table is available.</p>
                             </div>
                           )}
                        </CardContent>
                         {session ? (
                             <CardFooter className="grid grid-cols-3 gap-2 no-print">
                               <Button onClick={handlePause} disabled={sessionStatus !== 'running'} variant="outline">
                                    <Pause className="mr-2 h-4 w-4" />
                                    Pause
                               </Button>
                                <Button onClick={handleResume} disabled={!['paused', 'stopped'].includes(sessionStatus)} variant="outline">
                                    <Play className="mr-2 h-4 w-4" />
                                    Resume
                                </Button>
                               <Button onClick={handleStop} disabled={sessionStatus !== 'running' || isPending} variant="destructive" className="col-span-1">
                                   {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-4 w-4" />}
                                   Stop
                                </Button>
                             </CardFooter>
                         ) : (
                             <CardFooter className="no-print">
                                <Button onClick={handleStart} className="w-full bg-green-600 hover:bg-green-700">
                                    <Play className="mr-2 h-4 w-4" /> Start New Session
                                </Button>
                             </CardFooter>
                         )}
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Membership Check</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={handleMemberSearch} className="flex gap-2">
                                <Input 
                                    id="memberSearchMain" 
                                    value={memberSearchTerm} 
                                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                                    placeholder="Search by Name or Mobile"
                                    disabled={!session}
                                />
                                <Button type="submit" disabled={isSearching || !memberSearchTerm.trim() || !session}>
                                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}
                                </Button>
                            </form>
                            
                            {searchedMembers.length > 0 && (
                                <div className="space-y-2">
                                    {searchedMembers.map(member => (
                                        <div key={member.id} onClick={() => handleSelectMember(member)} className="p-2 border rounded-md cursor-pointer hover:bg-muted">
                                            <p className='font-semibold'>{member.name}</p>
                                            <p className='text-xs text-muted-foreground'>Mobile: {member.mobileNumber}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedMember && (
                                <div className="text-sm space-y-2 pt-2 border-t">
                                    <h4 className="font-semibold text-primary">{selectedMember.name}</h4>
                                    <div className="flex justify-between"><span>Plan:</span> <span>{memberPlan?.name || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span>Remaining:</span> <span>{selectedMember.remainingHours.toFixed(2)} hrs</span></div>
                                    <div className="flex justify-between"><span>Expires:</span> <span>{selectedMember.validityDate ? format(new Date(selectedMember.validityDate), "PPP") : 'N/A'}</span></div>
                                </div>
                            )}
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
                                        <div className="flex items-center gap-2 no-print">
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
                                    <span className='font-medium'>{session?.customerName || 'Walk-in Customer'}</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className="font-medium text-primary">{session ? (session.status.charAt(0).toUpperCase() + session.status.slice(1)) : 'Not Started'}</span>
                                 </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch space-y-2 no-print">
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
                            <h4 className="font-semibold mb-3">{table?.name} - Bill Summary</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Customer:</span><span>{selectedMember?.name || session?.customerName}</span></div>
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
                            {selectedPaymentMethod === 'Membership' && (
                                <div className="space-y-4 mt-4 p-4 border rounded-md">
                                    {!selectedMember && (
                                        <p className="text-sm text-center text-muted-foreground">Please use the 'Membership Check' feature on the main page to select a member first.</p>
                                    )}
                                    
                                    {selectedMember && (
                                        <Card className="bg-muted">
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <UserCheck className="text-green-600"/>
                                                    Selected Member
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-sm space-y-2">
                                                <p><strong>Name:</strong> {selectedMember.name}</p>
                                                <p><strong>Time Played:</strong> {playedHours.toFixed(2)} hours</p>
                                                <p><strong>Remaining Hours:</strong> {selectedMember.remainingHours.toFixed(2)} hours</p>
                                                {!hasSufficientHours && (
                                                    <Alert variant="destructive">
                                                        <AlertTitle>Insufficient Hours</AlertTitle>
                                                        <AlertDescription>
                                                           This member does not have enough hours. Please recharge or use another payment method.
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBillDialogOpen(false)}>Cancel</Button>
                        <Button 
                            className="bg-green-600 hover:bg-green-700" 
                            onClick={handleCompletePayment} 
                            disabled={!selectedPaymentMethod || isSplitPayMismatch || isPending || (selectedPaymentMethod === 'Membership' && (!selectedMember || !hasSufficientHours))}
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Settle Bill
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
