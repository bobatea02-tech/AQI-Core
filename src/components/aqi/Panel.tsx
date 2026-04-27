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
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-card-gradient shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-3.5 py-2">
        <div className="leading-tight">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">{title}</div>
          {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
        </div>
        {badge && (
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">{children}</div>
    </motion.div>
  );
}