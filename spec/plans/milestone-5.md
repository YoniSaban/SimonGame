# Milestone 5 – היסטוריית משחקים ומחיקה מאושרת

מקורות: `MILESTONES.md` (Milestone 5), `PRD.md` §4.3 (יציאה בזמן הודעת הסיום), §4.4, מקרי קצה (Refresh, היסטוריה ריקה, מגבלה, ביטול מחיקה, אחסון חסום), `DESIGN.md` §1.2, §1.3, §2.3 (History Cards, Dialog), `ARCHITECTURE.md` §2.3 (כללים 4, 8, 9), §2.5 (Game Result), §2.6 (זרימת "אודות"), החלטת התכנון "היסטוריה", Mockup "אודות" ו-"אודות – אישור מחיקה".

## מצב נוכחי (מהקוד)
- `AboutScreen.tsx`: כרטיס "על המשחק", כותרת "10 המשחקים האחרונים" וחיווי ריק קבוע **"עדיין אין משחקים שמורים"**; אין קריאה מאחסון.
- `gameReducer.ts`: `gameId` עולה בכל `start`; `won`/`lost` נשמרים עד `dismiss` או `pause` (שמחזירים ל-`idle` ושומרים את `gameId`). `completedRounds` נכון ב-`won` (10) וב-`lost`.
- `App.tsx`: מחזיק את `useGame()` ואת המסך הנוכחי. `main.tsx` עוטף ב-`StrictMode`.
- אין שום שימוש ב-`localStorage`.

## 1. History Repository – `src/history/historyStore.ts` (חדש, ללא React)
- קבועים: `HISTORY_KEY = 'simon.history.v1'`, `MAX_HISTORY = 10`.
- טיפוסים לפי `ARCHITECTURE.md` §2.5:
  - `GameResult = { id: string; finishedAt: string /* ISO 8601 */; completedRounds: number; outcome: 'win' | 'loss' }`
  - `HistoryData = { schemaVersion: 1; results: GameResult[] }`
- `loadHistory(): { ok: true; results: GameResult[] } | { ok: false }`
  - הכל בתוך `try/catch` (גישה ל-`localStorage` עצמה עלולה לזרוק).
  - אין מפתח → `ok: true`, רשימה ריקה.
  - JSON לא תקין / `schemaVersion` שגוי / `results` שאינו מערך → `ok: false` (חיווי "ההיסטוריה לא זמינה").
  - רשומה בודדת לא תקינה (שדות חסרים, `completedRounds` מחוץ ל-0–10 או לא שלם, `outcome` אחר, תאריך לא ניתן לפענוח) מסוננת בשקט; חיתוך ל-10 ראשונות.
- `addResult(result): boolean` – קורא את הקיים (רשומות תקינות בלבד; אם הקריאה נכשלה מתחיל מרשימה ריקה), מוסיף בראש, חותך ל-10, כותב. `true` רק אם הכתיבה הצליחה.
- `clearHistory(): boolean` – כותב `{ schemaVersion: 1, results: [] }` לאותו מפתח. `true` רק בהצלחה (אין לטשטש כישלון).
- `createResult(completedRounds, outcome, now = new Date()): GameResult` – `id` מזמן + מספר אקראי (לא `crypto.randomUUID`), `finishedAt = now.toISOString()`.
- הפונקציות לא זורקות לעולם.

## 2. Hook – `src/history/useHistory.ts` (חדש)
- מצב: `results`, `loadFailed` (קריאה נכשלה), `saveFailed` (השמירה האחרונה נכשלה), `clearFailed` (המחיקה האחרונה נכשלה).
- טעינה ראשונית ב-`useState(() => loadHistory())` (פעם אחת, ללא Effect).
- `record(result)`: `addResult` → בהצלחה טוען מחדש את התצוגה (התצוגה משקפת את מה שבאמת נשמר) ומאפס `saveFailed`; בכשל `saveFailed = true` והרשימה לא משתנה.
- `clear()`: `clearHistory` → בהצלחה רשימה ריקה ו-`clearFailed = false`; בכשל `clearFailed = true` והרשימה נשארת כפי שהייתה.

## 3. רישום תוצאה פעם אחת – `src/App.tsx`
- `const history = useHistory();`
- Effect על `game.state.status` + `game.state.gameId`: כשהמצב `won` או `lost` **ו**-`gameId !== lastRecordedGameId.current` → מעדכן את ה-`ref` **לפני** הכתיבה, ואז `history.record(createResult(completedRounds, status === 'won' ? 'win' : 'loss'))`.
- הרישום מתבצע ברגע הכניסה ל-`won`/`lost` (זמן הלחיצה האחרונה), לא בהצגת ההודעה – כך יציאה מהמסך בהמתנה לפני ההודעה או בזמן הצגתה (`pause` → `idle`) לא מונעת ולא משכפלת רישום (`PRD.md` §4.3).
- השהיה, Refresh, ניווט ו-`dismiss` לא עוברים ב-`won`/`lost` עם `gameId` חדש → אין רישום. ה-Reducer נשאר ללא Side Effects (כלל 4).
- React Strict Mode מריץ Effects פעמיים ב-Mount בלבד; ה-`ref` מבטיח רשומה אחת גם אם ה-Effect רץ שוב עבור אותו `gameId`.
- `AboutScreen` מקבל `history` (רשימה, דגלי כשל, `clear`).

## 4. מסך אודות – `src/screens/AboutScreen.tsx`
- כרטיס "על המשחק" וכותרת "10 המשחקים האחרונים" ללא שינוי.
- **רשימה** (`<ol>` של כרטיסים, מהחדש לישן), לפי ה-Mockup: בצד ימין שתי שורות – **"שלבים שהושלמו: N"** (מודגש, N בתוך `<bdi>`) ו-**"ניצחון"** / **"הפסד"** (Caption, ירוק/אדום מאופק – והמילה עצמה נושאת את המשמעות, לא רק הצבע); בצד שמאל תאריך ושעה ב-Caption.
- **פורמט תאריך:** `new Date(finishedAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })` – למשל `21.10.2026, 14:30`, בזמן המקומי של המכשיר, בתוך `<bdi>`. נגזר בתצוגה בלבד, לא נשמר כמחרוזת.
- **ריק:** אם אין רשומות – החיווי הקיים **"עדיין אין משחקים שמורים"**, וכפתור המחיקה **לא מוצג**.
- **כפתור "מחק היסטוריה"** מתחת לרשימה, רק כשיש לפחות רשומה אחת; סגנון משני (משטח Surface עם קו מתאר, כמו ב-Mockup).
- **הודעות כשל** (פס קטן בסגנון ה-`audio-error` הקיים, `role="alert"`), מעל הרשימה:
  - קריאה נכשלה: **"לא ניתן לטעון את היסטוריית המשחקים."**
  - שמירה נכשלה: **"לא הצלחנו לשמור את תוצאת המשחק האחרון."**
  - מחיקה נכשלה: **"המחיקה נכשלה. ההיסטוריה לא נמחקה."**
- ההודעות לא חוסמות דבר: המשחק ממשיך לעבוד כרגיל.

## 5. Dialog אישור מחיקה – `src/components/ConfirmDialog.tsx` (חדש)
- נפתח מ-"מחק היסטוריה"; מצב פתוח/סגור נשמר ב-`AboutScreen` (`useState`). שכבת UI בתוך מסך אודות, לא מסך שלישי.
- Scrim כהה על כל המסך, כרטיס **בהיר** (White, טקסט כהה) מעוגל במרכז, לפי ה-Mockup:
  - כותרת **"למחוק את ההיסטוריה?"**, הסבר **"כל תוצאות המשחקים יימחקו."**
  - שני כפתורים בשורה; ב-RTL – **"מחק"** (אדום, Primary Red) מימין ו-**"ביטול"** (אפור בהיר, משני) משמאל, כמו ב-Mockup.
- `role="alertdialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby`; פוקוס ראשוני על **"ביטול"** (הפעולה הבטוחה). מקש Escape = ביטול.
- **"ביטול"** → סוגר, ללא קריאה לאחסון. **"מחק"** → `history.clear()`, סוגר; התצוגה מתעדכנת לחיווי הריק, או – בכשל – הרשימה נשארת ומוצגת הודעת הכשל.

## 6. CSS – `src/styles/index.css`
- `.history-list`, `.history-card` (Surface, קו Border, `--radius-card`, ריווח 12/16), `.history-card__rounds`, `.history-card__outcome--win/--loss`, `.history-card__date` (Caption, `--text-muted`).
- `.btn--secondary` (לכפתור "מחק היסטוריה"), `.storage-error` (שימוש חוזר בסגנון `.audio-error`).
- `.confirm-dialog` (Scrim, `position: fixed`), `.confirm-dialog__card` (לבן), `.btn--danger` (אדום), `.btn--light` (אפור בהיר).
- גלילה: הרשימה גוללת בתוך עמוד המובייל (`.app__content` כבר גולל); ללא גלילה אופקית ב-360px.

## 7. בדיקות (Vitest + RTL)
- `src/history/historyStore.test.ts`:
  - טעינה ריקה; הוספה בראש הרשימה; 11 הוספות → 10 רשומות, החדשה ראשונה והישנה ביותר הוסרה.
  - JSON פגום / `schemaVersion` שגוי → `ok: false`; רשומות לא תקינות מסוננות.
  - `setItem` / `getItem` זורקים (Mock של `Storage.prototype`) → `addResult` / `clearHistory` מחזירים `false`, `loadHistory` מחזיר `ok: false`, ללא חריגה.
  - `clearHistory` מרוקן.
- `src/history/history.test.tsx` (אינטגרציה דרך `App`, עם Fake Timers וה-Mocks הקיימים של אודיו/קונפטי, כמו ב-`game.test.tsx`):
  - הפסד בשלב 1 → בדיוק רשומה אחת: "שלבים שהושלמו: 0", "הפסד", תאריך מוצג.
  - ניצחון אחרי 10 שלבים → רשומה אחת "שלבים שהושלמו: 10", "ניצחון".
  - השהיה (מעבר לאודות / `visibilitychange`) באמצע משחק → אין רשומה; יציאה בזמן ההמתנה לפני הודעת הסיום ובזמן הצגתה → רשומה אחת בלבד.
  - "אישור" + משחק נוסף → שתי רשומות, החדשה ראשונה.
  - Render תחת `<StrictMode>` → רשומה אחת לכל משחק.
  - שמירה ב-`localStorage` ושחזור אחרי `unmount` + Render מחדש (סימולציית Refresh).
  - Dialog: "ביטול" לא משנה דבר; "מחק" מרוקן ומציג חיווי ריק והכפתור נעלם.
  - כשל כתיבה → המשחק מסתיים כרגיל + הודעת "לא הצלחנו לשמור..." באודות; כשל מחיקה → הודעת "המחיקה נכשלה..." והרשימה נשארת.
- `src/test/setup.ts`: `localStorage.clear()` לפני כל בדיקה, כדי שבדיקות לא ישפיעו זו על זו.
- הבדיקות הקיימות (`App.test.tsx` – חיווי ריק והיעדר כפתור מחיקה) ממשיכות לעבור ללא שינוי.

## 8. ADR
- **ADR-9: רישום תוצאה בכניסה ל-`won`/`lost` ב-Effect של `App` עם Guard של `gameId`** – למה ברגע הסיום ולא בהצגת ההודעה; התצוגה נטענת מחדש מהאחסון אחרי כתיבה; כשל אחסון כדגלים ב-Hook ולא כחריגה.

## 9. בדיקה ידנית ו-Build
- `npm run typecheck`, `npm run test`, `npm run build`.
- `npm run dev` באמולציית מובייל (360px): הפסד וניצחון מופיעים באודות; Refresh משאיר אותם; 11 משחקים (קצרים – הפסד מיידי) → 10 רשומות; ביטול/מחיקה; היסטוריה ריקה ללא כפתור.
- כשל אחסון ידני: בכלי המפתחים, לשים במפתח `simon.history.v1` ערך פגום → הודעת "לא ניתן לטעון...", והמשחק עובד.
- `npm run build` + `npm run preview` (`http://localhost:4173/SimonGame/`) – המשחק וההיסטוריה עובדים, ללא דף לבן.
- סימון 🟡 ב-`MILESTONES.md`. ה-Push ובדיקת האתר החי – רק אחרי אישור.

## מחוץ לתכולה
- PWA / Offline / אייקונים (Milestone 6). אין שינוי במסך הבית או בלוגיקת המשחק.
