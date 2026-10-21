# תוכנית – Milestone 1: בסיס אפליקציה ושני מסכים מעוצבים

> מקורות: `MILESTONES.md` (Milestone 1), `ARCHITECTURE.md` (סעיפים 1, 2.1, 2.9, "החלטות תכנון ראשוניות"), `DESIGN.md` (סעיפים 1–2, כולל טבלת 2.7), ותמונות `wireframes.png`, `mockups.png`, `style-guide.png`.
> באבן דרך זו **אין לוגיקת משחק**: הכפתור "התחל משחק" והלוח מוצגים בלבד ואינם מבצעים דבר.

## 0. דרישות מוקדמות

- **Node.js אינו מותקן כרגע במחשב** (`node`/`npm` לא נמצאו). לפני הבנייה יש להתקין Node.js בגרסת LTS העדכנית (מ-nodejs.org, או `winget install OpenJS.NodeJS.LTS`), ולפתוח מחדש את הסשן כדי שהפקודות יזוהו. בלי זה אי אפשר לבנות או להריץ.
- ה-Repository כבר מחובר ל-`https://github.com/YoniSaban/SimonGame.git`. אין Commit/Push באבן דרך זו.
- אין צורך ב-`.env` – לאפליקציה אין מפתחות או הגדרות סודיות.

## 1. הקמת הפרויקט ונעילת גרסאות

1. בתחילת הבנייה לבדוק ב-`npm view <package> version` את הגרסה היציבה העדכנית של כל תלות, ולהתקין **בגרסה מדויקת** (`npm install --save-exact`), בלי `^`/`~`.
2. תלויות:
   - Runtime: `react`, `react-dom`, `@fontsource/heebo`.
   - Dev: `typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
   - **לא** מתקינים עדיין `canvas-confetti` ו-`vite-plugin-pwa` – הם שייכים ל-Milestones 3 ו-6.
3. נעילת Node: קובץ `.nvmrc` עם גרסת ה-LTS המותקנת (מספר מלא), ושדה `engines.node` תואם ב-`package.json`.
4. `package-lock.json` נוצר ונשמר.
5. Scripts ב-`package.json`:
   - `dev` → `vite`
   - `build` → `tsc -b && vite build`
   - `preview` → `vite preview`
   - `typecheck` → `tsc -b --noEmit` (או מקבילה שעובדת עם מבנה ה-tsconfig)
   - `test` → `vitest run`
6. רישום **ADR-1: נעילת גרסאות הכלים** בסוף `ARCHITECTURE.md` (תחת `## Key decisions (ADRs)` – הסעיף "החלטות מרכזיות (ADRs)" הקיים), עם רשימת הגרסאות המדויקות שנבחרו, כולל Node.

## 2. קבצים שייווצרו

```text
.nvmrc
package.json / package-lock.json
index.html
vite.config.ts
tsconfig.json, tsconfig.app.json, tsconfig.node.json
src/
  main.tsx
  App.tsx
  App.test.tsx
  test/setup.ts
  game/colors.ts
  components/Board.tsx
  components/NavBar.tsx
  screens/HomeScreen.tsx
  screens/AboutScreen.tsx
  styles/index.css
```

- `.gitignore` הקיים כבר מכסה `node_modules/`, `dist/` ו-`*.tsbuildinfo` – אין צורך בשינוי.

### 2.1 `vite.config.ts`
- `base: '/SimonGame/'` (זהה ב-dev, preview ו-build). כתובת מקומית: `http://localhost:5173/SimonGame/`.
- `plugins: [react()]`.
- הגדרות Vitest באותו קובץ: `environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`, `globals: true`.

### 2.2 `index.html`
- `<html lang="he" dir="rtl">`, `meta viewport` עם `width=device-width, initial-scale=1, viewport-fit=cover`, `meta theme-color` = `#0A1628`, `<title>סיימון</title>`.
- ללא קישור ל-Google Fonts או לכל CDN.

### 2.3 `src/main.tsx`
- ייבוא משקלי Heebo בשימוש בלבד: `@fontsource/heebo/400.css`, `600.css`, `700.css`.
- ייבוא `styles/index.css`, ורינדור `<App />` בתוך `React.StrictMode`.

### 2.4 `src/game/colors.ts`
- רשימה קבועה של ארבעת הצבעים כמקור יחיד (ישמש גם את Milestone 2): מזהה (`green`, `red`, `yellow`, `blue`), שם בעברית ל-`aria-label` (ירוק/אדום/צהוב/כחול) ומיקום בלוח.
- סידור מחייב: **ירוק למעלה משמאל, אדום למעלה מימין, צהוב למטה משמאל, כחול למטה מימין** (לפי DESIGN – גובר על ה-Wireframes).

### 2.5 `src/App.tsx`
- State יחיד `screen: 'home' | 'about'` (`useState`) – ללא Router וללא שינוי כתובת, כך שהמעבר לא טוען דף מחדש.
- מבנה: מיכל אפליקציה → אזור תוכן (`<main>`) שמציג `HomeScreen` או `AboutScreen` → `NavBar` בתחתית.
- בשלב זה אין State משחק; ב-Milestone 2 הוא יתווסף כאן (לפי ההחלטה "מצב המשחק נשמר ב-`App`").

### 2.6 `src/components/NavBar.tsx`
- `<nav>` עם שני `<button type="button">`: **"בית"** ו-**"אודות"** (בסדר RTL: "בית" מימין, כמו ב-Mockups).
- האפשרות הפעילה מסומנת ב-`aria-current="page"` ובהדגשה חזותית (טקסט לבן מודגש / רקע כחול עדין). התוויות בעברית הן העיקר; בלי איקונים (אופציונליים לפי DESIGN, והפשוט עדיף).

### 2.7 `src/components/Board.tsx`
- מיכל עגול, CSS Grid 2×2, `direction: ltr` כדי שהסדר המרחבי לא יתהפך, `grid-area` מפורש לכל רבע.
- כל רבע הוא `<button type="button">` עם `aria-label` בעברית (שם הצבע), **ללא טקסט גלוי**, ופינה חיצונית מעוגלת אחת (`border-top-left-radius` וכו') כך שארבעתם יחד יוצרים עיגול.
- פסי ההפרדה הם ה-`gap` בצבע Charcoal, בעובי אחיד (בלי "טריז").
- דיסק מרכזי עגול ריק (Charcoal עם קו מתאר Border), דקורטיבי בלבד: `aria-hidden`, `pointer-events: none`, ללא טקסט.
- גודל: רוחב נגזר מהמיכל, `aspect-ratio: 1`, עם תקרה (למשל `min(100%, 340px)`) כדי שיתאים ל-360px וגם לגבהים קטנים.
- באבן דרך זו הכפתורים ללא פעולה. מניעת בחירת טקסט והגדלה בהקשה כפולה: `user-select: none`, `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`.
- מצבי Glow/עמעום **לא** ממומשים עכשיו (שייכים ל-Milestone 2); הלוח מוצג במצב "לוח מלא" בצבעים רוויים.

### 2.8 `src/screens/HomeScreen.tsx`
מלמעלה למטה:
1. כותרת מותג `<h1>` **"סיימון"** (32px Bold), עם קו הפרדה דק בצבע Border מתחתיה (כמו ב-Mockups). **ללא** הקשת הדקורטיבית.
2. חיווי שלב **"שלב 1 מתוך 10"** (H3, 20px Semibold). המספרים בתוך שורה עברית – לוודא שהם נקראים נכון (בידוד כיווניות במידת הצורך).
3. אזור סטטוס (שורה בגובה קבוע, ריקה במצב "לפני תחילת משחק"), כדי שהפריסה לא תקפוץ כשיתווסף טקסט ב-Milestone 2.
4. `Board`.
5. כפתור ראשי כחול רחב **"התחל משחק"** (16px Semibold, פינות מעוגלות, צל רך) – ללא פעולה באבן דרך זו.

### 2.9 `src/screens/AboutScreen.tsx`
1. כותרת `<h1>` **"אודות"** (לפי DESIGN 1.2; ה-Mockup מציג "סיימון" בראש מסך אודות – הטקסט במסמך גובר).
2. כרטיס Surface **"על המשחק"** (`<h2>`), ובו ארבע שורות בנוסח המחייב, שורה לכל משפט:
   - זכור את רצף הצבעים שמוצג.
   - לחץ על הצבעים באותו סדר.
   - נסה להגיע עד שלב 10!
   - הפעל צליל בטלפון (בלי מצב שקט) כדי לשמוע את הצבעים.
3. כותרת `<h2>` **"10 המשחקים האחרונים"**.
4. חיווי ריק: **"עדיין אין משחקים שמורים"** (Body, בצבע משני). בשלב זה ההיסטוריה תמיד ריקה, ולכן כפתור **"מחק היסטוריה"** אינו מוצג (לפי DESIGN – מוצג רק כשיש רשומות).
5. אם התוכן ארוך מהמסך – גלילה בתוך אזור התוכן בלבד; פס הניווט נשאר בתחתית.

### 2.10 `src/styles/index.css`
- **Tokens** ב-`:root`: ארבעת צבעי המשחק, Charcoal, Soft Gray, White, Background `#0A1628`, Surface `#12213A`, Border `#1E3556`; סולם ריווח `8/12/16/24px`; רדיוסים; גופן `'Heebo', Arial, sans-serif`; גדלי טקסט (32/24/20/16/14).
- `body`: רקע Background, טקסט לבן/Soft Gray, `margin: 0`, `overflow-x: hidden`.
- מיכל האפליקציה: `max-width: 480px`, `min-width: 360px`, ממורכז, `height: 100dvh` (עם Fallback ל-`100vh`), Flex אנכי: תוכן גולל + ניווט בתחתית; ריווח ל-`safe-area-inset-bottom`.
- כפתור ראשי, כרטיס, פס ניווט (Surface + Border, פינות מעוגלות, מפריד אנכי בין שתי האפשרויות כמו ב-Mockups).
- Focus גלוי (`:focus-visible`) לכפתורים, לנגישות.
- ללא Theme בהיר, ללא כפתורי הגדרות/סאונד.

## 3. בדיקות אוטומטיות (`src/App.test.tsx`)

`src/test/setup.ts` מייבא את `@testing-library/jest-dom/vitest`.

1. **מסך הבית מוצג כברירת מחדל:** כותרת "סיימון", "שלב 1 מתוך 10", כפתור "התחל משחק", ארבעה כפתורי צבע לפי `aria-label` (ירוק, אדום, צהוב, כחול).
2. **סדר הלוח:** סדר רבעי הלוח ב-DOM/`grid-area` תואם ירוק→אדום→צהוב→כחול (למעלה-שמאל, למעלה-ימין, למטה-שמאל, למטה-ימין).
3. **ניווט:** לחיצה על "אודות" מציגה את כותרת "אודות", ארבע שורות ההוראות ו"עדיין אין משחקים שמורים", ואינה מציגה "מחק היסטוריה"; לחיצה על "בית" מחזירה למסך הבית. `aria-current` עובר בהתאם.
4. **אין מסך שלישי:** בפס הניווט בדיוק שתי אפשרויות.

## 4. בדיקה עצמית בזמן הבנייה (לפני סימון 🟡)

1. `npm run typecheck`, `npm run test`, `npm run build` – כולם עוברים.
2. `npm run dev` ופתיחת `http://localhost:5173/SimonGame/` בדפדפן המובנה:
   - ברוחב 360px ו-375px (מובייל): אין גלילה אופקית (`document.documentElement.scrollWidth <= innerWidth`), הלוח במיקומי צבעים נכונים, הטקסטים בעברית ומיושרים לימין.
   - מעבר בית↔אודות: הדף לא נטען מחדש (בדיקת סימן ב-`window` שנשאר קיים אחרי המעבר).
   - ברוחב Desktop: מיכל ממורכז עד 480px.
   - צילום מסך והשוואה מול ה-Mockups (רקע, כרטיסים, כפתור כחול, פס ניווט).
3. לכבות את שרת הפיתוח בסיום.
4. למלא ב-`CLAUDE.md` את **Run commands**: Run (dev) = `npm run dev` (כתובת `http://localhost:5173/SimonGame/`), Test = `npm run test`.
5. לסמן 🟡 ליד כותרת Milestone 1 ב-`MILESTONES.md`.

## 5. מיפוי ל-Definition of Done

| קריטריון | איך מתקיים |
|---|---|
| Build ו-Typecheck עוברים; בדיקת Render/Navigation עוברת | סעיפים 1, 3, 4.1 |
| גרסאות נעולות ומתועדות; `base` = `/SimonGame/` ונפתח בנתיב הזה | סעיף 1, ADR-1, `vite.config.ts`, בדיקה 4.2 |
| שני מסכים, מעבר בלי רענון, אין מסך שלישי | `App.tsx` עם State פנימי, בדיקות 3.3–3.4, 4.2 |
| ארבעת אזורי הלוח במיקומים הנכונים, "שלב 1 מתוך 10", "התחל משחק"; אודות עם הסבר והודעת היסטוריה ריקה | סעיפים 2.7–2.9, בדיקות 3.1–3.3 |
| עברית, RTL, נוח ב-360px+ ללא גלילה אופקית | `index.html`, CSS, בדיקה 4.2 |
| אין יכולות מחוץ ל-PRD, אין Backend/Database | אין לוגיקה, אין תלויות שרת; רק התלויות שבסעיף 1 |

## 6. מחוץ לתחום באבן דרך זו

לוגיקת משחק, הארות ו-Glow, צלילים, קונפטי, השהיה, היסטוריה ו-`localStorage`, Dialog מחיקה, PWA/אייקונים, GitHub Actions.
