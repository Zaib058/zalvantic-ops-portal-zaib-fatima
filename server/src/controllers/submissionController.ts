import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { Intern } from "../models/Intern";
import { Task } from "../models/Task";
import { Submission } from "../models/Submission";

const DAY = 24 * 60 * 60 * 1000;
const LATE_DAYS = 3; // a submission is still taken this long after the due date, marked as late

const bodySchema = z.object({
  links: z
    .array(
      z.url({
        protocol: /^https?$/,
        error: "must be a link starting with http:// or https://",
      }),
    )
    .min(1, "add at least one link")
    .max(5, "5 links at most"),
  note: z.string().trim().max(1000, "the note is too long").default(""),
});

// open: before the due date, late: inside the extra days, closed: after that
function statusOf(dueAt: Date, now: number) {
  if (now <= dueAt.getTime()) return "open";
  if (now <= dueAt.getTime() + LATE_DAYS * DAY) return "late";
  return "closed";
}

export async function listMyTasks(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const intern = await Intern.findOne({ user: res.locals.userId });
    if (!intern) {
      return res
        .status(403)
        .json({ message: "you are not registered as an intern" });
    }

    const now = Date.now();

    // only the released tasks of the intern's own cohort and domain
    const tasks = await Task.find({
      cohort: intern.cohort,
      domain: intern.domain,
      releaseAt: { $lte: new Date(now) },
    }).sort({ weekNumber: 1 });

    const submissions = await Submission.find({
      intern: intern._id,
      task: { $in: tasks.map((t) => t._id) },
    });
    const byTask = new Map(submissions.map((s) => [String(s.task), s]));

    const result = tasks.map((task) => {
      const s = byTask.get(String(task._id));
      return {
        _id: task._id,
        weekNumber: task.weekNumber,
        title: task.title,
        brief: task.brief,
        domain: task.domain,
        releaseAt: task.releaseAt,
        dueAt: task.dueAt,
        status: statusOf(task.dueAt, now),
        submission: s
          ? {
              links: s.links,
              note: s.note,
              late: s.late,
              submittedAt: s.submittedAt,
            }
          : null,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function submitToTask(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isValidObjectId(req.params.taskId)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const result = bodySchema.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ message: "validation failed", errors: result.error.issues });
  }
  const { links, note } = result.data;

  try {
    const intern = await Intern.findOne({ user: res.locals.userId });
    if (!intern) {
      return res
        .status(403)
        .json({ message: "you are not registered as an intern" });
    }

    const task = await Task.findById(req.params.taskId);

    // a task of another cohort or domain looks the same as a task that does not exist
    if (
      !task ||
      String(task.cohort) !== String(intern.cohort) ||
      task.domain !== intern.domain
    ) {
      return res.status(404).json({ message: "task not found" });
    }

    const now = Date.now();

    if (task.releaseAt.getTime() > now) {
      return res
        .status(403)
        .json({ message: "this task has not been released yet" });
    }
    if (statusOf(task.dueAt, now) === "closed") {
      return res
        .status(403)
        .json({ message: "the deadline for this task has passed" });
    }

    const late = now > task.dueAt.getTime();

    // sending again before the deadline replaces the first submission
    const existing = await Submission.findOne({
      task: task._id,
      intern: intern._id,
    });
    if (existing) {
      existing.set({ links, note, late, submittedAt: new Date(now) });
      await existing.save();
      return res.json(existing);
    }

    const created = await Submission.create({
      task: task._id,
      intern: intern._id,
      links,
      note,
      late,
      submittedAt: new Date(now),
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}
