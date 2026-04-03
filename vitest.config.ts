import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const root = resolve(__dirname);

export default defineConfig({
  resolve: {
    alias: [
      {
        // Tests in test/unit/*/ use '../../src/...' which resolves two levels up to 'test/src/...'
        // This alias maps that incorrect path back to the actual 'src/' directory
        find: /^\.\.\/\.\.\/src\/(.*)/,
        replacement: `${root}/src/$1`,
      },
    ],
  },
  test: {
    include: ['test/unit/**/*.test.ts', 'test/integration/**/*.test.ts'],
  },
});
