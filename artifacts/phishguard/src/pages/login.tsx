import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ShieldAlert, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      setLocation(user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, setLocation]);

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    // Debug: confirm what RHF + Zod produced at submit time
    console.debug("[login] submit values:", {
      username: values.username,
      passwordLength: values.password?.length,
    });

    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (result) => {
          login(result.token);
          toast({
            title: "Access Granted",
            description: `Welcome back, ${result.user.username}.`,
          });
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: err.message || "Invalid credentials.",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Cyberpunk background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>

      <div className="w-full max-w-md bg-card border border-border p-8 rounded-lg shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/30">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-mono font-bold tracking-tight text-primary">PHISHGUARD</h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            SECURE ACCESS PORTAL
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Operator ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter username" {...field} className="font-mono bg-background border-border focus-visible:ring-primary focus-visible:border-primary" />
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
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Access Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="font-mono bg-background border-border focus-visible:ring-primary focus-visible:border-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full font-mono font-bold tracking-widest" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "AUTHENTICATING..." : "INITIALIZE LOGIN"}
            </Button>
          </form>
        </Form>
        
        <div className="mt-8 text-center text-xs text-muted-foreground font-mono">
          <p>Demo credentials:</p>
          <p className="mt-1">Admin: admin / admin123</p>
          <p>User: veemehlo / 1234</p>
        </div>
      </div>
    </div>
  );
}
