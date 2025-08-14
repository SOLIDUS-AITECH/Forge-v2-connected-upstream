/*import type { ClayPopulateParams, ClayPopulateResponse } from '@/tools/clay/types'
import type { ToolConfig } from '@/tools/types'

export const clayPopulateTool: ToolConfig<ClayPopulateParams, ClayPopulateResponse> = {
  id: 'clay_populate',
  name: 'Clay Populate',
  description:
    'Populate Clay with data from a JSON file. Enables direct communication and notifications with timestamp tracking and channel confirmation.',
  version: '1.0.0',

  params: {
    webhookURL: {
      type: 'string',
      required: true,
      visibility: 'user-only',
      description: 'The webhook URL to populate',
    },
    data: {
      type: 'json',
      required: true,
      visibility: 'user-or-llm',
      description: 'The data to populate',
    },
    authToken: {
      type: 'string',
      required: true,
      visibility: 'user-only',
      description: 'Auth token for Clay webhook authentication',
    },
  },

  request: {
    url: (params: ClayPopulateParams) => params.webhookURL,
    method: 'POST',
    headers: (params: ClayPopulateParams) => ({
      Contenttype: 'application/json',
      Authorization: `Bearer ${params.authToken}`,
    }),
    body: (params: ClayPopulateParams) => ({
      data: params.data,
    }),
  },

  transformResponse: async (response: Response) => {
    const contentType = response.headers.get('content-type')
    let data

    if (contentType?.includes('application/json')) {
      data = await response.json()
      if (!data.ok) {
        throw new Error(data.error || 'Clay API error')
      }
    } else {
      // Handle text response
      data = await response.text()
      if (data !== 'OK' && !response.ok) {
        throw new Error(data || 'Clay API error')
      }
    }

    return {
      success: true,
      output: {
        data: contentType?.includes('application/json') ? data : { message: data },
      },
    }
  },

  transformError: (error: any) => {
    const message = error.message || 'Clay populate failed'
    return message
  },
}
*/

import type { ClayPopulateParams, ClayPopulateResponse } from '@/tools/clay/types'
import type { ToolConfig } from '@/tools/types'

export const clayPopulateTool: ToolConfig<ClayPopulateParams, ClayPopulateResponse> = {
  id: 'clay_populate',
  name: 'Clay Populate',
  description:
    'Populate Clay with data from a JSON array. Automatically unwraps common "data" wrappers to ensure correct formatting.',
  version: '1.0.1',

  params: {
    webhookURL: {
      type: 'string',
      required: true,
      visibility: 'user-only',
      description: 'The webhook URL to populate',
    },
    data: {
      type: 'json',
      required: true,
      visibility: 'user-or-llm',
      description: 'The data to populate (must be a top-level array)',
    },
    authToken: {
      type: 'string',
      required: true,
      visibility: 'user-only',
      description: 'Auth token for Clay webhook authentication',
    },
  },

  request: {
    url: (params: ClayPopulateParams) => params.webhookURL,
    method: 'POST',
    headers: (params: ClayPopulateParams) => ({
      'Content-Type': 'application/json',
      'x-clay-webhook-auth': params.authToken!,
    }),
    body: (params: ClayPopulateParams) => {
      // 🛠️ Auto-unwrapping if user passed { data: [...] } inside params.data
      if (Array.isArray(params.data)) {
        return params.data
      }
      if ('data' in params.data && Array.isArray((params.data as any).data)) {
        return (params.data as any).data
      }
      throw new Error('Invalid format: "data" must be a top-level array or contain a "data" array field.')
    }
  },

  transformResponse: async (response: Response) => {
    const contentType = response.headers.get('content-type')
    let data

    if (contentType?.includes('application/json')) {
      data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Clay API error')
      }
    } else {
      const text = await response.text()
      if (!response.ok && text !== 'OK') {
        throw new Error(text || 'Clay API error')
      }
      data = { message: text }
    }

    return {
      success: true,
      output: {
        data
      }
    }
  },

  transformError: (error: any) => {
    return error?.message || 'Clay populate failed'
  },
}
