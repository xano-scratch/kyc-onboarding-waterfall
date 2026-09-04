import { apiGroup } from "@xanots/sdk";

/**
 * The one API group every channel calls. Its canonical slug is PINNED so the
 * public paths stay stable (`/api:kyc/...`) and getPath() resolves in the
 * browser bundle without waiting on a lock.
 */
export const kyc = apiGroup({ name: "kyc", canonical: "kyc" });
