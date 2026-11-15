import fs from 'fs';
import path from 'path';
const OUT = path.join(__dirname, '..', 'test-results', 'actual.jsonl');
export function record(id: string, input: string, expected: string, actual: string, pass: boolean) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.appendFileSync(OUT, JSON.stringify({ id, input, expected, actual, pass }) + '\n');
}
