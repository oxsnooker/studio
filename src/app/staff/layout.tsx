
"use client";
import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logout } from "@/app/actions";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from '@/lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, setUserName] = useState("Staff Member");
  const [userInitial, setUserInitial] = useState("S");

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if(user) {
            // Fetch user details from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setUserName(userData.name || "Staff");
                setUserInitial(userData.name?.[0]?.toUpperCase() || "S");
            } else {
                 setUserName(user.displayName || "Staff");
                 setUserInitial(user.displayName?.[0]?.toUpperCase() || "S");
            }
        }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/5">
      <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 no-print z-10">
          <Link
            href="/staff"
            className="flex items-center gap-2 text-xl font-bold font-headline text-primary"
          >
            THE OX SNOOKER
          </Link>
        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="font-semibold">{userName}</p>
              <p className="text-xs text-muted-foreground">Staff</p>
            </div>
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://picsum.photos/100/100" data-ai-hint="male avatar" />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
           <form action={logout}>
             <Button type="submit" variant="outline" size="icon">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
           </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}
