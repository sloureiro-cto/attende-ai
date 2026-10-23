import { z } from "zod"

export const loginSchema = z.object({
  email: z.string({ required_error: "e-mail is required" }).min(1, "e-mail is required").email("invalid e-mail"),
  password: z.string().min(1, "password is required"),
})
