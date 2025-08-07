import { useSession } from "@/lib/auth-client";

export function useChatType() {
  const { data: session } = useSession();

  // Get user's join minute from session
  const joinMinute = session?.user?.createdAt
    ? new Date(session.user.createdAt).getMinutes()
    : new Date().getMinutes() // fallback to current minute
  
  // Odd minutes get floating chat, even minutes get sidebar chat
  const shouldUseFloatingChat = joinMinute % 2 === 1
  
  return {
    shouldUseFloatingChat,
    joinDate: joinMinute, // keeping the property name for backward compatibility
    user: session?.user,
  };
}
