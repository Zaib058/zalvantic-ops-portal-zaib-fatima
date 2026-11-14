import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import { User } from "../src/models/User";
import { Intern } from "../src/models/Intern";
import { createUserAndLogin } from "./helpers";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST as string);
});

afterEach(async () => {
  await Intern.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

// makes an admin and a normal user, then an intern record for the normal user
async function setup() {
  const admin = await createUserAndLogin("admin@example.com", "admin");
  const person = await createUserAndLogin(
    "sara@example.com",
    "intern",
    "Sara Khan",
  );
  const res = await request(app)
    .post("/api/interns")
    .set("Authorization", `Bearer ${admin.token}`)
    .send({ userId: person.id, domain: "MERN / MEAN Stack" });

  return { admin, person, internId: res.body._id as string };
}

describe("admin routes are blocked for everyone else", () => {
  it("rejects a request with no token (401)", async () => {
    const res = await request(app).get("/api/interns");
    expect(res.status).toBe(401);
  });

  const routes = [
    ["get", "/api/interns"],
    ["post", "/api/interns"],
    ["get", "/api/interns/123"],
    ["patch", "/api/interns/123"],
    ["delete", "/api/interns/123"],
  ] as const;

  it.each(routes)("an intern cannot call %s %s (403)", async (method, url) => {
    const intern = await createUserAndLogin("intern@example.com", "intern");
    const res = await request(app)
      [method](url)
      .set("Authorization", `Bearer ${intern.token}`);
    expect(res.status).toBe(403);
  });

  it("a reviewer cannot call admin routes either (403)", async () => {
    const reviewer = await createUserAndLogin(
      "reviewer@example.com",
      "reviewer",
    );
    const res = await request(app)
      .get("/api/interns")
      .set("Authorization", `Bearer ${reviewer.token}`);
    expect(res.status).toBe(403);
  });

  it("an admin can call them (200)", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const res = await request(app)
      .get("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
  });
});

describe("create intern", () => {
  it("creates an intern and shows the user details without the hash", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const person = await createUserAndLogin(
      "sara@example.com",
      "intern",
      "Sara Khan",
    );

    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: person.id, domain: "MERN / MEAN Stack" });

    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe("Sara Khan");
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("gives 409 when the user is already an intern", async () => {
    const { admin, person } = await setup();
    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: person.id, domain: "MERN / MEAN Stack" });
    expect(res.status).toBe(409);
  });

  it("gives 404 when the user does not exist", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        userId: new mongoose.Types.ObjectId().toString(),
        domain: "MERN / MEAN Stack",
      });
    expect(res.status).toBe(404);
  });

  it("gives 400 for an invalid user id", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: "not-an-id", domain: "MERN / MEAN Stack" });
    expect(res.status).toBe(400);
  });

  it("gives 400 when the domain is too short", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const person = await createUserAndLogin("sara@example.com", "intern");
    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: person.id, domain: "x" });
    expect(res.status).toBe(400);
  });
});

describe("read and search", () => {
  it("lists the interns", async () => {
    const { admin } = await setup();
    const res = await request(app)
      .get("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it("finds an intern by name", async () => {
    const { admin } = await setup();
    const res = await request(app)
      .get("/api/interns?search=sara")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.body.length).toBe(1);
  });

  it("returns an empty list when nothing matches", async () => {
    const { admin } = await setup();
    const res = await request(app)
      .get("/api/interns?search=zzzz")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("does not crash on special characters in the search", async () => {
    const { admin } = await setup();
    const res = await request(app)
      .get("/api/interns?search=(*")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
  });

  it("gets one intern by id", async () => {
    const { admin, internId } = await setup();
    const res = await request(app)
      .get(`/api/interns/${internId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.domain).toBe("MERN / MEAN Stack");
  });

  it("gives 404 for an id that does not exist", async () => {
    const { admin } = await setup();
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/interns/${fakeId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(404);
  });

  it("gives 400 for an invalid id", async () => {
    const { admin } = await setup();
    const res = await request(app)
      .get("/api/interns/abc")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(400);
  });
});

describe("update and delete", () => {
  it("updates the status", async () => {
    const { admin, internId } = await setup();
    const res = await request(app)
      .patch(`/api/interns/${internId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "completed" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
  });

  it("gives 400 when the update body is empty", async () => {
    const { admin, internId } = await setup();
    const res = await request(app)
      .patch(`/api/interns/${internId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("deletes an intern", async () => {
    const { admin, internId } = await setup();
    const del = await request(app)
      .delete(`/api/interns/${internId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(del.status).toBe(204);

    const after = await request(app)
      .get(`/api/interns/${internId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(after.status).toBe(404);
  });
});
