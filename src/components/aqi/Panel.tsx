import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  badge?: string;
  className?: string;
  children: ReactNode;
  delay?: number;
}

export function Panel({ title, subtitle, badge, className, children, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-card-gradient shadow-card transition-all duration-300 hover:border-white/15 hover:shadow-glow",
        className,
      )}
    >
      {/* subtle top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <div className="leading-tight">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/90">{title}</div>
          {subtitle && <div className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</div>}
        </div>
        {badge && (
          <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground transition group-hover:border-white/20 group-hover:text-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">{children}</div>
    </motion.div>
  );
}