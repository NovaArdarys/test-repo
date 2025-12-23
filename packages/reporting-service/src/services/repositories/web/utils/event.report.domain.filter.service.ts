import { eventReports } from "@/db/schemas";
import { and, eq, inArray } from "drizzle-orm";

export function buildDomainFilter(options?: {
  domain?: string;
  kitchenIds?: string[];
  beneficiaryIds?: string[];
  driversIds?: string[];
}) {

  if (!options?.domain) return undefined;

  switch (options.domain) {
    case "kitchen":
      return and(
        eq(eventReports.domain, "kitchen"),
        options.kitchenIds?.length
          ? inArray(eventReports.domainId, options.kitchenIds)
          : undefined
      );

    case "driver":
      return and(
        eq(eventReports.entityType, "driver"),
        options.driversIds?.length
          ? inArray(eventReports.entityId, options.driversIds)
          : undefined
      );

    case "beneficiary":
      return and(
        eq(eventReports.entityType, "beneficiary"),
        options.beneficiaryIds?.length
          ? inArray(eventReports.entityId, options.beneficiaryIds)
          : undefined
      );

    default:
      return undefined;
  }
}