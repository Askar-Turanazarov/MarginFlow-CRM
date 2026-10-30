# MarginFlow CRM Office

**[English](#en) · [Oʻzbekcha](#uz) · [Русский](#ru)**

---

<a id="en"></a>

## English

Office CRM for **MarginFlow**, a fictional web studio in Silicon Valley, USA.
All people, companies, addresses, phones and e-mails in the demo are **fictional** (mock data).

### Features

**Ready**
- **Sign-in** with login and password. Passwords are stored only as bcrypt hashes.
- **Three roles**:
  - **Admin** — manages employees and the office plan;
  - **Manager** — manages clients and requests;
  - **Employee** — sees the requests assigned to them and the office plan.
- **Employees**: list with search. The admin creates and edits employees and managers (name, position, login, password, role, desk) and can deactivate an account.
- **Clients**: list and a map of all clients. A point is set by clicking the map or by address search.
- **Requests**:
  - fields: client, description, assignee, due date;
  - statuses: *New → Assigned → In progress → Done*;
  - filter tabs by status, assigning an employee right in the list, overdue requests highlighted.
- **Office plan**: shows who sits where and their status.
  - The admin can upload a plan image (PNG/JPG/WebP, up to 5 MB).
  - Click to add a desk with its number and PC number (e.g. `PC-07`), drag it to move, assign an employee.
  - Draw rectangular zones (kitchen, meeting room…).
  - Positions are stored as shares of the image size, so nothing shifts on other screen sizes.
  - A built-in test plan is shown until an image is uploaded.
- **3 interface languages**: English, Oʻzbekcha, Русский.
- **Check-in and end of day**: "I'm here" and "End of work" buttons; arrival after 09:05:59 is late, the admin sees who is late or has not checked in.
- **Admin home page**: live numbers (in office, out, not arrived, late, requests in work), office mini-map and a feed of latest events.
- **City map** (admin and managers): office, requests and employees who are out of the office, with a city switcher; movement simulation for the demo.
- **Reports**: attendance Excel file for a period — sheets "Summary" and "By day".
- **MCP server for an AI agent** (`mcp-server/`, `npm run mcp`, secret key): where everyone is, find an employee, who was late today, attendance summary, assign a request to a free employee in the office.
- **Exit with a reason and return**: lunch, client visit (linked to a request), meeting, personal, other, end of day; "I'm back" in one tap.
- **Interface "Human Liquid Glass"**: blurred office backdrop, glass panels, emerald accent, light/dark/system theme, soft spring motion, Ctrl+K command palette, phone layout with a bottom tab bar (details — [docs/SPEC.md §9](docs/SPEC.md)).

### Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui |
| Database | PostgreSQL + Prisma 6 |
| Auth | Auth.js (NextAuth v5), credentials, bcrypt |
| Validation | Zod |
| i18n | next-intl |
| Maps | Leaflet + OpenStreetMap — free, no registration or API keys |

### Requirements

- Node.js 20+ (tested on 22)
- Nothing else for the database: a local PostgreSQL runs from npm (`embedded-postgres`). Docker is optional.

### Getting started

```bash
npm install
cp .env.example .env
```

Open `.env` and replace every `change-me` with your own values. The `DB_PASSWORD` in `DATABASE_URL` must match `DB_PASSWORD`. Generate `AUTH_SECRET` with `npx auth secret`.

```bash
npm run db:start     # start local PostgreSQL (port 5433, data in .pgdata/)
npm run db:migrate   # create tables (also runs the seed on a new database)
npm run db:seed      # load demo data again if needed
npm run dev          # http://localhost:3000
```

With Docker instead of `db:start`:

```bash
docker compose up -d
```

To stop the local database:

```bash
npm run db:stop
```

### Demo accounts

Logins have the form `firstname.lastname`. The passwords are the `SEED_*_PASSWORD` values from your `.env`, one per role.

| Role | Login |
|---|---|
| Admin | `olivia.bennett` |
| Manager | `daniel.brooks`, `sofia.ramirez` |
| Employee | `mia.lopez`, `alex.carter`, `ethan.park`, … (10 in total) |

The demo data also has 20 desks (13 occupied), 3 zones, 7 clients (California and Tashkent) and 10 requests.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server (starts local PostgreSQL first) |
| `npm run build` / `npm start` | Production build / run |
| `npm run lint` | ESLint |
| `npm run db:start` / `db:stop` | Start / stop local PostgreSQL |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Load mock data |
| `npm run db:cleanup` | Remove location points older than the retention period |
| `npm run sim:on` / `sim:off` | Turn the movement simulation on / off (while `npm run dev` is running) |
| `npm run tunnel` | Temporary public https address for testing from a phone (needs `tools/cloudflared.exe`, not in Git) |
| `npm run mcp` | MCP server for an AI agent: http://127.0.0.1:3333/mcp (needs `MCP_API_KEY` in `.env`) |

### Tracking an employee from a phone

1. Download [cloudflared](https://github.com/cloudflare/cloudflared/releases) to `tools/cloudflared.exe`.
2. Run `npm run dev`, then `npm run tunnel` in a second terminal, and copy the `https://…trycloudflare.com` address. It changes on every start.
3. On the phone: open the address, sign in as `field.tracker` (password: `SEED_TRACKER_PASSWORD` in `.env`), tap the check-in button, then "Turn on tracking", and allow geolocation. Keep the page open.
4. On the computer: sign in as an admin or manager, open the city map and follow the tracking link.
5. Stop the tunnel when you finish: while it runs, the development server is reachable from the internet, and the phone sends real coordinates.

### Security and quick login

- Quick login without a password works only with `npm run dev`, only on `localhost`, and only with `DEV_LOGIN=1` in `.env`. The development server listens on `127.0.0.1`, so it cannot be reached from the local network.
- Login attempts are limited: 5 in 15 minutes for a login + address, 30 for an address. Limits also cover phone points, search and the Excel report.
- A password change signs out the old sessions. Real coordinates are kept for 30 days (`locationRetentionDays`); an admin sees who viewed the tracking page.

### Deploying to Vercel + Neon

1. Create a Neon project in US West and a Vercel project from this repository. `vercel.json` sets the build command and the daily cleanup.
2. In Vercel → Environment Variables set: `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `DATABASE_URL` (Neon, pooled), `DATABASE_URL_UNPOOLED` (Neon, direct), `CRON_SECRET`. Add `POSITIONS_API_TOKEN` only if you use sensors. Never set `DEV_LOGIN` there. Use a separate Neon branch with its own URLs for Preview.
3. Load the demo data once from your computer with new `SEED_*` passwords, different from the local ones, and with `DATABASE_URL` and `DATABASE_URL_UNPOOLED` pointing at Neon: `npm run db:seed`.
4. The MCP server stays a local process and is not deployed. On Vercel the movement simulation has no always-on process: it moves only while someone has the plan or map open.

### Notes

- Secrets (passwords, keys, `DATABASE_URL`, `AUTH_SECRET`) live only in `.env`, which is not committed. Only `.env.example` is in Git.
- `dev` and `build` use Turbopack: webpack does not accept the `!` character in the project path.
- Documentation: [docs/PRD.md](docs/PRD.md) (product), [docs/SPEC.md](docs/SPEC.md) (data, pages, rules).
- Two interface designs: glass (default) and skeuomorphic. The switch is in the sidebar, the phone account menu and on the login page. Textures are CC0 from ambientCG.

---

<a id="uz"></a>

## Oʻzbekcha

**MarginFlow** uchun ofis CRM tizimi. MarginFlow — Silikon vodiysidagi (AQSH) toʻqima veb-studiya.
Demodagi barcha odamlar, kompaniyalar, manzillar, telefonlar va e-mail’lar **toʻqima** (mock maʼlumotlar).

### Imkoniyatlar

**Tayyor**
- **Kirish** login va parol orqali. Parollar faqat bcrypt xeshi koʻrinishida saqlanadi.
- **Uchta rol**:
  - **Administrator** — xodimlar va ofis rejasini boshqaradi;
  - **Menejer** — mijozlar va arizalarni boshqaradi;
  - **Xodim** — oʻziga biriktirilgan arizalarni va ofis rejasini koʻradi.
- **Xodimlar**: qidiruvli roʻyxat. Administrator xodim va menejerlarni qoʻshadi va tahrirlaydi (ism, lavozim, login, parol, rol, ish joyi) hamda hisobni oʻchirib qoʻya oladi.
- **Mijozlar**: roʻyxat va barcha mijozlar xaritasi. Nuqta xaritani bosish yoki manzil boʻyicha qidirish orqali qoʻyiladi.
- **Arizalar**:
  - maydonlar: mijoz, tavsif, masʼul, muddat;
  - holatlar: *Yangi → Biriktirilgan → Jarayonda → Bajarilgan*;
  - holat boʻyicha filtr, xodimni toʻgʻridan-toʻgʻri roʻyxatda biriktirish, muddati oʻtganlar ajratib koʻrsatiladi.
- **Ofis rejasi**: kim qayerda oʻtirgani va uning holati.
  - Administrator reja rasmini yuklaydi (PNG/JPG/WebP, 5 MB gacha).
  - Bosish bilan joy qoʻshadi (joy raqami va kompyuter raqami, masalan `PC-07`), uni surib siljitadi, xodim biriktiradi.
  - Toʻrtburchak zonalar chizadi (oshxona, majlislar xonasi…).
  - Joylashuvlar rasm oʻlchamiga nisbatan ulushlarda saqlanadi, shuning uchun boshqa ekranlarda siljimaydi.
  - Rasm yuklanmaguncha ichki test rejasi koʻrsatiladi.
- **Interfeysning 3 tili**: English, Oʻzbekcha, Русский.
- **Kelish va kun yakuni**: «Keldim» va «Ishni tugatish» tugmalari; 09:05:59 dan keyin kelish — kechikish, administrator kechikkanlar va belgilanmaganlarni koʻradi.
- **Administrator bosh sahifasi**: jonli raqamlar (ofisda, tashqarida, kelmaganlar, kechikkanlar, ishdagi arizalar), ofis mini-xaritasi va soʻnggi voqealar lentasi.
- **Shahar xaritasi** (administrator va menejerlar): ofis, arizalar va ofisdan tashqaridagi xodimlar, shaharlar oʻrtasida almashtirish; demo uchun harakat imitatsiyasi.
- **Hisobotlar**: davr boʻyicha davomat Excel fayli — «Umumiy» va «Kunlar boʻyicha» varaqlari.
- **AI-agent uchun MCP server** (`mcp-server/`, `npm run mcp`, maxfiy kalit): hamma qayerda, xodimni topish, bugun kim kechikdi, davomat hisoboti, ofisdagi boʻsh xodimga ariza biriktirish.
- **Sabab bilan chiqish va qaytish**: tushlik, mijozga borish (ariza bilan), uchrashuv, shaxsiy, boshqa, kun oxiri; «Qaytdim» — bir bosishda.
- **«Human Liquid Glass» interfeysi**: xiralashtirilgan ofis foni, shisha panellar, zumrad rang, yorugʻ/qorongʻi/tizim mavzusi, yumshoq prujinali harakat, Ctrl+K buyruqlar paneli, telefonda pastki menyu (batafsil — [docs/SPEC.md §9](docs/SPEC.md)).

### Texnologiyalar

| Soha | Texnologiya |
|---|---|
| Freymvork | Next.js 15 (App Router, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui |
| Maʼlumotlar bazasi | PostgreSQL + Prisma 6 |
| Avtorizatsiya | Auth.js (NextAuth v5), login/parol, bcrypt |
| Validatsiya | Zod |
| i18n | next-intl |
| Xaritalar | Leaflet + OpenStreetMap — bepul, roʻyxatdan oʻtish va kalitlarsiz |

### Talablar

- Node.js 20+ (22-versiyada tekshirilgan)
- Baza uchun boshqa hech narsa kerak emas: lokal PostgreSQL npm orqali ishga tushadi (`embedded-postgres`). Docker ixtiyoriy.

### Ishga tushirish

```bash
npm install
cp .env.example .env
```

`.env` faylini oching va barcha `change-me` qiymatlarini oʻzingiznikiga almashtiring. `DATABASE_URL` ichidagi parol `DB_PASSWORD` bilan bir xil boʻlishi kerak. `AUTH_SECRET` ni `npx auth secret` buyrugʻi bilan yarating.

```bash
npm run db:start     # lokal PostgreSQL ni ishga tushirish (port 5433, maʼlumotlar .pgdata/ da)
npm run db:migrate   # jadvallarni yaratish (yangi bazada seed ham ishlaydi)
npm run db:seed      # kerak boʻlsa, demo maʼlumotlarni qayta yuklash
npm run dev          # http://localhost:3000
```

`db:start` oʻrniga Docker bilan:

```bash
docker compose up -d
```

Lokal bazani toʻxtatish:

```bash
npm run db:stop
```

### Demo hisoblar

Loginlar `ism.familiya` koʻrinishida. Parollar — `.env` dagi `SEED_*_PASSWORD` qiymatlari, har bir rol uchun bittadan.

| Rol | Login |
|---|---|
| Administrator | `olivia.bennett` |
| Menejer | `daniel.brooks`, `sofia.ramirez` |
| Xodim | `mia.lopez`, `alex.carter`, `ethan.park`, … (jami 10 ta) |

Demo maʼlumotlarda yana 20 ta ish joyi (13 tasi band), 3 ta zona, 7 ta mijoz (Kaliforniya va Toshkent) va 10 ta ariza bor.

### Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Ishlab chiqish serveri (avval lokal PostgreSQL ni ishga tushiradi) |
| `npm run build` / `npm start` | Production build / ishga tushirish |
| `npm run lint` | ESLint |
| `npm run db:start` / `db:stop` | Lokal PostgreSQL ni ishga tushirish / toʻxtatish |
| `npm run db:migrate` | Prisma migratsiyalarini qoʻllash |
| `npm run db:seed` | Mock maʼlumotlarni yuklash |
| `npm run db:cleanup` | Saqlash muddatidan eski joylashuv nuqtalarini oʻchirish |
| `npm run sim:on` / `sim:off` | Harakat imitatsiyasini yoqish / oʻchirish (`npm run dev` ishlab turganda) |
| `npm run tunnel` | Telefondan tekshirish uchun vaqtinchalik ochiq https manzil (`tools/cloudflared.exe` kerak, Gitda yoʻq) |
| `npm run mcp` | AI-agent uchun MCP server: http://127.0.0.1:3333/mcp (`.env` da `MCP_API_KEY` kerak) |

### Xodimni telefon orqali kuzatish

1. [cloudflared](https://github.com/cloudflare/cloudflared/releases) ni `tools/cloudflared.exe` ga yuklab oling.
2. `npm run dev`, soʻng ikkinchi terminalda `npm run tunnel` ni ishga tushiring va `https://…trycloudflare.com` manzilini nusxalang. Manzil har safar oʻzgaradi.
3. Telefonda: manzilni oching, `field.tracker` sifatida kiring (parol: `.env` dagi `SEED_TRACKER_PASSWORD`), kelganingizni belgilang, kuzatishni yoqing va geolokatsiyaga ruxsat bering. Sahifani ochiq qoldiring.
4. Kompyuterda: admin yoki menejer sifatida kiring, shahar xaritasini oching va kuzatish havolasini bosing.
5. Tugatgach, tunnelni toʻxtating: u ishlab turganda ishlab chiqish serveri internetdan ochiq boʻladi, telefon esa haqiqiy koordinatalarni yuboradi.

### Xavfsizlik va tezkor kirish

- Parolsiz tezkor kirish faqat `npm run dev` da, faqat `localhost` da va `.env` da `DEV_LOGIN=1` boʻlganda ishlaydi. Ishlab chiqish serveri `127.0.0.1` da tinglaydi, shuning uchun unga lokal tarmoqdan kirib boʻlmaydi.
- Kirish urinishlari cheklangan: login + manzil uchun 15 daqiqada 5 ta, manzil uchun 30 ta. Cheklovlar telefon nuqtalari, qidiruv va Excel hisobotiga ham tegishli.
- Parol oʻzgarganda eski sessiyalar yopiladi. Haqiqiy koordinatalar 30 kun saqlanadi (`locationRetentionDays`); admin kuzatish sahifasini kim koʻrganini koʻradi.

### Vercel + Neon ga joylash

1. Neon loyihasini US West hududida va shu repozitoriydan Vercel loyihasini yarating. `vercel.json` build buyrugʻi va kunlik tozalashni belgilaydi.
2. Vercel → Environment Variables ga kiriting: `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `DATABASE_URL` (Neon, pooled), `DATABASE_URL_UNPOOLED` (Neon, direct), `CRON_SECRET`. `POSITIONS_API_TOKEN` faqat sensorlar ishlatilsa kerak. `DEV_LOGIN` ni u yerda hech qachon koʻrsatmang. Preview uchun oʻz URL manzillari bilan alohida Neon tarmogʻidan foydalaning.
3. Demo maʼlumotlarni kompyuteringizdan bir marta yuklang: lokaldan farqli yangi `SEED_*` parollar bilan, `DATABASE_URL` va `DATABASE_URL_UNPOOLED` Neon ga qaragan holda: `npm run db:seed`.
4. MCP server lokal jarayon boʻlib qoladi va joylanmaydi. Vercel da harakat imitatsiyasi uchun doimiy jarayon yoʻq: u faqat kimdir plan yoki xaritani ochib turganda harakatlanadi.

### Eslatmalar

- Maxfiy maʼlumotlar (parollar, kalitlar, `DATABASE_URL`, `AUTH_SECRET`) faqat `.env` da saqlanadi va Git’ga tushmaydi. Git’da faqat `.env.example` bor.
- `dev` va `build` Turbopack orqali ishlaydi: webpack loyiha yoʻlidagi `!` belgisini qabul qilmaydi.
- Hujjatlar: [docs/PRD.md](docs/PRD.md) (mahsulot), [docs/SPEC.md](docs/SPEC.md) (maʼlumotlar, sahifalar, qoidalar).
- Ikki dizayn: shisha (standart) va skevomorfizm. Almashtirgich yon panelda, telefondagi akkaunt menyusida va kirish sahifasida. Teksturalar ambientCG dan, CC0 litsenziyasi.

---

<a id="ru"></a>

## Русский

Офисная CRM для **MarginFlow** — вымышленной веб-студии из Кремниевой долины (США).
Все люди, компании, адреса, телефоны и e-mail в демо **вымышленные** (мок-данные).

### Возможности

**Готово**
- **Вход** по логину и паролю. Пароли хранятся только в виде bcrypt-хэша.
- **Три роли**:
  - **Администратор** — управляет сотрудниками и планом офиса;
  - **Менеджер** — ведёт клиентов и заявки;
  - **Сотрудник** — видит назначенные ему заявки и план офиса.
- **Сотрудники**: список с поиском. Админ добавляет и меняет сотрудников и менеджеров (имя, должность, логин, пароль, роль, рабочее место) и может отключить учётную запись.
- **Клиенты**: список и карта всех клиентов. Точка ставится кликом по карте или поиском по адресу.
- **Заявки**:
  - поля: клиент, описание, ответственный, срок;
  - статусы: *Новая → Назначена → В работе → Выполнена*;
  - вкладки-фильтр по статусу, назначение сотрудника прямо в списке, просроченные заявки подсвечены.
- **План офиса**: кто где сидит и его статус.
  - Админ может загрузить картинку плана (PNG/JPG/WebP, до 5 МБ).
  - Кликом добавляет место с номером места и номером компьютера (например, `PC-07`), перетаскивает его, привязывает сотрудника.
  - Рисует прямоугольные зоны (кухня, переговорная…).
  - Положение хранится в долях от размера картинки, поэтому на других экранах ничего не съезжает.
  - Пока картинка не загружена, показывается встроенный тестовый план.
- **3 языка интерфейса**: English, Oʻzbekcha, Русский.
- **Приход и конец дня**: кнопки «Я пришёл» и «Закончить работу»; приход после 09:05:59 — опоздание, админ видит опоздавших и не отметившихся.
- **Главная админа**: живые цифры (в офисе, вне офиса, не пришли, опоздали, заявок в работе), мини-карта офиса и лента последних событий.
- **На карте города** (админ и менеджеры): офис, заявки и сотрудники вне офиса, переключатель городов; имитация движения для демо.
- **Отчёты**: Excel-файл посещаемости за период — листы «Сводка» и «По дням».
- **MCP-сервер для ИИ-агента** (`mcp-server/`, `npm run mcp`, секретный ключ): где все сотрудники, поиск сотрудника, кто опоздал сегодня, сводка прихода и ухода, назначение заявки свободному сотруднику в офисе.
- **Выход с причиной и возврат**: обед, выезд на заявку, встреча, личное, другое, конец дня; «Вернулся» — одним нажатием.
- **Интерфейс «Human Liquid Glass»**: размытое фото офиса на фоне, стеклянные панели, изумрудный акцент, светлая/тёмная/системная тема, мягкие пружинные анимации, палитра Ctrl+K, на телефоне — нижнее меню (подробно — [docs/SPEC.md §9](docs/SPEC.md)).

### Технологии

| Что | Технология |
|---|---|
| Фреймворк | Next.js 15 (App Router, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui |
| База данных | PostgreSQL + Prisma 6 |
| Авторизация | Auth.js (NextAuth v5), логин/пароль, bcrypt |
| Валидация | Zod |
| Языки | next-intl |
| Карты | Leaflet + OpenStreetMap — бесплатно, без регистрации и ключей |

### Требования

- Node.js 20+ (проверено на 22)
- Для базы больше ничего не нужно: локальный PostgreSQL запускается из npm (`embedded-postgres`). Docker — по желанию.

### Запуск

```bash
npm install
cp .env.example .env
```

Откройте `.env` и замените все `change-me` своими значениями. Пароль в `DATABASE_URL` должен совпадать с `DB_PASSWORD`. `AUTH_SECRET` можно получить командой `npx auth secret`.

```bash
npm run db:start     # запустить локальный PostgreSQL (порт 5433, данные в .pgdata/)
npm run db:migrate   # создать таблицы (на новой базе заодно запускается сид)
npm run db:seed      # при необходимости заново залить демо-данные
npm run dev          # http://localhost:3000
```

С Docker вместо `db:start`:

```bash
docker compose up -d
```

Остановить локальную базу:

```bash
npm run db:stop
```

### Демо-доступы

Логины в виде `имя.фамилия`. Пароли — значения `SEED_*_PASSWORD` из вашего `.env`, по одному на роль.

| Роль | Логин |
|---|---|
| Администратор | `olivia.bennett` |
| Менеджер | `daniel.brooks`, `sofia.ramirez` |
| Сотрудник | `mia.lopez`, `alex.carter`, `ethan.park`, … (всего 10) |

Ещё в демо-данных: 20 рабочих мест (13 заняты), 3 зоны, 7 клиентов (Калифорния и Ташкент) и 10 заявок.

### Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | Сервер разработки (сначала сам запускает локальный PostgreSQL) |
| `npm run build` / `npm start` | Сборка / запуск в продакшене |
| `npm run lint` | ESLint |
| `npm run db:start` / `db:stop` | Запустить / остановить локальный PostgreSQL |
| `npm run db:migrate` | Применить миграции Prisma |
| `npm run db:seed` | Залить мок-данные |
| `npm run db:cleanup` | Удалить точки геолокации старше срока хранения |
| `npm run sim:on` / `sim:off` | Включить / выключить имитацию движения (пока работает `npm run dev`) |
| `npm run tunnel` | Временный публичный https-адрес для проверки с телефона (нужен `tools/cloudflared.exe`, его нет в Git) |
| `npm run mcp` | MCP-сервер для ИИ-агента: http://127.0.0.1:3333/mcp (нужен `MCP_API_KEY` в `.env`) |

### Слежение за сотрудником с телефона

1. Скачайте [cloudflared](https://github.com/cloudflare/cloudflared/releases) в `tools/cloudflared.exe`.
2. Запустите `npm run dev`, затем во втором терминале `npm run tunnel` и скопируйте адрес `https://…trycloudflare.com`. Он меняется при каждом запуске.
3. На телефоне: откройте адрес, войдите как `field.tracker` (пароль — `SEED_TRACKER_PASSWORD` в `.env`), нажмите «Я пришёл», затем «Включить слежение» и разрешите геолокацию. Страницу не закрывайте.
4. На компьютере: войдите как админ или менеджер, откройте карту города и перейдите по ссылке «Следить».
5. Закончив, остановите туннель: пока он работает, сервер разработки доступен из интернета, а телефон шлёт настоящие координаты.

### Безопасность и быстрый вход

- Быстрый вход без пароля работает только при `npm run dev`, только на `localhost` и только с `DEV_LOGIN=1` в `.env`. Сервер разработки слушает `127.0.0.1`, поэтому из локальной сети он недоступен.
- Попытки входа ограничены: 5 за 15 минут на пару логин + адрес, 30 на адрес. Лимиты есть также у точек с телефона, поиска и Excel-отчёта.
- Смена пароля завершает старые сессии. Настоящие координаты хранятся 30 дней (`locationRetentionDays`); админ видит, кто смотрел страницу слежения.

### Деплой на Vercel + Neon

1. Создайте проект Neon в регионе US West и проект Vercel из этого репозитория. Команду сборки и ежедневную очистку задаёт `vercel.json`.
2. В Vercel → Environment Variables укажите: `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `DATABASE_URL` (Neon, с пулом), `DATABASE_URL_UNPOOLED` (Neon, без пула), `CRON_SECRET`. `POSITIONS_API_TOKEN` нужен только для сенсоров. `DEV_LOGIN` там не задавайте никогда. Для Preview используйте отдельную ветку Neon со своими адресами.
3. Один раз залейте демо-данные со своего компьютера: с новыми паролями `SEED_*`, отличными от локальных, и с `DATABASE_URL` и `DATABASE_URL_UNPOOLED`, указывающими на Neon: `npm run db:seed`.
4. MCP-сервер остаётся локальным процессом и не деплоится. На Vercel у имитации движения нет постоянного процесса: люди двигаются, только пока кто-то держит открытым план или карту.

### Примечания

- Секреты (пароли, ключи, `DATABASE_URL`, `AUTH_SECRET`) хранятся только в `.env`, который не попадает в Git. В Git есть только `.env.example`.
- `dev` и `build` работают через Turbopack: webpack не принимает символ `!` в пути проекта.
- Документация: [docs/PRD.md](docs/PRD.md) (продукт), [docs/SPEC.md](docs/SPEC.md) (данные, страницы, правила).
- Два дизайна интерфейса: стекло (по умолчанию) и скевоморфизм. Переключатель — в боковой панели, в меню аккаунта на телефоне и на странице входа. Текстуры — CC0 с ambientCG.
