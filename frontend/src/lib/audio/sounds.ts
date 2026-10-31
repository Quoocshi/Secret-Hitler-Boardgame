export const sounds = {
  softui: { file: "softui.wav", gain: 0.65, priority: 1 },
  hardui: { file: "hardui.wav", gain: 0.65, priority: 1 },
  card: { file: "card-flip.mp3", gain: 0.7, priority: 2 },
  paper: { file: "paper_quick.wav", gain: 0.7, priority: 2 },
  policies: { file: "3_policy.mp3", gain: 0.65, priority: 3 },
  notify: { file: "notify.wav", gain: 0.5, priority: 4 },
  error: { file: "error.wav", gain: 0.4, priority: 8 },
  knock: { file: "knock.mp3", gain: 0.6, priority: 2 },
  start: { file: "gavel_game_start.mp3", gain: 0.65, priority: 7 },
  gavel: { file: "gavel_x1.mp3", gain: 0.6, priority: 6 },
  gunshot: { file: "gunshot.mp3", gain: 0.3, priority: 9 },
} as const;

export type SoundId = keyof typeof sounds;

export function soundUrl(id: SoundId) {
  return `${import.meta.env.BASE_URL}sound/${sounds[id].file}`;
}
