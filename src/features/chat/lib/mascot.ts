/** One character identity shared by the website, LMS and assistant. */
export const ABU_AL_JOUD = {
  welcome: "/mascot/abu-al-joud/welcome.webp",
  explain: "/mascot/abu-al-joud/explain.webp",
  think: "/mascot/abu-al-joud/think.webp",
  celebrate: "/mascot/abu-al-joud/celebrate.webp",
  vision: "/mascot/abu-al-joud/vision.webp",
  avatar: "/mascot/abu-al-joud/avatar.webp",
} as const;

export const HERO_MASCOT_IMAGES = [
  ABU_AL_JOUD.welcome,
  ABU_AL_JOUD.explain,
  ABU_AL_JOUD.explain,
  ABU_AL_JOUD.celebrate,
  ABU_AL_JOUD.vision,
  ABU_AL_JOUD.vision,
] as const;

/** Decode the small pose set ahead of a scroll transition, without blocking it. */
export function preloadMascotPoses() {
  for (const src of Object.values(ABU_AL_JOUD)) {
    const image = new Image();
    image.src = src;
    void image.decode().catch(() => {});
  }
}
