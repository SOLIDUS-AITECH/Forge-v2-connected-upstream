'use client'

import { useRef, useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useParams } from 'next/navigation'
import { useSession } from '@/lib/auth-client'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
}

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

export function SidebarChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const { data: session } = useSession()
  const workflowId = params?.workflowId as string | undefined
  const username = session?.user?.name || 'anonymous'

  // Fetch conversation history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      if (!workflowId || !username) {
        setHistoryLoaded(true)
        return
      }
      try {
        const res = await fetch(`http://localhost:5050/sessions/${username}/${workflowId}/history`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, username])

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
      const res = await fetch('http://localhost:5050/query', {
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

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-1 flex-col overflow-hidden'>
        <div className='flex-1 overflow-hidden'>
          {historyLoaded && messages.length === 0 ? (
            <div className='flex h-full items-center justify-center text-muted-foreground text-sm'>
              No messages yet
            </div>
          ) : (
            <ScrollArea className='h-full pb-2' hideScrollbar={true}>
              <div className='flex flex-col gap-2'>
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
        <div className='relative flex-none pt-3 pb-4'>
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
    </div>
  )
} 