# תוכנית – Milestone 2: משחק מלא – לוגיקה וממשק (ללא צליל וקונפטי)

> מקורות: `MILESTONES.md` (Milestone 2), `PRD.md` (סעיפים 3.ב, 4.2, 4.4, מקרי קצה), `ARCHITECTURE.md` (סעיפים 2.3, 2.4, 2.5, 2.10, "החלטות תכנון ראשוניות"), `DESIGN.md` (סעיף 1.1 – מצבי תצוגה, נוסחים, טבלת קצב; סעיפים 2.3–2.4, טבלת 2.7), ותמונות `wireframes.png`, `mockups.png`, `style-guide.png`.
> נקודת פתיחה: הקוד של Milestone 1 (מעטפת, לוח סטטי, ניווט). **אין** באבן דרך זו: צליל, `AudioContext`, קונפטי, מצב `paused`/"המשך משחק", `visibilitychange`, היסטוריה ו-`localStorage`, PWA.

## 0. דרישות מוקדמות

- אין תלויות חדשות. אין `.env`. אין Commit/Push.
- הרנדום: `Math.random()` לבחירת אינדקס 0–3 (ARCHITECTURE 2.3 כלל 1).

## 1. קבצים

```text
src/game/
  config.ts              (חדש)  קבועי קצב ו-MAX_ROUNDS
  colors.ts              (שינוי) הוספת randomColor()
  gameReducer.ts         (חדש)  State, Actions, Reducer טהור
  gameReducer.test.ts    (חדש)  בדיקות יחידה ל-Reducer
  sleep.ts               (חדש)  המתנה ניתנת לביטול (AbortSignal)
  useGame.ts             (חדש)  useReducer + רנדום + Sequence Controller + השהיית הודעת סיום
src/components/
  Board.tsx              (שינוי) הארה, עמעום, קלט pointerdown/מקלדת
  EndDialog.tsx          (חדש)  Overlay ניצחון/הפסד עם "אישור"
src/screens/
  HomeScreen.tsx         (שינוי) מקבל מצב משחק ופעולות כ-Props
src/App.tsx              (שינוי) בעלים של useGame; ביטול משחק בניווט ל"אודות"
src/App.test.tsx         (שינוי) התאמה לשינויים
src/game/game.test.tsx   (חדש)  בדיקות זרימת משחק מלאה עם Fake Timers
src/styles/index.css     (שינוי) Glow, עמעום, מצב לחוץ, Overlay, אזור הנחיה
```

## 2. קבועים – `src/game/config.ts`

לפי טבלת "קצב הצגת הרצף" ב-`DESIGN.md` (זהים בכל השלבים, ללא האצה):

| קבוע | ערך |
|---|---|
| `MAX_ROUNDS` | `10` |
| `FLASH_MS` – הארת צבע ברצף | `600` |
| `GAP_MS` – הפסקה בין צבעים | `250` |
| `START_DELAY_MS` – לפני הצגה אחרי "התחל משחק" | `1000` |
| `ROUND_DONE_MS` – חיווי השלב שהושלם נשאר | `1000` |
| `NEXT_ROUND_MS` – אחרי הצגת מספר השלב הבא, עד הצבע הראשון | `1000` |
| `END_DELAY_MS` – מהלחיצה הסופית עד הודעת ניצחון/הפסד | `1000` |
| `PRESS_MIN_MS` – הארה מינימלית בלחיצת שחקן | `300` |

ב-`colors.ts`: `randomColor(): ColorId` → `COLORS[Math.floor(Math.random() * 4)].id`.

## 3. מנוע המשחק – `src/game/gameReducer.ts` (טהור, ללא Side Effects)

**State** (ARCHITECTURE 2.5, בלי `paused` שמגיע ב-Milestone 4):

```ts
type Status = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';
type GameState = {
  status: Status;
  sequence: ColorId[];     // אורך = round
  round: number;           // 1–10
  inputIndex: number;
  completedRounds: number; // 0–10
  gameId: number;          // עולה בכל "התחל משחק" (ישמש את ההיסטוריה ב-M5)
  presentationId: number;  // עולה בכל כניסה ל-presenting ובכל ביטול
};
```

`initialState`: `idle`, `sequence: []`, `round: 1`, `inputIndex: 0`, `completedRounds: 0`, `gameId: 0`, `presentationId: 0`.

**Actions** – הצבע האקראי נוצר מחוץ ל-Reducer ומגיע בתוך ה-Action:

| Action | מותר ממצב | תוצאה |
|---|---|---|
| `start { color }` | `idle` | `sequence=[color]`, `round=1`, `inputIndex=0`, `completedRounds=0`, `gameId+1`, `presentationId+1`, → `presenting` |
| `presentationDone { presentationId }` | `presenting` | אם המזהה תואם → `awaitingInput`, `inputIndex=0`; מזהה מיושן → אין שינוי |
| `press { color, nextColor }` | `awaitingInput` | שגוי → `lost` (`completedRounds` נשאר `round-1`). נכון ולא אחרון → `inputIndex+1`. נכון ואחרון בשלב < 10 → `completedRounds=round`, `round+1`, `sequence=[...sequence, nextColor]`, `inputIndex=0`, `presentationId+1`, → `presenting`. נכון ואחרון בשלב 10 → `completedRounds=10`, → `won` |
| `dismiss` | `won`/`lost` | → `idle`, `round=1`, `sequence=[]`, `inputIndex=0`; `gameId`/`presentationId` נשמרים |
| `abort` (זמני, עד M4) | כל מצב שאינו `idle` | → `idle` כמו `dismiss`, ו-`presentationId+1` כדי שכל Callback ישן יתעלם |

Action שנשלח ממצב לא מורשה מחזיר את אותו אובייקט State ללא שינוי (כך לחיצה ב-`presenting`/`idle`/`won`/`lost` לא משפיעה). אין מצב שבו `round` עולה מעל 10.

## 4. Sequence Controller ותזמון – `src/game/useGame.ts` + `sleep.ts`

- `sleep(ms, signal)` מחזיר Promise שנפתר אחרי `ms`, או נדחה מיד כש-`signal` מבוטל (ומנקה את ה-Timer).
- `useGame()` מחזיק `useReducer(gameReducer, initialState)` ומחזיר:
  - `state`, `litColor` (הצבע המואר כרגע בהצגה, או `null`), `shownRound` (מספר השלב שבחיווי), `endingVisible` (האם להציג את ה-Overlay).
  - `startGame()` → `dispatch({ type: 'start', color: randomColor() })`.
  - `pressColor(color)` → `dispatch({ type: 'press', color, nextColor: randomColor() })`.
  - `dismiss()`, `abortGame()`.
- **Effect הצגה** – תלוי ב-`state.status` וב-`state.presentationId`. כשהמצב `presenting`:
  1. יוצר `AbortController`; ה-Cleanup של ה-Effect קורא ל-`abort()` ומכבה את `litColor`. כך ביטול, ניווט, ו-Strict Mode (שמריץ Effect פעמיים) לא משאירים Timer פעיל.
  2. אם `round === 1` (התחלת משחק): `shownRound=1`, המתנה `START_DELAY_MS`.
     אחרת (מעבר שלב): `shownRound=round-1` למשך `ROUND_DONE_MS`, ואז `shownRound=round` והמתנה `NEXT_ROUND_MS`.
  3. לכל צבע ברצף: `litColor=color` ← `FLASH_MS` ← `litColor=null` ← `GAP_MS` (בלי הפסקה אחרי הצבע האחרון).
  4. בסיום: `dispatch({ type: 'presentationDone', presentationId })` עם המזהה שנלכד בתחילת ה-Effect – כך סיום מיושן נדחה גם ב-Reducer (שכבת הגנה כפולה, ARCHITECTURE 2.3 כלל 5).
- **Effect הודעת סיום** – כש-`status` הופך ל-`won`/`lost`: `endingVisible=false`, Timer של `END_DELAY_MS`, ואז `endingVisible=true`. ה-Cleanup מבטל את ה-Timer. (ב-M3 יתווספו כאן הצליל והקונפטי באותה נקודה.)
- `shownRound` בכל מצב אחר: `idle` → `1`; `awaitingInput` → `round`; `won`/`lost` → `round` (השלב האחרון שהיה פעיל, לפי DESIGN 1.1).

## 5. ממשק

### 5.1 `Board.tsx`
Props: `litColor`, `mode: 'show' | 'presenting' | 'input' | 'locked'`, `onPress(color)`.
- `presenting`: הרבע המואר עם Glow (קלאס `is-lit`), כל השאר מעומעמים (קלאס `board--presenting`). `show`/`input`/`locked`: צבעים מלאים.
- קלט רק ב-`mode='input'`: `onPointerDown` → `onPress(color)` + הארה מקומית של הרבע (קלאס `is-pressed`). ההארה נשארת לפחות `PRESS_MIN_MS`, או עד `pointerup`/`pointercancel` (מאזין על `window`) – הארוך מביניהם. גם לחיצה שגויה מוארת. מקלדת: Enter/Space ב-`onKeyDown` → אותה פעולה עם הארה של `300ms`. לא משתמשים ב-`onClick` (כדי לא לספור לחיצה פעמיים).
- מחוץ ל-`input` הרבעים מסומנים `aria-disabled="true"` והלחיצה מתעלמת (לא `disabled`, כדי שהעיצוב והמבנה לא ישתנו). `touch-action: none` על הרבעים כדי למנוע זום/גלילה בלחיצה מהירה.
- Timers של הארת הלחיצה מנוקים ב-Unmount.

### 5.2 `HomeScreen.tsx`
מקבל מ-`App`: `state`, `litColor`, `shownRound`, `endingVisible`, `onStart`, `onPress`, `onDismiss`.

| מצב | חיווי שלב | שורת סטטוס (מעל הלוח) | אזור תחתון (מתחת ללוח) |
|---|---|---|---|
| `idle` | `שלב 1 מתוך 10` | ריק | כפתור **"התחל משחק"** |
| `presenting` | `shownRound` | **"המשחק מציג את הרצף"** | **"המתן..."** (לפי ה-Wireframes וה-Mockups), ללא כפתור |
| `awaitingInput` | `round` | **"התור שלך"** | **"הקש על הצבעים לפי הסדר"**, ללא כפתור |
| `won`/`lost` | `round` | ריק | ריק; ה-Overlay מוצג אחרי `END_DELAY_MS` |

לאזור התחתון גובה קבוע (כגובה הכפתור), כדי שהפריסה לא תקפוץ בין מצבים. המספרים בחיווי נשארים בתוך `<bdi>`.

### 5.3 `EndDialog.tsx`
- Overlay מעל אזור הלוח (הלוח נשאר מזוהה ברקע, לפי ה-Mockups): כרטיס `Surface` עם `Border` ופינות מעוגלות, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` לכותרת.
- ניצחון: כותרת **"כל הכבוד! ניצחת!"**, שורה **"השלמת את כל 10 השלבים"**.
- הפסד: כותרת **"נפסלת!"** באדום, שורה **"השלמת N שלבים"**; כש-N=0: **"לא הושלמו שלבים"**.
- כפתור ראשי כחול **"אישור"** בתוך הכרטיס → `dismiss`. הפוקוס עובר לכפתור כשההודעה נפתחת.

### 5.4 `App.tsx`
- `useGame()` חי ב-`App`, כך שמעבר מסכים לא מפרק אותו (ARCHITECTURE "החלטות תכנון").
- **פתרון זמני עד M4:** בניווט ל-**"אודות"** כש-`status !== 'idle'` → `abortGame()` ואז מעבר מסך. ה-Abort מעלה `presentationId`, ה-Cleanup של ה-Effects מבטל את כל ה-Timers ומכבה הארה. אין רישום תוצאה (ממילא אין היסטוריה עד M5).
- רענון דף: המצב חי רק בזיכרון (`useReducer`), לכן Refresh מתחיל תמיד ב-`idle`. אין שימוש ב-`localStorage`.

### 5.5 CSS (`index.css`)
- `.board--presenting .board__pad:not(.is-lit)` – עמעום (למשל `filter: brightness(0.45) saturate(0.7)`), בדומה למצב "הצגת רצף" ב-Mockups.
- `.is-lit`, `.is-pressed` – בהירות מוגברת ו-Glow בצבע הרבע (`box-shadow` + `filter: brightness(1.25)`), עם מעבר קצר (~80ms). Glow נפרד לכל צבע דרך משתנה CSS לכל רבע.
- `.board-wrap` (עוטף יחסי) + `.end-dialog` (מיקום אבסולוטי מעל הלוח), `.end-dialog__title` 32px Bold, `.end-dialog__title--loss` אדום, `.end-dialog__title--win` ירוק (כמו ב-Mockup), טקסט 16px.
- `.hint` – אזור התחתון בגובה קבוע, צבע `--text-muted`.
- שמירה על: ללא גלילה אופקית ב-360px, כיווניות RTL, הלוח `direction: ltr`.

## 6. בדיקות (Vitest + RTL)

**`gameReducer.test.ts`** (טהור, ללא Timers):
- `start` יוצר רצף באורך 1 ושלב 1; Actions ממצב לא מורשה לא משנים דבר (לחיצה ב-`idle`/`presenting`/`won`/`lost`).
- `presentationDone` עם מזהה מיושן מתעלם.
- לחיצות נכונות מקדמות `inputIndex`; השלמת שלב מוסיפה **צבע אחד** לסוף, הרצף הקודם הוא Prefix של הבא, `completedRounds` מתעדכן; אורכים 1, 2, …, 10 בשלבים 1, 2, …, 10; צבע חוזר מותר.
- טעות בשלב 1 → `lost`, `completedRounds=0`; טעות בשלב 5 → `lost`, `completedRounds=4`; טעות בצבע שאינו הראשון בשלב.
- השלמת שלב 10 → `won`, `completedRounds=10`, `round` נשאר 10 (אין שלב 11), ולחיצות נוספות לא משנות.
- `dismiss` → `idle` עם שלב 1; `abort` מכל מצב פעיל → `idle` ו-`presentationId` עולה.

**`game.test.tsx`** (רינדור `App`, `vi.useFakeTimers()`, `Math.random` מבוקר ב-`vi.spyOn`, לחיצות דרך `fireEvent.pointerDown`):
- "התחל משחק" → סטטוס "המשחק מציג את הרצף"; אחרי 1000ms הרבע הנכון מואר והשאר מעומעמים; אחרי 600ms כבה; הצגה של שלב 2 נמשכת `1000+1000+600+250+600`ms לפי הטבלה – אותו קצב בשלבים שונים.
- לחיצה בזמן ההצגה לא משנה דבר; אחרי ההצגה → "התור שלך".
- הפסד בשלב 1: אין Overlay מיד; אחרי 1000ms – "נפסלת!" + "לא הושלמו שלבים" + "אישור".
- הפסד בשלב 3: "השלמת 2 שלבים"; חיווי השלב נשאר "שלב 3 מתוך 10".
- ניצחון: משחק מלא של 10 שלבים → "כל הכבוד! ניצחת!" + "השלמת את כל 10 השלבים"; אין שלב 11.
- "אישור" → "שלב 1 מתוך 10" + "התחל משחק"; משחק חדש מייצר רצף חדש (`Math.random` מחזיר ערכים אחרים → הצבע הראשון שונה).
- מעבר ל"אודות" באמצע הצגה ובאמצע תור השחקן → חזרה ל"בית" מציגה מצב התחלה; קידום Timers לא מאיר רבע ולא משנה מצב (אין Timers ממתינים: `vi.getTimerCount() === 0`).
- `localStorage.setItem` לא נקרא במהלך משחק.

**`App.test.tsx`** – הבדיקות הקיימות נשארות ומותאמות לשינויים (למשל אזור התחתון).

## 7. ADRs לרישום בבנייה (ב-`ARCHITECTURE.md`)

- **ADR-2: תזמון ההצגה ב-Hook עם `AbortController` ו-`presentationId`** – Effect אחד לכל כניסה ל-`presenting`, ביטול ב-Cleanup ודחיית סיום מיושן ב-Reducer.
- **ADR-3: חיווי השלב בהמתנות שבין שלבים** – ה-Reducer מקדם את `round` מיד (כלל 10), והחיווי שעל המסך (`shownRound`) מנוהל ב-Controller כדי להציג את השלב שהושלם 1000ms ואז את השלב הבא.
- **ADR-4: `abort` זמני בניווט ל"אודות"** – יוחלף ב-`pause` ב-Milestone 4.

## 8. בדיקה עצמית בסיום הבנייה

1. `npm run typecheck`, `npm run test`, `npm run build` – עוברים.
2. הרצת `npm run dev` ובדיקה בדפדפן באמולציית מובייל (375px וגם 360px): משחק עד הפסד, משחק עד ניצחון (בעזרת קריאה זמנית בכלי המפתחים בלבד, לא בקוד), "אישור", מעבר ל"אודות" באמצע משחק, Refresh באמצע משחק, ללא שגיאות Console וללא גלילה אופקית.
3. סימון 🟡 ליד Milestone 2 ב-`MILESTONES.md` וכיבוי השרת.

## 9. Definition of Done – איך כל סעיף נבדק

| סעיף | בדיקה |
|---|---|
| התחלה, אורכי רצף 1/2/10, Prefix | `gameReducer.test.ts` + `game.test.tsx` |
| הארה נבדלת לכל צבע, קצב קבוע לפי הטבלה | `game.test.tsx` (תזמון) + בדיקה חזותית בדפדפן |
| לחיצות ב-`presenting` חסומות, נכונות מקדמות, שגויה מפסידה | שתי קבוצות הבדיקות |
| הפסד בשלב 1, הפסד מתקדם, ניצחון, אין שלב 11, רצף חדש אחרי "אישור" | `game.test.tsx` |
| הודעה ו"אישור" בנוסח הנכון, מספר שלבים שהושלמו | `game.test.tsx` |
| Refresh מאפס, אין אחסון מתמיד | בדיקה בדפדפן + בדיקת `localStorage` |
| מעבר ל"אודות" לא משאיר הארה או Timer | `game.test.tsx` (`getTimerCount`) + דפדפן |
