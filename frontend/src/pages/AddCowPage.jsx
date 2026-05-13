// Cow registration page for adding new herd records.
import { useState } from "react";

import { addCow } from "../services/api";

export default function AddCowPage() {
  const [formData, setFormData] = useState({
    name: "",
    breed: "",
    age: "",
    lactation_count: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name || !formData.breed || !formData.age || !formData.lactation_count) {
      setError("All fields are required");
      return;
    }

    setIsLoading(true);
    try {
      await addCow({
        ...formData,
        age: Number(formData.age),
        lactation_count: Number(formData.lactation_count),
      });
      setSuccess("Cow registered successfully");
      setFormData({ name: "", breed: "", age: "", lactation_count: "" });
    } catch (err) {
      setError(err.message || "Failed to register cow");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Register New Cow</h2>
        <p className="mt-1 text-sm text-slate-600">Add cow profile details for herd tracking.</p>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cow Name/ID</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Breed</label>
            <input
              name="breed"
              value={formData.breed}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Age (years)</label>
            <input
              type="number"
              min="0"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lactation Count</label>
            <input
              type="number"
              min="0"
              name="lactation_count"
              value={formData.lactation_count}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
            />
          </div>

          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          {success && <p className="sm:col-span-2 text-sm text-emerald-600">{success}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="sm:col-span-2 rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {isLoading ? "Saving..." : "Register Cow"}
          </button>
        </form>
      </div>
    </div>
  );
}
