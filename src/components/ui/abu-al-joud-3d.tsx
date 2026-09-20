import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Hand, RotateCcw } from "lucide-react";

type ModelController = {
  dispose: () => void;
  setActive: (active: boolean) => void;
  wave: () => void;
  reset: () => void;
  turn: (amount: number) => void;
};

type ModelFactory = (
  host: HTMLElement,
  options: { reducedMotion: boolean; onActivate: () => void },
) => ModelController;

let modelModule: Promise<ModelFactory> | undefined;

function loadModel() {
  if (!modelModule) {
    modelModule = new Promise<ModelFactory>((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "/cinematic/js/abu-al-joud-model.js";
      script.onload = () => {
        const factory = (window as Window & { saaeCreateAbuAlJoudScene?: ModelFactory })
          .saaeCreateAbuAlJoudScene;
        if (factory) resolve(factory);
        else reject(new Error("Character module did not initialize"));
      };
      script.onerror = () => {
        script.remove();
        modelModule = undefined;
        reject(new Error("Character module could not load"));
      };
      document.head.appendChild(script);
    });
  }
  return modelModule;
}

type AbuAlJoud3DProps = {
  active?: boolean;
  cue?: string | number;
  interactive?: boolean;
  label: string;
  onActivate: () => void;
  speech: string;
  status: string;
};

export function AbuAlJoud3D({
  active = true,
  cue,
  interactive = true,
  label,
  onActivate,
  speech,
  status,
}: AbuAlJoud3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ModelController | null>(null);
  const activateRef = useRef(onActivate);
  const activeRef = useRef(active);
  const reducedMotion = Boolean(useReducedMotion());
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [requested, setRequested] = useState(active);
  const isArabic = /[\u0600-\u06ff]/.test(label);

  useEffect(() => {
    activateRef.current = onActivate;
  }, [onActivate]);
  useEffect(() => {
    activeRef.current = active;
    if (active) setRequested(true);
    sceneRef.current?.setActive(active);
  }, [active]);

  useEffect(() => {
    if (!requested || !hostRef.current) return;
    let cancelled = false;
    const host = hostRef.current;
    setState("loading");
    loadModel()
      .then((createScene) => {
        if (cancelled) return;
        sceneRef.current = createScene(host, {
          reducedMotion,
          onActivate: () => {
            if (interactive) activateRef.current();
          },
        });
        sceneRef.current.setActive(activeRef.current);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [interactive, requested, reducedMotion]);

  useEffect(() => {
    if (active && state === "ready" && cue !== undefined) {
      sceneRef.current?.wave();
    }
  }, [active, cue, state]);

  return (
    <div className="aj3d-stage" data-model-state={state}>
      <div
        ref={hostRef}
        className="aj3d-canvas"
        role={interactive ? "group" : "img"}
        tabIndex={interactive ? 0 : undefined}
        aria-label={
          isArabic
            ? "أبو الجود، شخصية ثلاثية الأبعاد تفاعلية"
            : "Abu Al-Joud, interactive 3D character"
        }
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  sceneRef.current?.turn(event.key === "ArrowLeft" ? -0.3 : 0.3);
                } else if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onActivate();
                }
              }
            : undefined
        }
      />
      {state !== "ready" && (
        <div className="aj3d-loading" role="status">
          {state === "loading" ? (
            <span
              className="aj3d-loading-ring"
              aria-label={isArabic ? "جارٍ التحميل" : "Loading"}
            />
          ) : interactive ? (
            <button type="button" className="hmf-action" onClick={onActivate}>
              {label}
            </button>
          ) : null}
        </div>
      )}
      {state === "ready" && interactive && (
        <>
          <span className="aj3d-speech" aria-hidden="true">
            <i />
            {speech}
          </span>
          <span className="aj3d-status" aria-hidden="true">
            <i />
            {status}
          </span>
          <div
            className="aj3d-tools"
            role="group"
            aria-label={isArabic ? "حركة أبو الجود" : "Character controls"}
          >
            <button
              type="button"
              onClick={() => sceneRef.current?.wave()}
              title={isArabic ? "ألقِ التحية" : "Wave hello"}
              aria-label={isArabic ? "ألقِ التحية" : "Wave hello"}
            >
              <Hand size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => sceneRef.current?.reset()}
              title={isArabic ? "إعادة الاتجاه" : "Reset view"}
              aria-label={isArabic ? "إعادة الاتجاه" : "Reset view"}
            >
              <RotateCcw size={18} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
