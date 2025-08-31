import { config } from 'dotenv';
config();

import '@/ai/flows/generate-detailed-bill.ts';
import { setupAdmin } from '@/lib/setup-admin';

// Run setup only once
setupAdmin().then(result => console.log(result.message));
