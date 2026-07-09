import { useState } from "react";
import { useListPhishingEmails, useRecordPhishingAction, getListPhishingEmailsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Mail, AlertTriangle, ShieldCheck, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Inbox() {
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const { data: emails, isLoading } = useListPhishingEmails();
  const recordAction = useRecordPhishingAction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading || !emails) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-[500px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  const handleAction = (emailId: number, action: "click" | "report" | "ignore") => {
    recordAction.mutate(
      { id: emailId, data: { action } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPhishingEmailsQueryKey() });
          
          if (action === "click") {
            toast({
              variant: "destructive",
              title: "Security Breach Simulated",
              description: "You clicked a simulated malicious link. Please review your training.",
            });
          } else if (action === "report") {
            toast({
              title: "Threat Neutralized",
              description: "Good job identifying and reporting the threat.",
            });
          }
        }
      }
    );
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-mono font-bold tracking-tight text-primary">SIMULATED INBOX</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Review intercepted communications and take action.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Email List */}
        <Card className="col-span-1 border-border bg-card/50 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="font-mono text-sm uppercase text-muted-foreground font-semibold">Incoming Messages ({emails.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {emails.length === 0 ? (
              <div className="p-4 text-center text-sm font-mono text-muted-foreground">
                Inbox clear. No threats detected.
              </div>
            ) : (
              emails.map((email) => (
                <div 
                  key={email.id} 
                  className={`p-4 rounded-md cursor-pointer border transition-colors ${selectedEmailId === email.id ? 'bg-primary/10 border-primary/50' : 'bg-background hover:bg-muted/50 border-border'}`}
                  onClick={() => setSelectedEmailId(email.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm truncate pr-2">{email.sender}</span>
                    <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {format(new Date(email.sentAt), "MMM d")}
                    </span>
                  </div>
                  <div className="text-sm font-medium truncate mb-1">{email.subject}</div>
                  <div className="text-xs text-muted-foreground truncate">{email.previewText}</div>
                  
                  {email.myAction && (
                    <div className="mt-2 flex items-center">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold
                        ${email.myAction === "report" ? "bg-green-500/20 text-green-500 border border-green-500/30" : 
                          email.myAction === "click" ? "bg-destructive/20 text-destructive border border-destructive/30" : 
                          "bg-muted text-muted-foreground border border-border"}
                      `}>
                        {email.myAction}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Email Content */}
        <Card className="col-span-2 border-border bg-card/50 flex flex-col h-full overflow-hidden">
          {selectedEmail ? (
            <>
              <div className="p-6 border-b border-border bg-muted/10 space-y-4">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold">{selectedEmail.subject}</h2>
                  <span className="text-sm text-muted-foreground font-mono">
                    {format(new Date(selectedEmail.sentAt), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-mono text-muted-foreground mr-2">From:</span>
                  <span className="font-medium">{selectedEmail.sender}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-mono text-muted-foreground mr-2">To:</span>
                  <span className="font-medium text-muted-foreground">you@organization.local</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#0f1115] text-slate-800 dark:text-slate-200">
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap font-sans">
                  {selectedEmail.body || selectedEmail.previewText}
                </div>
              </div>
              
              <div className="p-4 border-t border-border bg-muted/20 flex gap-3 justify-end items-center">
                {selectedEmail.myAction ? (
                  <div className="font-mono text-sm text-muted-foreground flex items-center">
                    Action recorded: <span className="ml-2 font-bold uppercase">{selectedEmail.myAction}</span>
                  </div>
                ) : (
                  <>
                    <span className="font-mono text-xs text-muted-foreground uppercase mr-auto flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                      Take Action
                    </span>
                    <Button 
                      variant="outline" 
                      onClick={() => handleAction(selectedEmail.id, "ignore")}
                      disabled={recordAction.isPending}
                      className="font-mono"
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      Ignore
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleAction(selectedEmail.id, "click")}
                      disabled={recordAction.isPending}
                      className="font-mono"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Click Link (Fail)
                    </Button>
                    <Button 
                      variant="default" 
                      onClick={() => handleAction(selectedEmail.id, "report")}
                      disabled={recordAction.isPending}
                      className="font-mono bg-green-600 text-white hover:bg-green-700"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Report Threat
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <Mail className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-mono text-sm">Select a message from the queue to inspect payload.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
