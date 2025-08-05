'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MessageSquare, 
  Search, 
  Eye,
  Trash2,
  Calendar,
  FileText,
  Zap,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface ChatSession {
  id: string
  title: string
  file_id: string
  created_at: string
  file_name?: string
  message_count?: number
  last_message?: string
  last_message_at?: string
}

export default function ChatHistoryPage() {
  const router = useRouter()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchChatSessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        setUser(user)

        // Fetch chat sessions with file information and message stats
        const { data: sessions, error: sessionsError } = await supabase
          .from('chat_sessions')
          .select(`
            id,
            title,
            file_id,
            created_at,
            user_files!inner(file_name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (sessionsError) {
          setError('Failed to load chat history')
          return
        }

        // Get message counts and last messages for each session
        const sessionsWithStats = await Promise.all(
          (sessions || []).map(async (session) => {
            const { data: messages, error: messagesError } = await supabase
              .from('chat_messages')
              .select('content, created_at, role')
              .eq('session_id', session.id)
              .order('created_at', { ascending: false })

            const messageCount = messages?.length || 0
            const lastMessage = messages?.[0]

            return {
              ...session,
              file_name: session.user_files?.file_name,
              message_count: messageCount,
              last_message: lastMessage?.content,
              last_message_at: lastMessage?.created_at
            }
          })
        )

        setChatSessions(sessionsWithStats)
      } catch (error) {
        setError('Failed to load chat history')
      } finally {
        setLoading(false)
      }
    }

    fetchChatSessions()
  }, [router, supabase])

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this chat session? This will also delete all messages in this conversation.')) return

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id)

      if (error) throw error

      setChatSessions(prev => prev.filter(session => session.id !== sessionId))
    } catch (error) {
      console.error('Error deleting chat session:', error)
    }
  }

  const filteredSessions = chatSessions.filter(session => 
    session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (!message) return ''
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
            <Button variant="outline" asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat History</h1>
          <p className="text-gray-600">View and manage your previous conversations</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Chat Sessions */}
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
              <p className="text-gray-600 text-center">
                {searchTerm 
                  ? 'Try adjusting your search criteria.'
                  : 'Start a conversation by uploading a document and asking questions about it.'}
              </p>
              {!searchTerm && (
                <Button asChild className="mt-4">
                  <Link href="/upload">Upload Document</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-medium mb-2">
                        {session.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{session.file_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{session.message_count} messages</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Started: {new Date(session.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSession(session.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {session.last_message && (
                      <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                        <p className="text-sm font-medium text-gray-700 mb-1">Last message:</p>
                        <p className="text-sm text-gray-600">{truncateMessage(session.last_message)}</p>
                        {session.last_message_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(session.last_message_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="flex-1">
                        <Link href={`/analysis/${session.file_id}`} className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          View Document
                        </Link>
                      </Button>
                      <Button asChild className="flex-1">
                        <Link href={`/chat/${session.id}`} className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Continue Chat
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}