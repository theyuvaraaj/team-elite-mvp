import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0] ?? full, lastName: parts.slice(1).join(" ") };
}

/** Local/demo accounts — never use these passwords in production. */
const DEMO_PASSWORD = {
  employee: "Employee123!",
  candidate: "Candidate123!",
};

const EMPLOYEES = [
  { name: "Aarav Mehta", email: "employee@teamelite.local", employeeCode: "E-1001", password: DEMO_PASSWORD.employee },
  { name: "Kabir Nair", email: "kabir.nair@teamelite.local", employeeCode: "E-1002" },
] as const;

const CANDIDATES = [
  { name: "Priya Sharma", email: "candidate@teamelite.local", phone: "+1 555 0100", primaryRole: "Backend Engineer", experience: "4 years", assignedTo: "employee@teamelite.local", password: DEMO_PASSWORD.candidate },
  { name: "Rohan Iyer", email: "rohan.iyer@teamelite.local", phone: "+1 555 0142", primaryRole: "Frontend Engineer", experience: "3 years", assignedTo: "employee@teamelite.local" },
  { name: "Ananya Rao", email: "ananya.rao@teamelite.local", phone: "+1 555 0188", primaryRole: "Data Analyst", experience: "2 years", assignedTo: "kabir.nair@teamelite.local" },
  { name: "Vikram Singh", email: "vikram.singh@teamelite.local", phone: "+1 555 0207", primaryRole: "DevOps Engineer", experience: "6 years", assignedTo: "kabir.nair@teamelite.local" },
] as const;

/**
 * Remove leftover integration-test users (unique suffixed emails from killed
 * test runs that never reached their afterAll cleanup). Deletes FK-dependent
 * rows first so the users can be removed.
 */
async function purgeTestData() {
  const patterns = ["res-", "stats-", "applications-", "authz-", "admin-users-"];
  const orphans = await prisma.user.findMany({
    where: { OR: patterns.map((p) => ({ email: { startsWith: p } })) },
    select: { id: true, candidate: { select: { id: true } } },
  });
  if (orphans.length === 0) return;

  const userIds = orphans.map((u) => u.id);
  const candidateIds = orphans
    .map((u) => u.candidate?.id)
    .filter((id): id is string => Boolean(id));

  await prisma.optimizedResume.deleteMany({
    where: { OR: [{ createdById: { in: userIds } }, { candidateId: { in: candidateIds } }] },
  });
  await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.application.deleteMany({ where: { candidateId: { in: candidateIds } } });
  await prisma.assignment.deleteMany({
    where: { OR: [{ assignedBy: { in: userIds } }, { candidateId: { in: candidateIds } }] },
  });
  // candidates/employees cascade-delete with their user
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  console.log(`Purged ${userIds.length} leftover test user(s)`);
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
  }

  await purgeTestData();

  const adminHash = await argon2.hash(password);
  const adminName = splitName("Neha Verma");
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name: "Neha Verma", ...adminName, passwordHash: adminHash, role: UserRole.ADMIN, isActive: true },
    create: { name: "Neha Verma", ...adminName, email, passwordHash: adminHash, role: UserRole.ADMIN, isActive: true },
  });
  console.log(`Seeded admin: ${email}`);

  const employeeIdByEmail = new Map<string, string>();
  for (const emp of EMPLOYEES) {
    const passwordHash = emp.password ? await argon2.hash(emp.password) : null;
    const parts = splitName(emp.name);
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: { name: emp.name, ...parts, role: UserRole.EMPLOYEE, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
      create: { name: emp.name, ...parts, email: emp.email, role: UserRole.EMPLOYEE, isActive: true, passwordHash },
    });
    const employee = await prisma.employee.upsert({
      where: { userId: user.id },
      update: { name: emp.name, employeeCode: emp.employeeCode },
      create: { userId: user.id, name: emp.name, employeeCode: emp.employeeCode },
    });
    employeeIdByEmail.set(emp.email, employee.id);
  }
  console.log(`Seeded ${EMPLOYEES.length} employees`);

  for (const cand of CANDIDATES) {
    const passwordHash = cand.password ? await argon2.hash(cand.password) : null;
    const parts = splitName(cand.name);
    const user = await prisma.user.upsert({
      where: { email: cand.email },
      update: { name: cand.name, ...parts, role: UserRole.CANDIDATE, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
      create: { name: cand.name, ...parts, email: cand.email, role: UserRole.CANDIDATE, isActive: true, passwordHash },
    });
    const candidate = await prisma.candidate.upsert({
      where: { userId: user.id },
      update: { phone: cand.phone, primaryRole: cand.primaryRole, experience: cand.experience },
      create: { userId: user.id, phone: cand.phone, primaryRole: cand.primaryRole, experience: cand.experience },
    });
    const employeeId = employeeIdByEmail.get(cand.assignedTo);
    if (employeeId) {
      await prisma.assignment.upsert({
        where: { employeeId_candidateId: { employeeId, candidateId: candidate.id } },
        update: {},
        create: { employeeId, candidateId: candidate.id, assignedBy: admin.id },
      });
    }
  }
  console.log(`Seeded ${CANDIDATES.length} candidates + assignments`);
  console.log(`Demo logins: employee@teamelite.local / ${DEMO_PASSWORD.employee} · candidate@teamelite.local / ${DEMO_PASSWORD.candidate}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
