/**
 * datetime
 * --------
 * Helpers de formatage de dates localisés (FR par défaut, EN si
 * `localStorage.lang === 'en'`). Centralise les patterns pour garantir un
 * affichage cohérent (`dd/MM/yyyy HH:mm` en FR, `MM/dd/yyyy hh:mm a` en EN).
 *
 * Toujours préférer ces helpers à `Date#toLocaleString` direct.
 */
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

/**
 * Format a date in the user's selected timezone (or GMT/UTC by default).
 * Works as a drop-in replacement for `format(new Date(x), pattern)` calls.
 *
 * Usage:
 *   formatTz(value, "dd/MM/yyyy HH:mm", { timezone: prefs.timezone, language })
 *
 * "GMT" is treated as UTC. Any IANA tz string (e.g. "Europe/Paris") is supported.
 */
export const formatTz = (
  value: string | number | Date | null | undefined,
  pattern: string,
  opts?: { timezone?: string; language?: "fr" | "en" }
): string => {
  if (value === null || value === undefined || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  const tz = opts?.timezone || "GMT";
  const language = opts?.language || "fr";
  const locale = language === "fr" ? fr : enUS;

  try {
    if (tz === "GMT" || tz === "UTC") {
      // Shift to UTC, then format using UTC components by adjusting the date object.
      const utc = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      return format(utc, pattern, { locale }) + (pattern.includes("H") ? " GMT" : "");
    }
    // Use Intl to convert to target timezone then format
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
    const shifted = new Date(
      Number(get("year")), Number(get("month")) - 1, Number(get("day")),
      Number(get("hour")) === 24 ? 0 : Number(get("hour")),
      Number(get("minute")), Number(get("second"))
    );
    return format(shifted, pattern, { locale });
  } catch {
    return format(d, pattern, { locale });
  }
};
