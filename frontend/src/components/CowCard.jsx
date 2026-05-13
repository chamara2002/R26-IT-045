// Reusable card for displaying cow details and farmer quick actions.
import { useI18n } from "../i18n/language-context";

export default function CowCard({ cow, onCheckDisease, onViewRecords, onEdit, onDelete }) {
  const { t } = useI18n();

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{cow.name}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
        <div>
          <dt className="font-medium text-slate-500">{t("cowCard.breed")}</dt>
          <dd>{cow.breed}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">{t("cowCard.age")}</dt>
          <dd>{cow.age} {t("cowCard.years")}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">{t("cowCard.lactation")}</dt>
          <dd>{cow.lactation_count}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">{t("cowCard.cowId")}</dt>
          <dd>#{cow.id}</dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCheckDisease}
          className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {t("cowCard.checkDisease")}
        </button>
        <button
          type="button"
          onClick={onViewRecords}
          className="rounded-2xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
        >
          {t("cowCard.viewRecords")}
        </button>
      </div>

      {(onEdit || onDelete) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t("cowCard.edit")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-2xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            {t("cowCard.delete")}
          </button>
        </div>
      )}
    </article>
  );
}
