
'use server';
/**
 * @fileOverview Extracts delivery data from an image using an LLM.
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

const ExtractDeliveryDataOutputSchema = z.object({
    takaNumber: z.string().describe('The taka number.'),
    machineNumber: z.string().describe('The machine number.'),
    meter: z.string().describe('The meter reading.'),
    date: z.string().optional().describe('The production date in dd/mm/yy format, if available.'),
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
The image contains up to four numbers, each on a new line.
1. The first number is the Taka Number.
2. The second number is the Machine Number.
3. The third number is the Meter reading.
4. There might be a date present.

Extract these values from the image provided.

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

    if (!output) {
      throw new Error('Could not extract data from the image.');
    }

    return output;
  }
);
