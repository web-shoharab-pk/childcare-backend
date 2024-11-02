import Stripe from 'stripe';
import { envConfig } from './environment';

export const stripe = new Stripe(envConfig.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-09-30.acacia',
});
