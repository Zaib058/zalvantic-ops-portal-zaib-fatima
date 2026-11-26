import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { Task } from "../models/Task";
import { Cohort } from "../models/Cohort";
import { Submission } from "../models/Submission";

const createSchema = z
  .object({
    cohortId: z.string().refine((v) => isValidObjectId(v), "invalid id"),
    domain: z.string().trim().min(2, "domain is too short"),
    weekNumber: z
      .number("weekNumber must be a number")
      .int()
      .min(1, "weeks start at 1")
      .max(8, "there are only 8 weeks"),
    title: z.string().trim().min(2, "title is too short"),
    brief: z.string().trim().min(2, "brief is too short"),
    releaseAt: z.coerce.date(),
    dueAt: z.coerce.date(),
  })
  .refine((data) => data.dueAt > data.releaseAt, {
    message: "the due date must be after the release date",
    path: ["dueAt"],
  });

const updateSchema = z
  .object({
    title: z.string().trim().min(2, "title is too short").optional(),
    brief: z.string().trim().min(2, "brief is too short").optional(),
    releaseAt: z.coerce.date().optional(),
    dueAt: z.coerce.date().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "send at least one field to update",
  );

export async function createTask(
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

  const { cohortId, domain, weekNumber, title, brief, releaseAt, dueAt } =
    result.data;

  try {
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "cohort not found" });
    }

    if (!cohort.domains.includes(domain)) {
      return res
        .status(400)
        .json({ message: "this domain is not in the cohort" });
    }

    const exists = await Task.findOne({ cohort: cohortId, domain, weekNumber });
    if (exists) {
      return res.status(409).json({
        message: "this cohort and domain already have a task for that week",
      });
    }

    const task = await Task.create({
      cohort: cohortId,
      domain,
      weekNumber,
      title,
      brief,
      releaseAt,
      dueAt,
    });
    await task.populate("cohort", "name");

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

export async function listTasks(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const cohort = typeof req.query.cohort === "string" ? req.query.cohort : "";
  const domain = typeof req.query.domain === "string" ? req.query.domain : "";

  if (cohort && !isValidObjectId(cohort)) {
    return res.status(400).json({ message: "invalid cohort id" });
  }

  try {
    const filter: Record<string, unknown> = {};
    if (cohort) filter.cohort = cohort;
    if (domain) filter.domain = domain;

    const tasks = await Task.find(filter)
      .populate("cohort", "name")
      .sort({ weekNumber: 1, domain: 1 });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  try {
    const task = await Task.findById(req.params.id).populate("cohort", "name");
    if (!task) {
      return res.status(404).json({ message: "task not found" });
    }
    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function updateTask(
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
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "task not found" });
    }

    task.set(result.data);

    // the dates are checked together, because only one of them may have been sent
    if (task.dueAt <= task.releaseAt) {
      return res
        .status(400)
        .json({ message: "the due date must be after the release date" });
    }

    await task.save();
    await task.populate("cohort", "name");

    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  try {
    const hasSubmissions = await Submission.exists({ task: req.params.id });
    if (hasSubmissions) {
      return res
        .status(409)
        .json({ message: "this task already has submissions" });
    }

    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "task not found" });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
export async function listSubmissions(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "task not found" });
    }

    // fill in the intern and, inside it, the name and email of the user
    const submissions = await Submission.find({ task: task._id })
      .populate({
        path: "intern",
        select: "domain status user",
        populate: { path: "user", select: "name email" },
      })
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (err) {
    next(err);
  }
}
