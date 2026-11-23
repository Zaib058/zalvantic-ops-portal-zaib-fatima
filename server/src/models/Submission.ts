import { Schema, model } from "mongoose";

const submissionSchema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    intern: { type: Schema.Types.ObjectId, ref: "Intern", required: true },
    links: { type: [String], default: [] },
    note: { type: String, default: "", trim: true },
    late: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// an intern has one submission for each task
submissionSchema.index({ task: 1, intern: 1 }, { unique: true });

export const Submission = model("Submission", submissionSchema);
