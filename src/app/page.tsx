
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

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.literal("staff", { required_error: "Role is required" }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "staff",
    },
  });

  const onStaffSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      const result = await login(values);
      if (result.success) {
        toast({
          title: "Login Successful",
          description: `Welcome, ${values.username}!`,
        });
        router.push(result.redirect);
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: result.message,
        });
        form.reset();
      }
    });
  };

  const onAdminLogin = () => {
    startTransition(async () => {
        const result = await login({ role: "admin" });
        if (result.success) {
            router.push(result.redirect);
        } else {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: result.message,
            });
        }
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="flex flex-col items-center justify-center space-y-4 mb-8">
        <Logo className="w-16 h-16" />
        <h1 className="text-3xl font-headline font-bold">CueBook</h1>
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onStaffSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
           <Button onClick={onAdminLogin} variant="secondary" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Go to Admin Panel
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
