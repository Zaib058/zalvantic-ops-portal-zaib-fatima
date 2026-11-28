import { useEffect, useState } from "react";
import { getCohorts, type Cohort } from "../api/cohorts";
import {
  getTasks,
  createTask,
  deleteTask,
  getSubmissions,
  type Task,
  type SubmissionItem,
} from "../api/tasks";

const formatDate = (date: string) => new Date(date).toLocaleString();

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [error, setError] = useState("");

  // the form
  const [cohortId, setCohortId] = useState("");
  const [domain, setDomain] = useState("");
  const [weekNumber, setWeekNumber] = useState("1");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [releaseAt, setReleaseAt] = useState("");
  const [dueAt, setDueAt] = useState("");

  // the submissions of the task that was clicked
  const [selected, setSelected] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);

  function reload() {
    getTasks()
      .then(setTasks)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    reload();
    getCohorts()
      .then(setCohorts)
      .catch(() => {});
  }, []);

  // the domains of the chosen cohort
  const domains = cohorts.find((c) => c._id === cohortId)?.domains ?? [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await createTask({
        cohortId,
        domain,
        weekNumber: Number(weekNumber),
        title,
        brief,
        releaseAt: new Date(releaseAt).toISOString(),
        dueAt: new Date(dueAt).toISOString(),
      });
      setTitle("");
      setBrief("");
      setReleaseAt("");
      setDueAt("");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleDelete(task: Task) {
    if (!window.confirm(`Delete the task "${task.title}"?`)) return;

    setError("");
    try {
      await deleteTask(task._id);
      if (selected?._id === task._id) setSelected(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function handleShow(task: Task) {
    setError("");
    setSelected(task);
    getSubmissions(task._id)
      .then(setSubmissions)
      .catch((err) => setError(err.message));
  }

  return (
    <div>
      <h1>Tasks</h1>

      <form className="card" onSubmit={handleCreate}>
        <h2>New task</h2>
        <div className="two">
          <label>
            Cohort
            <select
              value={cohortId}
              onChange={(e) => {
                setCohortId(e.target.value);
                setDomain("");
              }}
              required
            >
              <option value="">Choose a cohort</option>
              {cohorts.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Domain
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            >
              <option value="">Choose a domain</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="two">
          <label>
            Week number (1 to 8)
            <input
              type="number"
              min={1}
              max={8}
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              required
            />
          </label>
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Brief
          <textarea
            rows={3}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            required
          />
        </label>
        <div className="two">
          <label>
            Released on
            <input
              type="datetime-local"
              value={releaseAt}
              onChange={(e) => setReleaseAt(e.target.value)}
              required
            />
          </label>
          <label>
            Due on
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              required
            />
          </label>
        </div>
        <button type="submit">Create task</button>
      </form>

      {error && <p className="error">{error}</p>}

      {tasks.length === 0 ? (
        <p>There are no tasks yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Cohort</th>
              <th>Domain</th>
              <th>Title</th>
              <th>Released</th>
              <th>Due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task._id}>
                <td>{task.weekNumber}</td>
                <td>{task.cohort ? task.cohort.name : "-"}</td>
                <td>{task.domain}</td>
                <td>{task.title}</td>
                <td>{formatDate(task.releaseAt)}</td>
                <td>{formatDate(task.dueAt)}</td>
                <td>
                  <div className="row">
                    <button onClick={() => handleShow(task)}>
                      Submissions
                    </button>
                    <button
                      className="danger"
                      onClick={() => handleDelete(task)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>
            Submissions for week {selected.weekNumber}: {selected.title}
          </h2>
          {submissions.length === 0 && (
            <p className="muted">Nobody has submitted yet.</p>
          )}
          {submissions.map((s) => (
            <div className="sub" key={s._id}>
              <div className="row between">
                <strong>
                  {s.intern?.user ? s.intern.user.name : "(deleted user)"}
                </strong>
                <span className={"chip " + (s.late ? "late" : "open")}>
                  {s.late ? "late" : "on time"}
                </span>
              </div>
              <span className="muted">
                {s.intern?.user ? s.intern.user.email : "-"} ·{" "}
                {formatDate(s.submittedAt)}
              </span>
              <ul>
                {s.links.map((link) => (
                  <li key={link}>
                    <a href={link} target="_blank" rel="noreferrer">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
              {s.note && <p>{s.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
