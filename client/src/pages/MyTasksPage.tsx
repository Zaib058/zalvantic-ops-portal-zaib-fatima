import { useEffect, useState } from "react";
import { getMyTasks, type MyTask } from "../api/myTasks";
import MyTaskCard from "../components/MyTaskCard";

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function reload() {
    getMyTasks()
      .then((data) => {
        setTasks(data);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div>
      <h1>My tasks</h1>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading...</p>}
      {!loading && !error && tasks.length === 0 && (
        <p>No tasks have been released for you yet.</p>
      )}

      {tasks.map((task) => (
        <MyTaskCard key={task._id} task={task} onSaved={reload} />
      ))}
    </div>
  );
}
