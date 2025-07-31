'use client'

import Providers from './w/components/providers/providers'
import { Sidebar } from './w/components/sidebar/sidebar'
import { FloatingChatButton } from './w/components/floating-chat-button/floating-chat-button'
import { Panel } from './w/[workflowId]/components/panel/panel'
import { useChatType } from './w/components/chat-utils'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { shouldUseFloatingChat } = useChatType()

  return (
    <Providers>
      <div className='flex min-h-screen w-full'>
        <div className='z-20'>
          <Sidebar />
        </div>
        <div className='flex flex-1 flex-col'>{children}</div>
        {shouldUseFloatingChat ? (
          <FloatingChatButton />
        ) : (
          <Panel />
        )}
      </div>
    </Providers>
  )
}
