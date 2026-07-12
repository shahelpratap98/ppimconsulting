"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDown, List, X } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { services, companyInfo } from "@/lib/data";
import { Button } from "./Button";

const navItems = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
    setServicesOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-cream/90 backdrop-blur-md shadow-[0_1px_0_rgba(13,29,46,0.08)]"
          : "bg-transparent"
      )}
    >
      <div className="container-page flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex h-10 items-center justify-center rounded-lg bg-navy-900 px-2.5 font-display text-base font-semibold tracking-wide text-gold-400 transition-transform duration-300 group-hover:scale-105">
            PPIM
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg text-navy-900 tracking-tight">
              {companyInfo.name}
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.14em] text-navy-700/60 sm:block">
              Priya Pratap Immigration Consulting
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <Link
              href="/services"
              className="flex items-center gap-1 px-4 py-2 rounded-full text-[15px] text-navy-800 hover:bg-navy-900/5 transition-colors"
            >
              Services
              <CaretDown size={14} weight="bold" className={clsx("transition-transform duration-200", servicesOpen && "rotate-180")} />
            </Link>
            <AnimatePresence>
              {servicesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute left-0 top-full pt-2 w-80"
                >
                  <div className="rounded-2xl border border-navy-900/10 bg-white/95 backdrop-blur-md shadow-xl p-2">
                    {services.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/services/${s.slug}`}
                        className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-navy-900/5 transition-colors"
                      >
                        <s.icon size={20} weight="duotone" className="mt-0.5 text-gold-600 shrink-0" />
                        <span>
                          <span className="block text-sm font-medium text-navy-900">{s.shortName}</span>
                          <span className="block text-xs text-navy-700/70 mt-0.5">{s.tagline}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 rounded-full text-[15px] text-navy-800 hover:bg-navy-900/5 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button href="/book-consultation" size="md">
            Book a Consultation
          </Button>
        </div>

        <button
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="lg:hidden flex h-11 w-11 items-center justify-center rounded-full text-navy-900 hover:bg-navy-900/5"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={24} /> : <List size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="lg:hidden overflow-hidden bg-cream/98 backdrop-blur-md border-t border-navy-900/10"
          >
            <div className="container-page py-4 flex flex-col gap-1">
              <p className="px-3 pt-2 pb-1 text-xs uppercase tracking-wide text-navy-700/60">
                Services
              </p>
              {services.map((s) => (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-navy-900/5"
                >
                  <s.icon size={20} weight="duotone" className="text-gold-600" />
                  <span className="text-sm text-navy-900">{s.shortName}</span>
                </Link>
              ))}
              <div className="h-px bg-navy-900/10 my-2" />
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-2.5 hover:bg-navy-900/5 text-sm text-navy-900"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-3">
                <Button href="/book-consultation" className="w-full">
                  Book a Consultation
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
