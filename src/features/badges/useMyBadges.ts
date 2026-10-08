import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyBadges } from "./badges.functions";

/** One account-scoped result shared by the profile cover and badge details. */
export function useMyBadges(userId: string | undefined) {
  const fetchBadges = useServerFn(getMyBadges);
  return useQuery({
    queryKey: ["profile-badges", userId],
    queryFn: () => fetchBadges(),
    enabled: !!userId,
  });
}
