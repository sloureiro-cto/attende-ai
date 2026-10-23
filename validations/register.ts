import { z } from "zod"

/** Stable codes for Zod messages; translate in UI via `useRegisterFieldTranslation`. */
export enum RegisterFieldErrors {
  FULL_NAME_REQUIRED = "FULL_NAME_REQUIRED",
  FIRST_AND_LAST_NAME_REQUIRED = "FIRST_AND_LAST_NAME_REQUIRED",
  EMAIL_REQUIRED = "EMAIL_REQUIRED",
  INVALID_EMAIL = "INVALID_EMAIL",
}

export function isRegisterFieldErrorCode(message: string): message is RegisterFieldErrors {
  return (Object.values(RegisterFieldErrors) as string[]).includes(message)
}

export enum PasswordErrors {
  MIN_LENGTH = "MIN_LENGTH",
  UPPERCASE_REQUIRED = "UPPERCASE_REQUIRED",
  LOWERCASE_REQUIRED = "LOWERCASE_REQUIRED",
  NUMBER_REQUIRED = "NUMBER_REQUIRED",
  SPECIAL_CHAR_REQUIRED = "SPECIAL_CHAR_REQUIRED",
}

export const passwordErrorsLabels = {
  MIN_LENGTH: "At least 8 characters",
  UPPERCASE_REQUIRED: "Uppercase letters (A-Z)",
  LOWERCASE_REQUIRED: "Lowercase letters (a-z)",
  NUMBER_REQUIRED: "Numbers (0-9)",
  SPECIAL_CHAR_REQUIRED: "Symbols (e.g., !, @, #, etc.)",
} as Record<keyof typeof PasswordErrors, string>

export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, { message: PasswordErrors.MIN_LENGTH })
  .regex(/[A-Z]/, { message: PasswordErrors.UPPERCASE_REQUIRED })
  .regex(/[a-z]/, { message: PasswordErrors.LOWERCASE_REQUIRED })
  .regex(/\d/, { message: PasswordErrors.NUMBER_REQUIRED })
  .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: PasswordErrors.SPECIAL_CHAR_REQUIRED })

export const fullNameSchema = z
  .string({ required_error: RegisterFieldErrors.FULL_NAME_REQUIRED })
  .min(1, { message: RegisterFieldErrors.FULL_NAME_REQUIRED })
  .refine((name) => name.split(" ").length >= 2, {
    message: RegisterFieldErrors.FIRST_AND_LAST_NAME_REQUIRED,
  })

export const emailSchema = z
  .string({ required_error: RegisterFieldErrors.EMAIL_REQUIRED })
  .min(1, { message: RegisterFieldErrors.EMAIL_REQUIRED })
  .email({ message: RegisterFieldErrors.INVALID_EMAIL })

export const nameAndPasswordSchema = z.object({
  name: fullNameSchema,
  password: passwordSchema,
})

export const registerSchema = z.object({
  name: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
  language: z.enum(["english", "portuguese", "spanish"]).optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1, "Full name is required").optional(),
  email: z.string().min(1, "E-mail is required").email("Invalid e-mail").optional(),
  username: z.string().min(1, "Username is required").optional(),
  password: passwordSchema.optional(),
  image: z.string().optional(),
  aboutMe: z.string().optional(),
  role: z.string().optional(),
  pronouns: z.string().optional(),
  genericRole: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  birthDate: z.date().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (v == null || v.trim() === "") return true
        const digits = v.replace(/\D/g, "")
        return digits.length >= 8 && digits.length <= 15
      },
      { message: "Phone must include country code (e.g. +351912345678)" }
    ),
  language: z.enum(["english", "portuguese", "spanish"]).optional(),
  twoFactorEnabled: z.boolean().optional(),
})
