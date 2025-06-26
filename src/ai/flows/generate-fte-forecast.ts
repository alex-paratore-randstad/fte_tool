'use server';

/**
 * @fileOverview FTE Forecasting utility.
 *
 * - generateFTEForecast - A function that handles the FTE forecast generation process.
 * - GenerateFTEForecastInput - The input type for the generateFTEForecast function.
 * - GenerateFTEForecastOutput - The return type for the generateFTEForecast function.
 */

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
  ).describe('An array of forecasted FTE values for the next twelve months, along with the rationale behind the forecast.'),
});
export type GenerateFTEForecastOutput = z.infer<typeof GenerateFTEForecastOutputSchema>;

export async function generateFTEForecast(input: GenerateFTEForecastInput): Promise<GenerateFTEForecastOutput> {
  const { priorFTEData } = input;
  
  // Simple trend calculation
  const ftes = priorFTEData.map(d => d.fte);
  const monthlyTrend = (ftes[3] - ftes[0]) / 3; // Average monthly change over the 4 months

  const forecast: GenerateFTEForecastOutput['forecast'] = [];
  let lastFte = ftes[3];
  
  // Parse date as UTC to avoid timezone issues
  const lastMonthDate = new Date(`${priorFTEData[3].month}-01T00:00:00Z`);

  for (let i = 1; i <= 12; i++) {
    const forecastDate = new Date(lastMonthDate);
    forecastDate.setUTCMonth(lastMonthDate.getUTCMonth() + i);
    
    const year = forecastDate.getUTCFullYear();
    const month = (forecastDate.getUTCMonth() + 1).toString().padStart(2, '0');
    
    // Apply trend
    const newFte = lastFte + monthlyTrend;
    lastFte = newFte;

    forecast.push({
      month: `${year}-${month}`,
      fte: Math.max(0, parseFloat(newFte.toFixed(2))), // Ensure FTE is not negative
      rationale: `Forecast based on a calculated monthly trend of ${monthlyTrend.toFixed(2)} FTE.`,
    });
  }

  return { forecast };
}
