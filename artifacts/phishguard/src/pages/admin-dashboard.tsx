import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Send, MousePointerClick, ShieldCheck, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: dashboard, isLoading } = useGetAdminDashboard();

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
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  const { totalUsers, highRiskCount, mediumRiskCount, lowRiskCount, totalSimulations, totalClicks, totalReports, totalIgnores, recentActions, riskDistribution } = dashboard;

  const COLORS = {
    high: "hsl(var(--destructive))",
    medium: "hsl(43 100% 50%)",
    low: "hsl(152 69% 45%)"
  };

  const chartData = riskDistribution.map(d => ({
    name: d.level.toUpperCase(),
    value: d.count,
    color: d.level === "high" ? COLORS.high : d.level === "medium" ? COLORS.medium : COLORS.low
  }));

  const clickRate = totalSimulations > 0 ? Math.round((totalClicks / totalSimulations) * 100) : 0;
  const reportRate = totalSimulations > 0 ? Math.round((totalReports / totalSimulations) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-mono font-bold tracking-tight text-primary">COMMAND CENTER</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Organization-wide security posture and risk metrics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase text-muted-foreground">Total Personnel</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-primary">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase text-muted-foreground">High Risk Operators</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-destructive">{highRiskCount}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">Require immediate training</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase text-muted-foreground">Total Sims Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold">{totalSimulations}</div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono font-medium uppercase text-muted-foreground">Org Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-amber-500">{clickRate}%</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">Target: &lt; 5%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="font-mono text-lg text-primary uppercase">Risk Distribution</CardTitle>
            <CardDescription className="font-mono text-xs">Organization-wide breakdown.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontFamily: 'var(--font-mono)' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="font-mono text-lg text-primary uppercase">Live Action Feed</CardTitle>
            <CardDescription className="font-mono text-xs">Recent operator interactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {recentActions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground font-mono text-sm">
                  No recent activity logged.
                </div>
              ) : (
                recentActions.map(action => (
                  <div key={action.id} className="flex items-center justify-between p-3 border border-border/50 rounded bg-background/50">
                    <div className="space-y-1">
                      <p className="text-sm font-medium"><span className="text-primary">{action.username}</span> {action.action === 'click' ? 'failed' : action.action === 'report' ? 'reported' : 'ignored'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{action.emailSubject}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {format(new Date(action.createdAt), "MMM d, HH:mm")}
                      </p>
                    </div>
                    <div>
                      <span className={`text-xs font-mono px-2 py-1 rounded-full uppercase font-bold
                        ${action.action === "report" ? "bg-green-500/20 text-green-500 border border-green-500/30" : 
                          action.action === "click" ? "bg-destructive/20 text-destructive border border-destructive/30" : 
                          "bg-muted text-muted-foreground border border-border"}
                      `}>
                        {action.action}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
