// Bottom page ads section with placeholder banners.
import AdBanner from "./AdBanner";
import { useI18n } from "../i18n/language-context";

export default function PageAds() {
  const { t } = useI18n();

  const bottomAds = [
    {
      title: t("ads.healthyFeed"),
      description: t("ads.healthyFeedDesc"),
      image: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: t("ads.vetService"),
      description: t("ads.vetServiceDesc"),
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: t("ads.farmTools"),
      description: t("ads.farmToolsDesc"),
      image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  return (
    <section className="mx-auto mt-2 w-full max-w-7xl px-4 pb-6 sm:px-6">
      <h2 className="mb-3 text-sm font-semibold text-slate-500">{t("ads.sponsored")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bottomAds.map((ad) => (
          <AdBanner key={ad.title} title={ad.title} description={ad.description} image={ad.image} compact />
        ))}
      </div>
    </section>
  );
}
