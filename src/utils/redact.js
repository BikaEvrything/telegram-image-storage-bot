
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9]{10,}\b/g,
  /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/gi,
  /\bAIza[0-9A-Za-z\-_]{20,}\b/g,
  /\b(?:xox[baprs]-)[0-9A-Za-z\-]{10,}\b/g,
];

export function redactSecrets(text) {
  const s = String(text || "");
  let out = s;
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[REDACTED]");
  return out;
}
