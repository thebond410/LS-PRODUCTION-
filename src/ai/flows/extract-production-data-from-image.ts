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
  prompt: `You are an AI assistant helping to extract data from a production log image.

  The image contains handwritten production data, including taka number, machine number, meter reading, and date.
  The date is written only once and applies to subsequent entries until a new date is written.
  The date format is dd/mm/yy.
  Extract up to 30 entries from the text, inferring the date for each entry based on the context.
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
