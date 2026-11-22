import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { Intern, INTERN_STATUSES } from "../models/Intern";
import { User } from "../models/User";
import { Cohort } from "../models/Cohort";

const objectId = z.string().refine((v) => isValidObjectId(v), "invalid id");

const createSchema = z.object({
  userId: objectId,
  cohortId: objectId,
  domain: z.string().trim().min(2, "domain is too short"),
  status: z.enum(INTERN_STATUSES).optional(),
});

const updateSchema = z
  .object({
    domain: z.string().trim().min(2, "domain is too short").optional(),
    status: z.enum(INTERN_STATUSES).optional(),
  })
  .refine(
    (data) => data.domain !== undefined || data.status !== undefined,
    "send at least one field to update",
  );

// which fields to fill in when we send an intern back
const populateFields = [
  { path: "user", select: "name email role" },
  { path: "cohort", select: "name" },
];

// so people can't break the search with characters like ( or *
function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createIntern(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const result = createSchema.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ message: "validation failed", errors: result.error.issues });
  }

  const { userId, cohortId, domain, status } = result.data;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "cohort not found" });
    }

    if (!cohort.domains.includes(domain)) {
      return res
        .status(400)
        .json({ message: "this domain is not in the cohort" });
    }

    const exists = await Intern.findOne({ user: userId });
    if (exists) {
      return res
        .status(409)
        .json({ message: "this user is already an intern" });
    }

    const intern = await Intern.create({
      user: userId,
      cohort: cohortId,
      domain,
      status,
    });
    await intern.populate(populateFields);

    res.status(201).json(intern);
  } catch (err) {
    next(err);
  }
}

export async function listInterns(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // read the query string, an empty value means "no filter"
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";
  const cohort = typeof req.query.cohort === "string" ? req.query.cohort : "";
  const domain = typeof req.query.domain === "string" ? req.query.domain : "";
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

  if (cohort && !isValidObjectId(cohort)) {
    return res.status(400).json({ message: "invalid cohort id" });
  }
  if (status && !(INTERN_STATUSES as readonly string[]).includes(status)) {
    return res.status(400).json({ message: "invalid status" });
  }

  try {
    const filter: Record<string, unknown> = {};
    if (cohort) filter.cohort = cohort;
    if (domain) filter.domain = domain;
    if (status) filter.status = status;

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      // name and email live in the users collection, so find those users first
      const users = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select("_id");
      const userIds = users.map((u) => u._id);

      filter.$or = [{ user: { $in: userIds } }, { domain: regex }];
    }

    const total = await Intern.countDocuments(filter);
    const interns = await Intern.find(filter)
      .populate(populateFields)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      data: interns,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

export async function getIntern(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  try {
    const intern = await Intern.findById(req.params.id).populate(
      populateFields,
    );
    if (!intern) {
      return res.status(404).json({ message: "intern not found" });
    }

    res.json(intern);
  } catch (err) {
    next(err);
  }
}

export async function updateIntern(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ message: "validation failed", errors: result.error.issues });
  }

  try {
    const intern = await Intern.findById(req.params.id);
    if (!intern) {
      return res.status(404).json({ message: "intern not found" });
    }

    // a new domain has to be one of the domains of the intern's cohort
    if (result.data.domain) {
      const cohort = await Cohort.findById(intern.cohort);
      if (!cohort || !cohort.domains.includes(result.data.domain)) {
        return res
          .status(400)
          .json({ message: "this domain is not in the cohort" });
      }
    }

    intern.set(result.data);
    await intern.save();
    await intern.populate(populateFields);

    res.json(intern);
  } catch (err) {
    next(err);
  }
}

export async function deleteIntern(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  try {
    const intern = await Intern.findByIdAndDelete(req.params.id);
    if (!intern) {
      return res.status(404).json({ message: "intern not found" });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
