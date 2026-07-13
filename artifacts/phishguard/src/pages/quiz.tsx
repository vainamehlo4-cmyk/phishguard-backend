import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Quiz() {
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(5);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/phishing/submit-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, totalQuestions: total, answers: null }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      toast({ title: 'Quiz submitted', description: 'Your results were saved.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Submission failed', description: 'Could not save quiz results.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Quick Quiz (manual submit)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-mono">Score</label>
              <input type="number" value={score} onChange={(e) => setScore(parseInt(e.target.value || '0'))} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-mono">Total Questions</label>
              <input type="number" value={total} onChange={(e) => setTotal(parseInt(e.target.value || '0'))} className="w-full p-2 border rounded" />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={loading}>
                Submit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
