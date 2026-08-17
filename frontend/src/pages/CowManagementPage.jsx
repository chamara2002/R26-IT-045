import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Pencil, 
  Plus, 
  Trash2, 
  Search, 
  Eye, 
  Tag, 
  Clock, 
  Calendar, 
  MapPin,
  Layers,
  AlertCircle,
  PlusCircle
} from "lucide-react";
import { Card, Button, Input, Badge, Modal, Alert, EmptyState, Skeleton } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import { addCow, deleteCow, getCows, updateCow } from "../services/api";
import { AddCowForm, CATTLE_BREEDS, CATTLE_SOURCES, calculateAgeDisplay, calculateCompletedYears } from "./AddCowPage";

export default function CowManagementPage() {
  const { t } = useI18n();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [cows, setCows] = useState([]);
  const [filteredCows, setFilteredCows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCow, setEditingCow] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    tag_id: "",
    name: "",
    breed: "",
    date_of_birth: "",
    gender: "Female",
    lactation_count: "",
    current_lactation: "",
    date_acquired: "",
    source: "",
    source_details: "",
  });
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadCows = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getCows();
      setCows(response.cows || []);
      setFilteredCows(response.cows || []);
    } catch {
      showError(t("common.serverError") || "Failed to load cattle records");
    } finally {
      setIsLoading(false);
    }
  }, [t, showError]);

  useEffect(() => {
    loadCows();
  }, [loadCows]);

  // Filter cows based on search term
  useEffect(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) {
      setFilteredCows(cows);
      return;
    }
    const filtered = cows.filter(
      (cow) =>
        (cow.tag_id && cow.tag_id.toLowerCase().includes(q)) ||
        (cow.name && cow.name.toLowerCase().includes(q)) ||
        (cow.breed && cow.breed.toLowerCase().includes(q))
    );
    setFilteredCows(filtered);
  }, [cows, searchTerm]);

  const startEdit = (cow) => {
    setEditingCow(cow);
    setEditForm({
      tag_id: cow.tag_id || cow.name || `COW-${cow.id}`,
      name: cow.name || "",
      breed: cow.breed || "",
      date_of_birth: cow.date_of_birth || "",
      gender: cow.gender || "Female",
      lactation_count: cow.lactation_count !== undefined && cow.lactation_count !== null ? String(cow.lactation_count) : "",
      current_lactation: cow.current_lactation !== undefined && cow.current_lactation !== null ? String(cow.current_lactation) : "",
      date_acquired: cow.date_acquired || "",
      source: cow.source || "",
      source_details: cow.source_details || "",
    });
    setEditError("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError("");

    if (!editForm.tag_id.trim()) {
      setEditError("Cow ID / Tag Number is required");
      return;
    }

    if (editForm.lactation_count !== "" && editForm.current_lactation !== "") {
      const tot = Number(editForm.lactation_count);
      const cur = Number(editForm.current_lactation);
      if (cur > tot) {
        setEditError(`Current Lactation (${cur}) cannot exceed Total Lactations (${tot})`);
        return;
      }
    }

    if (editForm.source === "Other" && !editForm.source_details.trim()) {
      setEditError("Please specify the source");
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload = {
        tag_id: editForm.tag_id.trim(),
        name: editForm.name.trim() || editForm.tag_id.trim(),
        breed: editForm.breed.trim() || "Other",
        gender: editForm.gender,
        lactation_count: editForm.lactation_count !== "" ? parseInt(editForm.lactation_count, 10) : 0,
        current_lactation: editForm.current_lactation !== "" ? parseInt(editForm.current_lactation, 10) : undefined,
        date_acquired: editForm.date_acquired || undefined,
        source: editForm.source || undefined,
        source_details: editForm.source === "Other" ? editForm.source_details.trim() : undefined,
      };

      if (editForm.date_of_birth) {
        payload.date_of_birth = editForm.date_of_birth;
      }

      await updateCow(editingCow.id, payload);
      showSuccess("Cattle details updated successfully");
      setEditingCow(null);
      await loadCows();
    } catch (err) {
      const msg = err.message || "Failed to update cattle details";
      setEditError(msg);
      showError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (cowId) => {
    try {
      await deleteCow(cowId);
      showSuccess("Cattle deleted successfully");
      setDeleteConfirmId(null);
      await loadCows();
    } catch (err) {
      const msg = err.message || "Failed to delete cattle";
      showError(msg);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t("cowManagement.yourCowList") || "Herd Management"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {cows.length} cattle registered in your farm herd
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="gap-2 text-xs sm:text-sm px-4 py-2.5"
              variant="primary"
            >
              <Plus className="h-4 w-4" />
              Register New Cow
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Tag ID, Name, or Breed..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </motion.div>

      {/* Register Cow Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Cow"
        size="lg"
      >
        <AddCowForm
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadCows();
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Cow Modal */}
      <Modal
        isOpen={editingCow !== null}
        onClose={() => setEditingCow(null)}
        title={`Edit Cow: ${editingCow?.tag_id || editingCow?.name}`}
        size="lg"
      >
        {editingCow && (
          <form onSubmit={handleEditSubmit} className="space-y-5">
            {editError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cow ID / Tag Number *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.tag_id}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, tag_id: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cow Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Breed <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={editForm.breed}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, breed: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select Breed</option>
                  {CATTLE_BREEDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gender *
                </label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={editForm.date_of_birth}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Lactations (≥ 0)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.lactation_count}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, lactation_count: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Lactation (≥ 1)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editForm.current_lactation}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, current_lactation: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={editForm.source}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, source: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select Source</option>
                  {CATTLE_SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {editForm.source === "Other" && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Specify Source *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.source_details}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, source_details: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingCow(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSavingEdit}
                disabled={isSavingEdit}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Are you sure you want to remove this cattle record from your herd? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => handleDelete(deleteConfirmId)}
            >
              Delete Cow
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cattle List Cards */}
      <motion.div variants={itemVariants}>
        {isLoading && cows.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-6 w-24 mb-3 rounded-lg" />
                <Skeleton className="h-4 w-32 mb-2 rounded-lg" />
                <Skeleton className="h-4 w-28 mb-4 rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1 rounded-lg" />
                  <Skeleton className="h-8 flex-1 rounded-lg" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredCows.length === 0 ? (
          <EmptyState
            icon={Tag}
            title={searchTerm ? "No cattle found" : "No cattle registered yet"}
            message={
              searchTerm
                ? "Try adjusting your search query for Tag ID, Name, or Breed."
                : "Start by registering your first cow to track milk production, health detections, and herd analytics."
            }
            action={
              !searchTerm && (
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="gap-2 text-xs sm:text-sm"
                  variant="primary"
                >
                  <Plus className="h-4 w-4" />
                  Register First Cow
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredCows.map((cow) => {
              const ageDisplay = cow.date_of_birth
                ? calculateAgeDisplay(cow.date_of_birth)
                : `${cow.age || 0} years`;

              return (
                <motion.div
                  key={cow.id}
                  variants={itemVariants}
                  whileHover={{ y: -3 }}
                >
                  <Card hover className="p-5 sm:p-6 h-full flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <div>
                      {/* Top Row: Tag ID & Gender Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                              {cow.tag_id || cow.name || `COW-${cow.id}`}
                            </h3>
                          </div>
                          {cow.name && cow.name !== cow.tag_id && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-6">
                              "{cow.name}"
                            </p>
                          )}
                        </div>

                        <Badge
                          variant={cow.gender === "Male" ? "secondary" : "success"}
                          className="text-[11px] font-bold"
                        >
                          {cow.gender === "Male" ? "♂ Bull" : "♀ Cow"}
                        </Badge>
                      </div>

                      {/* Detail Metrics Grid */}
                      <div className="space-y-2.5 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400 dark:text-slate-500">Breed:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                            {cow.breed || "Other"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-slate-400 dark:text-slate-500">Age:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {ageDisplay}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-slate-400 dark:text-slate-500">Lactations:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {cow.current_lactation ? `Current #${cow.current_lactation}` : "—"} (Total: {cow.lactation_count ?? 0})
                          </span>
                        </div>

                        {cow.source && (
                          <div className="flex justify-between">
                            <span className="text-slate-400 dark:text-slate-500">Source:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {cow.source === "Other" && cow.source_details ? cow.source_details : cow.source}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="text-slate-400 dark:text-slate-500">Monthly Yield:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {cow.milk_month_total !== undefined ? `${cow.milk_month_total} L` : `${cow.milk_yield || 0} L`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/cows/${cow.id}`)}
                        className="flex-1 gap-1 text-xs py-2"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Records
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(cow)}
                        className="gap-1 text-xs py-2 px-3"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteConfirmId(cow.id)}
                        className="text-xs py-2 px-2.5"
                        title="Delete Cow"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
