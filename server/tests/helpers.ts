import request from "supertest";
import app from "../src/app";
import { User, Role } from "../src/models/User";

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
