export function sectionProgress(scroll, start, end) {
  if (![scroll, start, end].every(Number.isFinite) || end <= start) return 0;
  return Math.max(0, Math.min(1, (scroll - start) / (end - start)));
}
export function smoothRange(value, start, end) {
  const p = sectionProgress(value, start, end);
  return p * p * (3 - 2 * p);
}
