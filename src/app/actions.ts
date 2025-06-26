'use server';

import {
  generateFTEForecast,
  type GenerateFTEForecastInput,
  type GenerateFTEForecastOutput,
} from '@/ai/flows/generate-fte-forecast';
import { z } from 'zod';

const actionSchema = z.object({
  accountName: z.string(),
  priorFTEData: z.array(
    z.object({
      month: z.string(),
      fte: z.coerce.number(),
    })
  ).length(4),
});

export async function getFteForecastAction(
  input: GenerateFTEForecastInput
): Promise<{ success: boolean; data?: GenerateFTEForecastOutput; error?: string }> {

  const parsedInput = actionSchema.safeParse(input);

  if (!parsedInput.success) {
    return { success: false, error: 'Invalid input data.' };
  }
  
  try {
    const result = await generateFTEForecast(parsedInput.data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error generating FTE forecast:', error);
    return { success: false, error: 'An unexpected error occurred while generating the forecast.' };
  }
}
