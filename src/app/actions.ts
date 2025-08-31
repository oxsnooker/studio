
"use server";

import { z } from "zod";
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Staff } from '@/lib/types';
import { createSession } from "@/app/session";

const loginSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  role: z.enum(["admin", "staff"]),
});

type LoginInput = z.infer<typeof loginSchema>;

export async function login(
  input: LoginInput
): Promise<{ success: boolean; message: string; role?: string; }> {
  try {
    const { username, password, role } = loginSchema.parse(input);

    if (role === "admin") {
      if (password === "Teamox76@=172089") {
        await createSession({ role: 'admin' });
        return { success: true, message: "Admin login successful.", role: "admin" };
      }
      return { success: false, message: "Invalid Admin Password." };
    } 
    
    if (role === "staff") {
      if (!username || !password) {
        return { success: false, message: "Username and password are required for staff login." };
      }
      const q = query(collection(db, "staff"), where("username", "==", username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, message: "Invalid username or password" };
      }
      
      const staffDoc = querySnapshot.docs[0];
      const staff = staffDoc.data() as Staff;
      
      if (staff.password === password) {
         await createSession({ role: 'staff', username: staff.username, name: staff.name });
         return { success: true, message: "Staff login successful.", role: "staff" };
      }
    }

    return { success: false, message: "Invalid username or password" };
  } catch (error) {
    console.error("Login Error:", error);
    if (error instanceof z.ZodError) {
        return { success: false, message: "Validation failed." };
    }
    return { success: false, message: "An unexpected error occurred during login." };
  }
}

