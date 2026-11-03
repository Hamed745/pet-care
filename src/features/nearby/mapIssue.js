// Categorize MapGL failures without returning raw error messages or leaking map keys.
export function classifyMapIssue(error) {
  const name = String(error?.name || "").toLowerCase();
  const status = String(error?.status ?? error?.statusCode ?? "").toLowerCase();
  const text = String(error?.error?.message || error?.message || error?.code || error?.type || error || "").toLowerCase();
  if (/invalidtilekey|invalid.?key|api.?key|unauthori[sz]ed|forbidden|referr?er|access.denied|authentication/.test(text) ||
      ["401", "403"].includes(status)) return "key";
  if (/webgl|contextlost|graphics|gpu|not.supported/.test(text)) return "webgl";
  if (/network|failed to fetch|load failed|timeout|timed out|net::err|blocked|connection|cdn|script/.test(text) ||
      name === "typeerror" && /fetch/.test(text)) return "network";
  if (/styleloaderror|style.load|style error/.test(text)) return "style";
  return "unknown";
}
