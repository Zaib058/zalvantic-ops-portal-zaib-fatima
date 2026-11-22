import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import { User } from "../src/models/User";
import { Intern } from "../src/models/Intern";
import { Cohort } from "../src/models/Cohort";
import { createUserAndLogin, createCohort } from "./helpers";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST as string);
});

afterEach(async () => {
  await Intern.deleteMany({});
  await Cohort.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

// makes an admin, a normal user and a cohort, then an intern record for the normal user
async function setup() {
  const admin = await createUserAndLogin("admin@example.com", "admin");
  const person = await createUserAndLogin(
    "sara@example.com",
    "intern",
    "Sara Khan",
  );
  const cohortId = await createCohort();
  const res = await request(app)
    .post("/api/interns")
    .set("Authorization", `Bearer ${admin.token}`)
    .send({ userId: person.id, cohortId, domain: "MERN / MEAN Stack" });

  return { admin, person, cohortId, internId: res.body._id as string };
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
  it("creates an intern and shows the user and cohort without the hash", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const person = await createUserAndLogin(
      "sara@example.com",
      "intern",
      "Sara Khan",
    );
    const cohortId = await createCohort();

    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: person.id, cohortId, domain: "MERN / MEAN Stack" });

    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe("Sara Khan");
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.cohort.name).toBe("Batch 2026-27");
  });

  it("gives 409 when the user is already an intern", async () => {
    const { admin, person, cohortId } = await setup();
    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: person.id, cohortId, domain: "MERN / MEAN Stack" });
    expect(res.status).toBe(409);
  });

  it("gives 404 when the user does not exist", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        userId: new mongoose.Types.ObjectId().toString(),
        cohortId,
        domain: "MERN / MEAN Stack",
      });
    expect(res.status).toBe(404);
  });

  it("gives 404 when the cohort does not exist", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const person = await createUserAndLogin("sara@example.com", "intern");
    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        userId: person.id,
        cohortId: new mongoose.Types.ObjectId().toString(),
        domain: "MERN / MEAN Stack",
      });
    expect(res.status).toBe(404);
  });

  it("gives 400 for an invalid user id", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: "not-an-id", cohortId, domain: "MERN / MEAN Stack" });
    expect(res.status).toBe(400);
  });

  it("gives 400 when the domain is too short", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const person = await createUserAndLogin("sara@example.com", "intern");
    const cohortId = await createCohort();
    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: person.id, cohortId, domain: "x" });
    expect(res.status).toBe(400);
  });

  it("gives 400 when the domain is not in the cohort", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const person = await createUserAndLogin("sara@example.com", "intern");
    const cohortId = await createCohort();
    const res = await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: person.id, cohortId, domain: "Data Science" });
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
    expect(res.body.data.length).toBe(1);
  });

  it("finds an intern by name", async () => {
    const { admin } = await setup();
    const res = await request(app)
      .get("/api/interns?search=sara")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.body.data.length).toBe(1);
  });

  it("returns an empty list when nothing matches", async () => {
    const { admin } = await setup();
    const res = await request(app)
      .get("/api/interns?search=zzzz")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
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

  it("changes the domain to another one in the cohort", async () => {
    const { admin, internId } = await setup();
    const res = await request(app)
      .patch(`/api/interns/${internId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ domain: "UI / UX Design" });
    expect(res.status).toBe(200);
    expect(res.body.domain).toBe("UI / UX Design");
  });

  it("gives 400 when the new domain is not in the cohort", async () => {
    const { admin, internId } = await setup();
    const res = await request(app)
      .patch(`/api/interns/${internId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ domain: "Data Science" });
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
// adds a user and makes them an intern, returns the intern id
async function addIntern(
  adminToken: string,
  cohortId: string,
  email: string,
  name: string,
  domain = "MERN / MEAN Stack",
) {
  const person = await createUserAndLogin(email, "intern", name);
  const res = await request(app)
    .post("/api/interns")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ userId: person.id, cohortId, domain });
  return res.body._id as string;
}

describe("pagination and filters", () => {
  it("returns the page info", async () => {
    const { admin } = await setup();
    const res = await request(app)
      .get("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.total).toBe(1);
    expect(res.body.totalPages).toBe(1);
    expect(res.body.data.length).toBe(1);
  });

  it("splits the list into pages", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    await addIntern(admin.token, cohortId, "a@example.com", "Ayesha");
    await addIntern(admin.token, cohortId, "b@example.com", "Bilal");
    await addIntern(admin.token, cohortId, "c@example.com", "Chand");

    const first = await request(app)
      .get("/api/interns")
      .query({ limit: 2 })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(first.body.data.length).toBe(2);
    expect(first.body.total).toBe(3);
    expect(first.body.totalPages).toBe(2);

    const second = await request(app)
      .get("/api/interns")
      .query({ limit: 2, page: 2 })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(second.body.data.length).toBe(1);
  });

  it("filters by domain", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    await addIntern(
      admin.token,
      cohortId,
      "a@example.com",
      "Ayesha",
      "MERN / MEAN Stack",
    );
    await addIntern(
      admin.token,
      cohortId,
      "b@example.com",
      "Bilal",
      "UI / UX Design",
    );

    const res = await request(app)
      .get("/api/interns")
      .query({ domain: "UI / UX Design" })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].user.name).toBe("Bilal");
  });

  it("filters by status", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    const firstId = await addIntern(
      admin.token,
      cohortId,
      "a@example.com",
      "Ayesha",
    );
    await addIntern(admin.token, cohortId, "b@example.com", "Bilal");
    await request(app)
      .patch(`/api/interns/${firstId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "completed" });

    const res = await request(app)
      .get("/api/interns")
      .query({ status: "completed" })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].user.name).toBe("Ayesha");
  });

  it("filters by cohort", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const firstCohort = await createCohort();
    const second = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Batch 2027-28",
        startDate: "2027-05-01",
        domains: ["MERN / MEAN Stack"],
      });
    await addIntern(admin.token, firstCohort, "a@example.com", "Ayesha");
    await addIntern(admin.token, second.body._id, "b@example.com", "Bilal");

    const res = await request(app)
      .get("/api/interns")
      .query({ cohort: firstCohort })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].user.name).toBe("Ayesha");
  });

  it("gives 400 for an invalid cohort filter", async () => {
    const { admin } = await setup();
    const res = await request(app)
      .get("/api/interns")
      .query({ cohort: "abc" })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(400);
  });

  it("gives 400 for an invalid status filter", async () => {
    const { admin } = await setup();
    const res = await request(app)
      .get("/api/interns")
      .query({ status: "sleeping" })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(400);
  });

  it("returns an empty page when the page number is too high", async () => {
    const { admin } = await setup();
    const res = await request(app)
      .get("/api/interns")
      .query({ page: 5 })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
