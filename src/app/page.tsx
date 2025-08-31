
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { login } from "@/app/actions";
import { Logo } from "@/components/logo";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


const staffFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.literal("staff", { required_error: "Role is required" }),
});

const adminFormSchema = z.object({
    password: z.string().min(1, "Password is required"),
    role: z.literal("admin", { required_error: "Role is required" }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);

  const staffForm = useForm<z.infer<typeof staffFormSchema>>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "staff",
    },
  });
  
  const adminForm = useForm<z.infer<typeof adminFormSchema>>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
        password: "",
        role: "admin",
    },
  });

  const onStaffSubmit = (values: z.infer<typeof staffFormSchema>) => {
    startTransition(async () => {
      const result = await login(values);
      if (result.success) {
        toast({
            title: "Login Successful",
            description: "Redirecting to staff dashboard...",
        });
        router.push('/staff');
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: result.message,
        });
        staffForm.reset();
      }
    });
  };

  const onAdminSubmit = (values: z.infer<typeof adminFormSchema>) => {
    startTransition(async () => {
        const result = await login(values);
        if (result.success) {
             toast({
                title: "Login Successful",
                description: "Redirecting to admin dashboard...",
            });
            router.push('/admin');
        } else {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: result.message,
            });
            adminForm.reset();
        }
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="flex flex-col items-center justify-center space-y-4 mb-8">
        <Logo className="w-16 h-16" />
        <h1 className="text-3xl font-headline font-bold">THE OX SNOOKER</h1>
        <p className="text-muted-foreground">Club Management System</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Staff Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the staff dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit(onStaffSubmit)} className="space-y-4">
              <FormField
                control={staffForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., staff01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={staffForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login as Staff
              </Button>
            </form>
          </Form>
          <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-sm text-muted-foreground">
                OR
              </span>
          </div>
           <Button onClick={() => setIsAdminDialogOpen(true)} variant="secondary" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Go to Admin Panel
          </Button>
        </CardContent>
      </Card>

        {/* Admin Password Dialog */}
        <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
            <DialogContent>
                <Form {...adminForm}>
                    <form onSubmit={adminForm.handleSubmit(onAdminSubmit)}>
                        <DialogHeader>
                            <DialogTitle>Admin Access</DialogTitle>
                            <DialogDescription>
                                Please enter the administrator password to continue.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                             <FormField
                                control={adminForm.control}
                                name="password"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAdminDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Login
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </main>
  );
}
