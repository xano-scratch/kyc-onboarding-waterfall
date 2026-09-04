// Boundary normalizers. Some response fields drilled from a get / query-single
// infer as `T | null`, and a couple as `unknown`; these coerce them at the
// render boundary rather than re-declaring the response shapes by hand.

export const str = (v: unknown): string => (v == null ? "" : String(v));

export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function fmtTime(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  try {
    return new Date(n).toLocaleString();
  } catch {
    return "—";
  }
}
