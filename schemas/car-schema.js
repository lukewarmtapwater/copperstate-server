import { z } from "zod";

const carSchema = z.object({
  year: z.string().min(1, "Year is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  location: z.string().min(1, "Location is required"),
  daysOnLot: z.string().min(1, "Days on lot are required"),
  windshield: z.string().min(1),
  rimDamage: z.string().min(1),
  camera: z.string().min(1),
  steering: z.string().min(1),
  upholstery: z.string().min(1),
});

export default carSchema;
