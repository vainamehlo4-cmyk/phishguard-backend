import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListCampaigns,
  getListCampaignsQueryKey,
  useCreateCampaign,
  useLaunchCampaign,
  useCancelCampaign,
  useListPhishingEmails,
  Campaign,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarClock,
  Plus,
  Rocket,
  XCircle,
  Mail,
  Building2,
  Clock,
} from "lucide-react";

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
  targetDepartment: z.string().optional(),
  scheduledAt: z.string().min(1, "Schedule date is required"),
});

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    scheduled: { label: "SCHEDULED", className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
    active: { label: "ACTIVE", className: "bg-green-500/10 text-green-400 border-green-500/30" },
    completed: { label: "COMPLETED", className: "bg-muted text-muted-foreground border-border" },
    cancelled: { label: "CANCELLED", className: "bg-red-500/10 text-red-400 border-red-500/30" },
  };
  const s = map[status] ?? { label: status.toUpperCase(), className: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono ${s.className}`}>
      {s.label}
    </span>
  );
}

function CreateCampaignDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createMutation = useCreateCampaign();
  const { data: emails } = useListPhishingEmails();

  const form = useForm<z.infer<typeof campaignSchema>>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { name: "", description: "", targetDepartment: "", scheduledAt: "" },
  });

  const onSubmit = (values: z.infer<typeof campaignSchema>) => {
    createMutation.mutate(
      {
        data: {
          name: values.name,
          description: values.description ?? "",
          targetDepartment: values.targetDepartment || undefined,
          scheduledAt: new Date(values.scheduledAt).toISOString(),
          emailIds: emails?.map((e) => e.id) ?? [],
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Campaign created", description: `"${values.name}" has been scheduled.` });
          form.reset();
          setOpen(false);
          onCreated();
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err.message });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-mono gap-2" data-testid="button-create-campaign">
          <Plus className="w-4 h-4" />
          SCHEDULE CAMPAIGN
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary">DEPLOY CAMPAIGN</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Campaign Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Q1 Awareness Wave" {...field} className="font-mono bg-background border-border focus-visible:ring-primary" data-testid="input-campaign-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional description" {...field} className="font-mono bg-background border-border focus-visible:ring-primary" data-testid="input-campaign-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetDepartment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Target Department (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="font-mono bg-background border-border focus:ring-primary" data-testid="select-target-department">
                        <SelectValue placeholder="All departments" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All departments</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Schedule Date & Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} className="font-mono bg-background border-border focus-visible:ring-primary" data-testid="input-scheduled-at" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="bg-background/50 border border-border rounded p-3 text-xs font-mono text-muted-foreground">
              <span className="text-primary">NOTE:</span> Campaign will include all {emails?.length ?? 0} available phishing simulations.
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="font-mono">
                CANCEL
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="font-mono" data-testid="button-submit-campaign">
                {createMutation.isPending ? "DEPLOYING..." : "DEPLOY"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CampaignCard({ campaign, onRefresh }: { campaign: Campaign; onRefresh: () => void }) {
  const { toast } = useToast();
  const launchMutation = useLaunchCampaign();
  const cancelMutation = useCancelCampaign();

  const handleLaunch = () => {
    launchMutation.mutate(
      { id: campaign.id },
      {
        onSuccess: () => {
          toast({ title: "Campaign launched", description: `"${campaign.name}" is now active.` });
          onRefresh();
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err.message });
        },
      }
    );
  };

  const handleCancel = () => {
    cancelMutation.mutate(
      { id: campaign.id },
      {
        onSuccess: () => {
          toast({ title: "Campaign cancelled", description: `"${campaign.name}" has been cancelled.` });
          onRefresh();
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err.message });
        },
      }
    );
  };

  const scheduled = new Date(campaign.scheduledAt);

  return (
    <div className="bg-card border border-border rounded-lg p-5 hover:border-primary/40 transition-colors" data-testid={`card-campaign-${campaign.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {statusBadge(campaign.status)}
            <h3 className="font-mono font-semibold text-foreground truncate" data-testid={`text-campaign-name-${campaign.id}`}>{campaign.name}</h3>
          </div>
          {campaign.description && (
            <p className="text-sm text-muted-foreground mb-3">{campaign.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary/60" />
              {campaign.emailCount} simulations
            </span>
            {campaign.targetDepartment && campaign.targetDepartment !== "all" && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary/60" />
                {campaign.targetDepartment}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary/60" />
              {scheduled.toLocaleString()}
            </span>
            {campaign.createdByName && (
              <span className="text-muted-foreground/60">by {campaign.createdByName}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {campaign.status === "scheduled" && (
            <>
              <Button
                size="sm"
                onClick={handleLaunch}
                disabled={launchMutation.isPending}
                className="font-mono text-xs gap-1"
                data-testid={`button-launch-campaign-${campaign.id}`}
              >
                <Rocket className="w-3.5 h-3.5" />
                LAUNCH
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="font-mono text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                data-testid={`button-cancel-campaign-${campaign.id}`}
              >
                <XCircle className="w-3.5 h-3.5" />
                CANCEL
              </Button>
            </>
          )}
          {campaign.status === "active" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="font-mono text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
              data-testid={`button-cancel-active-campaign-${campaign.id}`}
            >
              <XCircle className="w-3.5 h-3.5" />
              STOP
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminCampaigns() {
  const queryClient = useQueryClient();
  const { data: campaigns, isLoading } = useListCampaigns();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
  };

  const activeCampaigns = campaigns?.filter((c) => c.status === "active") ?? [];
  const scheduledCampaigns = campaigns?.filter((c) => c.status === "scheduled") ?? [];
  const pastCampaigns = campaigns?.filter((c) => ["completed", "cancelled"].includes(c.status)) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-primary tracking-tight">CAMPAIGN SCHEDULER</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">Plan and deploy automated phishing awareness waves</p>
        </div>
        <CreateCampaignDialog onCreated={refresh} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "ACTIVE", value: activeCampaigns.length, color: "text-green-400" },
          { label: "SCHEDULED", value: scheduledCampaigns.length, color: "text-cyan-400" },
          { label: "TOTAL", value: campaigns?.length ?? 0, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-4 text-center">
            <div className={`text-3xl font-mono font-bold ${stat.color}`} data-testid={`stat-${stat.label.toLowerCase()}`}>{stat.value}</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      )}

      {!isLoading && campaigns?.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarClock className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-mono text-sm">NO CAMPAIGNS DEPLOYED</p>
          <p className="text-xs mt-1">Schedule your first phishing awareness wave</p>
        </div>
      )}

      {activeCampaigns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-mono text-green-400 uppercase tracking-widest">Active</h2>
          {activeCampaigns.map((c) => <CampaignCard key={c.id} campaign={c} onRefresh={refresh} />)}
        </div>
      )}

      {scheduledCampaigns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Scheduled</h2>
          {scheduledCampaigns.map((c) => <CampaignCard key={c.id} campaign={c} onRefresh={refresh} />)}
        </div>
      )}

      {pastCampaigns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Past Campaigns</h2>
          {pastCampaigns.map((c) => <CampaignCard key={c.id} campaign={c} onRefresh={refresh} />)}
        </div>
      )}
    </div>
  );
}
