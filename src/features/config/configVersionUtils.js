/**
 * Compara dos cadenas de versión estilo MAJOR.MINOR.PATCH con aritmética numérica
 * por segmento para evitar el bug "6.0.9" > "6.0.10" de la comparación lexicográfica.
 *
 * Retorna: > 0 si a > b · 0 si a === b · < 0 si a < b.
 */
export function compareAppVersions(a, b) {
  const parse = (v) =>
    String(v || "0.0.0")
      .split(".")
      .map((n) => Math.max(0, parseInt(n, 10) || 0));
  const [a0, a1, a2 = 0] = parse(a);
  const [b0, b1, b2 = 0] = parse(b);
  if (a0 !== b0) return a0 - b0;
  if (a1 !== b1) return a1 - b1;
  return a2 - b2;
}
