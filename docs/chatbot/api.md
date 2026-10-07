# Abu Al-Joud API

Other systems (a WhatsApp or Telegram bot, a mobile app's server, a partner's
website backend) can talk to Abu Al-Joud through one endpoint. It is the
website's own assistant: the same answers, knowledge, courses, tone and lead
capture as the chat window on aisyria.org, and every change made to the website
assistant applies here too.

## Getting a key

An admin opens **Admin → Chatbot → API keys → New key**, names the system
that will use it, sets its limits and copies the key. The key is shown once;
only its hash is stored. A lost or leaked key is revoked on the same page and
replaced with a new one.

Keys belong on a server. Never put one in a web page, a phone app or a
public repository: anyone who can read it can use it until it is revoked.

## The request

```
POST https://www.aisyria.org/api/v1/abu-al-joud/chat
Authorization: Bearer saae_aj_…
Content-Type: application/json

{
  "message": "شو الدورات المتاحة؟",
  "conversation_id": "…",
  "user": "whatsapp:+963…",
  "lang": "ar"
}
```

| Field             | Required | Meaning                                                                                                                                                                                                            |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `message`         | yes      | What the person wrote, up to 2,000 characters.                                                                                                                                                                     |
| `conversation_id` | no       | Leave it out to start a conversation; send the one from the previous answer to continue it. Abu Al-Joud remembers the conversation itself, so send only the new message, never the history.                        |
| `user`            | no       | Your own id for the person (a phone number, a user id). It is stored only as a hash and gives each person their own limit, so one person cannot use up the whole key. Send it whenever the key serves many people. |
| `lang`            | no       | `ar` or `en`. Abu Al-Joud answers in the language the person writes in; this is only used when the message has no letters.                                                                                         |

No other field is accepted: the API takes the person's message only, never
instructions, roles or history.

## The answer

```json
{
  "conversation_id": "6f1c…",
  "lang": "ar",
  "reply": {
    "text": "على عيني. هي الدورات المتاحة هلق: [الذكاء الاصطناعي التوليدي 10](https://www.aisyria.org/learning-management-system/courses/gen-ai-10)",
    "choices": ["تفاصيل الدورة", "دورة غيرها"],
    "links": [
      {
        "label": "الذكاء الاصطناعي التوليدي 10",
        "url": "https://www.aisyria.org/learning-management-system/courses/gen-ai-10"
      }
    ]
  }
}
```

- `text` is what the person reads. Links appear as `[label](url)` and may
  have `**bold**`; `links` lists them, for channels that show links apart.
- `choices` are the answer buttons the website shows under the message. Show
  them as buttons or a numbered list; when the person picks one, send its exact
  text as the next `message`.
- Answers take a few seconds (up to about 45). The `X-RateLimit-Remaining-Day`
  header says how many requests the key has left today.

## Errors

Every error is JSON: `{"error": {"code": "…", "message": "…"}}`, sometimes
with `scope` and `retry_after` (seconds, also sent as `Retry-After`).

| Status | `code`                   | What to do                                                                                                                      |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `invalid_request`        | Fix the body; `field` names the problem.                                                                                        |
| 401    | `invalid_key`            | The key is missing, wrong, expired or revoked.                                                                                  |
| 405    | `method_not_allowed`     | Use POST.                                                                                                                       |
| 409    | `conversation_full`      | The conversation reached its length limit (80 messages). Start a new one without `conversation_id`.                             |
| 413    | `payload_too_large`      | The body is over 8 KB.                                                                                                          |
| 415    | `unsupported_media_type` | Send `Content-Type: application/json`.                                                                                          |
| 429    | `rate_limited`           | Too many requests this minute: for the whole key (`scope: key`), this person (`user`) or this conversation. Wait `retry_after`. |
| 429    | `daily_limit`            | The key's or the person's daily limit is used up. Days start at 00:00 UTC.                                                      |
| 503    | `busy`                   | The assistant is busy or the service-wide cap is reached. Retry after `retry_after`.                                            |
| 503    | `unavailable`            | Something is down. Retry later.                                                                                                 |
| 504    | `timeout`                | No answer in time. Retry.                                                                                                       |

## Limits

Each key has its own limits, set by the admin: requests a minute and a day for
the whole key, and a minute and a day for each `user`. All keys together are
capped at 50 requests a minute and 2,000 a day, so the API never takes the
model capacity the website's visitors need.

## What the API never returns

Only the answer leaves the server. The assistant's instructions, its tools and
their raw results, other conversations, provider errors and internal messages
stay inside. Every answer is also checked before it is sent: one that would
recite the assistant's instructions or name its internals is replaced with a
short refusal, and the key's "held back" count on the admin page goes up.

## Example

```bash
curl -X POST https://www.aisyria.org/api/v1/abu-al-joud/chat \
  -H "Authorization: Bearer $SAAE_ABU_AL_JOUD_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "شو الدورات المتاحة؟", "user": "demo-1"}'
```

## For developers of this site

- Route: `src/routes/api/v1/abu-al-joud/chat.ts`. Request handling:
  `src/features/chat/lib/chat-api-handler.ts`; it calls the website chat's own
  POST handler (`src/routes/api/chat.ts`) in-process, with the session id
  `api_<key id>_<conversation_id>`, so the conversation, its leads and its usage
  are stored like any website conversation.
- Leak check: `src/features/chat/lib/chat-api-guard.ts`. A new tool in
  `chat.ts` must be added to `TOOL_NAMES` (a unit test fails until it is).
- Keys and limits: migration `20261007160000_chat_api_keys.sql`
  (`chat_api_keys`, `chat_api_counters`, `chat_api_authorize`). Browser roles
  can reach none of it.
