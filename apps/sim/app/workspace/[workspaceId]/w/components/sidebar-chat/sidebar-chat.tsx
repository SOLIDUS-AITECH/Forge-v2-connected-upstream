'use client'

import { useRef, useState, useEffect } from 'react'
import { ArrowUp, Play, MessageCircle, HelpCircle, ArrowLeft, Bot, FileText, ArrowDownToLine, CircleSlash, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useParams } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { Chat } from '../../[workflowId]/components/panel/components/chat/chat'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
}

type ChatMode = 'menu' | 'workflow' | 'agent' | 'rep' | 'faqs'

// Maximum character length for a word before it's broken up
const MAX_WORD_LENGTH = 25

const WordWrap = ({ text }: { text: string }) => {
  if (!text) return null

  // Split text into words, keeping spaces and punctuation
  const parts = text.split(/(\s+)/g)

  return (
    <>
      {parts.map((part, index) => {
        // If the part is whitespace or shorter than the max length, render it as is
        if (part.match(/\s+/) || part.length <= MAX_WORD_LENGTH) {
          return <span key={index}>{part}</span>
        }

        // For long words, break them up into chunks
        const chunks = []
        for (let i = 0; i < part.length; i += MAX_WORD_LENGTH) {
          chunks.push(part.substring(i, i + MAX_WORD_LENGTH))
        }

        return (
          <span key={index} className='break-all'>
            {chunks.map((chunk, chunkIndex) => (
              <span key={chunkIndex}>{chunk}</span>
            ))}
          </span>
        )
      })}
    </>
  )
}

interface SidebarChatProps {
  onClose?: () => void
}

export function SidebarChat({ onClose }: SidebarChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [activeMode, setActiveMode] = useState<ChatMode>('menu')
  const [workflowChatMessage, setWorkflowChatMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const { data: session } = useSession()
  const workflowId = params?.workflowId as string | undefined
  const username = session?.user?.name || 'anonymous'

  // Fetch conversation history when switching to agent mode
  useEffect(() => {
    if (activeMode === 'agent') {
      const fetchHistory = async () => {
        if (!workflowId || !username) {
          setHistoryLoaded(true)
          return
        }
        try {
          const res = await fetch(`https://forgev2-platform.ai.aitech.io/sessions/${username}/${workflowId}/history`)
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data.conversation_history)) {
              const historyMsgs: Message[] = data.conversation_history.flatMap((turn: any) => [
                {
                  id: `${turn.turn}-user`,
                  content: turn.user_query,
                  role: 'user',
                },
                {
                  id: `${turn.turn}-assistant`,
                  content: turn.agent_response,
                  role: 'assistant',
                },
              ])
              setMessages(historyMsgs)
            }
          }
        } catch (e) {
          // ignore error, just show no messages
        } finally {
          setHistoryLoaded(true)
        }
      }
      fetchHistory()
    }
  }, [activeMode, workflowId, username])

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = {
      id: crypto.randomUUID(),
      content: input,
      role: 'user',
    }
    setMessages((msgs) => [...msgs, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('https://forgev2-platform.ai.aitech.io/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg.content,
          session_id: workflowId,
          user_id: username,
        }),
      })
      const data = await res.json()
      setMessages((msgs) => [
        ...msgs,
        {
          id: crypto.randomUUID(),
          content: data.result || (data.error ? `Error: ${data.error}` : 'No response'),
          role: 'assistant',
        },
      ])
    } catch (e: any) {
      setMessages((msgs) => [
        ...msgs,
        {
          id: crypto.randomUUID(),
          content: `Error: ${e.message}`,
          role: 'assistant',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleModeChange = (mode: ChatMode) => {
    setActiveMode(mode)
    if (mode !== 'menu') {
      setMessages([])
      setInput('')
      setHistoryLoaded(false)
    }
  }

  const handleClearAgentChat = async () => {
    try {
      await fetch(`https://forgev2-platform.ai.aitech.io/sessions/${username}/${workflowId}`, {
        method: 'DELETE',
      })
      setMessages([])
    } catch (e) {
      // ignore error
    }
  }

  const handleClosePanel = () => {
    // Close the entire panel
    if (onClose) {
      onClose()
    }
  }

  const renderHeaderButtons = () => {
    if (activeMode === 'menu') {
      // Menu: Only close button
      return (
        <button
          onClick={handleClosePanel}
          className='font-medium text-md leading-normal transition-all hover:brightness-75 dark:hover:brightness-125'
          style={{ color: 'var(--base-muted-foreground)' }}
        >
          <X className='h-4 w-4' strokeWidth={2} />
        </button>
      )
    } else if (activeMode === 'workflow') {
      // Workflow: All three buttons (download, clear, close)
      return (
        <div className='flex items-center gap-2'>
          <button 
            className='font-medium text-md leading-normal transition-all hover:brightness-75 dark:hover:brightness-125'
            style={{ color: 'var(--base-muted-foreground)' }}
          >
            <ArrowDownToLine className='h-4 w-4' strokeWidth={2} />
          </button>
          <button 
            className='font-medium text-md leading-normal transition-all hover:brightness-75 dark:hover:brightness-125'
            style={{ color: 'var(--base-muted-foreground)' }}
          >
            <CircleSlash className='h-4 w-4' strokeWidth={2} />
          </button>
          <button
            onClick={handleClosePanel}
            className='font-medium text-md leading-normal transition-all hover:brightness-75 dark:hover:brightness-125'
            style={{ color: 'var(--base-muted-foreground)' }}
          >
            <X className='h-4 w-4' strokeWidth={2} />
          </button>
        </div>
      )
    } else if (activeMode === 'agent') {
      // Agent: Only clear and close buttons
      return (
        <div className='flex items-center gap-2'>
          <button 
            onClick={handleClearAgentChat}
            className='font-medium text-md leading-normal transition-all hover:brightness-75 dark:hover:brightness-125'
            style={{ color: 'var(--base-muted-foreground)' }}
          >
            <CircleSlash className='h-4 w-4' strokeWidth={2} />
          </button>
          <button
            onClick={handleClosePanel}
            className='font-medium text-md leading-normal transition-all hover:brightness-75 dark:hover:brightness-125'
            style={{ color: 'var(--base-muted-foreground)' }}
          >
            <X className='h-4 w-4' strokeWidth={2} />
          </button>
        </div>
      )
    } else {
      // Rep/FAQs: Only close button
      return (
        <button
          onClick={handleClosePanel}
          className='font-medium text-md leading-normal transition-all hover:brightness-75 dark:hover:brightness-125'
          style={{ color: 'var(--base-muted-foreground)' }}
        >
          <X className='h-4 w-4' strokeWidth={2} />
        </button>
      )
    }
  }

  const renderMenu = () => (
    <div className='flex flex-col gap-3 p-3'>
      <button
        onClick={() => handleModeChange('workflow')}
        className='group flex flex-col items-center gap-3 rounded-lg border border-gray-700 bg-black p-4 text-center transition-all duration-200 hover:border-[#107f39]'
      >
        <Play className='h-10 w-10 text-[#6f6f6f] transition-colors duration-200 group-hover:text-[#107f39]' />
        <div>
          <div className='text-base font-medium text-white'>Run workflow</div>
          <div className='text-xs text-[#6f6f6f] mt-1'>Execute your workflow and get responses</div>
        </div>
      </button>
      
      <button
        onClick={() => handleModeChange('agent')}
        className='group flex flex-col items-center gap-3 rounded-lg border border-gray-700 bg-black p-4 text-center transition-all duration-200 hover:border-[#107f39]'
      >
        <Bot className='h-10 w-10 text-[#6f6f6f] transition-colors duration-200 group-hover:text-[#107f39]' />
        <div>
          <div className='text-base font-medium text-white'>Talk to agent</div>
          <div className='text-xs text-[#6f6f6f] mt-1'>Get help from our AI assistant</div>
        </div>
      </button>
      
      <button
        onClick={() => window.open('https://calendar.google.com', '_blank')}
        className='group flex flex-col items-center gap-3 rounded-lg border border-gray-700 bg-black p-4 text-center transition-all duration-200 hover:border-[#107f39]'
      >
        <MessageCircle className='h-10 w-10 text-[#6f6f6f] transition-colors duration-200 group-hover:text-[#107f39]' />
        <div>
          <div className='text-base font-medium text-white'>Talk to Rep</div>
          <div className='text-xs text-[#6f6f6f] mt-1'>Connect with our support team</div>
        </div>
      </button>
      
      <button
        onClick={() => handleModeChange('faqs')}
        className='group flex flex-col items-center gap-3 rounded-lg border border-gray-700 bg-black p-4 text-center transition-all duration-200 hover:border-[#107f39]'
      >
        <HelpCircle className='h-10 w-10 text-[#6f6f6f] transition-colors duration-200 group-hover:text-[#107f39]' />
        <div>
          <div className='text-base font-medium text-white'>FAQs</div>
          <div className='text-xs text-[#6f6f6f] mt-1'>Find answers to common questions</div>
        </div>
      </button>
    </div>
  )

  const renderChatContent = () => {
    if (activeMode === 'workflow') {
      return (
        <div className='h-full'>
          <Chat 
            panelWidth={400} 
            chatMessage={workflowChatMessage}
            setChatMessage={setWorkflowChatMessage}
          />
        </div>
      )
    }

    if (activeMode === 'faqs') {
      return (
        <div className='flex h-full items-center justify-center text-muted-foreground text-sm p-3'>
          FAQs - Coming Soon
        </div>
      )
    }

    if (activeMode === 'rep') {
      return (
        <div className='flex h-full items-center justify-center text-muted-foreground text-sm p-3'>
          Talk to Rep - Coming Soon
        </div>
      )
    }

    return (
      <div className='flex h-full flex-col'>
        <div className='flex-1 overflow-hidden'>
          {historyLoaded && messages.length === 0 ? (
            <div className='flex h-full items-center justify-center text-muted-foreground text-sm p-3'>
              No messages yet
            </div>
          ) : (
            <ScrollArea className='h-full pb-2' hideScrollbar={true}>
              <div className='flex flex-col gap-2 p-3'>
                {messages.map((msg) => (
                  <div key={msg.id} className='w-full py-2'>
                    {msg.role === 'user' ? (
                      <div className='flex justify-end'>
                        <div className='max-w-[80%]'>
                          <div className='rounded-[10px] bg-[#0e5628] px-3 py-2'>
                            <div className='whitespace-pre-wrap break-words font-normal text-white text-sm leading-normal'>
                              <WordWrap text={msg.content} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className='pl-[2px]'>
                        <div className='overflow-wrap-anywhere relative whitespace-normal break-normal font-normal text-sm leading-normal'>
                          <div className='whitespace-pre-wrap break-words text-white'>
                            <WordWrap text={msg.content} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className='w-full py-2 pl-[2px]'>
                    <div className='overflow-wrap-anywhere relative whitespace-normal break-normal font-normal text-sm leading-normal'>
                      <div className='whitespace-pre-wrap break-words text-white opacity-70'>
                        ...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </div>
        <div className='relative flex-none pt-3 pb-4 px-3'>
          <div className='flex gap-2'>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Type a message...'
              className='h-9 flex-1 rounded-lg border-[#E5E5E5] bg-[#222] text-white shadow-xs focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-[#414141] dark:bg-[#202020]'
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              size='icon'
              disabled={!input.trim() || loading}
              className='h-9 w-9 rounded-lg bg-[#0e5628] text-white shadow-[0_0_0_0_#0e5628] transition-all duration-200 hover:bg-[#7028E6] hover:shadow-[0_0_0_4px_rgba(127,47,255,0.15)]'
            >
              <ArrowUp className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Menu mode: Only close button in top-right, no header/border */}
      {activeMode === 'menu' && (
        <div className='flex justify-end p-3 pb-0'>
          {renderHeaderButtons()}
        </div>
      )}

      {/* Non-menu modes: Back button and header with border */}
      {activeMode !== 'menu' && (
        <div className='border-b border-gray-700'>
          {/* Back button row */}
          <div className='flex items-center px-3 pt-3 pb-2'>
            <button
              onClick={() => handleModeChange('menu')}
              className='flex items-center gap-2 text-sm text-[#6f6f6f] hover:text-white transition-colors'
            >
              <ArrowLeft className='h-4 w-4' />
              Back
            </button>
          </div>
          
          {/* Header row */}
          <div className='flex items-center justify-between px-3 pb-3'>
            <h2 className='font-[450] text-base text-card-foreground capitalize'>
              {activeMode === 'workflow' ? 'Chat' : activeMode === 'agent' ? 'Agent Chat' : activeMode}
            </h2>
            {renderHeaderButtons()}
          </div>
        </div>
      )}
      
      {/* Content Area */}
      <div className='flex-1 overflow-hidden'>
        {activeMode === 'menu' ? renderMenu() : renderChatContent()}
      </div>
    </div>
  )
} 