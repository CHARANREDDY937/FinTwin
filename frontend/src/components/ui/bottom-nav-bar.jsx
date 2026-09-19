import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { motion } from "framer-motion";
import {
  Home,
  LayoutDashboard,
  MessageCircle,
  Zap,
  FileText,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", icon: Home, route: "/" },
  { label: "Dashboard", icon: LayoutDashboard, route: "/dashboard" },
  { label: "AI Chat", icon: MessageCircle, route: "/chat" },
  { label: "Scenarios", icon: Zap, route: "/scenarios" },
  { label: "Ledger", icon: FileText, route: "/records" },
  { label: "Agents", icon: Users, route: "/agents" },
];

const MOBILE_LABEL_WIDTH = 72;

export function BottomNavBar({ className, stickyBottom = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive activeIndex from the current route
  const getActiveIndex = () => {
    const idx = navItems.findIndex((item) => {
      if (item.route === "/") return location.pathname === "/";
      return location.pathname.startsWith(item.route);
    });
    return idx >= 0 ? idx : 0;
  };

  const [activeIndex, setActiveIndex] = useState(getActiveIndex);

  // Sync when location changes (e.g. from the top navbar or browser back/forward)
  useEffect(() => {
    setActiveIndex(getActiveIndex());
  }, [location.pathname]);

  const handleTap = (idx) => {
    setActiveIndex(idx);
    navigate(navItems[idx].route);
  };

  return (
    <motion.nav
      initial={{ y: 20, scale: 0.95, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      role="navigation"
      aria-label="Bottom Navigation Dock"
      className={cn(
        "rounded-full flex items-center p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)] space-x-1 min-w-[320px] max-w-[95vw] h-[54px]",
        "backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-white/10",
        stickyBottom && "fixed inset-x-0 bottom-5 mx-auto z-40 w-fit",
        className,
      )}
    >
      {navItems.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeIndex === idx;

        return (
          <motion.button
            key={item.label}
            whileTap={{ scale: 0.94 }}
            className={cn(
              "flex items-center gap-0 px-3 py-2 rounded-full transition-all duration-200 relative h-10 min-w-[42px] min-h-[40px] max-h-[42px]",
              isActive
                ? "bg-violet-500/15 dark:bg-violet-500/25 text-violet-700 dark:text-violet-300 font-semibold gap-2 shadow-sm"
                : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/10",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 cursor-pointer",
            )}
            onClick={() => handleTap(idx)}
            aria-label={item.label}
            type="button"
          >
            <Icon
              size={20}
              strokeWidth={isActive ? 2.5 : 2}
              aria-hidden
              className="transition-transform duration-200 flex-shrink-0"
            />

            <motion.div
              initial={false}
              animate={{
                width: isActive ? "auto" : "0px",
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? "6px" : "0px",
              }}
              transition={{
                width: { type: "spring", stiffness: 350, damping: 30 },
                opacity: { duration: 0.18 },
                marginLeft: { duration: 0.18 },
              }}
              className="overflow-hidden flex items-center max-w-[90px]"
            >
              <span
                className={cn(
                  "font-semibold text-xs whitespace-nowrap select-none transition-opacity duration-200 overflow-hidden text-ellipsis leading-none",
                  isActive ? "text-violet-700 dark:text-violet-200" : "opacity-0",
                )}
                title={item.label}
              >
                {item.label}
              </span>
            </motion.div>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default BottomNavBar;
