import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

/** Local/demo accounts — never use these passwords in production. */
const DEMO = {
  employee: {
    name: "Alex Employee",
    email: "employee@teamelite.local",
    password: "Employee123!",
    employeeCode: "E-1001",
  },
  candidate: {
    name: "Priya Candidate",
    email: "candidate@teamelite.local",
    password: "Candidate123!",
    phone: "+1 555 0100",
    primaryRole: "Backend Engineer",
    experience: "4 years",
  },
} as const;

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
  }

  const adminHash = await argon2.hash(password);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Admin",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      name: "Admin",
      email,
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(`Seeded admin user: ${email}`);

  const employeeHash = await argon2.hash(DEMO.employee.password);
  const employeeUser = await prisma.user.upsert({
    where: { email: DEMO.employee.email },
    update: {
      name: DEMO.employee.name,
      passwordHash: employeeHash,
      role: UserRole.EMPLOYEE,
      isActive: true,
    },
    create: {
      name: DEMO.employee.name,
      email: DEMO.employee.email,
      passwordHash: employeeHash,
      role: UserRole.EMPLOYEE,
      isActive: true,
    },
  });

  const employee = await prisma.employee.upsert({
    where: { userId: employeeUser.id },
    update: {
      name: DEMO.employee.name,
      employeeCode: DEMO.employee.employeeCode,
    },
    create: {
      userId: employeeUser.id,
      name: DEMO.employee.name,
      employeeCode: DEMO.employee.employeeCode,
    },
  });

  console.log(`Seeded employee: ${DEMO.employee.email} / ${DEMO.employee.password}`);

  const candidateHash = await argon2.hash(DEMO.candidate.password);
  const candidateUser = await prisma.user.upsert({
    where: { email: DEMO.candidate.email },
    update: {
      name: DEMO.candidate.name,
      passwordHash: candidateHash,
      role: UserRole.CANDIDATE,
      isActive: true,
    },
    create: {
      name: DEMO.candidate.name,
      email: DEMO.candidate.email,
      passwordHash: candidateHash,
      role: UserRole.CANDIDATE,
      isActive: true,
    },
  });

  const candidate = await prisma.candidate.upsert({
    where: { userId: candidateUser.id },
    update: {
      phone: DEMO.candidate.phone,
      primaryRole: DEMO.candidate.primaryRole,
      experience: DEMO.candidate.experience,
    },
    create: {
      userId: candidateUser.id,
      phone: DEMO.candidate.phone,
      primaryRole: DEMO.candidate.primaryRole,
      experience: DEMO.candidate.experience,
    },
  });

  console.log(
    `Seeded candidate: ${DEMO.candidate.email} / ${DEMO.candidate.password}`,
  );

  await prisma.assignment.upsert({
    where: {
      employeeId_candidateId: {
        employeeId: employee.id,
        candidateId: candidate.id,
      },
    },
    update: {},
    create: {
      employeeId: employee.id,
      candidateId: candidate.id,
      assignedBy: admin.id,
    },
  });

  console.log(
    `Assigned ${DEMO.employee.email} → ${DEMO.candidate.email}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
