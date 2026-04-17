import { z } from "zod";

const loginSchemaParams = {
  email: z
    .string()
    .min(1, "Email is required")
    .email("Email provided is not valid"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must have at least 8 characters"),
};

export const loginSchema = z.object(loginSchemaParams);

export const signUpSchema = z
  .object({
    ...loginSchemaParams,
    repeatPassword: z.string().min(1, "Repeating the password is required"),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords do not match",
    path: ["repeatPassword"],
  });
