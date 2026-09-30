import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SlugInput = (i: unknown) => z.object({ slug: z.string().trim().min(1).max(120) }).parse(i);

export const getProfileCard = createServerFn({ method: "POST" })
  .inputValidator(SlugInput)
  .handler(async ({ data }) => {
    const { findProfileCard } = await import("./private-profiles.server");
    return findProfileCard(data.slug);
  });

export const getProfileContact = createServerFn({ method: "POST" })
  .inputValidator(SlugInput)
  .handler(async ({ data }) => {
    const { findProfileContact } = await import("./private-profiles.server");
    return findProfileContact(data.slug);
  });
