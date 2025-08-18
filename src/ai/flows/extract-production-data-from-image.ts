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

const assignDatesPrompt = ai.definePrompt({
  name: 'assignDatesPrompt',
  input: {schema: z.object({
    photoDataUri: z
    .string()
    .describe(
      "A photo of handwritten production data, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. The image includes taka number, machine number, meter, and a handwritten date (dd/mm/yy)."
    ),
  })},
  output: {schema: ExtractProductionDataOutputSchema},
  prompt: `You are an AI assistant helping to extract production data from a photo of a logbook.

  The data is organized in columns:
  1.  **Taka Number**: (e.g., 2417, 2418). Sometimes, only the last two digits are written (e.g., 19, 20), implying it follows the sequence from the last full number. You need to infer the full taka number. For example, if the last full number was 2418, then 19, 20, 21 should be interpreted as 2419, 2420, 2421.
  2.  **Machine Number**: (e.g., 11, 10, 3, 4, 7, 6).
  3.  **Meter**: (e.g., 120, 110, 114-50, 104/50, 114-, 114/). Meter values can be written like "104-50", "104/50" or "104.50". You should convert these to "104.50". If a meter value is written like "114-" or "114/", interpret it as just "114".

  A **date** (e.g., 15/8/25) is written on the side and applies to all subsequent rows until a new date appears. Your task is to correctly assign the date to each entry.

  Your instructions are:
  - Process the image to identify rows containing Taka Number, Machine Number, and Meter.
  - A row is valid only if it has a value for both Machine Number and Meter. If either is missing, **skip that row entirely**.
  - Infer incomplete Taka Numbers based on the previous full Taka Number.
  - Propagate the date correctly. The first date found applies to all entries until a new date is mentioned.
  - Ignore any non-data text or annotations (e.g., handwritten totals, words in other languages, checkmarks).
  - Extract up to 30 valid entries per image.
  - **Do not include entries with duplicate Taka Numbers**. If you see a taka number that has already been extracted, ignore it.

  Return the extracted data in JSON format based on the image provided.

  Image:
  {{media url=photoDataUri}}
  `,
});

const extractProductionDataFlow = ai.defineFlow(
  {
    name: 'extractProductionDataFlow',
    inputSchema: ExtractProductionDataInputSchema,
    outputSchema: ExtractProductionDataOutputSchema,
  },
  async input => {
    const result = await assignDatesPrompt(input);

    if (!result.output) {
      return { entries: [] };
    }

    return result.output;
  }
);
