// Prefixes suggest the provider; only its API can verify a key's validity.
export function detectKeyProvider(value) {
  const key = value.trim();
  if (key.startsWith("sk-")) return "openai";
  if (key.startsWith("AIza")) return "gemini";
  return null;
}
