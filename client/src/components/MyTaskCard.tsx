import { useState } from "react";
import { submitToTask, type MyTask } from "../api/myTasks";

type Props = {
  task: MyTask;
  onSaved: () => void;
};

const formatDate = (date: string) => new Date(date).toLocaleString();

export default function MyTaskCard({ task, onSaved }: Props) {
  const [linksText, setLinksText] = useState(
    task.submission ? task.submission.links.join("\n") : "",
  );
  const [note, setNote] = useState(task.submission ? task.submission.note : "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    // there is one link on every line
    const links = linksText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    try {
      await submitToTask(task._id, links, note);
      setMessage("Your submission is saved");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="row between">
        <div>
          <h2>
            Week {task.weekNumber}: {task.title}
          </h2>
          <span className="muted">Due {formatDate(task.dueAt)}</span>
        </div>
        <span className={"chip " + task.status}>{task.status}</span>
      </div>

      <p>{task.brief}</p>

      {task.submission && (
        <p className="success">
          Submitted on {formatDate(task.submission.submittedAt)}
          {task.submission.late ? " (late)" : ""}
        </p>
      )}

      {task.status === "closed" ? (
        <p className="muted">The deadline for this task has passed.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {task.status === "late" && (
            <p className="warning">
              The due date has passed. You can still submit, but it will be
              marked as late.
            </p>
          )}
          <label>
            Links (one on every line)
            <textarea
              rows={3}
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              placeholder="https://github.com/your-name/your-repo"
            />
          </label>
          <label>
            Note (optional)
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}

          <button type="submit" disabled={saving}>
            {task.submission ? "Send again" : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}
