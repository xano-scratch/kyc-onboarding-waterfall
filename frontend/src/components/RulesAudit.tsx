import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Pencil, ScrollText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OutcomeBadge, CodePill } from "@/components/status";
import {
  editStage,
  listApplicants,
  listDecisions,
  listStages,
  type Applicant,
  type Decision,
  type Session,
  type Stage,
} from "@/lib/api";
import { fmtTime, num, str } from "@/lib/format";

type Draft = { threshold: string; outcome_on_fire: string; stage_order: string; active: boolean };

export function RulesAudit({
  session,
  onDecision,
}: {
  session: Session;
  onDecision: (decisionId: number) => void;
}) {
  const isAdmin = str(session.role) === "admin";

  const [stages, setStages] = useState<Stage[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({ threshold: "0", outcome_on_fire: "refer", stage_order: "0", active: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, d, a] = await Promise.all([listStages(), listDecisions(), listApplicants()]);
      setStages(s as Stage[]);
      setDecisions(d as Decision[]);
      setApplicants(a as Applicant[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currentVersion = useMemo(
    () => stages.filter((s) => Boolean(s.active)).reduce((m, s) => Math.max(m, num(s.ruleset_version)), 0),
    [stages],
  );

  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const a of applicants) map.set(num((a as { id?: unknown }).id), str(a.full_name));
    return map;
  }, [applicants]);

  function startEdit(stage: Stage) {
    setEditingId(num((stage as { id?: unknown }).id));
    setDraft({
      threshold: String(num(stage.threshold)),
      outcome_on_fire: str(stage.outcome_on_fire) || "refer",
      stage_order: String(num(stage.stage_order)),
      active: Boolean(stage.active),
    });
  }

  async function save(id: number) {
    setSaving(true);
    setError(null);
    try {
      await editStage({
        id,
        threshold: num(draft.threshold),
        outcome_on_fire: draft.outcome_on_fire as "refer" | "decline",
        stage_order: num(draft.stage_order),
        active: draft.active,
      });
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="size-5" /> Rule set
            </CardTitle>
            <CardDescription>
              One ordered, versioned set of stages every channel shares. The waterfall stops at the first that fires.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">Current version v{currentVersion}</Badge>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-center">Order</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-center">Version</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  {isAdmin && <TableHead className="text-right">Edit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : (
                  stages.map((stage) => {
                    const id = num((stage as { id?: unknown }).id);
                    const editing = editingId === id;
                    const isTrue = str(stage.operator) === "is_true";
                    return (
                      <TableRow key={id} className={stage.active ? "" : "opacity-55"}>
                        <TableCell className="text-center">
                          {editing ? (
                            <Input className="h-8 w-16" type="number" value={draft.stage_order} onChange={(e) => setDraft({ ...draft, stage_order: e.target.value })} />
                          ) : (
                            <span className="tabular-nums text-muted-foreground">{num(stage.stage_order)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{str(stage.label)}</div>
                          <CodePill>{str(stage.stage_key)}</CodePill>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="text-muted-foreground">{str(stage.check_type)}</span>{" "}
                          <span className="font-mono">{str(stage.operator)}</span>{" "}
                          {editing && !isTrue ? (
                            <Input className="mt-1 h-8 w-24" type="number" step="0.1" value={draft.threshold} onChange={(e) => setDraft({ ...draft, threshold: e.target.value })} />
                          ) : (
                            <span className="tabular-nums">{isTrue ? "" : num(stage.threshold)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editing ? (
                            <Select value={draft.outcome_on_fire} onValueChange={(v) => setDraft({ ...draft, outcome_on_fire: v })}>
                              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="refer">refer</SelectItem>
                                <SelectItem value="decline">decline</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <OutcomeBadge outcome={stage.outcome_on_fire} />
                          )}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">v{num(stage.ruleset_version)}</TableCell>
                        <TableCell className="text-center">
                          {editing ? (
                            <Checkbox checked={draft.active} onCheckedChange={(c) => setDraft({ ...draft, active: c === true })} />
                          ) : stage.active ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Yes</span>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            {editing ? (
                              <div className="flex justify-end gap-1">
                                <Button size="sm" disabled={saving} onClick={() => save(id)}>{saving ? "Saving…" : "Save"}</Button>
                                <Button size="icon-sm" variant="ghost" disabled={saving} onClick={() => setEditingId(null)}><X /></Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => startEdit(stage)}><Pencil /> Edit</Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {isAdmin && (
            <p className="mt-3 text-xs text-muted-foreground">
              Editing any stage bumps the rule-set version. Re-run an applicant to see the new version recorded, with the prior decision still in the audit trail.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="size-5" /> Audit trail
          </CardTitle>
          <CardDescription>Every run, newest first — outcome, the stage that fired, and the version it decided under.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Firing stage</TableHead>
                  <TableHead className="text-center">Version</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : decisions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No decisions yet. Run an applicant to start the trail.</TableCell>
                  </TableRow>
                ) : (
                  decisions.map((d) => {
                    const id = num((d as { id?: unknown }).id);
                    const key = str(d.firing_stage_key);
                    return (
                      <TableRow key={id}>
                        <TableCell className="font-medium">
                          {nameById.get(num(d.applicant_id)) || `#${num(d.applicant_id)}`}
                        </TableCell>
                        <TableCell><OutcomeBadge outcome={d.outcome} /></TableCell>
                        <TableCell>{key ? <CodePill>{key}</CodePill> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-center tabular-nums">v{num(d.ruleset_version)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtTime(d.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => onDecision(id)}>View</Button>
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
    </div>
  );
}
