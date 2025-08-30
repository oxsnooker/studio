
"use server";

import { z } from "zod";
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Admin, Staff } from '@/lib/types';


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
      // Hardcoded admin password check
      if (password === "Teamox76@=172089") {
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
      const staff = querySnapshot.docs[0].data() as Staff;
      // In a real app, passwords should be hashed.
       if (staff.password === password) {
         return { success: true, message: "Staff login successful.", role: "staff" };
      }
    }

    return { success: false, message: "Invalid username or password" };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, message: "An unexpected error occurred during login." };
  }
}

export async function logout() {
    // This would typically handle session clearing.
    // For now, we'll just simulate a logout for client-side redirection.
    return { success: true, message: "Logged out." };
}
