import { createFileRoute } from '@tanstack/react-router'
import { timingSafeEqual } from 'crypto'

/**
 * Phase 6 — Bunny Stream webhook.
 *
 * Bunny sends POST { VideoLibraryId, VideoGuid, Status } after upload/encoding
 * milestones. Bunny does not provide an HMAC on the payload, so we authenticate
 * the caller via a shared secret in the URL query string. Configure the same
 * secret in the Bunny library "Webhook URL", e.g.:
 *   https://.../api/public/bunny-webhook?secret=<BUNNY_WEBHOOK_SECRET>
 *
 * The update is idempotent and only touches the lesson whose current
 * `video_uid` still matches — so a stale event for an old (replaced) video
 * cannot mark the new upload ready.
 */
export const Route = createFileRoute('/api/public/bunny-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url)
        const provided = url.searchParams.get('secret') ?? ''
        const expected = process.env.BUNNY_WEBHOOK_SECRET ?? ''
        if (!expected) return new Response('webhook_not_configured', { status: 503 })
        const a = Buffer.from(provided)
        const b = Buffer.from(expected)
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response('unauthorized', { status: 401 })
        }

        let body: { VideoGuid?: string; VideoLibraryId?: number; Status?: number }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return new Response('bad_request', { status: 400 })
        }
        const guid = body.VideoGuid?.trim()
        if (!guid) return new Response('missing_guid', { status: 400 })

        // Bunny status codes: 4/8 = playable; 5/6 = failed; anything else = processing.
        const status =
          body.Status === 4 || body.Status === 8
            ? 'ready'
            : body.Status === 5 || body.Status === 6
              ? 'failed'
              : 'processing'

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { error } = await supabaseAdmin
          .from('lms_lessons')
          .update({
            video_status: status,
            video_ready: status === 'ready',
            video_status_error: status === 'failed' ? `provider_status_${body.Status}` : null,
          })
          .eq('video_provider', 'bunny')
          .eq('video_uid', guid)
        if (error) {
          console.error('[bunny-webhook] update failed', error.message)
          return new Response('update_failed', { status: 500 })
        }
        return new Response('ok')
      },
    },
  },
})
