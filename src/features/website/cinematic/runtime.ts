export type CinematicRuntimeContext = { locale: "ar" | "en"; direction: "rtl" | "ltr"; reducedMotion: boolean };
export type CinematicRuntime = { init(root: HTMLElement, ctx: CinematicRuntimeContext): void | (() => void) };
