// Right sidebar ads for dashboard and key pages.
import AdBanner from "./AdBanner";
import { useI18n } from "../i18n/language-context";

export default function DashboardSidebarAds() {
  const { t } = useI18n();

  const sidebarAds = [
    {
      title: t("ads.cattleFeed"),
      description: t("ads.cattleFeedDesc"),
      image: "https://images.unsplash.com/photo-1592982537447-6f2a6a0b59d5?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: t("ads.vaccineCamp"),
      description: t("ads.vaccineCampDesc"),
      image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: t("ads.storageTank"),
      description: t("ads.storageTankDesc"),
      image: "https://images.unsplash.com/photo-1615473967657-9dc21773daa3?auto=format&fit=crop&w=800&q=80",
    },
  ];

  return (
    <aside className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-500">{t("ads.deals")}</h2>
      {sidebarAds.map((ad) => (
        <AdBanner key={ad.title} title={ad.title} description={ad.description} image={ad.image} />
      ))}
    </aside>
  );
}
