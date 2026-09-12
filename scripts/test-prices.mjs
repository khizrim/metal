import { fileURLToPath } from 'node:url';
import { startVitest } from 'vitest/node';

const runner = await startVitest('test', ['src/prices'], {
  root: fileURLToPath(new URL('../', import.meta.url)),
  config: false,
  watch: false,
  css: true,
});
await runner.close();
