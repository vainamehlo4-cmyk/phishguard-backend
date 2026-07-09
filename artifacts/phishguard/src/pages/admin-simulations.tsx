import { useListPhishingEmails, useCreatePhishingEmail, getListPhishingEmailsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Send, PlusCircle } from "lucide-react";

const simSchema = z.object({
  subject: z.string().min(1, "Subject required"),
  sender: z.string().min(1, "Sender required").email("Must be a valid email format"),
  previewText: z.string().min(1, "Preview text required"),
  body: z.string().min(1, "Body required"),
  difficulty: z.enum(["easy", "medium", "hard"])
});

export default function AdminSimulations() {
  const { data: emails, isLoading } = useListPhishingEmails();
  const createSim = useCreatePhishingEmail();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof simSchema>>({
    resolver: zodResolver(simSchema),
    defaultValues: {
      subject: "",
      sender: "",
      previewText: "",
      body: "",
      difficulty: "easy"
    }
  });

  const onSubmit = (values: z.infer<typeof simSchema>) => {
    createSim.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPhishingEmailsQueryKey() });
          setOpen(false);
          form.reset();
          toast({
            title: "Simulation Deployed",
            description: "Phishing simulation has been broadcast to all operators.",
          });
        }
      }
    );
  };

  if (isLoading || !emails) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-mono font-bold tracking-tight text-primary">SIMULATION CONTROL</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Manage and deploy phishing tests.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono font-bold tracking-widest">
              <PlusCircle className="w-4 h-4 mr-2" />
              NEW DEPLOYMENT
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-mono text-primary uppercase text-xl">Deploy Simulation</DialogTitle>
              <DialogDescription className="font-mono text-xs">Configure payload parameters for the next organizational test.</DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Spoofed Sender</FormLabel>
                        <FormControl>
                          <Input placeholder="it-support@org.local" {...field} className="font-mono bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Difficulty Rating</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="font-mono bg-background">
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Subject Line</FormLabel>
                      <FormControl>
                        <Input placeholder="URGENT: Password Reset Required" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="previewText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Preview Snippet</FormLabel>
                      <FormControl>
                        <Input placeholder="Please reset your password immediately..." {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Payload Body</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Email content goes here..." {...field} className="h-32 bg-background font-sans" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button type="submit" disabled={createSim.isPending} className="font-mono font-bold tracking-widest">
                    {createSim.isPending ? "TRANSMITTING..." : (
                      <><Send className="w-4 h-4 mr-2" /> EXECUTE DEPLOYMENT</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="font-mono text-lg text-primary uppercase">Deployment History</CardTitle>
          <CardDescription className="font-mono text-xs">Previously executed organizational tests.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="border-border">
                <TableHead className="font-mono uppercase text-xs">Subject</TableHead>
                <TableHead className="font-mono uppercase text-xs">Sender</TableHead>
                <TableHead className="font-mono uppercase text-xs">Difficulty</TableHead>
                <TableHead className="font-mono uppercase text-xs text-right">Deployed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground font-mono text-sm">
                    No simulations have been deployed.
                  </TableCell>
                </TableRow>
              ) : (
                emails.map((email) => (
                  <TableRow key={email.id} className="border-border/50 hover:bg-muted/10">
                    <TableCell className="font-medium">{email.subject}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{email.sender}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-mono px-2 py-1 rounded-full uppercase font-bold
                        ${email.difficulty === "easy" ? "bg-green-500/20 text-green-500 border border-green-500/30" : 
                          email.difficulty === "hard" ? "bg-destructive/20 text-destructive border border-destructive/30" : 
                          "bg-amber-500/20 text-amber-500 border border-amber-500/30"}
                      `}>
                        {email.difficulty}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono text-right">
                      {format(new Date(email.sentAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
