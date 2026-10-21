# תוכנית – Milestone 3: צלילים וקונפטי

> מקורות: `MILESTONES.md` (Milestone 3), `PRD.md` (סעיפים 3.ב, 4.2, 4.4, מקרי קצה – "צליל במצב שקט"), `ARCHITECTURE.md` (סעיף 1 – Web Audio, canvas-confetti; סיכוני אודיו במובייל; סעיף 2.3 כללים 5, 11; סעיף 2.5; זרימת "תחילת משחק"; "החלטות תכנון ראשוניות"; ADR-1, ADR-2, ADR-4), `DESIGN.md` (סעיף 1.1 – טבלת קצב, מצבי ניצחון/הפסד; סעיף 2.4 – Motion & Feedback).
> נקודת פתיחה: הקוד של Milestone 2 (משחק שקט מלא, `useGame` עם `AbortController`, `abort` זמני במעבר ל"אודות"). **אין** באבן דרך זו: מצב `paused`, כפתור "המשך משחק", `visibilitychange`/`pagehide`, היסטוריה, PWA.

## 0. דרישות מוקדמות

- תלויות חדשות (גרסה מדויקת, בלי `^`/`~`): `canvas-confetti` `1.9.4` (dependencies), `@types/canvas-confetti` `1.9.0` (devDependencies). לעדכן את ADR-1 בהתאם.
- אין `.env`, אין Commit/Push. אין קובצי אודיו – כל הצלילים נוצרים בקוד (Offline).
- **נוסח הודעת כשל האודיו (אושר על ידי המשתמש):** **"לא הצלחנו להפעיל את הצליל. לחץ שוב על "התחל משחק"."** (הנוסח אינו מופיע ב-`DESIGN.md`; אושר בשלב התכנון.)

## 1. קבצים

| קובץ | פעולה |
|---|---|
| `src/audio/audioEngine.ts` | **חדש** – Audio Engine (Web Audio API), ללא React |
| `src/audio/audioEngine.test.ts` | **חדש** – בדיקות יחידה עם `AudioContext` מזויף |
| `src/effects/confetti.ts` | **חדש** – עטיפה דקה ל-`canvas-confetti` (הפעלה + ניקוי) |
| `src/game/useGame.ts` | עדכון – פתיחת אודיו ב"התחל משחק", צלילי רצף, צליל סיום, קונפטי, מצב שגיאת אודיו |
| `src/game/config.ts` | עדכון – קבועי צליל (תדרים, Envelope, משכי מוטיבי סיום) |
| `src/components/Board.tsx` | עדכון – צליל לחיצה המחובר למצב `pressed` של הרבע |
| `src/screens/HomeScreen.tsx` | עדכון – הצגת הודעת כשל אודיו; העברת `playTone` ללוח |
| `src/App.tsx` | עדכון – העברת ה-Props החדשים; `abortGame` עוצר גם צלילים |
| `src/styles/index.css` | עדכון – עיצוב הודעת הכשל (Caption, אדום/Soft Gray, בתוך אזור `.actions`) |
| `src/test/setup.ts` | עדכון – Mock גלובלי ל-`audioEngine` ול-`canvas-confetti` (jsdom אינו תומך ב-Web Audio וב-Canvas) |
| `src/game/game.test.tsx` | עדכון – בדיקות צליל/קונפטי/כשל אודיו/ביטול |
| `package.json`, `package-lock.json` | התלויות החדשות |
| `spec/ARCHITECTURE.md` | עדכון ADR-1 + ADRs חדשים (סעיף 7) |

## 2. Audio Engine – `src/audio/audioEngine.ts`

מודול יחיד (Singleton ברמת המודול), ללא React:

- `unlockAudio(): Promise<boolean>`
  - נקרא **סינכרונית** מתוך ה-Click של "התחל משחק" (לפני כל `await` אחר), כדי שהדפדפן יזהה Gesture.
  - יוצר `AudioContext` בפעם הראשונה (עם Fallback ל-`webkitAudioContext` בספארי ישן); אם `state !== 'running'` קורא `resume()`.
  - משמיע Buffer שקט קצר מתוך ה-Gesture (הדרך המקובלת "לשחרר" אודיו ב-iOS).
  - מחזיר `true` רק אם בסוף `ctx.state === 'running'`. כל חריגה, היעדר תמיכה, או `resume()` שלא הסתיים תוך `AUDIO_UNLOCK_TIMEOUT_MS` (2000ms) → `false`.
- `playTone(color: ColorId): () => void`
  - Oscillator (`triangle`) + `GainNode` עם Envelope: Attack 10ms ל-Gain 0.3, ובעצירה Release 40ms ל-0 ואז `stop()` – למניעת קליקים.
  - מחזיר פונקציית `stop` (אידמפוטנטית). הצליל נמשך עד שנקראת `stop` – כך משך הצליל זהה למשך ההארה.
  - אם אין `AudioContext` פעיל – No-op שמחזיר `stop` ריק (לא זורק).
- `playEndSound(outcome: 'won' | 'lost'): () => void`
  - **ניצחון:** ארפג'יו עולה קצר (4 תווים, למשל C5–E5–G5–C6, כ-150ms לתו, האחרון ארוך יותר).
  - **הפסד:** שני תווים נמוכים יורדים בגל `sawtooth` מרוכך (כ-350ms + 500ms).
  - מתוזמן כולו על שעון ה-`AudioContext` (`start(when)`), ומחזיר `stop` שמשתיק ועוצר את כל צמתי המוטיב.
- `stopAllSounds()` – עוצר כל צליל פעיל (המודול מחזיק `Set` של פונקציות `stop` פעילות; כל צליל מסיר את עצמו בסיום).

**תדרים לכל צבע** (ב-`config.ts`; ארבעה גבהים שונים בבירור, בהשראת Simon המקורי):

| צבע | תדר |
|---|---|
| ירוק | `415Hz` |
| אדום | `310Hz` |
| צהוב | `252Hz` |
| כחול | `209Hz` |

## 3. חיבור למשחק – `src/game/useGame.ts`

### 3.1 "התחל משחק" עם פתיחת אודיו
- `startGame` הופך לאסינכרוני: `const ok = await unlockAudio()` (הקריאה עצמה מתבצעת בתוך ה-Click), ורק אם `ok` → `dispatch({ type: 'start', ... })`.
- בכשל: `setAudioError(true)`, **לא** נשלח `start` – המשחק נשאר `idle`, הכפתור "התחל משחק" נשאר זמין, ולחיצה חוזרת עליו היא הניסיון החוזר מתוך Gesture. בהצלחה: `setAudioError(false)`.
- הגנה מלחיצה כפולה בזמן ההמתנה ל-`unlockAudio`: `ref` של "מתחיל כעת" – לחיצה נוספת באותו זמן מתעלמת.
- הפונקציה בנויה כך שב-Milestone 4 "המשך משחק" ישתמש באותו `unlockAudio` ובאותה הודעת כשל.

### 3.2 צלילים בהצגת הרצף
בתוך ה-Effect הקיים של ה-Sequence Controller (ADR-2):
```
setLitColor(c); stopTone = playTone(c);
await sleep(FLASH_MS, signal);
stopTone(); setLitColor(null);
```
ה-Cleanup של ה-Effect קורא גם ל-`stopTone` הנוכחי (אם יש), כך שביטול באמצע צבע עוצר מיד גם את הצליל.

### 3.3 צליל סיום וקונפטי
ב-Effect הקיים של `won`/`lost` (Timer של `END_DELAY_MS` = 1000ms), **באותו Callback** שמציג את ההודעה:
- `setEndingVisible(true)` + `stopEnd = playEndSound(status)`; אם `status === 'won'` → `stopConfetti = fireConfetti()`.
- Cleanup (יציאה מ-`won`/`lost` – "אישור" או `abort`): `clearTimeout`, `stopEnd?.()`, `stopConfetti?.()`, `setEndingVisible(false)`.
- כך הצליל, ההודעה והקונפטי מופיעים יחד, פעם אחת לכל כניסה למצב, ובהפסד אין קונפטי.

### 3.4 ביטול
- `abortGame` (הפתרון הזמני של ADR-4) קורא בנוסף ל-`stopAllSounds()` – רשת ביטחון מעבר ל-Cleanups של ה-Effects ושל הרבעים.
- הערכים המוחזרים מה-Hook מתווספים: `audioError`, ו-`playTone` (להעברה ללוח).

## 4. צליל לחיצת השחקן – `src/components/Board.tsx`

- `Board` ו-`Pad` מקבלים Prop חדש `playTone: (color) => () => void`.
- ב-`Pad`: `useEffect(() => { if (!pressed) return; return playTone(color.id); }, [pressed])` – הצליל מתחיל ברגע שההארה מתחילה (`pointerdown`), ונעצר כשההארה נגמרת (לפחות 300ms או כל עוד האצבע לוחצת). כך הצליל וההארה תמיד באותו משך, ופירוק הרבע (מעבר ל"אודות") עוצר את הצליל.
- לחיצה שגויה: `press` עדיין מפעיל `pressed` → צליל הצבע שנלחץ מושמע **מיד**, כמו בכל לחיצה; צליל ההפסד מגיע 1000ms אחר כך (סעיף 3.3).
- לחיצה בזמן `presenting` חסומה כבר היום (`enabled=false`) – לכן גם אין צליל.

## 5. קונפטי – `src/effects/confetti.ts`

- `fireConfetti(): () => void` – משתמש ב-`confetti` של `canvas-confetti` (הקנבס הגלובלי שהספרייה יוצרת, `position: fixed`), עם `zIndex` גבוה מזה של `.end-dialog` כדי שהקונפטי יופיע **מעל** חלונית הניצחון.
- צבעים: ארבעת צבעי המשחק (`#00D26A`, `#FF3B30`, `#FFD600`, `#00A3FF`).
- רגיל: כמה פרצים משני צידי המסך לאורך כ-2 שניות (`setInterval` מנוהל).
- `prefers-reduced-motion: reduce` (נבדק ב-`matchMedia` בזמן ההפעלה): פרץ **יחיד**, קטן וקצר (פחות חלקיקים, `ticks` נמוך) – הפחתת תנועה בלי לשנות את חוקי המשחק.
- הפונקציה המוחזרת: `clearInterval` + `confetti.reset()` – עוצרת ומנקה את הקנבס.

## 6. ממשק – `HomeScreen.tsx`, `App.tsx`, CSS

- `HomeScreen` מקבל `audioError` ו-`playTone`. כש-`status === 'idle' && audioError` מוצגת מעל כפתור "התחל משחק" שורת הודעה (`role="alert"`) בנוסח שאושר (סעיף 0). ההודעה נעלמת כשהמשחק מתחיל בהצלחה.
- `App` מעביר את ה-Props החדשים; אין שינוי בניווט מעבר לכך.
- CSS: `.audio-error` – Caption `14px`, צבע טקסט בהיר על רקע `Surface` עם גבול אדום עדין, פינות מעוגלות, ריווח מסולם `8/12/16/24`. ללא כפתור נוסף (הניסיון החוזר הוא "התחל משחק" עצמו) – כדי לא להוסיף פעולות שאינן ב-Spec.
- אין מתג השתקה ואין כפתורי סאונד (PRD).

## 7. ADRs לרישום בבנייה (ב-`ARCHITECTURE.md`)

- **עדכון ADR-1:** הוספת `canvas-confetti` `1.9.4` ו-`@types/canvas-confetti` `1.9.0`.
- **ADR-5: Audio Engine כמודול יחיד, וצליל הלחיצה צמוד להארה** – `unlockAudio` עם Timeout והחזרת `boolean`; צלילים כ-`start → stop` שמשך הצליל נקבע לפי ההארה; צליל הלחיצה ב-Effect של `pressed` ברבע; כשל פתיחה משאיר `idle` והניסיון החוזר הוא "התחל משחק".
- **ADR-6: קונפטי וצליל סיום מופעלים ב-Callback של הודעת הסיום** – הפעלה אחת לכל כניסה ל-`won`/`lost`, ניקוי ב-Cleanup של אותו Effect; פרץ יחיד ב-`prefers-reduced-motion`.

## 8. בדיקות (Vitest + RTL)

ב-`setup.ts`: `vi.mock` ל-`src/audio/audioEngine` (ברירת מחדל: `unlockAudio` מחזיר `true`, `playTone`/`playEndSound` מחזירים `stop` מסוג `vi.fn`) ול-`canvas-confetti`. בדיקות קיימות של Milestone 2 ממשיכות לעבור (התחלת משחק אחרי `await` של `unlockAudio`).

**`audioEngine.test.ts`** (עם `AudioContext` מזויף על `globalThis`):
- ארבעת הצבעים יוצרים Oscillator בארבעה תדרים שונים.
- `stop` מפעיל Release ועוצר את ה-Oscillator; קריאה כפולה בטוחה.
- `unlockAudio` מחזיר `false` כש-`resume()` נדחה, כשהוא לא מסתיים עד ה-Timeout, או כשאין `AudioContext`; ו-`true` כשהמצב `running`.
- `stopAllSounds` עוצר את כל הצלילים הפעילים; מוטיבי ניצחון והפסד שונים זה מזה.

**`game.test.tsx`** (עם הזיופים):
- בהצגת רצף: `playTone` נקרא לכל צבע ברצף, בסדר הנכון, וה-`stop` שלו נקרא אחרי 600ms.
- לחיצת שחקן: `playTone` של הצבע שנלחץ נקרא מיד ב-`pointerdown`, ו-`stop` אחרי 300ms או בשחרור – המאוחר מביניהם.
- לחיצה בזמן `presenting`: אין `playTone`.
- לחיצה שגויה: צליל הצבע מיד; `playEndSound('lost')` **לא** נקרא לפני 1000ms ונקרא בדיוק יחד עם הופעת "נפסלת!"; `confetti` לא נקרא.
- ניצחון: אחרי 1000ms מהלחיצה האחרונה – הודעת ניצחון, `playEndSound('won')` ו-`confetti` נקראים פעם אחת; "אישור" מפעיל `confetti.reset` ו-`stop` של צליל הסיום.
- כשל אודיו: `unlockAudio` מחזיר `false` → מוצגת ההודעה בעברית, המצב נשאר "התחל משחק"/"שלב 1 מתוך 10", ואין `playTone`; לחיצה חוזרת עם `true` מתחילה משחק וההודעה נעלמת.
- לחיצה כפולה מהירה על "התחל משחק" בזמן ההמתנה ל-`unlockAudio` מתחילה משחק אחד בלבד.
- מעבר ל"אודות" באמצע צבע ברצף ובאמצע לחיצה: `stop` של הצליל הפעיל נקרא, `stopAllSounds` נקרא, ואין Timer יתום (`vi.getTimerCount()`).
- מעבר ל"אודות" בהמתנה שלפני הודעת הסיום: אין צליל סיום ואין קונפטי (לפי הפתרון הזמני, `abort` חוזר ל-`idle`).

## 9. בדיקה עצמית בסיום הבנייה

1. `npm run typecheck`, `npm run test`, `npm run build` – עוברים.
2. `npm run dev` ובדיקה בדפדפן באמולציית מובייל: ארבעה צלילים שונים ברצף ובלחיצה, צליל הפסד והודעה יחד שנייה אחרי טעות, ניצחון עם צליל וקונפטי מעל החלונית (לצורך הבדיקה – משחק עד שלב 10, או סימולציה בבדיקה אוטומטית), אין שגיאות ב-Console.
3. בדיקת `prefers-reduced-motion` באמולציה – פרץ קונפטי יחיד וקצר.
4. סגירת השרת בסיום.

**בדיקת טלפון אמיתי (מבוצעת על ידי המשתמש):** בשלב "Run" השרת יורץ עם `npm run dev -- --host`, כדי שאפשר יהיה לפתוח את המשחק מהטלפון באותה רשת Wi-Fi (כתובת המחשב ברשת). ייתכן ש-Windows ישאל לאשר גישת רשת ל-Node – המשתמש מאשר. הוראות פשוטות יינתנו: צלילים ברצף ובלחיצה, צליל הפסד, ניצחון וקונפטי, ובדיקה עם מתג שקט דולק וכבוי. התוצאה תדווח כפי שהמשתמש מסר – לא תוצג כעוברת לפני שבוצעה.

## 10. Definition of Done – איך כל סעיף נבדק

| סעיף | אופן הבדיקה |
|---|---|
| ארבעה צלילים שונים ברצף ובלחיצה | בדיקת יחידה לתדרים + בדיקת זרימה ל-`playTone` ברצף ובלחיצה + האזנה בדפדפן |
| טעות: צליל הצבע מיד, הפסד + הודעה אחרי שנייה | בדיקת זרימה עם Fake Timers (לפני/אחרי 1000ms) + האזנה בדפדפן |
| צליל ניצחון וקונפטי בניצחון בלבד | בדיקת זרימה לניצחון ולהפסד (קונפטי נקרא / לא נקרא) + בדיקה חזותית |
| כשל אודיו: הודעה בעברית, ללא התקדמות שקטה, ניסיון חוזר עובד | בדיקת זרימה עם `unlockAudio` שמחזיר `false` ואז `true` + בדיקות יחידה ל-Timeout/דחייה |
| מעבר ל"אודות" לא משאיר צליל פעיל | בדיקת זרימה (`stop` נקרא, אין Timer יתום) + בדיקה בדפדפן |
| בדיקת טלפון אמיתי כולל מצב שקט | הוראות למשתמש בשלב Run; התוצאה מדווחת לפי מה שהמשתמש מסר |
