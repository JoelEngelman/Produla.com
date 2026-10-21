import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "https://produla-auth.joeldavidengelman.workers.dev",
});