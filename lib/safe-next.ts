export function safeRelativeDestination(
  value: string | null | undefined,
  fallback = "/start"
): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;

  try {
    const parsed = new URL(candidate, "https://local.invalid");
    if (parsed.origin !== "https://local.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function applyRelativeDestination(url: URL, destination: string): URL {
  const safe = safeRelativeDestination(destination);
  const parsed = new URL(safe, url.origin);
  url.pathname = parsed.pathname;
  url.search = parsed.search;
  url.hash = parsed.hash;
  return url;
}
