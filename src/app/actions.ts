
'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { cookies } from 'next/headers';

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginInput = z.infer<typeof loginSchema>;

export async function login(
  input: LoginInput
): Promise<{ success: boolean; message: string; role?: string; }> {
  try {
    const { email, password } = loginSchema.parse(input);

    const usersRef = collection(adminDb, "users");
    const q = query(usersRef, where("email", "==", email), where("password", "==", password));
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: "Invalid email or password." };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const role = userData.role;
    const name = userData.name || 'User';

    if (!role) {
      return { success: false, message: "User role not found." };
    }
    
    // Set a simple cookie for logged in state
    cookies().set('auth', JSON.stringify({ uid: userDoc.id, role, name }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
    });

    return { success: true, message: `Welcome ${name}!`, role: role };

  } catch (error: any) {
    console.error("Login Error:", error);
     if (error instanceof z.ZodError) {
        return { success: false, message: "Validation failed." };
    }
    return { success: false, message: "An unexpected error occurred during login." };
  }
}

export async function logout() {
    cookies().delete('auth');
}
