// The one contract: every request path and every request/response TYPE is
// derived from the xanots query defs. Change a def and this file follows — no
// hand-typed URL, no hand-mirrored response interface.
//
// We import the lean per-endpoint def modules (never xano/index.ts, which would
// pull the whole workspace). Types come via InferInput / InferResponse and erase
// at build time.

import type { InferInput, InferResponse } from "@xanots/sdk";

import { seedQuery } from "../../../xano/api/seed.js";
import { loginQuery } from "../../../xano/api/login.js";
import { applicantsListQuery } from "../../../xano/api/applicants-list.js";
import { applicantsCreateQuery } from "../../../xano/api/applicants-create.js";
import { applicantsRunQuery } from "../../../xano/api/applicants-run.js";
import { decisionGetQuery } from "../../../xano/api/decision-get.js";
import { decisionsListQuery } from "../../../xano/api/decisions-list.js";
import { stagesListQuery } from "../../../xano/api/stages-list.js";
import { stagesEditQuery } from "../../../xano/api/stages-edit.js";

/**
 * The deployed backend base URL. Injected as `window.XANO_HOST` by
 * `xanots deploy --static`, or read from `VITE_XANO_HOST` in dev.
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Auth token store ────────────────────────────────────────────────────────

const TOKEN_KEY = "kyc_token";
let authToken: string | null =
  typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export function setToken(token: string | null): void {
  authToken = token;
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return authToken;
}

// ── Transport ─────────────────────────────────────────────────────────────

async function call<T>(
  path: string,
  verb: string,
  opts: { body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const sendBody = opts.body !== undefined;
  if (sendBody) headers["content-type"] = "application/json";
  if (opts.auth !== false && authToken) headers["authorization"] = `Bearer ${authToken}`;

  const res = await fetch(XANO_HOST + path, {
    method: verb,
    headers,
    body: sendBody ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed?.message) message = parsed.message;
    } catch {
      /* non-JSON error body — use the raw text */
    }
    throw new Error(message || `${res.status} ${res.statusText}`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Types (all derived from the defs) ────────────────────────────────────────

export type LoginBody = InferInput<typeof loginQuery>;
export type Session = InferResponse<typeof loginQuery>;
export type SeedResult = InferResponse<typeof seedQuery>;
export type Applicant = InferResponse<typeof applicantsCreateQuery>;
export type ApplicantInput = InferInput<typeof applicantsCreateQuery>;
export type Decision = InferResponse<typeof applicantsRunQuery>;
export type DecisionDetail = InferResponse<typeof decisionGetQuery>;
export type Stage = InferResponse<typeof stagesListQuery>[number];
export type StageEditBody = InferInput<typeof stagesEditQuery>;

// ── Endpoints ────────────────────────────────────────────────────────────────

export function login(body: LoginBody): Promise<Session> {
  return call<Session>(loginQuery.getPath(), loginQuery.verb, { body, auth: false });
}

export function seed(): Promise<SeedResult> {
  return call<SeedResult>(seedQuery.getPath(), seedQuery.verb, { body: {}, auth: false });
}

export function listApplicants(): Promise<InferResponse<typeof applicantsListQuery>> {
  return call(applicantsListQuery.getPath(), applicantsListQuery.verb);
}

export function createApplicant(body: ApplicantInput): Promise<Applicant> {
  return call<Applicant>(applicantsCreateQuery.getPath(), applicantsCreateQuery.verb, { body });
}

export function runWaterfall(id: number): Promise<Decision> {
  return call<Decision>(
    applicantsRunQuery.getPath({ params: { id: String(id) } }),
    applicantsRunQuery.verb,
    { body: {} },
  );
}

export function getDecision(id: number): Promise<DecisionDetail> {
  return call<DecisionDetail>(
    decisionGetQuery.getPath({ params: { id: String(id) } }),
    decisionGetQuery.verb,
  );
}

export function listDecisions(): Promise<InferResponse<typeof decisionsListQuery>> {
  return call(decisionsListQuery.getPath(), decisionsListQuery.verb);
}

export function listStages(): Promise<InferResponse<typeof stagesListQuery>> {
  return call(stagesListQuery.getPath(), stagesListQuery.verb);
}

export function editStage(body: StageEditBody): Promise<InferResponse<typeof stagesEditQuery>> {
  return call(
    stagesEditQuery.getPath({ params: { id: String(body.id) } }),
    stagesEditQuery.verb,
    { body },
  );
}
