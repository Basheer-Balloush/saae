import { createLmsAccount, isEmailConfirmationRequired } from '../src/lib/lms-auth-email.server'
const email = `qa.flow.${Date.now()}@saaeqa.org`
const password = 'Str0ng!Passw0rd#2026'
console.log('confirmationRequired setting =', await isEmailConfirmationRequired())
const res = await createLmsAccount({ fullName: 'محمد أحمد خالد', email, password, asInstructor: true, lang: 'en' })
console.log('result', res)
const admin = await import('../src/integrations/supabase/client.server')
const { data } = await admin.supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
const u = data.users.find(x => x.email === email)
console.log('email_confirmed_at =', u?.email_confirmed_at)
const { createClient } = await import('@supabase/supabase-js')
const pub = createClient(process.env.SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!)
const signin = await pub.auth.signInWithPassword({ email, password })
console.log('signin error =', signin.error?.message ?? 'none', 'session =', !!signin.data.session)
const roles = await admin.supabaseAdmin.from('user_roles').select('role').eq('user_id', u!.id)
const inst = await admin.supabaseAdmin.from('lms_instructors').select('approved').eq('user_id', u!.id)
console.log('roles', roles.data, 'instructor', inst.data)
