import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { sendPasswordResetWithResend, signUpWithResendConfirmation } from './lms-auth-email.server'

const langSchema = z.enum(['ar', 'en'])

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  asInstructor: z.boolean(),
  lang: langSchema,
})

const resetSchema = z.object({
  email: z.string().trim().email().max(255),
  lang: langSchema,
})

export const signUpLmsUser = createServerFn({ method: 'POST' })
  .inputValidator((input) => signupSchema.parse(input))
  .handler(async ({ data }) => signUpWithResendConfirmation(data))

export const sendLmsPasswordReset = createServerFn({ method: 'POST' })
  .inputValidator((input) => resetSchema.parse(input))
  .handler(async ({ data }) => sendPasswordResetWithResend(data))