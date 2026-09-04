import { useEffect, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { RoleBadge } from "@/components/status";
import { SignIn } from "@/components/SignIn";
import { Applicants } from "@/components/Applicants";
import { DecisionView } from "@/components/DecisionView";
import { RulesAudit } from "@/components/RulesAudit";
import { getToken, setToken, type Session } from "@/lib/api";
import { str } from "@/lib/format";

type View = "applicants" | "rules";

const SESSION_KEY = "kyc_session";

function loadSession(): Session | null {
  if (!getToken()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

// Lightweight hash routing so a decision is a shareable link (#/decision/<id>).
function parseHash(): { view: View; decisionId: number | null } {
  const h = typeof window !== "undefined" ? window.location.hash : "";
  const m = h.match(/^#\/decision\/(\d+)/);
  if (m) return { view: "applicants", decisionId: Number(m[1]) };
  if (h.startsWith("#/rules")) return { view: "rules", decisionId: null };
  return { view: "applicants", decisionId: null };
}

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const { view, decisionId } = route;

  function nav(hash: string) {
    if (window.location.hash === hash) setRoute(parseHash());
    else window.location.hash = hash;
  }

  function onSignedIn(s: Session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  }

  function signOut() {
    setToken(null);
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    nav("#/applicants");
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex justify-end p-4">
          <ModeToggle />
        </div>
        <SignIn onSignedIn={onSignedIn} />
      </div>
    );
  }

  const navBtn = (key: View, label: string) => (
    <Button
      variant={view === key && decisionId === null ? "secondary" : "ghost"}
      size="sm"
      onClick={() => nav(key === "rules" ? "#/rules" : "#/applicants")}
    >
      {label}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <span className="hidden sm:inline">KYC Onboarding Waterfall</span>
          </div>
          <nav className="flex items-center gap-1">
            {navBtn("applicants", "Applicants")}
            {navBtn("rules", "Rule set & audit")}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <span className="text-muted-foreground">{str(session.name)}</span>
              <RoleBadge role={session.role} />
            </div>
            <ModeToggle />
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {decisionId !== null ? (
          <DecisionView id={decisionId} onBack={() => nav("#/applicants")} />
        ) : view === "applicants" ? (
          <Applicants session={session} onDecision={(id) => nav(`#/decision/${id}`)} />
        ) : (
          <RulesAudit session={session} onDecision={(id) => nav(`#/decision/${id}`)} />
        )}
      </main>
    </div>
  );
}
