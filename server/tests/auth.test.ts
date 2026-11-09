import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { User } from "../src/models/User";


const testUser = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
};

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST as string);
});

afterEach(async () => {
  // empty the users after every test so they dont affect each other
  await User.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
});

describe("register", () => {
  it("creates a user and does not return the password", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.email).toBe(testUser.email);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("saves a hash, not the real password", async () => {
    await request(app).post("/api/auth/register").send(testUser);

    const saved = await User.findOne({ email: testUser.email });
    expect(saved?.passwordHash).not.toBe(testUser.password);
  });

  it("gives 409 for a duplicate email", async () => {
    await request(app).post("/api/auth/register").send(testUser);
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(409);
  });

  it("gives 400 for a short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...testUser, password: "123" });

    expect(res.status).toBe(400);
  });

    it("ignores a role sent in the body", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...testUser, role: "admin" });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("intern");
  });
  
});

describe("login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(testUser);
  });

  it("returns a token with the right password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it("gives 401 for a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("gives 401 for an email that does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });

    expect(res.status).toBe(401);
  });
});

describe("protected route /api/auth/me", () => {
  it("rejects a request with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects a fake token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer abc123");

    expect(res.status).toBe(401);
  });

  it("rejects a token signed with another secret", async () => {
    const fakeToken = jwt.sign({ sub: "123" }, "some-other-secret");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const oldToken = jwt.sign({ sub: "123" }, process.env.JWT_SECRET as string, {
      expiresIn: -10,
    });
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${oldToken}`);

    expect(res.status).toBe(401);
  });

  it("returns the user with a valid token", async () => {
    await request(app).post("/api/auth/register").send(testUser);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testUser.email);
  });
});