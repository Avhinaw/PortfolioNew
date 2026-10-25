import type { Say } from '@/game/types';

/** "S3" -> "S 3" (English, read letter-by-letter) / "एस 3" (Hindi). */
const coachEn = (c: string) => c.replace(/^S(\d)$/, 'S $1');
const coachHi = (c: string) => c.replace(/^S(\d)$/, 'एस $1');

export const paIntro = (): Say => ({
  en: 'Attention please. Train number 1 2 9 5 1, the Last Call Express, departs in two minutes thirty seconds. Passengers are requested to keep their tickets ready.',
  hi: 'यात्रीगण कृपया ध्यान दें! गाड़ी संख्या 1 2 9 5 1, लास्ट कॉल एक्सप्रेस, दो मिनट तीस सेकंड में रवाना होगी। यात्रियों से अनुरोध है कि अपने टिकट तैयार रखें।',
});
export const paPlatform = (p: number, coach: string): Say => ({
  en: `Train number 1 2 9 5 1 will arrive shortly on platform number ${p}. Coach position: ${coachEn(coach)}.`,
  hi: `गाड़ी संख्या 1 2 9 5 1 कुछ ही देर में प्लेटफ़ॉर्म संख्या ${p} पर आएगी। कोच की स्थिति: ${coachHi(coach)}।`,
});
export const paArrival = (p: number): Say => ({
  en: `Attention please. Train number 1 2 9 5 1, the Last Call Express, is now arriving on platform number ${p}.`,
  hi: `यात्रीगण कृपया ध्यान दें। गाड़ी संख्या 1 2 9 5 1, लास्ट कॉल एक्सप्रेस, अब प्लेटफ़ॉर्म संख्या ${p} पर आ रही है।`,
});
export const paChange = (p: number): Say => ({
  en: `Platform change. The train will now arrive on platform number ${p}.`,
  hi: `प्लेटफ़ॉर्म में बदलाव। गाड़ी अब प्लेटफ़ॉर्म संख्या ${p} पर आएगी।`,
});
export const paShift = (p: number): Say => ({
  en: `Attention please. The train has been moved to platform number ${p}.`,
  hi: `यात्रीगण कृपया ध्यान दें। गाड़ी को प्लेटफ़ॉर्म संख्या ${p} पर ले जाया गया है।`,
});
export const paDepart = (): Say => ({
  en: 'Attention please. The train is about to depart. Passengers are requested to board immediately.',
  hi: 'यात्रीगण कृपया ध्यान दें। गाड़ी रवाना होने वाली है। यात्रियों से अनुरोध है कि तुरंत सवार हों।',
});
