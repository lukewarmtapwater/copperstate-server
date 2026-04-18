import { z } from "zod";

const carSchema = z.object({
  year: z.coerce
    .number()
    .min(1, "Year is required")
    .min(1900, "Year is too old")
    .max(2026, "Year can't be larger than the current year."),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  location: z.string().min(1, "Location is required"),
  daysOnLot: z.string().min(1, "Days on lot are required"),
  windshield: z.enum(["Needed", "Not Needed", "Ordered"]),
  rimDamage: z.enum(["Light", "Medium", "Severe"]),
  camera: z.enum(["Yes", "No"]),
  steering: z.enum(["Yes", "No"]),
  upholstery: z.enum(["Light", "Medium", "Severe"]),
});

export default carSchema;
