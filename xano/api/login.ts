import { query, s, c, ref, inp, input, expr } from "@xanots/sdk";
import { kyc } from "./kyc.js";
import { users } from "../tables/users.js";

/**
 * Native @xanots/sdk auth: email + password against the users auth table, mint
 * a token. The submitted password is taken as input.text() (NOT input.password,
 * which would double-hash and never match), and the read names `password` in
 * `output` to pull the internal hash for check_password.
 */
export const loginQuery = query({
  name: "auth/login",
  verb: "POST",
  apiGroup: kyc,
  input: {
    email: input.email({ required: true, methods: ["lower", "trim"] }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "email", "password", "role", "name"],
      as: "u",
    }),
    // Same generic message for no-such-user and bad-password (no enumeration).
    s.precondition({ expr: expr(ref("u", { safe: true }), "!=", c.null()), error_type: "unauthorized", error: c.text("Invalid email or password.") }),
    s.security.check_password({ text_password: inp("password"), hash_password: ref("u.password"), as: "ok" }),
    s.precondition({ expr: expr(ref("ok"), "=", c.bool(true)), error_type: "unauthorized", error: c.text("Invalid email or password.") }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  response: {
    token: ref("token"),
    id: ref("u.id"),
    email: ref("u.email"),
    role: ref("u.role"),
    name: ref("u.name"),
  },
});
