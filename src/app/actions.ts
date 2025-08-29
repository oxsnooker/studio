"use server";

import { z } from "zod";
import { admins, initialStaff } from "@/lib/data";

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
      const admin = admins.find(
        (a) => a.username === username && a.password === password
      );
      if (admin) {
        return { success: true, message: "Admin login successful", redirect: "/admin" };
      }
    } else if (role === "staff") {
      const staff = initialStaff.find(
        (s) => s.username === username && s.password === password
      );
      if (staff) {
        return { success: true, message: "Staff login successful", redirect: "/staff" };
      }
    }

    return { success: false, message: "Invalid username or password", redirect: "" };
  } catch (error) {
    return { success: false, message: "Invalid input", redirect: "" };
  }
}
