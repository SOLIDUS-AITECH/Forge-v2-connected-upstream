'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { SimpleChat } from './simple-chat'

export function FloatingChatButton() {
  const [chatMessage, setChatMessage] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full border border-[#0e5628] bg-black text-white shadow-lg transition-all duration-200 hover:bg-[#0e5628] hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[600px] p-0 flex flex-col">
        <DialogTitle className="text-lg font-semibold px-4 py-3 border-b flex-none">
          Agent Forge Platform Help
        </DialogTitle>
        <div className="flex-1 overflow-hidden p-4">
          <SimpleChat />
        </div>
      </DialogContent>
    </Dialog>
  )
} 