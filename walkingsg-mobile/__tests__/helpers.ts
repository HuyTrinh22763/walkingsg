import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(__dirname, '..', 'test-results');
const OUT_FILE = path.join(OUT_DIR, 'actual.jsonl');

export function record(id: string, actual: string): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.appendFileSync(OUT_FILE, JSON.stringify({ id, actual }) + '\n');
}

export function outcome<T>(fn: () => T): { value?: T; error?: string } {
  try {
    return { value: fn() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export function show(value: unknown): string {
  return JSON.stringify(value);
}