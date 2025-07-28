/**
 * Environment utility functions for consistent environment detection across the application
 */
import { env } from './env'

/**
 * Is the application running in production mode
 */
// export const isProd = env.NODE_ENV === 'production'
export const isProd = true

/**
 * Is the application running in development mode
 */
// export const isDev = env.NODE_ENV === 'development'
export const isDev = false
/**
 * Is the application running in test mode
 */
// export const isTest = env.NODE_ENV === 'test'
export const isTest = false
/**
 * Is this the hosted version of the application
 */
export const isHosted = env.NEXT_PUBLIC_APP_URL === 'https://www.simstudio.ai'

/**
 * Get cost multiplier based on environment
 */
export function getCostMultiplier(): number {
  return isProd ? (env.COST_MULTIPLIER ?? 1) : 1
}
