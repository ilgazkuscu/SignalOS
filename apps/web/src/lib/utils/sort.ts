export function compareIsoAsc(a: string, b: string): number {
  return a.localeCompare(b);
}

export function compareIsoDesc(a: string, b: string): number {
  return b.localeCompare(a);
}
