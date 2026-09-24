import { describe, expect, it } from "vitest";
import { bunnyErrorMessage } from "../../src/lib/bunny-errors";

describe("bunnyErrorMessage", () => {
  it("names the missing server secrets", () => {
    const msg = bunnyErrorMessage(new Error("bunny_not_configured: BUNNY_STREAM_API_KEY"), "en");
    expect(msg).toContain("BUNNY_STREAM_API_KEY");
    expect(
      bunnyErrorMessage(new Error("bunny_not_configured: BUNNY_STREAM_LIBRARY_ID"), "ar"),
    ).toContain("BUNNY_STREAM_LIBRARY_ID");
  });

  it("explains a rejected API key and a wrong library id", () => {
    expect(bunnyErrorMessage(new Error("bunny_api_error: create video HTTP 401"), "en")).toContain(
      "BUNNY_STREAM_API_KEY",
    );
    expect(bunnyErrorMessage(new Error("bunny_api_error: create video HTTP 404"), "en")).toContain(
      "BUNNY_STREAM_LIBRARY_ID",
    );
    expect(bunnyErrorMessage(new Error("bunny_api_error: create video HTTP 502"), "en")).toContain(
      "502",
    );
  });

  it("reads the status of a tus upload failure", () => {
    const rejected = Object.assign(
      new Error("tus: unexpected response while creating upload, response code: 401"),
      {
        originalResponse: { getStatus: () => 401 },
      },
    );
    expect(bunnyErrorMessage(rejected, "en")).toContain("signature");
    const dropped = Object.assign(
      new Error("tus: failed to upload chunk, caused by [object ProgressEvent]"),
      {
        originalResponse: null,
      },
    );
    expect(bunnyErrorMessage(dropped, "en")).toContain("connection dropped");
  });

  it("falls back to the generic mapping for anything else", () => {
    expect(bunnyErrorMessage(new Error("Lesson not found"), "en")).toBe(
      "The requested item was not found.",
    );
  });
});
