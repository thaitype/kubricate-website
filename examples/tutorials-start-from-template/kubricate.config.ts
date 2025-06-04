import { defineConfig } from 'kubricate';
import { myApp } from './src/stacks';

export default defineConfig({
  stacks: {
    myApp
  },
});
