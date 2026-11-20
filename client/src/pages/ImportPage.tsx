import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCohorts, type Cohort } from "../api/cohorts";
import { importInterns, type ImportResult } from "../api/interns";

export default function ImportPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCohorts()
      .then((list) => {
        setCohorts(list);
        if (list.length > 0) setCohortId(list[0]._id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a csv file first");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    try {
      setResult(await importInterns(cohortId, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p>
        <Link to="/interns">Back to interns</Link>
      </p>
      <h1>Import interns</h1>

      <form className="card" onSubmit={handleSubmit}>
        <p className="muted">
          The file needs these columns: name, email, password, domain. It can
          have up to 200 rows.
        </p>
        <label>
          Cohort
          <select
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            required
          >
            {cohorts.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          CSV file
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Importing, this can take a while..." : "Import"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="card">
          <h2>
            {result.imported} of {result.total} rows imported
          </h2>
          {result.failed === 0 ? (
            <p className="success">Every row was imported.</p>
          ) : (
            <>
              <p className="error">{result.failed} rows were not imported:</p>
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Email</th>
                    <th>Problem</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e) => (
                    <tr key={e.row}>
                      <td>{e.row}</td>
                      <td>{e.email || "-"}</td>
                      <td>{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
