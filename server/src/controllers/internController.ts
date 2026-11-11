import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { Intern, INTERN_STATUSES } from "../models/Intern";
import { User } from "../models/User";

const createSchema = z.object({
  userId: z.string().refine((v) => isValidObjectId(v), "invalid user id"),
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

function formatIssues(error: z.ZodError) {
  return error.issues.map((i) => ({
    field: i.path.join("."),
    message: i.message,
  }));
}

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
      .json({
        message: "validation failed",
        errors: formatIssues(result.error),
      });
  }

  const { userId, domain, status } = result.data;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const exists = await Intern.findOne({ user: userId });
    if (exists) {
      return res
        .status(409)
        .json({ message: "this user is already an intern" });
    }

    const intern = await Intern.create({ user: userId, domain, status });
    await intern.populate("user", "name email role");

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
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    let filter = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      // name and email live in the users collection, so find those users first
      const users = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select("_id");
      const userIds = users.map((u) => u._id);

      filter = { $or: [{ user: { $in: userIds } }, { domain: regex }] };
    }

    const interns = await Intern.find(filter)
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.json(interns);
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
      "user",
      "name email role",
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
      .json({
        message: "validation failed",
        errors: formatIssues(result.error),
      });
  }

  try {
    const intern = await Intern.findByIdAndUpdate(req.params.id, result.data, {
      new: true,
    }).populate("user", "name email role");
    if (!intern) {
      return res.status(404).json({ message: "intern not found" });
    }

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
