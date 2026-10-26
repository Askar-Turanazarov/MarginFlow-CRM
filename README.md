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
| `npm run sim:on` / `sim:off` | Turn the movement simulation on / off (while `npm run dev` is running) |
| `npm run mcp` | MCP server for an AI agent: http://127.0.0.1:3333/mcp (needs `MCP_API_KEY` in `.env`) |

### Notes

- Secrets (passwords, keys, `DATABASE_URL`, `AUTH_SECRET`) live only in `.env`, which is not committed. Only `.env.example` is in Git.
- `dev` and `build` use Turbopack: webpack does not accept the `!` character in the project path.
- Documentation: [docs/PRD.md](docs/PRD.md) (product), [docs/SPEC.md](docs/SPEC.md) (data, pages, rules).

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
| `npm run sim:on` / `sim:off` | Harakat imitatsiyasini yoqish / oʻchirish (`npm run dev` ishlab turganda) |
| `npm run mcp` | AI-agent uchun MCP server: http://127.0.0.1:3333/mcp (`.env` da `MCP_API_KEY` kerak) |

### Eslatmalar

- Maxfiy maʼlumotlar (parollar, kalitlar, `DATABASE_URL`, `AUTH_SECRET`) faqat `.env` da saqlanadi va Git’ga tushmaydi. Git’da faqat `.env.example` bor.
- `dev` va `build` Turbopack orqali ishlaydi: webpack loyiha yoʻlidagi `!` belgisini qabul qilmaydi.
- Hujjatlar: [docs/PRD.md](docs/PRD.md) (mahsulot), [docs/SPEC.md](docs/SPEC.md) (maʼlumotlar, sahifalar, qoidalar).

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
| `npm run sim:on` / `sim:off` | Включить / выключить имитацию движения (пока работает `npm run dev`) |
| `npm run mcp` | MCP-сервер для ИИ-агента: http://127.0.0.1:3333/mcp (нужен `MCP_API_KEY` в `.env`) |

### Примечания

- Секреты (пароли, ключи, `DATABASE_URL`, `AUTH_SECRET`) хранятся только в `.env`, который не попадает в Git. В Git есть только `.env.example`.
- `dev` и `build` работают через Turbopack: webpack не принимает символ `!` в пути проекта.
- Документация: [docs/PRD.md](docs/PRD.md) (продукт), [docs/SPEC.md](docs/SPEC.md) (данные, страницы, правила).
