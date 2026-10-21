# Milestone 4 – השהיה וחידוש משחק + פרסום אוטומטי ל-GitHub Pages

מקורות: `MILESTONES.md` (Milestone 4), `PRD.md` §4.3 ותרחיש "מעבר למסך אודות והמשך משחק", `DESIGN.md` §1.1 (מצב "מושהה", קצב הצגה), `ARCHITECTURE.md` §2.3 (כללים 5–11), §2.4, §2.9, החלטת התכנון "השהיה כמצב `paused`", ADR-2/3/4/5/6.

## מצב נוכחי (מהקוד)
- `gameReducer.ts`: מצבים `idle | presenting | awaitingInput | won | lost`; Action זמני `abort` (ADR-4).
- `useGame.ts`: Effect הצגה לפי `presentationId` עם `AbortController`; Effect סיום (`won`/`lost`) עם Timer של 1000ms, צליל וקונפטי; `abortGame()` שולח `abort` + `stopAllSounds()`.
- `App.tsx`: `navigate('about')` קורא ל-`abortGame()`.
- אין `.github/workflows`. ה-Repository `YoniSaban/SimonGame` **ציבורי** (נבדק), ו-GitHub Pages **עדיין לא מופעל** בו (ה-API מחזיר 404).

## חלק א – השהיה וחידוש

### 1. Reducer (`src/game/gameReducer.ts`)
- להוסיף `'paused'` ל-`Status`.
- להוסיף לשדות המצב `resumed: boolean` – `true` רק בהצגה שנפתחה מ-"המשך משחק"; `start` ו-מעבר שלב מאפסים ל-`false`. (נדרש כדי שהחידוש ימתין `START_DELAY_MS` ולא את ההמתנות שבין שלבים.)
- Action `pause`:
  - מ-`presenting` / `awaitingInput` → `paused`, `inputIndex: 0`, `presentationId + 1` (סיום Playback מיושן נדחה). `sequence`, `round`, `completedRounds`, `gameId` ללא שינוי.
  - מ-`won` / `lost` → `idle` (dismiss אוטומטי, כלל 11). התוצאה אינה נרשמת שוב (ההיסטוריה תגיע ב-M5; ה-`gameId` נשמר).
  - מ-`idle` / `paused` → ללא שינוי.
- Action `resume`: רק מ-`paused` → `presenting`, `inputIndex: 0`, `resumed: true`, `presentationId + 1`. ריבוי `resume` – השני נדחה כי המצב כבר אינו `paused`.
- `press` ו-`presentationDone` כבר נדחים בכל מצב שאינו המצב שלהם – כולל `paused`.
- **הסרת `abort`** (מוחלף ב-`pause`, לפי ADR-4).

### 2. Hook (`src/game/useGame.ts`)
- Effect ההצגה: ההמתנה הראשונה היא `START_DELAY_MS` כאשר `round === 1` **או** `resumed`; אחרת ההמתנות שבין שלבים כרגיל. `resumed` נכנס לתלויות.
- `pauseGame()`: `dispatch({ type: 'pause' })` + `stopAllSounds()`. ה-Cleanup הקיים של Effect ההצגה ושל Effect הסיום כבר מבטל Timers, הארה, צליל, הודעה וקונפטי ברגע שהמצב משתנה.
- `resumeGame()`: כמו `startGame` – `unlockAudio()` ראשון בתוך ה-Click, הגנת `ref` מפני לחיצה כפולה, ורק בהצלחה `dispatch({ type: 'resume' })`. בכשל נשארים `paused` ומוצגת הודעה (ראה סעיף 4).
- Visibility Handler: Effect אחד שמאזין ל-`visibilitychange` (כש-`document.visibilityState === 'hidden'`) ול-`pagehide`, וקורא ל-`pauseGame()`. חזרה לנראות לא עושה דבר (אין Resume אוטומטי).
- להחליף `abortGame` ב-`pauseGame` ב-API של ה-Hook.

### 3. App (`src/App.tsx`)
- `navigate('about')` קורא ל-`game.pauseGame()` במקום `abortGame()`. מעבר ל"בית" לא משנה דבר.

### 4. מסך הבית (`src/screens/HomeScreen.tsx`)
- `STATUS_TEXT.paused = 'המשחק מושהה'` (נוסח `DESIGN.md`).
- אזור הפעולות: ב-`paused` – כפתור ראשי **"המשך משחק"** (`onResume`) במקום ההנחיה. הכפתור מופיע **רק** ב-`paused`.
- `BOARD_MODE.paused = 'paused'`.
- הודעת כשל אודיו: מוצגת גם ב-`paused`, עם שם הכפתור הנכון – ב-`paused`: **"לא הצלחנו להפעיל את הצליל. לחץ שוב על "המשך משחק"."** (אותו נוסח מאושר מ-ADR-5, רק עם שם הכפתור שמוצג באותו רגע).
- חיווי השלב: ב-`paused` מוצג `round` (השלב החדש אם ההשהיה הייתה בהמתנה שבין שלבים) – כבר נגזר כך ב-`shownRound`, אין שינוי.

### 5. לוח (`src/components/Board.tsx` + CSS)
- `BoardMode` מקבל `'paused'`: כל ארבעת הרבעים מעומעמים (class `board--paused`, באותו עמעום של `board--presenting`), ללא קלט.
- `Pad`: כאשר `enabled` הופך ל-`false` באמצע לחיצה (השהיה בזמן שהאצבע על הרבע) – לבטל את ה-Timer וה-Listeners ולכבות `pressed`, כדי שלא תישאר הארה או צליל.

### 6. בדיקות (Vitest + RTL, Timers מזויפים, Audio Mock כמו היום)
עדכון בדיקות ה-"אודות" הקיימות (שבדקו ביטול) לבדוק השהיה, ובדיקות חדשות:
- Reducer: `pause` מכל מצב (כולל `won`/`lost` → `idle`, `idle`/`paused` ללא שינוי); `resume` רק מ-`paused`; `press`/`presentationDone` מיושן נדחים ב-`paused`; הרצף והשלב לא משתנים.
- מעבר ל"אודות" בזמן הצגה ובזמן שחזור: אין הארה, `stopAllSounds` נקרא, אין Timer פעיל; חזרה ל"בית" מציגה "המשחק מושהה" ו-"המשך משחק" ולא מתחילה הצגה מעצמה.
- "המשך משחק" אחרי שחזור חלקי: מוצג הרצף המלא (אותו רצף, אותו שלב), ואז השחזור מתחיל מההתחלה.
- השהיה בהמתנה שבין שלבים: בחידוש מוצג הרצף החדש כולל הצבע שנוסף, והחיווי מראה את השלב החדש.
- `visibilitychange` ל-`hidden` ו-`pagehide` משהים; חזרה לנראות לא מחדשת.
- יציאה בזמן ההמתנה לפני הודעת הסיום ובזמן הצגתה: חזרה ל-`idle`, ללא צליל/קונפטי.
- כשל `unlockAudio` ב-"המשך משחק": נשארים מושהים עם ההודעה; ניסיון חוזר מצליח.
- לחיצה כפולה מהירה על "המשך משחק" מפעילה הצגה אחת בלבד.
- "המשך משחק" לא מוצג ב-`idle` ובמצבי סיום.

### 7. תיעוד
- ADR חדש ב-`ARCHITECTURE.md`: השהיה כמצב `paused` + `resumed` + Visibility Handler (מאשר את החלטת התכנון ומחליף את ADR-4).
- `CLAUDE.md` → Run commands: להוסיף `npm run build` + `npm run preview` → `http://localhost:4173/SimonGame/`.
- `.claude/launch.json`: תצורת `preview` (פורט 4173) לבדיקה המקומית.

## חלק ב – פרסום אוטומטי ל-GitHub Pages

### 8. Workflow (`.github/workflows/deploy.yml`)
- טריגר: `push` ל-`main` (+ `workflow_dispatch` להרצה ידנית מתוך GitHub אם צריך).
- `permissions: contents: read, pages: write, id-token: write`; `concurrency: group: pages, cancel-in-progress: false`.
- Job `build`: `actions/checkout` → `actions/setup-node` עם `node-version-file: .nvmrc` ו-`cache: npm` → `npm ci` → `npm run typecheck` → `npm run test` → `npm run build` → `actions/upload-pages-artifact` עם `path: dist`.
- Job `deploy` (`needs: build`, `environment: github-pages`): `actions/deploy-pages`. Build/בדיקה שנכשלו עוצרים לפני הפריסה.
- גרסאות ה-Actions – Major יציב עדכני בעת הבנייה, נרשם ב-ADR.

### 9. בדיקה מקומית לפני Push
- `npm run build` + `npm run preview` → `http://localhost:4173/SimonGame/`: המשחק נטען (לא דף לבן), ללא שגיאות 404 בקונסול/רשת, משחק + השהיה + חידוש עובדים.

### 10. הגדרות שהמשתמש מבצע (בהדרכה, בשלב ה-Push)
- ה-Repository כבר ציבורי – אין צורך בשינוי.
- **Settings → Pages → Build and deployment → Source: GitHub Actions** – לפני ה-Push הראשון (או מיד אחריו ואז הרצה חוזרת של ה-Workflow).
- אחרי Push מאושר: אני בודק שה-Workflow עבר (`gh run` / דף ה-Actions) ושהכתובת `https://yonisaban.github.io/SimonGame/` נטענת כמשחק עובד דרך HTTPS, ללא 404.

## Definition of Done – איך כל סעיף נבדק
| סעיף | בדיקה |
|---|---|
| "אודות" בזמן הצגה/שחזור משהה ועוצר הארה וצליל | בדיקות אוטומטיות + בדיקה ידנית בדפדפן |
| חזרה ל"בית" לא מפעילה רצף; "המשך משחק" רק במושהה | בדיקות אוטומטיות + ידנית |
| "המשך משחק" מציג את כל הרצף, ללא שינוי שלב/צבע (פרט להמתנה שבין שלבים) | בדיקות אוטומטיות + ידנית |
| הסתרה וחזרה – אותו כלל, ללא Callback מיושן | בדיקות אוטומטיות (אירועים מדומים); בטלפון אמיתי – המשתמש |
| יציאה לפני/בזמן הודעת סיום → "לפני תחילת משחק", ללא צליל/קונפטי | בדיקות אוטומטיות |
| מושהה ≠ הפסד; Refresh מאפס | בדיקות אוטומטיות + ידנית |
| `npm run build` + `npm run preview` נטען כמשחק עובד | אני, בדפדפן המובנה |
| Workflow עובר והאתר החי עובד | אחרי ה-Push המאושר בלבד |

## מחוץ לתחום
היסטוריה (M5), PWA / Service Worker / אייקונים (M6). אין שינוי בעיצוב מעבר למצב "מושהה".
