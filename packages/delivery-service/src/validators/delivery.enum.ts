import z from "zod";
import {
  deliveryStatusEnum,
  deliveryBeneficiaryStatusEnum,
} from "@/db/schemas";

export const DeliveryStatusTypeEnum = z.enum(
  deliveryStatusEnum.enumValues,
  {
    error: () => ({
      message: `Invalid type ${deliveryStatusEnum.enumValues.join(", ")}`,
    }),
  }
);

export const DeliveryBeneficiaryStatusTypeEnum = z.enum(
  deliveryBeneficiaryStatusEnum.enumValues,
  {
    error: () => ({
      message: `Invalid type ${deliveryBeneficiaryStatusEnum.enumValues.join(", ")}`,
    }),
  }
);
