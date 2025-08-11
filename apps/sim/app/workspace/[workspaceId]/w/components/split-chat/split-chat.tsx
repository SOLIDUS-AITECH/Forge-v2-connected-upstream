'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ArrowUp, ArrowDownToLine, CircleSlash, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useParams } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { useWorkflowYamlStore } from '@/stores/workflows/yaml/store'
import { Chat } from '../../[workflowId]/components/panel/components/chat/chat'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
}

type BottomTab = 'agent' | 'rep'

interface SplitChatProps {
  panelWidth: number
  onClose?: () => void
}

const SplitChatComponent = function({ panelWidth, onClose }: SplitChatProps) {
  const [agentMessages, setAgentMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('agent')
  const [workflowChatMessage, setWorkflowChatMessage] = useState('')
  const [topHeight, setTopHeight] = useState(60) // 60% for top, 40% for bottom
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStartY, setResizeStartY] = useState(0)
  const [resizeStartHeight, setResizeStartHeight] = useState(0)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const { data: session } = useSession()
  const workflowId = params?.workflowId as string | undefined
  const username = session?.user?.name || 'anonymous'

  // Fetch conversation history when switching to agent tab
  useEffect(() => {
    if (activeBottomTab === 'agent') {
      const fetchHistory = async () => {
        if (!workflowId || !username) return
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
              setAgentMessages(historyMsgs)
            }
          }
        } catch (e) {
          // ignore error
        }
      }
      fetchHistory()
    }
  }, [activeBottomTab, workflowId, username])

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [agentMessages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = {
      id: crypto.randomUUID(),
      content: input,
      role: 'user',
    }
    setAgentMessages((msgs) => [...msgs, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Get current workflow YAML
      const workflowYaml = useWorkflowYamlStore.getState().getYaml()
      
      const res = await fetch('https://forgev2-platform.ai.aitech.io/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg.content,
          session_id: workflowId,
          user_id: username,
          workflow_yaml: workflowYaml,
        }),
      })
      const data = await res.json()
      setAgentMessages((msgs) => [
        ...msgs,
        {
          id: crypto.randomUUID(),
          content: data.result || (data.error ? `Error: ${data.error}` : 'No response'),
          role: 'assistant',
        },
      ])
    } catch (e: any) {
      setAgentMessages((msgs) => [
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

  const handleClearChat = async () => {
    try {
      await fetch(`https://forgev2-platform.ai.aitech.io/sessions/${username}/${workflowId}`, {
        method: 'DELETE',
      })
      setAgentMessages([])
    } catch (e) {
      // ignore error
    }
  }

  const handleSuggestedPrompt = async (prompt: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      content: prompt,
      role: 'user',
    }
    setAgentMessages((msgs) => [...msgs, userMsg])
    setLoading(true)

    try {
      // Get current workflow YAML
      const workflowYaml = useWorkflowYamlStore.getState().getYaml()
      
      const res = await fetch('https://forgev2-platform.ai.aitech.io/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: prompt,
          session_id: workflowId,
          user_id: username,
          workflow_yaml: workflowYaml,
        }),
      })
      const data = await res.json()
      setAgentMessages((msgs) => [
        ...msgs,
        {
          id: crypto.randomUUID(),
          content: data.result || (data.error ? `Error: ${data.error}` : 'No response'),
          role: 'assistant',
        },
      ])
    } catch (e: any) {
      setAgentMessages((msgs) => [
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

  // Resize functionality
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      setResizeStartY(e.clientY)
      setResizeStartHeight(topHeight)
    },
    [topHeight]
  )

  const handleResize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return
      const deltaY = e.clientY - resizeStartY
      const containerHeight = window.innerHeight - 200 // Approximate available height
      const deltaPercentage = (deltaY / containerHeight) * 100
      const newHeight = Math.max(30, Math.min(80, resizeStartHeight + deltaPercentage))
      setTopHeight(newHeight)
    },
    [isResizing, resizeStartY, resizeStartHeight]
  )

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
  }, [])

  // Add global mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', handleResizeEnd)
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'

      return () => {
        document.removeEventListener('mousemove', handleResize)
        document.removeEventListener('mouseup', handleResizeEnd)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [isResizing, handleResize, handleResizeEnd])

  const renderAgentChat = () => (
    <div className='flex h-full flex-col'>
      <div className='flex-1 overflow-hidden'>
        {agentMessages.length === 0 ? (
          <div className='flex h-full items-center justify-center text-muted-foreground text-sm'>
            No messages yet
          </div>
        ) : (
          <ScrollArea className='h-full pb-2' hideScrollbar={true}>
            <div className='flex flex-col gap-2 p-3'>
              {agentMessages.map((msg) => (
                <div key={msg.id} className='w-full py-2'>
                  {msg.role === 'user' ? (
                    <div className='flex justify-end'>
                      <div className='max-w-[80%]'>
                        <div className='rounded-[10px] bg-[#0e5628] px-3 py-2'>
                          <div className='whitespace-pre-wrap break-words font-normal text-white text-sm leading-normal'>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='pl-[2px]'>
                      <div className='overflow-wrap-anywhere relative whitespace-normal break-normal font-normal text-sm leading-normal'>
                        <div className='whitespace-pre-wrap break-words text-white'>
                          {msg.content}
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
      
      {/* Suggested Prompts */}
      <div className='flex-none px-3 pb-2'>
        <div className='overflow-x-auto scrollbar-hide'>
          <div className='flex flex-col gap-2' style={{ width: 'max-content' }}>
            {/* Row 1 */}
            <div className='flex gap-2'>
              <button
                onClick={() => handleSuggestedPrompt('How do I create a workflow?')}
                disabled={loading}
                className='px-3 py-1.5 rounded-full border border-gray-700 bg-black text-white text-xs hover:border-[#107f39] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0'
              >
                How do I create a workflow?
              </button>
              <button
                onClick={() => handleSuggestedPrompt('What tools are available?')}
                disabled={loading}
                className='px-3 py-1.5 rounded-full border border-gray-700 bg-black text-white text-xs hover:border-[#107f39] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0'
              >
                What tools are available?
              </button>
              <button
                onClick={() => handleSuggestedPrompt('What does my workflow do?')}
                disabled={loading}
                className='px-3 py-1.5 rounded-full border border-gray-700 bg-black text-white text-xs hover:border-[#107f39] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0'
              >
                What does my workflow do?
              </button>
              <button
                onClick={() => handleSuggestedPrompt('How do I integrate APIs?')}
                disabled={loading}
                className='px-3 py-1.5 rounded-full border border-gray-700 bg-black text-white text-xs hover:border-[#107f39] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0'
              >
                How do I integrate APIs?
              </button>
              <button
                onClick={() => handleSuggestedPrompt('Can you help me debug?')}
                disabled={loading}
                className='px-3 py-1.5 rounded-full border border-gray-700 bg-black text-white text-xs hover:border-[#107f39] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0'
              >
                Can you help me debug?
              </button>
            </div>
            {/* Row 2 */}
            <div className='flex gap-2'>
              <button
                onClick={() => handleSuggestedPrompt('Show me examples')}
                disabled={loading}
                className='px-3 py-1.5 rounded-full border border-gray-700 bg-black text-white text-xs hover:border-[#107f39] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0'
              >
                Show me examples
              </button>
              <button
                onClick={() => handleSuggestedPrompt('How do I deploy?')}
                disabled={loading}
                className='px-3 py-1.5 rounded-full border border-gray-700 bg-black text-white text-xs hover:border-[#107f39] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0'
              >
                How do I deploy?
              </button>
              <button
                onClick={() => handleSuggestedPrompt('What are best practices?')}
                disabled={loading}
                className='px-3 py-1.5 rounded-full border border-gray-700 bg-black text-white text-xs hover:border-[#107f39] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0'
              >
                What are best practices?
              </button>
              <button
                onClick={() => handleSuggestedPrompt('Explain this error')}
                disabled={loading}
                className='px-3 py-1.5 rounded-full border border-gray-700 bg-black text-white text-xs hover:border-[#107f39] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0'
              >
                Explain this error
              </button>
              <button
                onClick={() => handleSuggestedPrompt('Optimize my workflow')}
                disabled={loading}
                className='px-3 py-1.5 rounded-full border border-gray-700 bg-black text-white text-xs hover:border-[#107f39] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0'
              >
                Optimize my workflow
              </button>
            </div>
          </div>
        </div>
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
            className='h-9 w-9 rounded-lg bg-[#0e5628] text-white shadow-[0_0_0_0_#0e5628] transition-all duration-200 hover:bg-[#107f39] hover:shadow-[0_0_0_4px_rgba(16,127,57,0.15)]'
          >
            <ArrowUp className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className='h-full flex flex-col gap-1'>
      {/* Top Container - Workflow Chat */}
      <div 
        className='flex flex-col rounded-[14px] border bg-card shadow-xs overflow-hidden'
        style={{ height: `${topHeight}%` }}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-3 pt-3 pb-1 flex-none'>
          <h2 className='font-[450] text-base text-card-foreground'>Chat</h2>
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
              onClick={onClose}
              className='font-medium text-md leading-normal transition-all hover:brightness-75 dark:hover:brightness-125'
              style={{ color: 'var(--base-muted-foreground)' }}
            >
              <X className='h-4 w-4' strokeWidth={2} />
            </button>
          </div>
        </div>
        
        {/* Chat Content */}
        <div className='flex-1 overflow-hidden px-3'>
          <Chat 
            panelWidth={panelWidth} 
            chatMessage={workflowChatMessage}
            setChatMessage={setWorkflowChatMessage}
          />
        </div>
      </div>

      {/* Resizable Divider */}
      <div
        className='h-2 flex items-center justify-center cursor-row-resize relative'
        onMouseDown={handleResizeStart}
      >
        <div className='w-12 h-1 bg-gray-500 rounded-full opacity-60 hover:opacity-100 hover:bg-gradient-to-r hover:from-gray-400 hover:to-gray-600 transition-all duration-200'></div>
      </div>

      {/* Bottom Container - Agent/Rep Tabs */}
      <div className='flex flex-col rounded-[14px] border bg-card shadow-xs overflow-hidden flex-1'>
        {/* Tab Selector */}
        <div className='flex h-9 items-center gap-1 px-3 py-1 flex-none'>
          <button
            onClick={() => setActiveBottomTab('agent')}
            className={`panel-tab-base inline-flex flex-1 cursor-pointer items-center justify-center rounded-[10px] border-transparent py-1 font-[450] text-sm outline-none transition-colors duration-200 ${
              activeBottomTab === 'agent' ? 'panel-tab-active' : 'panel-tab-inactive'
            }`}
          >
            Agent
          </button>
          <button
            onClick={() => window.open('https://calendar.google.com', '_blank')}
            className={`panel-tab-base inline-flex flex-1 cursor-pointer items-center justify-center rounded-[10px] border-transparent py-1 font-[450] text-sm outline-none transition-colors duration-200 panel-tab-inactive hover:text-white`}
          >
            Rep
          </button>
        </div>
        
        {/* Tab Content */}
        <div className='flex-1 overflow-hidden'>
          {activeBottomTab === 'agent' && (
            <div className='flex h-full flex-col'>
              {/* Agent Chat Header with Clear Button */}
              <div className='flex items-center justify-between p-3 border-b border-gray-700 flex-none'>
                <div className='text-sm font-medium text-white'>Agent Chat</div>
                <button
                  onClick={handleClearChat}
                  className='font-medium text-md leading-normal transition-all hover:brightness-75 dark:hover:brightness-125'
                  style={{ color: 'var(--base-muted-foreground)' }}
                >
                  <CircleSlash className='h-4 w-4' strokeWidth={2} />
                </button>
              </div>
              {/* Agent Chat Content */}
              <div className='flex-1 overflow-hidden'>
                {renderAgentChat()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const SplitChat = React.memo(SplitChatComponent) 