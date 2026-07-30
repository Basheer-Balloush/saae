import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { sendPasswordResetWithResend, createLmsAccount } from './lms-auth-email.server'
import { PASSWORD_MIN } from './password-policy'

const langSchema = z.enum(['ar', 'en'])

const ARABIC_NAME_RE = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/

const signupSchema = z.object({
  fullName: z.string().trim().min(5).max(120).refine((v) => {
    if (!ARABIC_NAME_RE.test(v)) return false
    const parts = v.split(/\s+/).filter((p) => p.length >= 2)
    return parts.length >= 3
  }, { message: 'Full name must be three Arabic words' }),
  email: z.string().trim().email().max(255),
  password: z.string().min(PASSWORD_MIN).max(72),
  asInstructor: z.boolean(),
  lang: langSchema,
})

const resetSchema = z.object({
  email: z.string().trim().email().max(255),
  lang: langSchema,
})

export const signUpLmsUser = createServerFn({ method: 'POST' })
  .inputValidator((input) => signupSchema.parse(input))
  .handler(async ({ data }) => createLmsAccount(data))

export const sendLmsPasswordReset = createServerFn({ method: 'POST' })
  .inputValidator((input) => resetSchema.parse(input))
  .handler(async ({ data }) => sendPasswordResetWithResend(data))
