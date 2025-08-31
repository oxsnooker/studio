
"use server";

import { z } from "zod";
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createSession, deleteSession } from '@/app/session';

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

    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user) {
        return { success: false, message: "Login failed. Please try again." };
    }

    // Get user's custom claims (role) from Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
       // This case should ideally not happen if user creation is handled properly
       return { success: false, message: "User role not found." };
    }
    
    const userData = userDoc.data();
    const role = userData?.role;
    const displayName = userData?.name || user.displayName;

    if (!role) {
        return { success: false, message: "User role not found." };
    }

    // Create session cookie
    const idToken = await user.getIdToken();
    await createSession(idToken);
    
    return { success: true, message: `Welcome ${displayName}!`, role: role };

  } catch (error: any) {
    console.error("Login Error:", error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        return { success: false, message: "Invalid email or password." };
    }
    if (error instanceof z.ZodError) {
        return { success: false, message: "Validation failed." };
    }
    return { success: false, message: "An unexpected error occurred during login." };
  }
}


export async function logout() {
    await deleteSession();
}
