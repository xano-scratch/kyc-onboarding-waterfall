import { useState } from "react";
import { Database, LogIn, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login, seed, setToken, type Session } from "@/lib/api";

const PASSWORD = "kyc-demo-1234";

const ROLES = [
  { key: "viewer", email: "viewer@example.com", label: "Viewer", desc: "Read only. Browse applicants, decisions, and the rule set." },
  { key: "analyst", email: "analyst@example.com", label: "Analyst", desc: "Submit applicants and run the waterfall." },
  { key: "admin", email: "admin@example.com", label: "Admin", desc: "Everything an analyst can do, plus edit rule stages (which bumps the version)." },
];

export function SignIn({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSeed, setNeedsSeed] = useState(false);

  async function signIn(email: string) {
    setBusy(email);
    setError(null);
    try {
      const session = await login({ email, password: PASSWORD });
      setToken(String(session.token));
      onSignedIn(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setNeedsSeed(true);
    } finally {
      setBusy(null);
    }
  }

  async function loadDemo() {
    setBusy("seed");
    setError(null);
    try {
      await seed();
      setNeedsSeed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center gap-6 p-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">KYC Onboarding Waterfall</h1>
        <p className="text-muted-foreground">
          Pick a role to sign in. Access is enforced at the API layer, so each role can do only
          what its endpoints allow.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ROLES.map((r) => (
          <Card key={r.key} className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-lg">{r.label}</CardTitle>
              <CardDescription>{r.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={busy !== null} onClick={() => signIn(r.email)}>
                <LogIn />
                {busy === r.email ? "Signing in…" : `Sign in as ${r.label}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        All three demo accounts share the password{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{PASSWORD}</code>.
      </p>

      {error && (
        <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-center text-sm">
          <p className="text-destructive">{error}</p>
          {needsSeed && (
            <>
              <p className="text-muted-foreground">
                If this is a fresh environment, load the demo data first, then sign in.
              </p>
              <Button variant="outline" disabled={busy !== null} onClick={loadDemo}>
                <Database />
                {busy === "seed" ? "Loading…" : "Load demo data"}
              </Button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
