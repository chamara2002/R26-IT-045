import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32 } },
};

export function PageHeader({ title, subtitle, actions }) {
  return (
    <motion.div variants={itemVariants} className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">{title}</h1>
        {subtitle && (
          <p className="text-slate-600 dark:text-slate-400 text-lg">{subtitle}</p>
        )}
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </motion.div>
  );
}

export default function PageWrapper({ children, className = "space-y-6" }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}
