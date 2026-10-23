import { z } from "zod"

export const verifyLoginOtpSchema = z.object({
  loginChallengeId: z.string().min(1, "login challenge is required"),
  otp: z
    .string({ required_error: "verification code is required" })
    .length(6, "code must have six numbers")
    .regex(/^\d+$/, "code must contain only digits"),
})

export const resendLoginOtpSchema = z.object({
  loginChallengeId: z.string().min(1, "login challenge is required"),
})
