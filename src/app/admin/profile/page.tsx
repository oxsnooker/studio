
"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/lib/firebase-client";
import { updateAdminProfile } from "./actions";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Invalid email address.").optional(),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<User | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        profileForm.reset({
          name: currentUser.displayName || "",
          email: currentUser.email || "",
        });
      }
    });
    return () => unsubscribe();
  }, [profileForm]);

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = (data) => {
    if (!user) return;
    
    startTransition(async () => {
      try {
        const result = await updateAdminProfile({
          uid: user.uid,
          name: data.name,
        });

        if (result.success) {
          toast({ title: "Success", description: result.message });
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
      }
    });
  };

  const onPasswordSubmit: SubmitHandler<PasswordFormValues> = (data) => {
    if (!user) return;
    
    startTransition(async () => {
      try {
        const result = await updateAdminProfile({
          uid: user.uid,
          password: data.newPassword,
        });

        if (result.success) {
          toast({ title: "Success", description: result.message });
          passwordForm.reset();
        } else {
          toast({ variant: "destructive", title: "Error", description: result.message });
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to change password." });
      }
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Admin Profile</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your display name.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...profileForm.register("name")} />
                {profileForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" {...profileForm.register("email")} disabled />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Choose a new, strong password for your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
                 {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" {...passwordForm.register("confirmPassword")} />
                 {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
