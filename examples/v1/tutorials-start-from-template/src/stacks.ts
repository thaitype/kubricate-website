import { simpleAppTemplate } from '@kubricate/stacks';
import { Stack } from 'kubricate';

export const myApp = Stack.fromTemplate(simpleAppTemplate, {
  name: 'demo-app',
  imageName: 'nginx:latest',
  port: 80,
});