// Disease module selector and result section.
import { useState } from "react";

import { predictModule } from "../services/api";

export default function ModuleSelector({ modules }) {
  const [selectedModule, setSelectedModule] = useState(modules[0] || "mastitis");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const runPrediction = async () => {
    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const response = await predictModule(selectedModule, {
        data: {},
        image: null,
      });
      setResult(response);
    } catch (err) {
      setError(err.message || "Prediction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Disease Checks</h2>
      <p className="mt-1 text-sm text-slate-600">
        Select a disease check and test integration.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <select
          value={selectedModule}
          onChange={(event) => setSelectedModule(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          {modules.map((moduleName) => (
            <option key={moduleName} value={moduleName}>
              {moduleName.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={runPrediction}
          disabled={isLoading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {isLoading ? "Running..." : "Run Detection"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            <span className="font-medium">Disease:</span> {result.disease}
          </p>
          <p>
            <span className="font-medium">Stage:</span> {result.stage}
          </p>
          <p>
            <span className="font-medium">Confidence:</span> {result.confidence}
          </p>
          <p>
            <span className="font-medium">Advice:</span> {result.advice}
          </p>
        </div>
      )}
    </section>
  );
}
