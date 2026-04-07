import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const SALT_ROUNDS = 12;

interface PilotConfig {
  professor: {
    email: string;
    name: string;
    password: string;
  };
  courses: {
    name: string;
    code: string;
  }[];
  enrollAllStudents: boolean; // Enroll all existing users
  specificStudentEmails: string[]; // Additional specific emails
}

// PILOT CONFIGURATION - Edit this for your setup
const pilotConfig: PilotConfig = {
  professor: {
    email: "professor@example.edu",
    name: "Dr. Statistics",
    password: "pilot2024!",
  },
  courses: [
    { name: "Engineering Statistics", code: "STAT301" },
    { name: "Marketing Principles", code: "MKT201" },
  ],
  enrollAllStudents: true, // Enroll all existing users in BOTH courses
  specificStudentEmails: [], // Add specific emails if needed
};

async function seedPilot(config: PilotConfig) {
  console.log("🌱 Setting up pilot professor and courses...\n");

  // 1. Create professor with hashed password
  console.log(`Creating professor: ${config.professor.email}`);
  const passwordHash = await bcrypt.hash(config.professor.password, SALT_ROUNDS);

  const [professor] = await db
    .insert(schema.professors)
    .values({
      email: config.professor.email.toLowerCase(),
      name: config.professor.name,
      passwordHash,
    })
    .onConflictDoUpdate({
      target: schema.professors.email,
      set: {
        name: config.professor.name,
        passwordHash,
      },
    })
    .returning();

  console.log(`✓ Professor created: ${professor.id}`);

  // 2. Also create professor as a student (so they can study too)
  console.log(`\nCreating student account for professor...`);
  const [profAsStudent] = await db
    .insert(schema.users)
    .values({
      email: config.professor.email.toLowerCase(),
      group: "krokyo",
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { group: "krokyo" },
    })
    .returning();
  console.log(`✓ Professor can also study as student: ${profAsStudent.id}`);

  // 3. Create courses
  const createdCourses: typeof schema.courses.$inferSelect[] = [];
  for (const courseConfig of config.courses) {
    console.log(`\nCreating course: ${courseConfig.code} - ${courseConfig.name}`);

    const [course] = await db
      .insert(schema.courses)
      .values({
        professorId: professor.id,
        name: courseConfig.name,
        code: courseConfig.code,
      })
      .onConflictDoUpdate({
        target: schema.courses.code,
        set: {
          name: courseConfig.name,
          professorId: professor.id,
        },
      })
      .returning();

    createdCourses.push(course);
    console.log(`✓ Course created: ${course.id}`);
  }

  // 4. Gather students to enroll
  let studentsToEnroll: typeof schema.users.$inferSelect[] = [];

  if (config.enrollAllStudents) {
    console.log(`\nFetching all existing students...`);
    studentsToEnroll = await db.query.users.findMany();
    console.log(`Found ${studentsToEnroll.length} students`);
  }

  // Add specific emails
  if (config.specificStudentEmails.length > 0) {
    for (const email of config.specificStudentEmails) {
      const existing = studentsToEnroll.find(
        (s) => s.email.toLowerCase() === email.toLowerCase()
      );
      if (!existing) {
        // Create student if doesn't exist
        const [newStudent] = await db
          .insert(schema.users)
          .values({
            email: email.toLowerCase(),
            group: "krokyo",
          })
          .onConflictDoNothing()
          .returning();
        if (newStudent) {
          studentsToEnroll.push(newStudent);
          console.log(`✓ Created new student: ${email}`);
        }
      }
    }
  }

  // 5. Enroll students in ALL courses
  console.log(`\nEnrolling ${studentsToEnroll.length} students in ${createdCourses.length} courses...`);

  for (const course of createdCourses) {
    let enrolled = 0;
    for (const student of studentsToEnroll) {
      await db
        .insert(schema.courseEnrollments)
        .values({
          courseId: course.id,
          userId: student.id,
        })
        .onConflictDoNothing();
      enrolled++;
    }
    console.log(`✓ ${course.code}: ${enrolled} students enrolled`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ Pilot setup complete!\n");
  console.log("PROFESSOR LOGIN:");
  console.log(`  Email:    ${config.professor.email}`);
  console.log(`  Password: ${config.professor.password}`);
  console.log(`  URL:      /professor`);
  console.log("\nCOURSES:");
  for (const course of createdCourses) {
    console.log(`  - ${course.code}: ${course.name}`);
  }
  console.log(`\nSTUDENTS ENROLLED: ${studentsToEnroll.length}`);
  console.log("\nNOTE: The professor can also study at /study using their email.");
  console.log("=".repeat(60));
}

// Override with environment variables if provided
const config: PilotConfig = {
  professor: {
    email: process.env.SEED_PROFESSOR_EMAIL || pilotConfig.professor.email,
    name: process.env.SEED_PROFESSOR_NAME || pilotConfig.professor.name,
    password: process.env.SEED_PROFESSOR_PASSWORD || pilotConfig.professor.password,
  },
  courses: pilotConfig.courses, // Edit pilotConfig above for courses
  enrollAllStudents: pilotConfig.enrollAllStudents,
  specificStudentEmails: process.env.SEED_STUDENT_EMAILS
    ? process.env.SEED_STUDENT_EMAILS.split(",").map((e) => e.trim())
    : pilotConfig.specificStudentEmails,
};

seedPilot(config).catch(console.error);
