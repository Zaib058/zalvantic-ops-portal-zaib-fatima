import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "mongoose";
import { parse } from "csv-parse/sync";
import bcrypt from "bcrypt";
import { z } from "zod";
import { User } from "../models/User";
import { Intern } from "../models/Intern";
import { Cohort } from "../models/Cohort";

const MAX_ROWS = 200;
const COLUMNS = ["name", "email", "password", "domain"];

// the rules for one row of the file
const rowSchema = z.object({
  name: z
    .string("this value is missing")
    .trim()
    .min(2, "must be at least 2 characters"),
  email: z
    .string("this value is missing")
    .trim()
    .toLowerCase()
    .email("is not a valid email"),
  password: z
    .string("this value is missing")
    .min(8, "must be at least 8 characters"),
  domain: z
    .string("this value is missing")
    .trim()
    .min(2, "this value is missing"),
});

export async function importInterns(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const cohortId = req.body.cohortId;
  if (typeof cohortId !== "string" || !isValidObjectId(cohortId)) {
    return res.status(400).json({ message: "send a valid cohortId" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "please upload a csv file" });
  }
  if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
    return res.status(400).json({ message: "the file must be a .csv file" });
  }

  // read the file, a broken file is a 400
  let rows: Record<string, string>[];
  let header: string[] = [];
  try {
    rows = parse(req.file.buffer, {
      columns: (line: string[]) => {
        header = line.map((h) => h.trim().toLowerCase());
        return header;
      },
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      bom: true,
    });
  } catch {
    return res
      .status(400)
      .json({ message: "could not read the file, is it a proper csv?" });
  }

  // the columns are checked on the header line, not on the first row
  const missingColumns = COLUMNS.filter((c) => !header.includes(c));
  if (missingColumns.length > 0) {
    return res
      .status(400)
      .json({
        message: `the file is missing these columns: ${missingColumns.join(", ")}`,
      });
  }
  if (rows.length === 0) {
    return res.status(400).json({ message: "the file has no rows" });
  }
  if (rows.length > MAX_ROWS) {
    return res
      .status(400)
      .json({
        message: `the file has too many rows, the limit is ${MAX_ROWS}`,
      });
  }

  try {
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "cohort not found" });
    }

    // one query to find which emails are already registered
    const emails = rows.map((r) =>
      String(r.email ?? "")
        .trim()
        .toLowerCase(),
    );
    const found = await User.find({ email: { $in: emails } }).select("email");
    const taken = new Set(found.map((u) => u.email));
    const seen = new Set<string>();

    const errors: { row: number; email: string; message: string }[] = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = rowSchema.safeParse(row);
      let problem = "";

      if (!result.success) {
        problem = result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
      } else if (!cohort.domains.includes(result.data.domain)) {
        problem = "domain: this domain is not in the cohort";
      } else if (taken.has(result.data.email)) {
        problem = "email: already registered";
      } else if (seen.has(result.data.email)) {
        problem = "email: appears twice in this file";
      }

      // row 1 of the file is the header, so the first data row is row 2
      if (problem || !result.success) {
        errors.push({
          row: i + 2,
          email: String(row.email ?? ""),
          message: problem,
        });
        continue;
      }

      const { name, email, password, domain } = result.data;
      seen.add(email);

      try {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, passwordHash });
        await Intern.create({ user: user._id, cohort: cohort._id, domain });
        imported++;
      } catch {
        // if the user was saved but the intern was not, remove the user again
        await User.deleteOne({ email });
        errors.push({ row: i + 2, email, message: "could not save this row" });
      }
    }

    res.json({ total: rows.length, imported, failed: errors.length, errors });
  } catch (err) {
    next(err);
  }
}
