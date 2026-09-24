import { useEffect, useRef } from "react";
import Hls from "hls.js";

type Props = {
  title: string;
  src: string;
  /** Bunny Stream embed (an iframe speaking player.js) rather than a file or HLS URL. */
  embed: boolean;
  /** Current position and length, several times a second while playing. */
  onTime: (seconds: number, duration: number | undefined) => void;
  /** Pause, seek or buffering: breaks the chain of watched time. */
  onBreak: () => void;
  onEnded: () => void;
};

const PLAYERJS_EVENTS = ["timeupdate", "play", "pause", "seeking", "seeked", "ended"];

/** The lesson video. Mount it with `key={lesson.id}` so each lesson starts fresh. */
export function LessonVideo({ title, src, embed, onTime, onBreak, onEnded }: Props) {
  const handlers = useRef({ onTime, onBreak, onEnded });
  handlers.current = { onTime, onBreak, onEnded };
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* Bunny's player speaks player.js over postMessage. Its receiver trusts
     only the origin in document.referrer, so the iframe must be sent our
     origin (see referrerPolicy below); with no referrer it drops every
     message and no event ever arrives. */
  useEffect(() => {
    if (!embed) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    let target = "*";
    try {
      target = new URL(src).origin;
    } catch {
      /* keep "*" */
    }
    const listener = `saae-${Math.random().toString(36).slice(2)}`;
    const post = (method: string, value?: string) => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ context: "player.js", version: "0.0.11", method, value, listener }),
        target,
      );
    };
    let subscribed = false;
    const subscribe = () => {
      if (subscribed) return;
      subscribed = true;
      PLAYERJS_EVENTS.forEach((event) => post("addEventListener", event));
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      let data: {
        context?: string;
        event?: string;
        value?: { seconds?: number; duration?: number };
      };
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (!data || data.context !== "player.js") return;
      const h = handlers.current;
      switch (data.event) {
        case "ready":
          subscribe();
          break;
        case "timeupdate":
          if (typeof data.value?.seconds === "number")
            h.onTime(data.value.seconds, data.value.duration);
          break;
        case "play":
        case "pause":
        case "seeking":
        case "seeked":
          h.onBreak();
          break;
        case "ended":
          h.onEnded();
          break;
      }
    };
    // The player announces "ready" once; asking again after load covers a missed one.
    const onLoad = () => post("addEventListener", "ready");
    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("message", onMessage);
      iframe.removeEventListener("load", onLoad);
    };
  }, [embed, src]);

  // Files and HLS play in a <video>; hls.js covers browsers without native HLS.
  useEffect(() => {
    const video = videoRef.current;
    if (embed || !video) return;
    if (
      !src.includes(".m3u8") ||
      video.canPlayType("application/vnd.apple.mpegurl") ||
      !Hls.isSupported()
    ) {
      video.src = src;
      return;
    }
    const hls = new Hls({ enableWorker: true });
    hls.loadSource(src);
    hls.attachMedia(video);
    return () => hls.destroy();
  }, [embed, src]);

  if (embed) {
    return (
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      controlsList="nodownload"
      playsInline
      aria-label={title}
      onTimeUpdate={(e) => onTime(e.currentTarget.currentTime, e.currentTarget.duration)}
      onPlay={onBreak}
      onPause={onBreak}
      onSeeking={onBreak}
      onWaiting={onBreak}
      onEnded={(e) => {
        onTime(e.currentTarget.duration, e.currentTarget.duration);
        onEnded();
      }}
    />
  );
}
