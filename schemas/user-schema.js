import { z } from "zod";

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Email provided is not valid");

const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must have at least 8 characters");

const strongPasswordSchema = passwordSchema
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: strongPasswordSchema,
    repeatPassword: z.string().min(1, "Repeating the password is required"),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords do not match",
    path: ["repeatPassword"],
  });

export const roleEnum = z.enum([
  "admin",
  "inspector",
  "mechanic",
  "unassigned",
]);
