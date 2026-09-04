import { useCallback, useEffect, useState } from "react";
import { Play, RefreshCw, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createApplicant,
  listApplicants,
  runWaterfall,
  seed,
  type Applicant,
  type Session,
} from "@/lib/api";
import { num, str } from "@/lib/format";

const BLANK = { full_name: "", country: "", identity_score: "85", risk_score: "30", watchlist_flag: false };

export function Applicants({
  session,
  onDecision,
}: {
  session: Session;
  onDecision: (decisionId: number) => void;
}) {
  const role = str(session.role);
  const canWrite = role === "analyst" || role === "admin";

  const [rows, setRows] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows((await listApplicants()) as Applicant[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createApplicant({
        full_name: form.full_name,
        country: form.country,
        identity_score: num(form.identity_score),
        risk_score: num(form.risk_score),
        watchlist_flag: form.watchlist_flag,
      });
      setForm({ ...BLANK });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function run(id: number) {
    setRunning(id);
    setError(null);
    try {
      const decision = await runWaterfall(id);
      onDecision(num((decision as { id?: unknown }).id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(null);
    }
  }

  async function reset() {
    setResetting(true);
    setError(null);
    try {
      await seed();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Applicants</CardTitle>
            <CardDescription>Every channel submits applicants here, then runs the same governed waterfall.</CardDescription>
          </div>
          {canWrite && (
            <Button variant="outline" size="sm" disabled={resetting} onClick={reset}>
              <RefreshCw className={resetting ? "animate-spin" : ""} />
              Reset demo data
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead className="text-right">Identity</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                  <TableHead className="text-center">Watchlist</TableHead>
                  <TableHead className="text-right">Run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No applicants yet.{canWrite ? " Submit one, or reset the demo data." : ""}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((a) => {
                    const id = num((a as { id?: unknown }).id);
                    return (
                      <TableRow key={id}>
                        <TableCell>
                          <div className="font-medium">{str(a.full_name)}</div>
                          <div className="text-xs text-muted-foreground">{str(a.country)}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{num(a.identity_score)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(a.risk_score)}</TableCell>
                        <TableCell className="text-center">
                          {a.watchlist_flag ? (
                            <span className="text-red-600 dark:text-red-400">Hit</span>
                          ) : (
                            <span className="text-muted-foreground">Clear</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!canWrite || running !== null}
                            title={canWrite ? "Run the waterfall" : "Analyst or admin only"}
                            onClick={() => run(id)}
                          >
                            <Play />
                            {running === id ? "Running…" : "Run"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="size-5" /> New applicant
          </CardTitle>
          <CardDescription>
            {canWrite ? "Scores are on a 0–100 scale." : "Signed in as viewer — submitting is analyst or admin only."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <fieldset className="space-y-4" disabled={!canWrite || submitting}>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jordan Rivera" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="US" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="identity_score">Identity score</Label>
                  <Input id="identity_score" type="number" min={0} max={100} step="0.1" required value={form.identity_score} onChange={(e) => setForm({ ...form, identity_score: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="risk_score">Risk score</Label>
                  <Input id="risk_score" type="number" min={0} max={100} step="0.1" required value={form.risk_score} onChange={(e) => setForm({ ...form, risk_score: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="watchlist_flag" checked={form.watchlist_flag} onCheckedChange={(c) => setForm({ ...form, watchlist_flag: c === true })} />
                <Label htmlFor="watchlist_flag">Watchlist hit</Label>
              </div>
              <Button type="submit" className="w-full">
                {submitting ? "Submitting…" : "Submit applicant"}
              </Button>
            </fieldset>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
