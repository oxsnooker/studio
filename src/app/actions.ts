
"use server";

import { z } from "zod";
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Admin, Staff } from '@/lib/types';

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
  role: z.enum(["admin", "staff"]),
});

type LoginInput = z.infer<typeof loginSchema>;

export async function login(
  input: LoginInput
): Promise<{ success: boolean; message: string; redirect: string }> {
  try {
    const { username, password, role } = loginSchema.parse(input);

    if (role === "admin") {
      const q = query(collection(db, "admins"), where("username", "==", username));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return { success: false, message: "Invalid username or password", redirect: "" };
      }
      const admin = querySnapshot.docs[0].data() as Admin;
      // In a real app, passwords should be hashed. This is a simple comparison for demonstration.
      if (admin.password === password) {
        return { success: true, message: "Admin login successful", redirect: "/admin" };
      }
    } else if (role === "staff") {
      const q = query(collection(db, "staff"), where("username", "==", username));
       const querySnapshot = await getDocs(q);
       if (querySnapshot.empty) {
        return { success: false, message: "Invalid username or password", redirect: "" };
      }
      const staff = querySnapshot.docs[0].data() as Staff;
      // In a real app, passwords should be hashed.
       if (staff.password === password) {
        return { success: true, message: "Staff login successful", redirect: "/staff" };
      }
    }

    return { success: false, message: "Invalid username or password", redirect: "" };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, message: "An unexpected error occurred during login.", redirect: "" };
  }
}
