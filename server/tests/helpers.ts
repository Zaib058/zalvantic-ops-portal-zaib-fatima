import request from "supertest";
import app from "../src/app";
import { User, Role } from "../src/models/User";
import { Cohort } from "../src/models/Cohort";

// registers a user, sets their role directly in the database, then logs in
export async function createUserAndLogin(
  email: string,
  role: Role = "intern",
  name = "Test " + role,
) {
  const password = "password123";

  await request(app).post("/api/auth/register").send({ name, email, password });

  if (role !== "intern") {
    await User.updateOne({ email }, { role });
  }

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  return {
    token: login.body.accessToken as string,
    id: login.body.user.id as string,
  };
}

// makes a cohort straight in the database and returns its id
export async function createCohort() {
  const cohort = await Cohort.create({
    name: "Batch 2026-27",
    startDate: new Date("2026-11-02"),
    domains: ["MERN / MEAN Stack", "UI / UX Design"],
  });
  return cohort.id as string;
}
