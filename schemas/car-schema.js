import { z } from "zod";

export const statusEnum = z.enum(["Awaiting Inspection", "Inspected"]);

export const carSchema = z.object({
  year: z.coerce
    .number()
    .min(1, "Year is required")
    .min(1900, "Year is too old")
    .max(
      new Date().getFullYear(),
      "Year can't be larger than the current year.",
    ),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  location: z.string().min(1, "Location is required"),
  windshield: z.enum(["none", "light", "severe"]),
  rimDamage: z.enum(["none", "light", "severe"]),
  camera: z.enum(["yes", "no"]),
  steering: z.enum(["yes", "no"]),
  status: statusEnum,
});
