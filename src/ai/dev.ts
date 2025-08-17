import { config } from 'dotenv';
config();

import '@/ai/flows/extract-production-data-from-image.ts';
import '@/ai/flows/interpret-date-from-image.ts';
import '@/ai/flows/extract-delivery-data-from-image.ts';
