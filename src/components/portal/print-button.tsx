"use client";

// Opens the browser's print dialog (which also offers "Save as PDF"). The
// print stylesheet in globals.css strips the menus, filters and buttons.
export function PrintButton({ label = "Print / save as PDF", className = "btn btn-quiet" }: { label?: string; className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${className} print:hidden`}>
      {label}
    </button>
  );
}
