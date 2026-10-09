"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LinkPending } from "@/components/portal/pending-buttons";

type NavLink = { href: string; label: string; badge?: number };

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="-mx-1 flex max-w-full min-w-0 items-center gap-1 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
              active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            {link.label}
            <LinkPending />
            {link.badge ? (
              <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-xs text-ink">{link.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
