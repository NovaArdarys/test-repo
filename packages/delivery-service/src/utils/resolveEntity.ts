type ActorDomain = "kitchen" | "beneficiary" | "driver";

interface ResolveEntityIdParams {
  actorDomain: ActorDomain;
  kitchenId?: string[];
  beneficiaryId?: string[];
  driverId?: string[];
}

const firstOrNull = (arr?: string[]) => arr?.[0] ?? null;

export function resolveEntityId({
  actorDomain,
  kitchenId,
  beneficiaryId,
  driverId,
}: ResolveEntityIdParams): string | null {

  const resolverMap: Record<ActorDomain, () => string | null> = {
    kitchen: () => firstOrNull(driverId) ?? firstOrNull(kitchenId),
    beneficiary: () => firstOrNull(beneficiaryId),
    driver: () => firstOrNull(driverId),
  };

  return resolverMap[actorDomain]?.() ?? null;
}
