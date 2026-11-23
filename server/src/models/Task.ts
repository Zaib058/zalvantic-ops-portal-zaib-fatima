import { Schema, model } from "mongoose";

const taskSchema = new Schema(
  {
    cohort: { type: Schema.Types.ObjectId, ref: "Cohort", required: true },
    domain: { type: String, required: true, trim: true },
    weekNumber: { type: Number, required: true, min: 1, max: 8 },
    title: { type: String, required: true, trim: true },
    brief: { type: String, required: true, trim: true },
    releaseAt: { type: Date, required: true },
    dueAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// only one task for each cohort, domain and week
taskSchema.index({ cohort: 1, domain: 1, weekNumber: 1 }, { unique: true });

export const Task = model("Task", taskSchema);
