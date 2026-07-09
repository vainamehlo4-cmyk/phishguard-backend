import { useGetUserDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert, BookOpen, Inbox, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetUserDashboard();

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { riskScore, trainingProgress, pendingEmails, recentActions } = dashboard;
  
  const riskColor = 
    riskScore.level === "high" ? "text-destructive" : 
    riskScore.level === "medium" ? "text-amber-500" : 
    "text-green-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-mono font-bold tracking-tight text-primary">OPERATOR DASHBOARD</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">System status and personal risk metrics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase text-muted-foreground">Risk Score</CardTitle>
            <ShieldAlert className={`h-4 w-4 ${riskColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-mono font-bold ${riskColor}`}>{riskScore.score}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Level: <span className="uppercase">{riskScore.level}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase text-muted-foreground">Pending Sims</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold">{pendingEmails}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">Awaiting your action</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase text-muted-foreground">Training Progress</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold">{trainingProgress.completed} / {trainingProgress.total}</div>
            <Progress 
              value={trainingProgress.total > 0 ? (trainingProgress.completed / trainingProgress.total) * 100 : 0} 
              className="mt-3 h-2" 
            />
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase text-muted-foreground">Vigilance Rating</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-green-500">{riskScore.reportCount}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">Total threats reported</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle className="font-mono text-lg text-primary uppercase">Recent Threat Interceptions</CardTitle>
          <CardDescription className="font-mono text-xs">Your latest interactions with simulated threats.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground font-mono text-sm">
              No recent threat interactions logged.
            </div>
          ) : (
            <div className="space-y-4">
              {recentActions.map(action => (
                <div key={action.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-background/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{action.emailSubject || "Unknown Subject"}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {format(new Date(action.createdAt), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className={`text-xs font-mono px-2 py-1 rounded-full uppercase font-bold
                      ${action.action === "report" ? "bg-green-500/20 text-green-500 border border-green-500/30" : 
                        action.action === "click" ? "bg-destructive/20 text-destructive border border-destructive/30" : 
                        "bg-muted text-muted-foreground border border-border"}
                    `}>
                      {action.action}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
