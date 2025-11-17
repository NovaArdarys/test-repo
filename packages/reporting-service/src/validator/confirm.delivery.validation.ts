import z from "zod";

export const CreateDeliveryEventReportSchema = z.object({
  name: z.string().optional(),
  reportType: z.string().optional(),
  date: z.string(),
  location: z.string().optional(),
  description: z.string().optional(),
  receivedPortion: z.number().optional(),
  takenTray: z.number().optional(),
  storageIds: z.array(z.string()).default([]),
});
