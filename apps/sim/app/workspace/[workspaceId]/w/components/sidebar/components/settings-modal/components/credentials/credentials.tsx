'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ExternalLink, RefreshCw, Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { client, useSession } from '@/lib/auth-client'
import { createLogger } from '@/lib/logs/console/logger'
import { OAUTH_PROVIDERS, type OAuthServiceConfig } from '@/lib/oauth/oauth'
import { cn } from '@/lib/utils'

const logger = createLogger('Credentials')

interface CredentialsProps {
  onOpenChange?: (open: boolean) => void
}

interface ServiceInfo extends OAuthServiceConfig {
  isConnected: boolean
  lastConnected?: string
  accounts?: { id: string; name: string }[]
}

export function Credentials({ onOpenChange }: CredentialsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const userId = session?.user?.id
  const pendingServiceRef = useRef<HTMLDivElement>(null)

  const [services, setServices] = useState<ServiceInfo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [pendingService, setPendingService] = useState<string | null>(null)
  const [_pendingScopes, setPendingScopes] = useState<string[]>([])
  const [authSuccess, setAuthSuccess] = useState(false)
  const [showActionRequired, setShowActionRequired] = useState(false)

  // Define available services from our standardized OAuth providers
  const defineServices = (): ServiceInfo[] => {
    const servicesList: ServiceInfo[] = []

    // Convert our standardized providers to ServiceInfo objects
    Object.values(OAUTH_PROVIDERS).forEach((provider) => {
      Object.values(provider.services).forEach((service) => {
        servicesList.push({
          ...service,
          isConnected: false,
          scopes: service.scopes || [],
        })
      })
    })

    return servicesList
  }

  // Fetch services and their connection status
  const fetchServices = async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      // Start with the base service definitions
      const serviceDefinitions = defineServices()

      // Fetch all OAuth connections for the user
      const response = await fetch('/api/auth/oauth/connections')
      if (response.ok) {
        const data = await response.json()
        const connections = data.connections || []

        // Update services with connection status and account info
        const updatedServices = serviceDefinitions.map((service) => {
          // Find matching connection - now we can do an exact match on providerId
          const connection = connections.find((conn: any) => {
            // Exact match on providerId is the most reliable
            return conn.provider === service.providerId
          })

          // If we found an exact match, use it
          if (connection) {
            return {
              ...service,
              isConnected: connection.accounts?.length > 0,
              accounts: connection.accounts || [],
              lastConnected: connection.lastConnected,
            }
          }

          // If no exact match, check if any connection has all the required scopes
          const connectionWithScopes = connections.find((conn: any) => {
            // Only consider connections from the same base provider
            if (!conn.baseProvider || !service.providerId.startsWith(conn.baseProvider)) {
              return false
            }

            // Check if all required scopes for this service are included in the connection
            if (conn.scopes && service.scopes) {
              return service.scopes.every((scope) => conn.scopes.includes(scope))
            }

            return false
          })

          if (connectionWithScopes) {
            return {
              ...service,
              isConnected: connectionWithScopes.accounts?.length > 0,
              accounts: connectionWithScopes.accounts || [],
              lastConnected: connectionWithScopes.lastConnected,
            }
          }

          return service
        })

        setServices(updatedServices)
      } else {
        // If there's an error, just use the base definitions
        setServices(serviceDefinitions)
      }
    } catch (error) {
      logger.error('Error fetching services:', { error })
      // Use base definitions on error
      setServices(defineServices())
    } finally {
      setIsLoading(false)
    }
  }

  // Check for OAuth callback
  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth callback
    if (code && state) {
      // This is an OAuth callback - try to restore state from localStorage
      try {
        const stored = localStorage.getItem('pending_oauth_state')
        if (stored) {
          const oauthState = JSON.parse(stored)
          logger.info('OAuth callback with restored state:', oauthState)

          // Mark as pending if we have context about what service was being connected
          if (oauthState.serviceId) {
            setPendingService(oauthState.serviceId)
            setShowActionRequired(true)
          }

          // Clean up the state (one-time use)
          localStorage.removeItem('pending_oauth_state')
        } else {
          logger.warn('OAuth callback but no state found in localStorage')
        }
      } catch (error) {
        logger.error('Error loading OAuth state from localStorage:', error)
        localStorage.removeItem('pending_oauth_state') // Clean up corrupted state
      }

      // Set success flag
      setAuthSuccess(true)

      // Refresh connections to show the new connection
      if (userId) {
        fetchServices()
      }

      // Clear the URL parameters
      router.replace('/workspace')
    } else if (error) {
      logger.error('OAuth error:', { error })
      router.replace('/workspace')
    }
  }, [searchParams, router, userId])

  // Fetch services on mount
  useEffect(() => {
    if (userId) {
      fetchServices()
    }
  }, [userId])

  // Handle connect button click
  const handleConnect = async (service: ServiceInfo) => {
    try {
      setIsConnecting(service.id)

      logger.info('Connecting service:', {
        serviceId: service.id,
        providerId: service.providerId,
        scopes: service.scopes,
      })

      await client.oauth2.link({
        providerId: service.providerId,
        callbackURL: window.location.href,
      })
    } catch (error) {
      logger.error('OAuth connection error:', { error })
      setIsConnecting(null)
    }
  }

  // Handle disconnect button click
  const handleDisconnect = async (service: ServiceInfo, accountId: string) => {
    setIsConnecting(`${service.id}-${accountId}`)
    try {
      // Call the API to disconnect the account
      const response = await fetch('/api/auth/oauth/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: service.providerId.split('-')[0],
          providerId: service.providerId,
        }),
      })

      if (response.ok) {
        // Update the local state by removing the disconnected account
        setServices((prev) =>
          prev.map((svc) => {
            if (svc.id === service.id) {
              return {
                ...svc,
                accounts: svc.accounts?.filter((acc) => acc.id !== accountId) || [],
                isConnected: (svc.accounts?.length || 0) > 1,
              }
            }
            return svc
          })
        )
      } else {
        logger.error('Error disconnecting service')
      }
    } catch (error) {
      logger.error('Error disconnecting service:', { error })
    } finally {
      setIsConnecting(null)
    }
  }

  // Group services by provider
  const groupedServices = services.reduce(
    (acc, service) => {
      // Find the provider for this service
      const providerKey =
        Object.keys(OAUTH_PROVIDERS).find((key) =>
          Object.keys(OAUTH_PROVIDERS[key].services).includes(service.id)
        ) || 'other'

      if (!acc[providerKey]) {
        acc[providerKey] = []
      }

      acc[providerKey].push(service)
      return acc
    },
    {} as Record<string, ServiceInfo[]>
  )

  // Filter services based on search term
  const filteredGroupedServices = Object.entries(groupedServices).reduce(
    (acc, [providerKey, providerServices]) => {
      const filteredServices = providerServices.filter(
        (service) =>
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.description.toLowerCase().includes(searchTerm.toLowerCase())
      )

      if (filteredServices.length > 0) {
        acc[providerKey] = filteredServices
      }

      return acc
    },
    {} as Record<string, ServiceInfo[]>
  )

  const scrollToHighlightedService = () => {
    if (pendingServiceRef.current) {
      pendingServiceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }

  return (
    <div className='space-y-6 p-6'>
      <div>
        <div className='mb-1 flex items-center justify-between'>
          <h3 className='font-medium text-lg'>Credentials</h3>

          {/* Search Input */}
          <div className='relative w-48'>
            <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='h-9 pl-9 text-sm'
            />
          </div>
        </div>
        <p className='mb-6 text-muted-foreground text-sm'>
          Connect your accounts to use tools that require authentication.
        </p>
      </div>

      {/* Success message */}
      {authSuccess && (
        <div className='mb-4 rounded-md border border-green-200 bg-green-50 p-4'>
          <div className='flex'>
            <div className='flex-shrink-0'>
              <Check className='h-5 w-5 text-green-400' />
            </div>
            <div className='ml-3'>
              <p className='font-medium text-green-800 text-sm'>Account connected successfully!</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending service message - only shown when coming from OAuth required modal */}
      {pendingService && showActionRequired && (
        <div className='mb-6 flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-5 text-sm shadow-sm'>
          <div className='mt-0.5 min-w-5'>
            <ExternalLink className='h-4 w-4 text-primary' />
          </div>
          <div className='flex flex-1 flex-col'>
            <p className='text-muted-foreground'>
              <span className='font-medium text-primary'>Action Required:</span> Please connect your
              account to enable the requested features. The required service is highlighted below.
            </p>
            <Button
              variant='outline'
              size='sm'
              onClick={scrollToHighlightedService}
              className='mt-3 flex h-8 items-center gap-1.5 self-start border-primary/20 px-3 font-medium text-primary text-sm transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary'
            >
              <span>Go to service</span>
              <ChevronDown className='h-3.5 w-3.5' />
            </Button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className='space-y-4'>
          <ConnectionSkeleton />
          <ConnectionSkeleton />
          <ConnectionSkeleton />
          <ConnectionSkeleton />
        </div>
      ) : (
        <div className='space-y-6'>
          {/* Group services by provider */}
          {Object.entries(filteredGroupedServices).map(([providerKey, providerServices]) => (
            <div key={providerKey} className='space-y-4'>
              <h4 className='font-medium text-muted-foreground text-sm'>
                {OAUTH_PROVIDERS[providerKey]?.name || 'Other Services'}
              </h4>
              <div className='space-y-4'>
                {providerServices.map((service) => (
                  <Card
                    key={service.id}
                    className={cn(
                      'p-6 transition-all hover:shadow-md',
                      pendingService === service.id && 'border-primary shadow-md'
                    )}
                    ref={pendingService === service.id ? pendingServiceRef : undefined}
                  >
                    <div className='flex w-full items-start gap-4'>
                      <div className='flex w-full items-start gap-4'>
                        <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted'>
                          {typeof service.icon === 'function'
                            ? service.icon({ className: 'h-5 w-5' })
                            : service.icon}
                        </div>
                        <div className='w-full space-y-1'>
                          <div>
                            <h4 className='font-medium leading-none'>{service.name}</h4>
                            <p className='mt-1 text-muted-foreground text-sm'>
                              {service.description}
                            </p>
                          </div>
                          {service.accounts && service.accounts.length > 0 && (
                            <div className='w-full space-y-2 pt-3'>
                              {service.accounts.map((account) => (
                                <div
                                  key={account.id}
                                  className='flex w-full items-center justify-between gap-2 rounded-md border bg-card/50 p-2'
                                >
                                  <div className='flex items-center gap-2'>
                                    <div className='flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10'>
                                      <Check className='h-3 w-3 text-green-600' />
                                    </div>
                                    <span className='font-medium text-sm'>{account.name}</span>
                                  </div>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => handleDisconnect(service, account.id)}
                                    disabled={isConnecting === `${service.id}-${account.id}`}
                                    className='h-7 px-2'
                                  >
                                    {isConnecting === `${service.id}-${account.id}` ? (
                                      <RefreshCw className='h-3 w-3 animate-spin' />
                                    ) : (
                                      'Disconnect'
                                    )}
                                  </Button>
                                </div>
                              ))}
                              {/* <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2"
                                onClick={() => handleConnect(service)}
                                disabled={isConnecting === service.id}
                              >
                                {isConnecting === service.id ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                                    Connecting...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-3 w-3 mr-2" />
                                    Connect Another Account
                                  </>
                                )}
                              </Button> */}
                            </div>
                          )}
                        </div>
                      </div>

                      {!service.accounts?.length && (
                        <div className='ml-auto flex justify-end'>
                          <Button
                            variant='default'
                            size='sm'
                            onClick={() => handleConnect(service)}
                            disabled={isConnecting === service.id}
                            className='shrink-0'
                          >
                            {isConnecting === service.id ? (
                              <>
                                <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                Connecting...
                              </>
                            ) : (
                              'Connect'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Show message when search has no results */}
          {searchTerm.trim() && Object.keys(filteredGroupedServices).length === 0 && (
            <div className='py-8 text-center text-muted-foreground text-sm'>
              No services found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Loading skeleton for connections
function ConnectionSkeleton() {
  return (
    <Card className='p-6'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex items-start gap-4'>
          <Skeleton className='h-12 w-12 rounded-lg' />
          <div className='space-y-2'>
            <Skeleton className='h-5 w-32' />
            <Skeleton className='h-4 w-48' />
          </div>
        </div>
        <Skeleton className='h-9 w-24 shrink-0' />
      </div>
    </Card>
  )
}
