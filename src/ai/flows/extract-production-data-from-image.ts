'use server';
/**
 * @fileOverview Extracts production data from an image using OCR and LLM processing.
 *
 * - extractProductionData - A function that handles the extraction of production data from an image.
 * - ExtractProductionDataInput - The input type for the extractProductionData function.
 * - ExtractProductionDataOutput - The return type for the extractProductionData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractProductionDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of handwritten production data, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractProductionDataInput = z.infer<typeof ExtractProductionDataInputSchema>;

const ProductionEntrySchema = z.object({
  takaNumber: z.string().describe('The taka number.'),
  machineNumber: z.string().describe('The machine number.'),
  meter: z.string().describe('The meter reading.'),
  date: z.string().describe('The production date in dd/mm/yy format.'),
});

const ExtractProductionDataOutputSchema = z.object({
  entries: z.array(ProductionEntrySchema).describe('An array of production entries extracted from the image.'),
});
export type ExtractProductionDataOutput = z.infer<typeof ExtractProductionDataOutputSchema>;

export async function extractProductionData(input: ExtractProductionDataInput): Promise<ExtractProductionDataOutput> {
  return extractProductionDataFlow(input);
}

const ocrPrompt = ai.definePrompt({
  name: 'ocrPrompt',
  input: {schema: ExtractProductionDataInputSchema},
  output: {schema: z.string().nullable()},
  prompt: `Extract all text from the following image:\n\n{{media url=photoDataUri}}`,
});

const assignDatesPrompt = ai.definePrompt({
  name: 'assignDatesPrompt',
  input: {schema: z.object({
    rawText: z.string().describe('The raw text extracted from the image.'),
  })},
  output: {schema: ExtractProductionDataOutputSchema},
  prompt: `You are an AI assistant helping to extract production data from raw text extracted from an image of a logbook.

  The data is organized in columns:
  1. Taka Number (e.g., 2444, 2445)
  2. Machine Number (e.g., 10, 6, 3)
  3. Meter (e.g., 110, 104-50, 104/50)

  A date (e.g., 16/8/25) is written on the side and applies to all subsequent rows until a new date appears. Your task is to correctly assign the date to each entry.

  Your instructions are:
  - Process the raw text and identify rows containing Taka Number, Machine Number, and Meter.
  - A row is valid only if it has a value for both Machine Number and Meter. If either is missing, skip that row.
  - Taka numbers may be read with a space (e.g., "24 44" should be "2444"). Combine them.
  - Meter values can be written like "104-50" or "104/50". Keep them as they are.
  - Propagate the date correctly. The first date found applies to all entries until a new date is mentioned.
  - Ignore any non-data text or annotations (e.g., handwritten totals, words in other languages).
  - Extract up to 30 valid entries.
  - Do not include entries with duplicate Taka Numbers.

  Return the extracted data in JSON format.

  Raw Text: {{{rawText}}}
  `,
});

const extractProductionDataFlow = ai.defineFlow(
  {
    name: 'extractProductionDataFlow',
    inputSchema: ExtractProductionDataInputSchema,
    outputSchema: ExtractProductionDataOutputSchema,
  },
  async input => {
    const ocrResult = await ocrPrompt(input);
    const rawText = ocrResult.output;

    if (!rawText) {
      return { entries: [] };
    }

    const assignDatesResult = await assignDatesPrompt({
      rawText,
    });

    return assignDatesResult.output!;
  }
);
