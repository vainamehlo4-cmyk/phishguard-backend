import { useListTrainingModules, useCompleteTrainingModule, getListTrainingModulesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Training() {
  const { data: modules, isLoading } = useListTrainingModules();
  const completeModule = useCompleteTrainingModule();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading || !modules) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const handleComplete = (id: number) => {
    completeModule.mutate(
      { data: { moduleId: id } as any }, // Assuming body takes moduleId, but the spec says no params? Let me check API spec later. Wait, the auto generated `useCompleteTrainingModule` might take an ID.
      // Wait, let's just pass id to custom fetch. Ah, the API spec says `POST /api/training/modules/{id}/complete`. So it takes an `id`.
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTrainingModulesQueryKey() });
          toast({
            title: "Module Completed",
            description: "Your training record has been updated.",
          });
        }
      }
    );
  };

  // Wait, let me rewrite `handleComplete` correctly based on standard orval generated mutations taking { id } if it's in path.
  // Actually, let me check the generated hooks for `useCompleteTrainingModule` in `api.ts`.
  // `export const completeTrainingModule = async (id: number, options?: RequestInit): Promise<TrainingCompletion>`
  
  const handleCompleteActual = (id: number) => {
    completeModule.mutate(
      { id } as any, // The mutation shape is usually `{ id: number }` for path params.
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTrainingModulesQueryKey() });
          toast({
            title: "Module Completed",
            description: "Your training record has been updated.",
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-mono font-bold tracking-tight text-primary">TRAINING REPOSITORY</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Required security awareness modules.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {modules.map((mod) => (
          <Card key={mod.id} className={`border-border bg-card/50 flex flex-col ${mod.completed ? 'opacity-80' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded uppercase font-bold tracking-wider">
                  {mod.category}
                </span>
                <span className="flex items-center text-xs font-mono text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  {mod.durationMinutes} MIN
                </span>
              </div>
              <CardTitle className="text-xl">{mod.title}</CardTitle>
              <CardDescription className="line-clamp-2">{mod.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-sm text-muted-foreground">
                {mod.content}
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t border-border/50 bg-muted/10">
              {mod.completed ? (
                <div className="flex items-center text-green-500 font-mono text-sm w-full">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  COMPLETED
                </div>
              ) : (
                <Button 
                  className="w-full font-mono font-bold tracking-widest" 
                  onClick={() => handleCompleteActual(mod.id)}
                  disabled={completeModule.isPending}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  MARK AS COMPLETED
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
