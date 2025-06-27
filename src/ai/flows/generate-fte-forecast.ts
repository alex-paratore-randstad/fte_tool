'use server';

/**
 * @fileOverview FTE Forecasting utility using Genkit AI.
 *
 * - generateFTEForecast - A function that handles the FTE forecast generation process.
 * - GenerateFTEForecastInput - The input type for the generateFTEForecast function.
 * - GenerateFTEForecastOutput - The return type for the generateFTEForecast function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
  ).length(12).describe('An array of forecasted FTE values for the next twelve months, along with the rationale behind the forecast.'),
});
export type GenerateFTEForecastOutput = z.infer<typeof GenerateFTEForecastOutputSchema>;

export async function generateFTEForecast(input: GenerateFTEForecastInput): Promise<GenerateFTEForecastOutput> {
  return generateFTEForecastFlow(input);
}

const forecastPrompt = ai.definePrompt({
    name: 'fteForecastPrompt',
    input: { schema: GenerateFTEForecastInputSchema },
    output: { schema: GenerateFTEForecastOutputSchema },
    prompt: `You are an expert financial analyst specializing in workforce planning and FTE (Full-Time Equivalent) forecasting.

Your task is to generate a 12-month FTE forecast for the account: '{{accountName}}'.

You have been provided with the actual FTE data for the past four months. Analyze this historical data to identify trends, seasonality, or other patterns.

Historical FTE Data:
{{#each priorFTEData as |data|}}
- Month: {{data.month}}, FTE: {{data.fte}}
{{/each}}

Based on your analysis of the historical data, create a month-by-month forecast for the next 12 months. For each month in the forecast, you must provide:
1.  The 'month' in 'YYYY-MM' format.
2.  The forecasted 'fte' value (a number, to two decimal places).
3.  A concise 'rationale' explaining the reasoning for that month's forecast (e.g., "Continuing the upward trend observed in prior months," "Seasonal dip expected based on typical project cycles," "Stabilization after a period of rapid growth.").

The last month of historical data is {{priorFTEData.[3].month}}. Your forecast should start from the following month.

Produce the output in the required structured format.
`,
});

const generateFTEForecastFlow = ai.defineFlow(
  {
    name: 'generateFTEForecastFlow',
    inputSchema: GenerateFTEForecastInputSchema,
    outputSchema: GenerateFTEForecastOutputSchema,
  },
  async (input) => {
    const { output } = await forecastPrompt(input);
    if (!output) {
      throw new Error('Failed to generate forecast from AI model.');
    }
    return output;
  }
);
