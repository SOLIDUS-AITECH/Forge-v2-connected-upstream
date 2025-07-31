import { useSession } from '@/lib/auth-client'

export function useChatType() {
  const { data: session } = useSession()
  
  // Get user's join date from session
  const joinDate = session?.user?.createdAt 
    ? new Date(session.user.createdAt).getDate()
    : new Date().getDate() // fallback to current date
  
  // Odd dates get floating chat, even dates get sidebar chat
  const shouldUseFloatingChat = joinDate % 2 === 1
  
  return {
    shouldUseFloatingChat,
    joinDate,
    user: session?.user
  }
} 