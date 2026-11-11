import { Schema, model } from "mongoose";

export const INTERN_STATUSES = ["active", "completed", "dropped"] as const;
export type InternStatus = (typeof INTERN_STATUSES)[number];

const internSchema = new Schema(
  {
    // points to a document in the users collection
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    domain: { type: String, required: true, trim: true },
    status: { type: String, enum: INTERN_STATUSES, default: "active" },
  },
  { timestamps: true },
);

export const Intern = model("Intern", internSchema);
