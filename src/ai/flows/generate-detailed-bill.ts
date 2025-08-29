'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a detailed bill summary using AI.
 *
 * - generateDetailedBill - A function that generates a detailed bill summary with personalized messages or promotions.
 * - GenerateDetailedBillInput - The input type for the generateDetailedBill function.
 * - GenerateDetailedBillOutput - The return type for the generateDetailedBill function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDetailedBillInputSchema = z.object({
  timePlayed: z.string().describe('The time played in a human-readable format (e.g., 1 hour 30 minutes).'),
  tableRate: z.number().describe('The hourly or per-minute rate for the table.'),
  itemsOrdered: z.array(z.object({
    name: z.string().describe('The name of the item.'),
    quantity: z.number().describe('The quantity of the item ordered.'),
    price: z.number().describe('The price of the item.'),
  })).describe('An array of items ordered with their names, quantities, and prices.'),
  paymentMethod: z.string().describe('The payment method used (e.g., Cash, UPI, Card).'),
  totalAmount: z.number().describe('The total amount due.'),
  customerName: z.string().optional().describe('The name of the customer, if available.'),
});

export type GenerateDetailedBillInput = z.infer<typeof GenerateDetailedBillInputSchema>;

const GenerateDetailedBillOutputSchema = z.object({
  billSummary: z.string().describe('A detailed bill summary including time played, items ordered, total amount, and a personalized message or promotion.'),
});

export type GenerateDetailedBillOutput = z.infer<typeof GenerateDetailedBillOutputSchema>;

export async function generateDetailedBill(input: GenerateDetailedBillInput): Promise<GenerateDetailedBillOutput> {
  return generateDetailedBillFlow(input);
}

const generateDetailedBillPrompt = ai.definePrompt({
  name: 'generateDetailedBillPrompt',
  input: {schema: GenerateDetailedBillInputSchema},
  output: {schema: GenerateDetailedBillOutputSchema},
  prompt: `You are an AI assistant that generates detailed bill summaries for a snooker club.

  Based on the following information, create a detailed and customer-friendly bill summary. Include a personalized message or promotion if appropriate.

  Time Played: {{{timePlayed}}}
  Table Rate: ₹{{{tableRate}}} per hour
  Items Ordered:
  {{#each itemsOrdered}}
  - {{{quantity}}} x {{{name}}} - ₹{{{price}}}
  {{/each}}
  Payment Method: {{{paymentMethod}}}
  Total Amount: ₹{{{totalAmount}}}
  {{#if customerName}}
  Customer Name: {{{customerName}}}
  {{/if}}

  Ensure the bill summary is clear, concise, and includes all necessary information. Add a thank you message and a small promotion if applicable.
  `,
});

const generateDetailedBillFlow = ai.defineFlow(
  {
    name: 'generateDetailedBillFlow',
    inputSchema: GenerateDetailedBillInputSchema,
    outputSchema: GenerateDetailedBillOutputSchema,
  },
  async input => {
    const {output} = await generateDetailedBillPrompt(input);
    return output!;
  }
);
