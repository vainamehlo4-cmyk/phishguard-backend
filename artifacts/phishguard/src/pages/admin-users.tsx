import { useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function AdminUsers() {
  const { data: users, isLoading } = useListUsers();
  const [search, setSearch] = useState("");

  if (isLoading || !users) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(search.toLowerCase()) || 
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    (user.department && user.department.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-mono font-bold tracking-tight text-primary">PERSONNEL RISK</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Detailed risk analysis by operator.</p>
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
          <div className="space-y-1">
            <CardTitle className="font-mono text-lg text-primary uppercase">Risk Directory</CardTitle>
            <CardDescription className="font-mono text-xs">Search and filter organization members.</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search operators..."
              className="pl-9 font-mono bg-background border-border focus-visible:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="border-border">
                <TableHead className="font-mono uppercase text-xs">Operator</TableHead>
                <TableHead className="font-mono uppercase text-xs">Department</TableHead>
                <TableHead className="font-mono uppercase text-xs">Risk Score</TableHead>
                <TableHead className="font-mono uppercase text-xs">Level</TableHead>
                <TableHead className="font-mono uppercase text-xs">Stats (C/R/I)</TableHead>
                <TableHead className="font-mono uppercase text-xs">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono text-sm">
                    No operators found matching query.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-border/50 hover:bg-muted/10">
                    <TableCell>
                      <div className="font-medium text-foreground">{user.username}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{user.department || "-"}</TableCell>
                    <TableCell className="font-mono font-bold">
                      {user.riskScore}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-mono px-2 py-1 rounded-full uppercase font-bold
                        ${user.riskLevel === "low" ? "bg-green-500/20 text-green-500 border border-green-500/30" : 
                          user.riskLevel === "high" ? "bg-destructive/20 text-destructive border border-destructive/30" : 
                          "bg-amber-500/20 text-amber-500 border border-amber-500/30"}
                      `}>
                        {user.riskLevel}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <span className="text-destructive">{user.clickCount}</span> / <span className="text-green-500">{user.reportCount}</span> / <span>{user.ignoreCount}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {format(new Date(user.createdAt), "MMM yyyy")}
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
