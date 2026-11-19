import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { Cohort } from "../models/Cohort";
import { Intern } from "../models/Intern";

const domains = z
  .array(z.string().trim().min(2, "domain is too short"))
  .refine(
    (list) => new Set(list).size === list.length,
    "domains must be different from each other",
  );

const createSchema = z.object({
  name: z.string().trim().min(2, "name is too short"),
  startDate: z.coerce.date(),
  domains: domains.optional(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(2, "name is too short").optional(),
    startDate: z.coerce.date().optional(),
    domains: domains.optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "send at least one field to update",
  );

export async function createCohort(
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

  try {
    const exists = await Cohort.findOne({ name: result.data.name });
    if (exists) {
      return res
        .status(409)
        .json({ message: "a cohort with this name already exists" });
    }

    const cohort = await Cohort.create(result.data);
    res.status(201).json(cohort);
  } catch (err) {
    next(err);
  }
}

export async function listCohorts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const cohorts = await Cohort.find().sort({ startDate: -1 });
    res.json(cohorts);
  } catch (err) {
    next(err);
  }
}

export async function getCohort(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) {
      return res.status(404).json({ message: "cohort not found" });
    }
    res.json(cohort);
  } catch (err) {
    next(err);
  }
}

export async function updateCohort(
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
    if (result.data.name) {
      // another cohort with the same name?
      const same = await Cohort.findOne({
        name: result.data.name,
        _id: { $ne: req.params.id },
      });
      if (same) {
        return res
          .status(409)
          .json({ message: "a cohort with this name already exists" });
      }
    }

    // a domain that interns are using can't be removed
    const newDomains = result.data.domains;
    if (newDomains) {
      const current = await Cohort.findById(req.params.id);
      const removed = current
        ? current.domains.filter((d) => !newDomains.includes(d))
        : [];
      if (removed.length > 0) {
        const inUse = await Intern.exists({
          cohort: req.params.id,
          domain: { $in: removed },
        });
        if (inUse) {
          return res
            .status(409)
            .json({ message: "some interns still use a domain you removed" });
        }
      }
    }
    const cohort = await Cohort.findByIdAndUpdate(req.params.id, result.data, {
      returnDocument: "after",
    });
    if (!cohort) {
      return res.status(404).json({ message: "cohort not found" });
    }
    res.json(cohort);
  } catch (err) {
    next(err);
  }
}

export async function deleteCohort(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  try {
    const hasInterns = await Intern.exists({ cohort: req.params.id });
    if (hasInterns) {
      return res.status(409).json({ message: "this cohort still has interns" });
    }
    const cohort = await Cohort.findByIdAndDelete(req.params.id);
    if (!cohort) {
      return res.status(404).json({ message: "cohort not found" });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
