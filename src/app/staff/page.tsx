
"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import type { Table as TableType } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTables } from "@/app/admin/tables/actions";
import { getActiveSessions } from "./actions";
import type { ActiveSession } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Image from "next/image";

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
};

const getTableImage = (category: string) => {
    switch (category) {
        case "American Pool":
            return { src: "https://images.unsplash.com/photo-1666193183128-6ec58995f672?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHw4JTIwYmFsbCUyMHBvb2x8ZW58MHx8fHwxNzU2NTQ4NjM5fDA&ixlib=rb-4.1.0&q=80&w=1080", hint: "pool table" };
        case "Mini Snooker":
            return { src: "https://tse1.mm.bing.net/th/id/OIP.5dWvpccyKu_5InU7Amm9iAAAAA?pid=ImgDet&w=158&h=158&c=7&o=7&rm=3", hint: "snooker table" };
        case "Standard":
             return { src: "https://tse1.mm.bing.net/th/id/OIP.5dWvpccyKu_5InU7Amm9iAAAAA?pid=ImgDet&w=158&h=158&c=7&o=7&rm=3", hint: "billiards table" };
        default:
            return { src: "https://picsum.photos/seed/default/600/400", hint: "game table" };
    }
}


export default function StaffDashboard() {
  const [tables, setTables] = useState<TableType[] | null>(null);
  const [sessions, setSessions] = useState<Record<string, ActiveSession>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All Tables");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedTables, fetchedSessions] = await Promise.all([
          getTables(),
          getActiveSessions(),
        ]);
        setTables(fetchedTables);
        const sessionsMap = fetchedSessions.reduce((acc, session) => {
          acc[session.tableId] = session;
          return acc;
        }, {} as Record<string, ActiveSession>);
        setSessions(sessionsMap);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load data. Check connection and Firestore setup.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessions(prev => {
        const newSessions = { ...prev };
        let changed = false;
        Object.keys(newSessions).forEach((tableId) => {
          const session = newSessions[tableId];
          if (session && session.status === 'running') {
            const now = Date.now();
            const elapsed = Math.floor((now - session.startTime) / 1000) - session.totalPauseDuration;
            if (session.elapsedSeconds !== elapsed) {
              newSessions[tableId] = { ...session, elapsedSeconds: elapsed };
              changed = true;
            }
          }
        });
        return changed ? newSessions : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  

  const handleCardClick = (table: TableType) => {
    if (!table.id) return;
    router.push(`/staff/session/${table.id}`);
  };

  const filteredTables = (tables || []).filter(table => activeTab === 'All Tables' || table.category === activeTab);

  const renderTableCard = (table: TableType) => {
    if (!table.id) return null;
    const session = sessions[table.id];
    const isActive = !!session;
    const imageData = getTableImage(table.category);

    return (
      <Card key={table.id} onClick={() => handleCardClick(table)} className="overflow-hidden cursor-pointer flex flex-col group">
        <div className="relative">
             <Image src={imageData.src} alt={table.name} width={195} height={130} className="object-cover aspect-[3/2] w-full group-hover:scale-105 transition-transform duration-300" data-ai-hint={imageData.hint}/>
             <Badge className={cn("absolute top-2 right-2", isActive ? "bg-red-500" : "bg-green-500")}>
              {isActive ? `In Use: ${formatDuration(session.elapsedSeconds)}` : "Available"}
            </Badge>
        </div>
        <CardHeader className="p-4">
            <CardTitle>{table.name}</CardTitle>
            <CardDescription>{table.category}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-grow">
             <p className="text-sm text-muted-foreground">{isActive ? 'Click to manage session.' : 'Click to start a new session.'}</p>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading Tables...</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
        {filteredTables.map(renderTableCard)}
      </div>
    </>
  );
}
