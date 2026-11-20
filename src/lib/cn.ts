import clsx, { type ClassValue } from "clsx";

/** Junta classes condicionais. */
export function cn(...classes: ClassValue[]): string {
  return clsx(classes);
}
