// src/ai/flows/interpret-date-from-image.ts
'use server';

/**
 * @fileOverview This file contains the Genkit flow for interpreting dates from a production data image.
 *
 * - interpretDateFromImage - An exported function that takes image data as input and returns interpreted production entries with date assignments.
 * - InterpretDateFromImageInput - The input type for the interpretDateFromImage function.
 * - InterpretDateFromImageOutput - The output type for the interpretDateFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretDateFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo containing production data, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. The image includes taka number, machine number, meter, and a handwritten date (dd/mm/yy)."
    ),
});
export type InterpretDateFromImageInput = z.infer<typeof InterpretDateFromImageInputSchema>;

const ProductionEntrySchema = z.object({
  takaNumber: z.string().describe('The taka number.'),
  machineNumber: z.string().describe('The machine number.'),
  meter: z.string().describe('The meter reading.'),
  date: z.string().describe('The production date in dd/mm/yy format.'),
});

const InterpretDateFromImageOutputSchema = z.array(ProductionEntrySchema).describe('Array of production entries with interpreted and assigned dates.');
export type InterpretDateFromImageOutput = z.infer<typeof InterpretDateFromImageOutputSchema>;

export async function interpretDateFromImage(input: InterpretDateFromImageInput): Promise<InterpretDateFromImageOutput> {
  return interpretDateFromImageFlow(input);
}

const interpretDateFromImagePrompt = ai.definePrompt({
  name: 'interpretDateFromImagePrompt',
  input: {schema: InterpretDateFromImageInputSchema},
  output: {schema: InterpretDateFromImageOutputSchema},
  prompt: `You are an AI assistant specialized in interpreting production data from images.
  You will receive an image containing production entries with taka number, machine number, meter, and handwritten dates (in dd/mm/yy format).
  Your task is to extract the data from the image, intelligently interpret the handwritten dates, and propagate the dates across entries until a new date is encountered.
  Return an array of production entries with the interpreted and assigned dates.

  The date format in the image is dd/mm/yy.

  Here's the image:
  {{media url=photoDataUri}}

  Return the result as a JSON array of production entries, where each entry includes takaNumber, machineNumber, meter, and date.
  Example:
  [
    {
      "takaNumber": "1234",
      "machineNumber": "A1",
      "meter": "100",
      "date": "01/01/2024"
    },
    {
      "takaNumber": "5678",
      "machineNumber": "B2",
      "meter": "200",
      "date": "01/01/2024"
    },
    {
      "takaNumber": "9101",
      "machineNumber": "C3",
      "meter": "300",
      "date": "02/01/2024"
    }
  ]
  `,
});

const interpretDateFromImageFlow = ai.defineFlow(
  {
    name: 'interpretDateFromImageFlow',
    inputSchema: InterpretDateFromImageInputSchema,
    outputSchema: InterpretDateFromImageOutputSchema,
  },
  async input => {
    const {output} = await interpretDateFromImagePrompt(input);
    return output!;
  }
);
