import { useEffect, useState } from "react";
import { getCohorts, createCohort, type Cohort } from "../api/cohorts";
import CohortCard from "../components/CohortCard";

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [domainsText, setDomainsText] = useState("");

  function reload() {
    getCohorts()
      .then(setCohorts)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // the domains are typed with commas between them
    const domains = domainsText
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    try {
      await createCohort({ name, startDate, domains });
      setName("");
      setStartDate("");
      setDomainsText("");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div>
      <h1>Cohorts</h1>

      <form className="card" onSubmit={handleCreate}>
        <h2>New cohort</h2>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Batch 2026-27"
            required
          />
        </label>
        <label>
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </label>
        <label>
          Domains (separate them with commas)
          <input
            value={domainsText}
            onChange={(e) => setDomainsText(e.target.value)}
            placeholder="MERN / MEAN Stack, UI / UX Design"
          />
        </label>
        <button type="submit">Create cohort</button>
      </form>

      {error && <p className="error">{error}</p>}

      {cohorts.map((cohort) => (
        <CohortCard
          key={cohort._id}
          cohort={cohort}
          onChange={reload}
          onError={setError}
        />
      ))}
    </div>
  );
}
