import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbSchema, type Crumb } from "@/lib/schema";

/** Visible breadcrumb trail plus matching BreadcrumbList structured data. */
export function Breadcrumbs({
  crumbs,
  tone = "dark",
}: {
  crumbs: Crumb[];
  /** "dark" for navy heroes, "light" for cream backgrounds. */
  tone?: "dark" | "light";
}) {
  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(crumbs)} />
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol
          className={clsx(
            "flex flex-wrap items-center gap-1.5 text-xs",
            tone === "dark" ? "text-cream/60" : "text-navy-700/70"
          )}
        >
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={crumb.path} className="flex items-center gap-1.5">
                {isLast ? (
                  <span aria-current="page">{crumb.name}</span>
                ) : (
                  <>
                    <Link
                      href={crumb.path}
                      className={clsx(
                        "transition-colors",
                        tone === "dark"
                          ? "hover:text-gold-400"
                          : "hover:text-gold-600"
                      )}
                    >
                      {crumb.name}
                    </Link>
                    <CaretRight size={10} weight="bold" aria-hidden="true" />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
