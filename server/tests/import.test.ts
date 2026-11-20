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

// a csv with 60 rows, 5 of them are bad
function makeCsv() {
  const lines = ["name,email,password,domain"];
  for (let i = 1; i <= 60; i++) {
    lines.push(
      `Intern ${i},intern${i}@example.com,password123,MERN / MEAN Stack`,
    );
  }
  lines[5] = "Intern 5,not-an-email,password123,MERN / MEAN Stack"; // row 6: bad email
  lines[12] = "Intern 12,intern12@example.com,short,MERN / MEAN Stack"; // row 13: short password
  lines[20] = "Intern 20,intern20@example.com,password123,Cooking"; // row 21: domain not in the cohort
  lines[30] = ",intern30@example.com,password123,MERN / MEAN Stack"; // row 31: no name
  lines[40] = "Intern 40,intern1@example.com,password123,MERN / MEAN Stack"; // row 41: same email as row 2
  return lines.join("\n");
}

// sends a csv to the import route
function sendFile(
  token: string,
  cohortId: string,
  csv: string,
  filename = "interns.csv",
) {
  return request(app)
    .post("/api/interns/import")
    .set("Authorization", `Bearer ${token}`)
    .field("cohortId", cohortId)
    .attach("file", Buffer.from(csv), filename);
}

describe("csv import", () => {
  it("imports 55 of 60 rows and reports the 5 bad ones", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();

    const res = await sendFile(admin.token, cohortId, makeCsv());

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(60);
    expect(res.body.imported).toBe(55);
    expect(res.body.failed).toBe(5);
    expect(res.body.errors.map((e: { row: number }) => e.row)).toEqual([
      6, 13, 21, 31, 41,
    ]);
    expect(res.body.errors[0].email).toBe("not-an-email");
    expect(res.body.errors[0].message).toContain("email");
    expect(res.body.errors[2].message).toContain("not in the cohort");
    expect(res.body.errors[4].message).toContain("twice");

    expect(await Intern.countDocuments()).toBe(55);
    expect(await User.countDocuments()).toBe(56); // 55 interns and the admin
  });

  it("puts every imported intern in the cohort with the right domain", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    await sendFile(admin.token, cohortId, makeCsv());

    const count = await Intern.countDocuments({
      cohort: cohortId,
      domain: "MERN / MEAN Stack",
    });
    expect(count).toBe(55);
  });

  it("lets an imported intern log in as an intern", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    await sendFile(admin.token, cohortId, makeCsv());

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "intern2@example.com", password: "password123" });

    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("intern");
  });

  it("stores a hash and not the password from the file", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    await sendFile(admin.token, cohortId, makeCsv());

    const saved = await User.findOne({ email: "intern2@example.com" });
    expect(saved?.passwordHash).not.toBe("password123");
    expect(saved?.passwordHash.startsWith("$2")).toBe(true);
  });

  it("imports nobody when the same file is sent again", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    await sendFile(admin.token, cohortId, makeCsv());

    const second = await sendFile(admin.token, cohortId, makeCsv());
    expect(second.body.imported).toBe(0);
    expect(second.body.failed).toBe(60);
    expect(await Intern.countDocuments()).toBe(55);
  });

  it("handles windows line endings, quotes and capital letters", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    const csv =
      'Name,Email,Password,Domain\r\n"Khan, Sara",SARA@Example.com,password123,UI / UX Design\r\n';

    const res = await sendFile(admin.token, cohortId, csv);

    expect(res.body.imported).toBe(1);
    const saved = await User.findOne({ email: "sara@example.com" });
    expect(saved?.name).toBe("Khan, Sara");
  });

  it("reports a short row instead of crashing", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();

    const res = await sendFile(
      admin.token,
      cohortId,
      "name,email,password,domain\nOnly Name\n",
    );

    expect(res.status).toBe(200);
    expect(res.body.failed).toBe(1);
    expect(res.body.errors[0].row).toBe(2);
  });
});

describe("csv import, bad requests", () => {
  it("gives 400 when there is no file", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    const res = await request(app)
      .post("/api/interns/import")
      .set("Authorization", `Bearer ${admin.token}`)
      .field("cohortId", cohortId);
    expect(res.status).toBe(400);
  });

  it("gives 400 when columns are missing", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    const res = await sendFile(
      admin.token,
      cohortId,
      "name,mail,pass\nA B,a@b.com,password123\n",
    );
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("email");
  });

  it("gives 400 when the file only has a header", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    const res = await sendFile(
      admin.token,
      cohortId,
      "name,email,password,domain\n",
    );
    expect(res.status).toBe(400);
  });

  it("gives 400 when the file is not a .csv", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    const res = await sendFile(admin.token, cohortId, makeCsv(), "interns.txt");
    expect(res.status).toBe(400);
  });

  it("gives 400 for an invalid cohort id", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const res = await sendFile(admin.token, "abc", makeCsv());
    expect(res.status).toBe(400);
  });

  it("gives 404 when the cohort does not exist", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const res = await sendFile(
      admin.token,
      new mongoose.Types.ObjectId().toString(),
      makeCsv(),
    );
    expect(res.status).toBe(404);
  });

  it("gives 400 when there are too many rows", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    const lines = ["name,email,password,domain"];
    for (let i = 0; i < 201; i++) {
      lines.push(`Intern ${i},i${i}@example.com,password123,MERN / MEAN Stack`);
    }
    const res = await sendFile(admin.token, cohortId, lines.join("\n"));
    expect(res.status).toBe(400);
  });

  it("gives 400 when the file is bigger than 1 MB", async () => {
    const admin = await createUserAndLogin("admin@example.com", "admin");
    const cohortId = await createCohort();
    const res = await sendFile(
      admin.token,
      cohortId,
      "a".repeat(1024 * 1024 + 10),
    );
    expect(res.status).toBe(400);
  });

  it("gives 403 when an intern tries to import", async () => {
    const intern = await createUserAndLogin("intern@example.com", "intern");
    const cohortId = await createCohort();
    const res = await sendFile(intern.token, cohortId, makeCsv());
    expect(res.status).toBe(403);
  });

  it("gives 401 without a token", async () => {
    const res = await request(app).post("/api/interns/import");
    expect(res.status).toBe(401);
  });
});
