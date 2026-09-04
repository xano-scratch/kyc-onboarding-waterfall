import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, FileClock, GitBranch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OutcomeBadge, CodePill } from "@/components/status";
import { getDecision, type DecisionDetail } from "@/lib/api";
import { fmtTime, num, str } from "@/lib/format";

const OP_SYM: Record<string, string> = { gte: "≥", lte: "≤", eq: "=" };

/** Human-readable version of the stage's condition. */
function ruleText(stage: NonNullable<DecisionDetail["firing_stage"]>): string {
  const check = str(stage.check_type);
  const op = str(stage.operator);
  if (op === "is_true") return `${check} flag is set`;
  return `${check} score ${OP_SYM[op] ?? op} ${num(stage.threshold)}`;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function DecisionView({ id, onBack }: { id: number; onBack: () => void }) {
  const [data, setData] = useState<DecisionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    getDecision(id)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [id]);

  const decision = data?.decision ?? null;
  const applicant = data?.applicant ?? null;
  const firing = data?.firing_stage ?? null;
  const fired = decision != null && num(decision.firing_stage_id) > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft /> Back to applicants
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!data && !error && <p className="text-muted-foreground">Loading decision…</p>}

      {decision && (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <div className="space-y-1">
                <CardDescription>Decision #{num(decision.id)}</CardDescription>
                <CardTitle className="text-2xl">
                  {str(applicant?.full_name) || `Applicant #${num(decision.applicant_id)}`}
                </CardTitle>
              </div>
              <OutcomeBadge outcome={decision.outcome} className="px-3 py-1 text-sm" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4">
                {fired ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileClock className="size-4 text-muted-foreground" />
                      Stopped at stage <span className="font-semibold">{str(firing?.label) || str(decision.firing_stage_key)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>Reason code</span>
                      <CodePill>{str(decision.reason_code)}</CodePill>
                      {firing && <span>because {ruleText(firing)}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    No stage fired — the applicant cleared every active rule.
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GitBranch className="size-4" />
                Decided under rule-set version{" "}
                <span className="font-semibold text-foreground">v{num(decision.ruleset_version)}</span>
                <span className="ml-auto">{fmtTime(decision.created_at)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Applicant facts</CardTitle>
              <CardDescription>The inbound values the waterfall evaluated.</CardDescription>
            </CardHeader>
            <CardContent className="py-0">
              <Fact label="Country" value={str(applicant?.country) || "—"} />
              <Separator />
              <Fact label="Identity score" value={applicant ? num(applicant.identity_score) : "—"} />
              <Separator />
              <Fact label="Risk score" value={applicant ? num(applicant.risk_score) : "—"} />
              <Separator />
              <Fact
                label="Watchlist"
                value={
                  applicant?.watchlist_flag ? (
                    <span className="text-red-600 dark:text-red-400">Hit</span>
                  ) : (
                    <span className="text-muted-foreground">Clear</span>
                  )
                }
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
