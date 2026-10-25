/**
 * Recorded station audio you supplied (in /public/audio).
 *  - chimeA / chimeB: short tonal chimes played before announcements (A for routine, B for important ones).
 *  - trainTime: a ~17s recorded announcement, played when the train arrives.
 *
 * TRAIN_TIME_LANG says which language the recorded voice is in:
 *   'hi'   -> only played when Hindi is selected   (English mode speaks the English line instead)
 *   'en'   -> only played when English is selected
 *   'both' -> played in either mode (use this if the recording is bilingual)
 */
export const CLIPS = {
  chimeA: '/audio/indian_railway.mp3',
  chimeB: '/audio/indian_railways1.mp3',
  trainTime: '/audio/train_time.mp3',
} as const;
export type ClipName = keyof typeof CLIPS;
export const TRAIN_TIME_LANG: 'hi' | 'en' | 'both' = 'both';
export const IMPORTANT_KINDS = ['intro', 'platform', 'arrival', 'shift', 'depart'];
