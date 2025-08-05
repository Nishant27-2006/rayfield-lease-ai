'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Send, 
  FileText, 
  User,
  Bot,
  Zap,
  ArrowLeft,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  created_at: string
}

interface ChatSession {
  id: string
  title: string
  file_id: string
  file_name?: string
}

export default function ChatPage() {
  const { id } = useParams()
  const router = useRouter()
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClientComponentClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        setUser(user)

        // Fetch session info
        const { data: sessionData, error: sessionError } = await supabase
          .from('chat_sessions')
          .select(`
            id,
            title,
            file_id,
            user_files!inner(file_name)
          `)
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (sessionError) {
          setError('Chat session not found')
          return
        }

        setSession({
          ...sessionData,
          file_name: sessionData.user_files?.file_name
        })

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', id)
          .order('created_at', { ascending: true })

        if (messagesError) {
          setError('Failed to load messages')
          return
        }

        setMessages(messagesData || [])
      } catch (error) {
        setError('Failed to load chat')
      } finally {
        setLoading(false)
      }
    }

    fetchChatData()
  }, [id, router, supabase])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending || !session) return

    setSending(true)
    setAiError(null) // Clear any previous AI errors
    const messageContent = newMessage.trim()
    setNewMessage('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          fileId: session.file_id,
          sessionId: session.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 500 && data.error?.includes('AI service')) {
          setAiError('AI service is temporarily unavailable. Please try again later.')
        } else if (response.status === 401) {
          router.push('/auth/login')
          return
        } else {
          throw new Error(data.error || 'Failed to send message')
        }
        return
      }

      // Refresh messages to get the new AI response
      const { data: updatedMessages, error: refreshError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true })

      if (refreshError) {
        console.error('Error refreshing messages:', refreshError)
        // Don't show error to user, just log it
      } else {
        setMessages(updatedMessages || [])
      }

    } catch (error) {
      console.error('Error sending message:', error)
      setAiError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const retryLastMessage = async () => {
    if (messages.length === 0 || sending) return
    
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop()
    
    if (lastUserMessage) {
      setNewMessage(lastUserMessage.content)
      // Trigger send after a brief delay to ensure state is updated
      setTimeout(() => {
        const form = document.querySelector('form')
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }
      }, 100)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Chat session not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-slate-900">Rayfield Lease</span>
                <span className="text-xl font-bold text-blue-600">AI</span>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{session.file_name}</span>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link href="/chat-history" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to History
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* AI Error Alert */}
      {aiError && (
        <div className="px-4 py-2">
          <Alert variant="destructive" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{aiError}</AlertDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAiError(null)}
              className="h-6 px-2"
            >
              Dismiss
            </Button>
          </Alert>
        </div>
      )}

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {session.title}
                <Badge variant="secondary" className="text-xs">
                  Powered by AI
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask a question about the document..."
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          
          {/* Help Text */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            Ask about specific clauses, risks, obligations, or any aspect of your lease document
          </div>
        </div>
      </div>
    </div>
  )
}