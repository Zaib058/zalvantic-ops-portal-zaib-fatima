import { useState } from "react";
import { updateCohort, deleteCohort, type Cohort } from "../api/cohorts";

type Props = {
  cohort: Cohort;
  onChange: () => void;
  onError: (message: string) => void;
};

export default function CohortCard({ cohort, onChange, onError }: Props) {
  const [newDomain, setNewDomain] = useState("");

  async function saveDomains(domains: string[]) {
    onError("");
    try {
      await updateCohort(cohort._id, { domains });
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const domain = newDomain.trim();
    if (!domain) return;

    saveDomains([...cohort.domains, domain]);
    setNewDomain("");
  }

  async function handleDelete() {
    if (!window.confirm(`Delete the cohort ${cohort.name}?`)) return;

    onError("");
    try {
      await deleteCohort(cohort._id);
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="card">
      <div className="row between">
        <div>
          <h2>{cohort.name}</h2>
          <span className="muted">
            Starts on {cohort.startDate.slice(0, 10)}
          </span>
        </div>
        <button className="danger" onClick={handleDelete}>
          Delete
        </button>
      </div>

      <div className="chips">
        {cohort.domains.length === 0 && (
          <span className="muted">No domains yet</span>
        )}
        {cohort.domains.map((domain) => (
          <span className="chip" key={domain}>
            {domain}
            <button
              className="x"
              aria-label={`Remove ${domain}`}
              onClick={() =>
                saveDomains(cohort.domains.filter((d) => d !== domain))
              }
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <form className="row" onSubmit={handleAdd}>
        <input
          placeholder="Add a domain"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
