// Reusable ad banner with placeholder image and simple farmer-friendly text.
export default function AdBanner({ title, description, image, compact = false }) {
  return (
    <article className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "" : ""}`}>
      <img src={image} alt={title} className={`w-full object-cover ${compact ? "h-24" : "h-32"}`} />
      <div className="p-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-600">{description}</p>
      </div>
    </article>
  );
}
