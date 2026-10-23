// Demo data. All people, companies, phones, e-mails and street addresses are fictional.
import "dotenv/config";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, type RequestStatus, Role, type ZoneKind } from "@prisma/client";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value === "change-me") throw new Error(`Set ${name} in .env`);
  return value;
}

// Positions match the tables drawn in public/office-plan-demo.svg (1200×800), stored as shares of the size.
const DESK_COLUMNS = [500, 640, 780, 920, 1060];
const DESK_ROWS = [130, 290, 510, 670];
const desks = DESK_ROWS.flatMap((y, row) =>
  DESK_COLUMNS.map((x, col) => {
    const n = String(row * DESK_COLUMNS.length + col + 1).padStart(2, "0");
    return { code: n, pcNumber: `PC-${n}`, x: x / 1200, y: y / 800 };
  }),
);

const zones: { name: string; kind: ZoneKind; x: number; y: number; width: number; height: number }[] = [
  { name: "Meeting room", kind: "MEETING_ROOM", x: 20 / 1200, y: 20 / 800, width: 360 / 1200, height: 280 / 800 },
  { name: "Lounge", kind: "LOUNGE", x: 20 / 1200, y: 300 / 800, width: 360 / 1200, height: 220 / 800 },
  { name: "Kitchen", kind: "KITCHEN", x: 20 / 1200, y: 520 / 800, width: 360 / 1200, height: 260 / 800 },
];

type Person = { firstName: string; lastName: string; position: string; role: Role; desk: string };

// 13 people on 13 of the 20 desks.
const people: Person[] = [
  { firstName: "Olivia", lastName: "Bennett", position: "Office Manager", role: "ADMIN", desk: "01" },
  { firstName: "Daniel", lastName: "Brooks", position: "Account Manager", role: "MANAGER", desk: "02" },
  { firstName: "Sofia", lastName: "Ramirez", position: "Project Manager", role: "MANAGER", desk: "03" },
  { firstName: "Alex", lastName: "Carter", position: "Frontend Developer", role: "EMPLOYEE", desk: "06" },
  { firstName: "Mia", lastName: "Lopez", position: "UI/UX Designer", role: "EMPLOYEE", desk: "07" },
  { firstName: "Ethan", lastName: "Park", position: "Backend Developer", role: "EMPLOYEE", desk: "08" },
  { firstName: "Chloe", lastName: "Nguyen", position: "Graphic Designer", role: "EMPLOYEE", desk: "09" },
  { firstName: "Ryan", lastName: "Mitchell", position: "Full-stack Developer", role: "EMPLOYEE", desk: "11" },
  { firstName: "Ava", lastName: "Thompson", position: "QA Engineer", role: "EMPLOYEE", desk: "12" },
  { firstName: "Noah", lastName: "Kim", position: "DevOps Engineer", role: "EMPLOYEE", desk: "13" },
  { firstName: "Emma", lastName: "Wilson", position: "Content Manager", role: "EMPLOYEE", desk: "16" },
  { firstName: "Liam", lastName: "Patel", position: "Mobile Developer", role: "EMPLOYEE", desk: "17" },
  { firstName: "Zoe", lastName: "Harris", position: "SEO Specialist", role: "EMPLOYEE", desk: "18" },
];

const clients = [
  {
    companyName: "Bluefin Labs",
    contactName: "Grace Holloway",
    phone: "(650) 555-0201",
    city: "Palo Alto, CA",
    address: "455 Example St, Palo Alto, CA 94301",
    lat: 37.4443,
    lng: -122.1598,
  },
  {
    companyName: "Golden Gate Bakery Co.",
    contactName: "Marcus Reed",
    phone: "(415) 555-0202",
    city: "San Francisco, CA",
    address: "1200 Sample Ave, San Francisco, CA 94103",
    lat: 37.7726,
    lng: -122.4099,
  },
  {
    companyName: "Redwood Fitness",
    contactName: "Priya Shah",
    phone: "(408) 555-0203",
    city: "San Jose, CA",
    address: "88 Demo Blvd, San Jose, CA 95113",
    lat: 37.3352,
    lng: -121.8893,
  },
  {
    companyName: "Orbit Robotics",
    contactName: "Kevin Tran",
    phone: "(650) 555-0204",
    city: "Mountain View, CA",
    address: "310 Placeholder Way, Mountain View, CA 94041",
    lat: 37.3894,
    lng: -122.0819,
  },
  {
    companyName: "Sunset Realty Group",
    contactName: "Laura Diaz",
    phone: "(213) 555-0205",
    city: "Los Angeles, CA",
    address: "742 Fiction Rd, Los Angeles, CA 90012",
    lat: 34.0549,
    lng: -118.2426,
  },
  {
    companyName: "Silk Road Travel",
    contactName: "Jasur Karimov",
    phone: "+998 90 555-02-06",
    city: "Tashkent, Uzbekistan",
    address: "Namuna koʻchasi 12, Tashkent",
    lat: 41.2995,
    lng: 69.2401,
  },
  {
    companyName: "Chorsu Market Online",
    contactName: "Dilnoza Rahimova",
    phone: "+998 90 555-02-07",
    city: "Tashkent, Uzbekistan",
    address: "Misol koʻchasi 45, Tashkent",
    lat: 41.3262,
    lng: 69.2283,
  },
];

type DemoRequest = {
  client: string;
  title: string;
  description: string;
  status: RequestStatus;
  assignee?: string;
  dueInDays: number;
};

const requests: DemoRequest[] = [
  { client: "Bluefin Labs", title: "Landing page redesign", description: "New hero section, pricing block and contact form.", status: "IN_PROGRESS", assignee: "mia.lopez", dueInDays: 5 },
  { client: "Bluefin Labs", title: "Analytics setup", description: "Connect web analytics and set up conversion goals.", status: "NEW", dueInDays: 14 },
  { client: "Golden Gate Bakery Co.", title: "Online ordering website", description: "Menu, cart and pickup time selection.", status: "ASSIGNED", assignee: "alex.carter", dueInDays: 10 },
  { client: "Golden Gate Bakery Co.", title: "Menu photo set", description: "Retouch 30 product photos for the website.", status: "DONE", assignee: "chloe.nguyen", dueInDays: -7 },
  { client: "Redwood Fitness", title: "Mobile app MVP", description: "Class schedule and booking for iOS and Android.", status: "IN_PROGRESS", assignee: "liam.patel", dueInDays: 21 },
  { client: "Orbit Robotics", title: "On-site kickoff meeting", description: "Visit the client office, collect requirements for the new site.", status: "ASSIGNED", assignee: "daniel.brooks", dueInDays: 2 },
  { client: "Sunset Realty Group", title: "SEO audit", description: "Audit of listings pages and a list of fixes.", status: "IN_PROGRESS", assignee: "zoe.harris", dueInDays: -1 },
  { client: "Sunset Realty Group", title: "Hosting migration", description: "Move the website to a new hosting provider.", status: "NEW", dueInDays: 30 },
  { client: "Silk Road Travel", title: "Multilingual booking site", description: "Tour booking in Uzbek, Russian and English.", status: "ASSIGNED", assignee: "ethan.park", dueInDays: 12 },
  { client: "Chorsu Market Online", title: "Online store bug fixes", description: "Fix checkout errors and slow product search.", status: "DONE", assignee: "ryan.mitchell", dueInDays: -3 },
];

function daysFromToday(days: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  const passwords: Record<Role, string> = {
    ADMIN: await bcrypt.hash(requireEnv("SEED_ADMIN_PASSWORD"), 10),
    MANAGER: await bcrypt.hash(requireEnv("SEED_MANAGER_PASSWORD"), 10),
    EMPLOYEE: await bcrypt.hash(requireEnv("SEED_EMPLOYEE_PASSWORD"), 10),
  };

  await prisma.officeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, officeAddress: "100 Example Ave, Palo Alto, CA (fictional)" },
  });
  await prisma.officePlan.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (const desk of desks) {
    await prisma.desk.upsert({ where: { code: desk.code }, update: desk, create: desk });
  }
  if ((await prisma.zone.count()) === 0) await prisma.zone.createMany({ data: zones });

  for (const [i, p] of people.entries()) {
    const login = `${p.firstName}.${p.lastName}`.toLowerCase();
    const desk = await prisma.desk.findUniqueOrThrow({ where: { code: p.desk } });
    const employee = {
      firstName: p.firstName,
      lastName: p.lastName,
      position: p.position,
      phone: `(650) 555-01${String(i + 10).padStart(2, "0")}`,
      email: `${login}@marginflow.test`,
      deskId: desk.id,
    };

    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) {
      await prisma.employee.update({ where: { id: existing.employeeId }, data: employee });
      await prisma.user.update({ where: { login }, data: { role: p.role, passwordHash: passwords[p.role] } });
    } else {
      await prisma.user.create({
        data: { login, role: p.role, passwordHash: passwords[p.role], employee: { create: employee } },
      });
    }
  }

  if ((await prisma.client.count()) === 0) {
    for (const c of clients) {
      const email = `contact@${c.companyName.toLowerCase().replace(/[^a-z]+/g, "")}.test`;
      await prisma.client.create({ data: { ...c, email } });
    }
    for (const r of requests) {
      const client = await prisma.client.findFirstOrThrow({ where: { companyName: r.client } });
      const assignee = r.assignee
        ? await prisma.user.findUniqueOrThrow({ where: { login: r.assignee } })
        : null;
      await prisma.request.create({
        data: {
          clientId: client.id,
          title: r.title,
          description: r.description,
          status: r.status,
          assigneeId: assignee?.employeeId,
          dueDate: daysFromToday(r.dueInDays),
        },
      });
    }
  }

  const agentToken = process.env.AGENT_API_TOKEN;
  if (agentToken && agentToken !== "change-me") {
    const tokenHash = createHash("sha256").update(agentToken).digest("hex");
    await prisma.agentToken.upsert({ where: { tokenHash }, update: {}, create: { name: "Demo agent", tokenHash } });
  }

  console.log(
    `Seeded ${desks.length} desks, ${zones.length} zones, ${people.length} users, ${clients.length} clients, ${requests.length} requests.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
