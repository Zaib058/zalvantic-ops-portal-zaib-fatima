import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import { User } from "../src/models/User";
import { Intern } from "../src/models/Intern";
import { Cohort } from "../src/models/Cohort";
import { createUserAndLogin } from "./helpers";

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

const newCohort = {
  name: "Batch 2026-27",
  startDate: "2026-11-02",
  domains: ["MERN / MEAN Stack", "UI / UX Design"],
};

describe("cohort routes are admin only", () => {
  it("rejects a request with no token (401)", async () => {
    const res = await request(app).get("/api/cohorts");
    expect(res.status).toBe(401);
  });

  const routes = [
    ["get", "/api/cohorts"],
    ["post", "/api/cohorts"],
    ["get", "/api/cohorts/123"],
    ["patch", "/api/cohorts/123"],
    ["delete", "/api/cohorts/123"],
  ] as const;

  it.each(routes)("an intern cannot call %s %s (403)", async (method, url) => {
    const intern = await createUserAndLogin("intern@example.com", "intern");
    const res = await request(app)
      [method](url)
      .set("Authorization", `Bearer ${intern.token}`);
    expect(res.status).toBe(403);
  });
});

describe("create and read", () => {
  it("creates a cohort", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const res = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send(newCohort);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Batch 2026-27");
    expect(res.body.domains.length).toBe(2);
  });

  it("gives 409 for a duplicate name", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send(newCohort);
    const res = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send(newCohort);
    expect(res.status).toBe(409);
  });

  it("gives 400 for a name that is too short", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const res = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ ...newCohort, name: "A" });
    expect(res.status).toBe(400);
  });

  it("gives 400 when the start date is missing", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const res = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Batch 2026-27" });
    expect(res.status).toBe(400);
  });

  it("lists the cohorts", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send(newCohort);
    const res = await request(app)
      .get("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it("gets one cohort by id", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const created = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send(newCohort);
    const res = await request(app)
      .get(`/api/cohorts/${created.body._id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Batch 2026-27");
  });

  it("gives 404 for an id that does not exist", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/cohorts/${fakeId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(404);
  });
});

describe("update", () => {
  it("adds a domain", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const created = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send(newCohort);
    const res = await request(app)
      .patch(`/api/cohorts/${created.body._id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        domains: ["MERN / MEAN Stack", "UI / UX Design", "Data Science"],
      });
    expect(res.status).toBe(200);
    expect(res.body.domains.length).toBe(3);
  });

  it("gives 400 for duplicate domains", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const created = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send(newCohort);
    const res = await request(app)
      .patch(`/api/cohorts/${created.body._id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ domains: ["MERN", "MERN"] });
    expect(res.status).toBe(400);
  });

  it("gives 400 when the update body is empty", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const created = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send(newCohort);
    const res = await request(app)
      .patch(`/api/cohorts/${created.body._id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("gives 409 when the new name belongs to another cohort", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send(newCohort);
    const second = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Batch 2027-28", startDate: "2027-05-01" });
    const res = await request(app)
      .patch(`/api/cohorts/${second.body._id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Batch 2026-27" });
    expect(res.status).toBe(409);
  });
});

describe("rules about interns", () => {
  // makes a cohort with one intern in the "MERN / MEAN Stack" domain
  async function cohortWithIntern() {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const person = await createUserAndLogin(
      "sara@example.com",
      "intern",
      "Sara Khan",
    );
    const created = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send(newCohort);
    const cohortId = created.body._id as string;

    await request(app)
      .post("/api/interns")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: person.id, cohortId, domain: "MERN / MEAN Stack" });

    return { admin, cohortId };
  }

  it("cannot remove a domain that an intern uses (409)", async () => {
    const { admin, cohortId } = await cohortWithIntern();
    const res = await request(app)
      .patch(`/api/cohorts/${cohortId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ domains: ["UI / UX Design"] });
    expect(res.status).toBe(409);
  });

  it("can remove a domain that nobody uses", async () => {
    const { admin, cohortId } = await cohortWithIntern();
    const res = await request(app)
      .patch(`/api/cohorts/${cohortId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ domains: ["MERN / MEAN Stack"] });
    expect(res.status).toBe(200);
    expect(res.body.domains.length).toBe(1);
  });

  it("cannot delete a cohort that still has interns (409)", async () => {
    const { admin, cohortId } = await cohortWithIntern();
    const res = await request(app)
      .delete(`/api/cohorts/${cohortId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(409);
  });

  it("deletes a cohort that has no interns", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const created = await request(app)
      .post("/api/cohorts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send(newCohort);
    const res = await request(app)
      .delete(`/api/cohorts/${created.body._id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(204);
  });
});
