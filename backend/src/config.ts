import 'dotenv/config'
import { z } from 'zod'

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  SALESFORCE_LOGIN_URL: z.string().url().default('https://login.salesforce.com'),
  SALESFORCE_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default('v65.0'),
  SALESFORCE_CLIENT_ID: z.string().optional(),
  SALESFORCE_CLIENT_SECRET: z.string().optional(),
  SALESFORCE_INSTANCE_URL: z.string().url().optional(),
  DEV_CUSTOMER_ID: z.string().default('demo-customer'),
  DEMO_USER_EMAIL: z.string().email().default('jordan.miller@example.com'),
  DEMO_USER_PASSWORD: z.string().min(8).default('AirwiseDemo2026!'),
  GEMMA_API_KEY: z.string().optional(),
  GEMMA_MODEL: z.string().default('gemma-3-27b-it'),
  GEMMA_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
})

export const config = configSchema.parse(process.env)

export function assertSalesforceConfig() {
  if (!config.SALESFORCE_CLIENT_ID || !config.SALESFORCE_CLIENT_SECRET) {
    throw new Error('Salesforce OAuth credentials are not configured')
  }
}