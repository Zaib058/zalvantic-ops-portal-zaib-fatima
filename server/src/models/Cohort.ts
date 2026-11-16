import { Schema, model } from "mongoose";

const cohortSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    startDate: { type: Date, required: true },
    domains: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const Cohort = model("Cohort", cohortSchema);
