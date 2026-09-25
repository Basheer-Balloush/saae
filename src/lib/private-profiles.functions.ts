import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPrivateProfile = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ slug: z.string().trim().min(1).max(120) }).parse(i))
  .handler(async ({ data }) => {
    const { findPrivateProfile } = await import("./private-profiles.server");
    return findPrivateProfile(data.slug);
  });
