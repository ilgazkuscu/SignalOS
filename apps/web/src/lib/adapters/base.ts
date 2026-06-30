import type { Signal, SourceEvent } from "@/lib/types/domain";

export interface AdapterResult {
  sourceEvents: SourceEvent[];
  signals: Signal[];
}

export interface SourceAdapter {
  key: string;
  fetchRecords(): Promise<unknown[]>;
  normalize(records: unknown[]): Promise<AdapterResult>;
  run(): Promise<AdapterResult>;
}

export abstract class FixtureAdapter implements SourceAdapter {
  abstract key: string;
  protected abstract records: unknown[];

  async fetchRecords(): Promise<unknown[]> {
    return this.records;
  }

  abstract normalize(records: unknown[]): Promise<AdapterResult>;

  async run(): Promise<AdapterResult> {
    const records = await this.fetchRecords();
    return this.normalize(records);
  }
}
