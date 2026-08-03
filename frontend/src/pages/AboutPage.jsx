import { Card } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import PageWrapper, { PageHeader } from "../components/PageWrapper";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title={t("about.title") || "About CattleSense"}
        subtitle={t("about.subtitle") || "Who we are, our mission, and how to get help."}
      />

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">{t("about.whatWeDo") || "What we do"}</h2>
        <p className="text-slate-700 dark:text-slate-300">
          {t("about.whatWeDoDesc") || "CattleSense helps smallholder farmers monitor herd health using simple image-based checks combined with farmer-reported metrics. Our goal is early detection, actionable guidance, and reducing the cost of veterinary care by catching issues early."}
        </p>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">{t("about.howWeHelp") || "How to get help"}</h2>
        <p className="text-slate-700 dark:text-slate-300">{t("about.howWeHelpDesc") || "Use the Guidance page to view emergency veterinarian contacts and follow step-by-step checks for common diseases like mastitis."}</p>
      </Card>
    </PageWrapper>
  );
}
