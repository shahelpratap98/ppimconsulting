"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Spinner } from "@phosphor-icons/react/dist/ssr";
import { services, companyInfo } from "@/lib/data";

type Status = "idle" | "submitting" | "success";

export function ConsultationForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    if (!data.get("name") || !data.get("email")) {
      setError("Please fill in your name and email so we can reach you.");
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch(
        `https://formsubmit.co/ajax/${companyInfo.enquiriesEmail}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            _subject: "New consultation enquiry — ppimconsulting.co.nz",
            name: data.get("name"),
            email: data.get("email"),
            phone: data.get("phone") || "Not provided",
            "visa pathway": data.get("service") || "Not sure yet",
            message: data.get("message") || "No message provided",
          }),
        }
      );
      if (!response.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("idle");
      setError(
        `Something went wrong sending your enquiry. Please try again, or email us directly at ${companyInfo.enquiriesEmail}.`
      );
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center rounded-card border border-fern-500/20 bg-fern-50 px-8 py-12 text-center"
        role="status"
        aria-live="polite"
      >
        <CheckCircle size={48} weight="fill" className="text-fern-600" />
        <h3 className="mt-4 font-display text-2xl text-navy-900">
          Request received
        </h3>
        <p className="mt-2 max-w-sm text-navy-700/70">
          Thank you — a licensed adviser will contact you within one business
          day to confirm your free consultation.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-navy-900">
            Full name <span className="text-gold-600">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="mt-1.5 w-full rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-navy-900 outline-none transition-colors focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-navy-900">
            Email address <span className="text-gold-600">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1.5 w-full rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-navy-900 outline-none transition-colors focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-navy-900">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className="mt-1.5 w-full rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-navy-900 outline-none transition-colors focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
          />
        </div>
        <div>
          <label htmlFor="service" className="block text-sm font-medium text-navy-900">
            Visa pathway you&apos;re interested in
          </label>
          <select
            id="service"
            name="service"
            className="mt-1.5 w-full rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-navy-900 outline-none transition-colors focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
          >
            <option value="">Not sure yet</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.shortName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-navy-900">
          Tell us a little about your situation
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="mt-1.5 w-full resize-none rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-navy-900 outline-none transition-colors focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
          placeholder="E.g. current visa status, occupation, timeframe..."
        />
        <p className="mt-1.5 text-xs text-navy-700/50">
          This helps your adviser prepare — no detail is too small.
        </p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className="text-sm text-red-600"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-8 py-4 text-base font-medium text-navy-950 transition-all duration-200 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" && (
          <Spinner size={18} className="animate-spin" />
        )}
        {status === "submitting" ? "Sending..." : "Request free consultation"}
      </button>
      <p className="text-xs text-navy-700/50">
        By submitting, you agree to be contacted by PPIM Consulting about
        your enquiry. We never share your details with third parties.
      </p>
    </form>
  );
}
