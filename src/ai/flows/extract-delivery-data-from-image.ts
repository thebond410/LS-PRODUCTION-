
'use server';
/**
 * @fileOverview Extracts single or multiple delivery data entries from an image using an LLM.
 *
 * - extractDeliveryData - A function that handles the extraction of delivery data from an image.
 * - ExtractDeliveryDataInput - The input type for the extractDeliveryData function.
 * - ExtractDeliveryDataOutput - The return type for the extractDeliveryData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractDeliveryDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a handwritten slip with delivery data, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractDeliveryDataInput = z.infer<typeof ExtractDeliveryDataInputSchema>;

const DeliveryEntrySchema = z.object({
    takaNumber: z.string().describe('The taka number.'),
    meter: z.string().describe('The meter reading.'),
});

const ExtractDeliveryDataOutputSchema = z.object({
    entries: z.array(DeliveryEntrySchema).describe('An array of delivery entries extracted from the image.'),
});
export type ExtractDeliveryDataOutput = z.infer<typeof ExtractDeliveryDataOutputSchema>;

export async function extractDeliveryData(input: ExtractDeliveryDataInput): Promise<ExtractDeliveryDataOutput> {
  return extractDeliveryDataFlow(input);
}

const extractPrompt = ai.definePrompt({
  name: 'extractDeliveryPrompt',
  input: {schema: ExtractDeliveryDataInputSchema},
  output: {schema: ExtractDeliveryDataOutputSchema},
  prompt: `You are an AI assistant that extracts information from an image of a handwritten slip.
The image can contain one or more delivery entries. Sometimes multiple entries are written side-by-side, often separated by a '+' sign.

For each entry, you need to extract two numbers:
1. The first number is the Taka Number (e.g., 2430).
2. The second number, often written below the Taka number, is the Meter reading (e.g., 100).

Meter values can be written like "120/" or "120-". You should interpret these as just "120".

Extract all valid entries from the image provided. Do not extract a machine number.

Image:
{{media url=photoDataUri}}
  `,
});

const extractDeliveryDataFlow = ai.defineFlow(
  {
    name: 'extractDeliveryDataFlow',
    inputSchema: ExtractDeliveryDataInputSchema,
    outputSchema: ExtractDeliveryDataOutputSchema,
  },
  async input => {
    const { output } = await extractPrompt(input);

    if (!output || !output.entries || output.entries.length === 0) {
      throw new Error('Could not extract data from the image.');
    }

    return output;
  }
);
