import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project: 'proj_iejiiryzximuuxyfhara',
  runtime: 'node',
  logLevel: 'log',
  maxDuration: 180,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 1,
    },
  },
  dirs: ['./trigger'],
})
