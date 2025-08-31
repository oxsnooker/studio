
"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Table,
  CupSoda,
  Award,
  Users,
  BarChart3,
  Package,
  LogOut,
  User,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from '@/lib/firebase';

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tables", label: "Tables", icon: Table },
  { href: "/admin/menu", label: "Items", icon: CupSoda },
  { href: "/admin/stock", label: "Stock", icon: Package },
  { href: "/admin/memberships", label: "Memberships", icon: Award },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/profile", label: "Profile", icon: User },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [adminName, setAdminName] = useState("Admin User");
  const [adminInitial, setAdminInitial] = useState("A");

   useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if(user) {
            setAdminName(user.displayName || "Admin User");
            setAdminInitial(user.displayName?.[0]?.toUpperCase() || "A");
        }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-6">
        <div className="flex items-center gap-3">
          <Logo className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-semibold font-headline">Club Management</h1>
            <p className="text-sm text-muted-foreground">Admin Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="text-right">
                <p className="font-semibold">{adminName}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
          <Avatar className="h-10 w-10 border">
            <AvatarImage src="https://picsum.photos/100/100" data-ai-hint="male avatar" />
            <AvatarFallback>{adminInitial}</AvatarFallback>
          </Avatar>
           <form action={logout}>
            <Button type="submit" variant="outline" size="icon">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
           </form>
        </div>
      </header>

      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-6">
         <nav className="sticky top-16 z-20 bg-background border-b">
            <div className="flex items-center gap-4 px-4 sm:px-0 overflow-x-auto">
            {navItems.map((item) => (
                <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors text-muted-foreground hover:text-primary whitespace-nowrap",
                    pathname === item.href && "text-primary border-b-2 border-primary"
                )}
                >
                <item.icon className="h-4 w-4" />
                {item.label}
                </Link>
            ))}
            </div>
        </nav>
        <main className="flex-1 p-4 md:p-6 sm:rounded-tl-xl sm:border-l sm:border-t">
            {children}
        </main>
      </div>
    </div>
  );
}
