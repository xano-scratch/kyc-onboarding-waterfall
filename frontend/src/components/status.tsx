import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { str } from "@/lib/format";

// Traffic-light semantics for a KYC outcome. The colors are chosen to stay
// readable in both light and dark palettes.
const OUTCOME: Record<string, { label: string; cls: string }> = {
  approve: { label: "Approve", cls: "border-emerald-600/30 bg-emerald-600/15 text-emerald-700 dark:text-emerald-400" },
  refer: { label: "Refer", cls: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  decline: { label: "Decline", cls: "border-red-600/40 bg-red-600/15 text-red-700 dark:text-red-400" },
};

export function OutcomeBadge({ outcome, className }: { outcome: unknown; className?: string }) {
  const key = str(outcome).toLowerCase();
  const o = OUTCOME[key] ?? { label: str(outcome) || "—", cls: "border-border bg-muted text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        o.cls,
        className,
      )}
    >
      {o.label}
    </span>
  );
}

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  analyst: "secondary",
  viewer: "outline",
};

export function RoleBadge({ role }: { role: unknown }) {
  const key = str(role).toLowerCase();
  return (
    <Badge variant={ROLE_VARIANT[key] ?? "outline"} className="uppercase tracking-wide">
      {str(role) || "—"}
    </Badge>
  );
}

// A neutral pill for a reason code / stage key.
export function CodePill({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
      {children}
    </code>
  );
}
