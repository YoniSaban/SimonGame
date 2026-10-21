# תוכנית – Milestone 6: PWA ו-Offline (בדיקה מקומית על Build)

מקורות: `MILESTONES.md` (Milestone 6), `PRD.md` §4.5, `ARCHITECTURE.md` §2.7, §2.9 ו"החלטות תכנון ראשוניות", `DESIGN.md` §1.1 (הודעת עדכון גרסה) ו-§2.4 (App Icon).

## 1. מטרה

להפוך את המשחק הקיים לאפליקציה הניתנת להתקנה ועובדת Offline אחרי טעינה ראשונה, עם הודעת עדכון גרסה שמופיעה רק במצב `idle` ואינה מרעננת משחק פעיל לעולם. אין שינוי בלוגיקת המשחק, בהיסטוריה או בעיצוב הקיים.

## 2. תלויות חדשות (גרסאות מדויקות, Dev)

| חבילה | גרסה | תפקיד |
|---|---|---|
| `vite-plugin-pwa` | `2.0.0` | Manifest + Service Worker (`generateSW`) + Precache |
| `workbox-window` | `7.4.1` | נדרש ל-`virtual:pwa-register` (Peer של הפלאגין) |
| `@vite-pwa/assets-generator` | `2.0.0` | הפקת PNG/Favicon מ-SVG אחד (מורץ ידנית, לא ב-CI) |

- הגרסאות נבדקו (`npm view`) – `vite-plugin-pwa@2.0.0` תומך ב-Vite `^8`. אם `npm install` מתלונן על Peer Dependency – לעצור ולדווח, לא לעקוף ב-`--force`.
- רישום ב-ADR-1 (שורת "Milestone 6"), במקום השורה "`vite-plugin-pwa` יתווסף...".

## 3. אייקון האפליקציה

**`public/icon.svg`** (קובץ מקור יחיד, נכתב ידנית), קנבס `512×512`:
- רקע מלא `#0A1628` (Background) – ללא שקיפות, כך שהוא תקין גם כ-Maskable.
- עיגול לוח בקוטר ~78% מהקנבס (≈400px, ממורכז), בתוך ה-Safe Zone של Maskable.
- ארבעה רבעים בסידור הלוח: ירוק `#00D26A` למעלה משמאל, אדום `#FF3B30` למעלה מימין, צהוב `#FFD600` למטה משמאל, כחול `#00A3FF` למטה מימין.
- פסי הפרדה כהים `#0F0F0F` בעובי אחיד (צלב) ומסגרת חיצונית כהה, ודיסק מרכזי כהה `#0F0F0F` ריק. ללא טקסט.

**`pwa-assets.config.ts`** (שורש הפרויקט) עם `minimal2023Preset`, מקור `public/icon.svg`, רקע `#0A1628` ל-Maskable ול-Apple.
**סקריפט** `"generate-pwa-assets": "pwa-assets-generator"` ב-`package.json`. מורץ פעם אחת, והקבצים נשמרים ב-`public/` וב-Git:
- `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`.

בדיקה: פתיחת ה-PNG-ים בצפייה לוודא שהם נראים נכון (צבעים במקום, לא חתוכים).

## 4. קבצים שישתנו / ייווצרו

| קובץ | שינוי |
|---|---|
| `public/icon.svg` + קובצי PNG/ICO | חדש (סעיף 3) |
| `pwa-assets.config.ts` | חדש |
| `package.json` / `package-lock.json` | תלויות + סקריפט `generate-pwa-assets` |
| `tsconfig.node.json` | להוסיף `pwa-assets.config.ts` ל-`include` (כדי שה-typecheck יכסה אותו) |
| `tsconfig.app.json` | להוסיף `"vite-plugin-pwa/client"` ל-`types` (טיפוסים של `virtual:pwa-register`) |
| `vite.config.ts` | הוספת `VitePWA(...)` (סעיף 5) |
| `index.html` | `<link rel="icon" href="/favicon.ico" sizes="48x48">`, `<link rel="icon" href="/icon.svg" type="image/svg+xml">`, `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">` (Vite מוסיף את `/SimonGame/` בעצמו) |
| `src/pwa/updateStore.ts` | חדש – מצב "יש גרסה חדשה" (סעיף 6) |
| `src/pwa/registerPwa.ts` | חדש – רישום ה-Service Worker (סעיף 6) |
| `src/main.tsx` | קריאה ל-`registerPwa()` |
| `src/App.tsx` | העברת `updateAvailable` ו-`onUpdate` ל-`HomeScreen` |
| `src/screens/HomeScreen.tsx` | פס העדכון, רק ב-`idle` |
| `src/styles/index.css` | עיצוב `.update-bar` |
| `src/pwa/update.test.tsx` | חדש – בדיקות הודעת העדכון |
| `spec/ARCHITECTURE.md` | ADR-1 (גרסאות) + ADR-10 (עדכון גרסה); הוצאת שורות האייקון/`id`/עדכון מ"טרם מומשו" אם מומשו כמתוכנן |
| `CLAUDE.md` | Run commands: הערה על `npm run generate-pwa-assets` ועל כך ש-Offline נבדק רק ב-`preview` |

`.gitignore`: לא נדרש שינוי (ה-Service Worker לא מופעל ב-dev, ולכן אין `dev-dist/`).

## 5. הגדרת `vite-plugin-pwa` (`vite.config.ts`)

```ts
VitePWA({
  strategies: 'generateSW',
  registerType: 'prompt',
  injectRegister: false,          // registration is done in src/main.tsx
  includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
  manifest: {
    id: '/SimonGame/app',          // never change after first install
    name: 'Simon',
    short_name: 'Simon',
    lang: 'he',
    dir: 'rtl',
    start_url: '/SimonGame/',
    scope: '/SimonGame/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A1628',
    theme_color: '#0A1628',
    icons: [ 64, 192, 512 (any), 512 maskable ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'], // includes Heebo font files
    cleanupOutdatedCaches: true,
    // no skipWaiting, no clientsClaim (defaults for "prompt")
  },
})
```

- `start_url`/`scope` נגזרים מאותו קבוע `BASE = '/SimonGame/'` שמשמש ל-`base` (לחלץ לקבוע אחד בקובץ).
- אין Runtime Caching, אין Background Sync, אין Push (ARCHITECTURE §2.7).
- `devOptions` לא מופעל: ב-`npm run dev` אין Service Worker; PWA נבדק רק ב-`build` + `preview`.
- `navigateFallback` – ברירת המחדל של הפלאגין (`index.html`), בתוך ה-Scope בלבד.

## 6. רישום ועדכון גרסה

**`src/pwa/updateStore.ts`** – מודול קטן ללא תלות ב-virtual module (כדי שהבדיקות לא יצטרכו אותו):
- `setUpdateHandler(fn)` – שומר את פונקציית ההפעלה של הגרסה החדשה ומסמן "יש עדכון".
- `useUpdateAvailable()` – Hook מבוסס `useSyncExternalStore` שמחזיר `true/false`.
- `applyUpdate()` – מפעיל את הפונקציה השמורה.

**`src/pwa/registerPwa.ts`**:
```ts
import { registerSW } from 'virtual:pwa-register';
const updateSW = registerSW({ immediate: true, onNeedRefresh: () => setUpdateHandler(() => updateSW(true)) });
```
- `updateSW(true)` שולח לגרסה הממתינה הודעת דילוג על המתנה ומרענן את הדף – **רק** בעקבות לחיצת המשתמש על "עדכן". אין `skipWaiting` אוטומטי.
- `main.tsx` קורא ל-`registerPwa()` לפני ה-Render.

**`HomeScreen`** – פרופס חדשים `updateAvailable: boolean`, `onUpdate: () => void`:
- הפס מוצג רק כש-`updateAvailable && status === 'idle'`. בכל מצב אחר (`presenting`, `awaitingInput`, `paused`, `won`, `lost`) הוא מוסתר, וחוזר כשהמשחק חוזר ל-`idle`.
- מיקום: אחרי אזור הפעולות, כלומר בין הלוח לפס הניווט.
- תוכן: `<div className="update-bar" role="status">` עם הטקסט **"יש גרסה חדשה"** וכפתור `btn btn--secondary` **"עדכן"**.

**CSS `.update-bar`:** רקע Surface `#12213A`, קו מתאר Border `#1E3556`, פינות מעוגלות, `display:flex` עם רווח בין הטקסט לכפתור, ריווח מסולם `8/12/16`, טקסט Caption/Body. ללא שינוי בשאר הפריסה; לא גורם לגלילה אופקית ב-360px.

## 7. בדיקות אוטומטיות

`src/pwa/update.test.tsx` (עם אותם Mocks של אודיו וקונפטי כמו בבדיקות הקיימות):
1. בלי עדכון ממתין – אין פס עדכון.
2. עם עדכון ממתין ב-`idle` – מוצגים "יש גרסה חדשה" ו"עדכן".
3. אחרי "התחל משחק" הפס נעלם (`presenting`/`awaitingInput`); במשחק מושהה (מעבר ל"אודות" וחזרה) הוא מוסתר; בהודעת הסיום הוא מוסתר; אחרי "אישור" הוא חוזר.
4. כשעדכון מגיע באמצע משחק – לא מוצג דבר, והמשחק ממשיך (לא נקרא `applyUpdate`).
5. לחיצה על "עדכן" קוראת לפונקציית ההפעלה פעם אחת.

Regression: כל הבדיקות הקיימות (Milestones 1–5) חייבות לעבור – `npm run test`, `npm run typecheck`, `npm run build`.

## 8. בדיקה ידנית שלי על ה-Build (לפני סימון 🟡)

1. `npm run build` – לוודא ב-`dist/`: `manifest.webmanifest` עם כל השדות שבסעיף 5; `sw.js` שרשימת ה-Precache שלו כוללת `index.html`, JS, CSS, קובצי ה-`woff2` של Heebo והאייקונים; קובצי האייקונים קיימים.
2. `npm run preview` (`http://localhost:4173/SimonGame/`) בדפדפן המובנה:
   - אין שגיאות קונסול ואין בקשות 404 (בדיקת Network); כל הנכסים תחת `/SimonGame/`.
   - `navigator.serviceWorker` רשום עם Scope `/SimonGame/` ו-Active; ה-Cache של Workbox מכיל את כל הנכסים.
   - Manifest נטען מה-`<link rel="manifest">` עם האייקונים.
3. **Offline אמיתי:** לעצור את שרת ה-`preview` לגמרי, ואז לרענן את הדף: האפליקציה נטענת מה-Cache; לשחק משחק מלא (עד ניצחון/הפסד), לעבור בין "בית" ל"אודות", לראות את ההיסטוריה השמורה. צלילים – לוודא שה-`AudioContext` במצב `running` ושאין שגיאות (בדיקה באוזן – אצלך).
4. **הודעת עדכון:** לשנות משהו קטן זמנית, לבנות שוב ולהפעיל `preview`, לרענן: הפס "יש גרסה חדשה" מופיע ב-`idle`; התחלת משחק מסתירה אותו והמשחק לא מתרענן; בסיום וב-"אישור" הוא חוזר; לחיצה על "עדכן" מרעננת ומפעילה את הגרסה החדשה. אחר כך להחזיר את השינוי הזמני ולבנות שוב.
5. תצוגת 360px – הפס לא שובר את הפריסה.
6. לכבות את שרת ה-`preview` בסיום, ולסמן 🟡 ב-`MILESTONES.md`. ללא Commit.

## 9. אחרי האישור שלך (Push)

- Commit + Push ל-`main` רק לאחר בקשתך. ה-Workflow הקיים לא צריך שינוי (הוא כבר מריץ `npm run build`, שמייצר עכשיו גם Manifest ו-Service Worker).
- אחרי ה-Push: לוודא שה-Workflow עבר, שהאתר החי `https://yonisaban.github.io/SimonGame/` נטען כמשחק עובד, שה-Manifest נטען ושה-Service Worker נרשם בו.

## 10. מחוץ לתכולה

- בדיקת התקנה ו-Offline בטלפון אמיתי – Milestone 7.
- אין מסך שלישי, אין כפתורים או יכולות חדשות מלבד פס העדכון שב-`DESIGN.md`.
- אין שינוי במסמכי PRD/DESIGN.

## 11. Definition of Done – איך כל סעיף ייבדק

| סעיף | איך נבדק |
|---|---|
| Manifest ו-Service Worker תקינים; אייקונים תקינים | סעיף 8.1–8.2 + צפייה בקובצי האייקון |
| Offline על ה-Build המקומי: טעינה, משחק, צלילים, ניווט, היסטוריה | סעיף 8.3 (שרת כבוי) |
| כל הנכסים תחת `/SimonGame/` ללא 404 | בדיקת Network בסעיף 8.2 |
| הודעת עדכון רק ב-`idle`, בלי לקטוע משחק | בדיקות אוטומטיות (סעיף 7) + סעיף 8.4 |
| Regression של Milestones 2–5 | `npm run test` |
| אתר חי אחרי Push: עובד, Manifest ו-SW תקינים | סעיף 9 (אחרי אישורך) |
