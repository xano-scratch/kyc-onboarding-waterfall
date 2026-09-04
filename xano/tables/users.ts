import { table, f } from "@xanots/sdk";

/**
 * The identity table that backs authentication (auth: true). A login endpoint
 * mints a token against it; every protected endpoint names it as `auth:` and
 * reads the caller with `auth("id")`. `role` drives API-layer RBAC — the guards
 * live at the endpoint layer, never as row-level security.
 *
 * `id` (int PK) and `created_at` are auto-injected.
 */
export const users = table({
  name: "users",
  auth: true,
  schema: {
    email: f.email({ required: true, methods: ["lower", "trim"] }),
    // f.password hashes on write and is access:"internal" — a login stack must
    // name it in the read's `output` to pull the hash for check_password.
    password: f.password({ required: true }),
    role: f.enum(["viewer", "analyst", "admin"], { required: true, default: "viewer" }),
    name: f.text({ required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
