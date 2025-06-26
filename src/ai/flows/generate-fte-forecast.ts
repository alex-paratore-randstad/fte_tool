// FTE Forecasting using GenAI

'use server';

/**
 * @fileOverview FTE Forecasting AI agent.
 *
 * - generateFTEForecast - A function that handles the FTE forecast generation process.
 * - GenerateFTEForecastInput - The input type for the generateFTEForecast function.
 * - GenerateFTEForecastOutput - The return type for the generateFTEForecast function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFTEForecastInputSchema = z.object({
  priorFTEData: z.array(
    z.object({
      month: z.string().describe('The month for the FTE data (YYYY-MM format).'),
      fte: z.number().describe('The FTE value for the specified month.'),
    })
  ).length(4).describe('An array of the prior four months of FTE data.'),
  accountName: z.string().describe('The name of the account for which the forecast is being generated.'),
});
export type GenerateFTEForecastInput = z.infer<typeof GenerateFTEForecastInputSchema>;

const GenerateFTEForecastOutputSchema = z.object({
  forecast: z.array(
    z.object({
      month: z.string().describe('The month for the forecast (YYYY-MM format).'),
      fte: z.number().describe('The forecasted FTE value for the specified month.'),
      rationale: z.string().describe('The rationale behind the forecasted FTE value.'),
    })
  ).describe('An array of forecasted FTE values for the next twelve months, along with the rationale behind the forecast.'),
});
export type GenerateFTEForecastOutput = z.infer<typeof GenerateFTEForecastOutputSchema>;

export async function generateFTEForecast(input: GenerateFTEForecastInput): Promise<GenerateFTEForecastOutput> {
  return generateFTEForecastFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFTEForecastPrompt',
  input: {schema: GenerateFTEForecastInputSchema},
  output: {schema: GenerateFTEForecastOutputSchema},
  prompt: `You are an experienced resource planning manager. You are responsible for forecasting FTE allocation for various accounts. Given the prior four months of FTE data for {{accountName}}, generate a forecast for the next twelve months. Explain your reasoning for each month's forecast.

Prior FTE Data:
{{#each priorFTEData}}
- {{month}}: {{fte}}
{{/each}}

Forecast:
`,
});

const generateFTEForecastFlow = ai.defineFlow(
  {
    name: 'generateFTEForecastFlow',
    inputSchema: GenerateFTEForecastInputSchema,
    outputSchema: GenerateFTEForecastOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
