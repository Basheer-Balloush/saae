/**
 * Bunny Stream webhook `Status` → lesson video status.
 *
 * Webhook codes are NOT the same as the `status` field of the video object
 * returned by the Stream API (which `refreshBunnyLessonStatus` reads):
 *   0 Queued, 1 Processing, 2 Encoding, 3 Finished, 4 Resolution finished
 *   (first one means playable), 5 Failed, 6 PresignedUploadStarted,
 *   7 PresignedUploadFinished, 8 PresignedUploadFailed, 9 CaptionsGenerated,
 *   10 TitleOrDescriptionGenerated.
 *
 * Returns null for events that say nothing about playability (captions,
 * generated titles, unknown codes) so the lesson is left untouched.
 */
export type LessonVideoStatus = "processing" | "ready" | "failed";

export function lessonStatusFromBunnyWebhook(status: unknown): LessonVideoStatus | null {
  switch (status) {
    case 3:
    case 4:
      return "ready";
    case 5:
    case 8:
      return "failed";
    case 0:
    case 1:
    case 2:
    case 6:
    case 7:
      return "processing";
    default:
      return null;
  }
}

/**
 * Stream API video object `status` → lesson video status (used when we ask
 * Bunny directly instead of waiting for the webhook):
 *   0 Created, 1 Uploaded, 2 Processing, 3 Transcoding, 4 Finished, 5 Error,
 *   6 UploadFailed, 7 JitSegmenting, 8 JitPlaylistsCreated.
 */
export function lessonStatusFromBunnyVideo(status: unknown): LessonVideoStatus {
  if (status === 4 || status === 8) return "ready";
  if (status === 5 || status === 6) return "failed";
  return "processing";
}
