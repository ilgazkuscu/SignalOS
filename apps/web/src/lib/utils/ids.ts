export function makeId(prefix: string, suffix: string): string {
  return `${prefix}-${suffix}`.replace(/[^a-zA-Z0-9-_]/g, "-");
}
