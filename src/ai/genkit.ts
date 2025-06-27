'use server';

import {genkit} from 'genkit';
import {googleAI} from 'genkit/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  enableTracing: true,
});
