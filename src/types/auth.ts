import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .trim()
    .email("Please enter a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(100, "Email too long"),
  password: z.string().optional()
})

export const createAccountUserSchema = z.object({
  name: z
    .string({ message: "Contact person name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(50, "Name too long"),

  email: z
    .string({ message: "Email is required" })
    .trim()
    .email("Please enter a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(100, "Email too long"),

  password: z
    .string({ message: "Password is required" })
    .trim()
    .min(8, "Password must be at least 8 characters long")
    .max(64, "Password too long")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),

  businessName: z
    .string({ message: "Business name is required" })
    .trim()
    .min(2, "Business name must be at least 2 characters"),

  phone: z
    .string()
    .trim()
    .max(15, "Phone number too long")
    .optional(),

  location: z
    .string()
    .trim()
    .max(200, "Location too long")
    .optional(),
  whatsappApiKey: z
    .string()
    .trim()
    .max(300, "WhatsApp API key is too long")
    .optional(),
});


export const newUserSchema = z.object({
  name: z
    .string({ error: "Contact person name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(50, "Name too long"),

  email: z
    .string({ error: "Email is required" })
    .trim()
    .email("Please enter a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(100, { error: "Email too long" }),
  password: z
    .string({ error: "Password is required" })
    .trim()
    .min(8, "Password must be at least 8 characters long")
    .max(64, "Password too long")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .optional(),

  role: z.enum(["ADMIN", "MANAGER"], { error: "Role is required" }),
})
export type NewUser = z.infer<typeof newUserSchema>
export type LoginSchema = z.infer<typeof loginSchema>
export type UserSchema = z.infer<typeof createAccountUserSchema>

export type LoginReturn = {
  success: boolean;
  token: string;
}

export const resetPasswordSchema = z.object({
  password: z
    .string({ message: "Password is required" })
    .trim()
    .min(8, "Password must be at least 8 characters long")
    .max(64, "Password too long")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
})

export const forgetPasswordEMail = z.object({
  email: z
    .string({ message: "Email is required" })
    .trim()
    .email("Please enter a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(100, "Email too long"),
})

export interface Account {
  id: string;
  businessName: string | null;
  phone: string | null;
  location: string | null;
  email: string;
  createdAt: Date;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  accountId: string;
  account: Account;
  initials: string;
}

export interface AccountSummaryResponse {
  data: AccountData;
  initials: string;
  total_response: number;
}

export interface AccountData {
  id: string;
  businessName: string;
  phone: string;
  location: string;
  email: string;
  createdAt: string; // ISO date string
  users: AccountUser[];
  forms: AccountForm[];
  _count: AccountCounts;
}

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SUPERADMIN" | "USER" | string;
}

export interface AccountForm {
  id: string;
  _count: FormCounts;
}

export interface AccountCounts {
  forms: number;
  users: number;
}

export interface FormCounts {
  responses: number;
}
