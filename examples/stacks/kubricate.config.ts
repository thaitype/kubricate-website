import { defineConfig } from 'kubricate';
import simpleAppStack from './src/simple-app-stack';

export default defineConfig({
  generate: {
    // outputMode: ''
  },
  metadata: {},
  stacks: {
    ...simpleAppStack,
  },
});
