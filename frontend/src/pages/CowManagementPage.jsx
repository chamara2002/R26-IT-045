import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Pencil, Plus, Trash2, Search, ChevronDown, Eye } from "lucide-react";
import { Card, Button, Input, Badge, Modal, Alert, EmptyState, Skeleton } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import { addCow, deleteCow, getCows, updateCow } from "../services/api";

const emptyForm = {
  name: "",
  breed: "",
  age: "",
  lactation_count: "",
};

export default function CowManagementPage() {
  const { t } = useI18n();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [cows, setCows] = useState([]);
  const [filteredCows, setFilteredCows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const loadCows = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getCows();
      setCows(response.cows || []);
      setFilteredCows(response.cows || []);
    } catch {
      showError(t("common.serverError"));
    } finally {
      setIsLoading(false);
    }
  }, [t, showError]);

  useEffect(() => {
    loadCows();
  }, [loadCows]);

  // Filter cows based on search term
  useEffect(() => {
    const filtered = cows.filter(
      (cow) =>
        cow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cow.breed.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCows(filtered);
  }, [cows, searchTerm]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.breed.trim() || !form.age || !form.lactation_count) {
      const errorMsg = t("common.fillAllFields");
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    const payload = {
      name: form.name,
      breed: form.breed,
      age: Number(form.age),
      lactation_count: Number(form.lactation_count),
    };

    setIsLoading(true);
    try {
      if (editingId) {
        await updateCow(editingId, payload);
        showSuccess(t("cowManagement.cowUpdated") || "Cow updated successfully");
      } else {
        await addCow(payload);
        showSuccess(t("cowManagement.cowAdded") || "Cow added successfully");
      }
      resetForm();
      setIsFormOpen(false);
      await loadCows();
    } catch (err) {
      const errorMsg = err.response?.data?.message || t("common.serverError");
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (cow) => {
    setEditingId(cow.id);
    setForm({
      name: cow.name,
      breed: cow.breed,
      age: String(cow.age),
      lactation_count: String(cow.lactation_count),
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (cowId) => {
    try {
      await deleteCow(cowId);
      showSuccess(t("cowManagement.cowDeleted") || "Cow deleted successfully");
      setDeleteConfirmId(null);
      await loadCows();
      if (editingId === cowId) {
        resetForm();
        setIsFormOpen(false);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || t("common.serverError");
      showError(errorMsg);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
              {t("cowManagement.yourCowList")}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {cows.length} cattle in your herd
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="gap-2"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              Add Cow
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants}>
        <Input
          label="Search cattle"
          type="text"
          placeholder="Search by name or breed..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </motion.div>

      {/* Add/Edit Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          resetForm();
          setIsFormOpen(false);
        }}
        title={editingId ? "Edit Cattle" : "Add New Cattle"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cattle Name/ID"
              type="text"
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="e.g., Bessy, Cattle #001"
              error={!form.name.trim() && error ? "Name is required" : ""}
            />
            <Input
              label="Breed"
              type="text"
              name="breed"
              value={form.breed}
              onChange={onChange}
              placeholder="e.g., Holstein, Jersey"
              error={!form.breed.trim() && error ? "Breed is required" : ""}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Age (years)"
              type="number"
              name="age"
              value={form.age}
              onChange={onChange}
              placeholder="0"
              min="0"
              error={!form.age && error ? "Age is required" : ""}
            />
            <Input
              label="Lactation Count"
              type="number"
              name="lactation_count"
              value={form.lactation_count}
              onChange={onChange}
              placeholder="0"
              min="0"
              error={!form.lactation_count && error ? "Lactation count is required" : ""}
            />
          </div>

          {error && (
            <Alert variant="error" message={error} />
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm();
                setIsFormOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading}
              className="gap-2"
            >
              {editingId ? "Update Cattle" : "Add Cattle"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this cattle? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
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
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cattle List */}
      <motion.div variants={itemVariants}>
        {isLoading && cows.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-8 w-24 mb-4 rounded-lg" />
                <Skeleton className="h-4 w-32 mb-3 rounded-lg" />
                <Skeleton className="h-4 w-28 mb-6 rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredCows.length === 0 ? (
          <EmptyState
            icon={Pencil}
            title={searchTerm ? "No cattle found" : "No cattle yet"}
            message={
              searchTerm
                ? "Try adjusting your search terms"
                : "Start by adding your first cattle to track their health and productivity"
            }
            action={
              !searchTerm && (
                <Button
                  onClick={() => {
                    resetForm();
                    setIsFormOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Add Your First Cattle
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCows.map((cow, idx) => (
              <motion.div
                key={cow.id}
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                <Card hover className="p-6 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {cow.name}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        ID: {cow.id}
                      </p>
                    </div>
                    <Badge
                      variant={cow.health_status === "healthy" ? "success" : "warning"}
                    >
                      {cow.health_status || "Healthy"}
                    </Badge>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                          Breed
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {cow.breed}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                          Age
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {cow.age} years
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                          Lactations
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {cow.lactation_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                          Milk Yield
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {cow.milk_month_total !== undefined ? `${cow.milk_month_total} L` : (cow.milk_yield || "0") + ' L'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/cows/${cow.id}`)}
                      className="flex-1 gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View Records
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(cow)}
                      className="flex-1 gap-1"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteConfirmId(cow.id)}
                      className="flex-1 gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
