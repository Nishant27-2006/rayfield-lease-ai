'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Search, 
  Filter,
  Eye,
  Trash2,
  Calendar,
  Zap,
  ArrowLeft,
  MessageSquare,
  Download
} from 'lucide-react'
import Link from 'next/link'

interface UserFile {
  id: string
  file_name: string
  file_type: string
  file_size: number
  processed: boolean
  lease_type: string
  analysis_modes: string[]
  created_at: string
  analysis_results: any
}

export default function MyDocumentsPage() {
  const router = useRouter()
  const [userFiles, setUserFiles] = useState<UserFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchUserFiles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        setUser(user)

        const { data, error } = await supabase
          .from('user_files')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          setError('Failed to load documents')
          return
        }

        setUserFiles(data || [])
      } catch (error) {
        setError('Failed to load documents')
      } finally {
        setLoading(false)
      }
    }

    fetchUserFiles()
  }, [router, supabase])

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      const { error } = await supabase
        .from('user_files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user.id)

      if (error) throw error

      setUserFiles(prev => prev.filter(file => file.id !== fileId))
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const handleStartChat = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch('/api/chat-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileId,
          title: `Chat about ${fileName}`
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        router.push(`/chat/${data.sessionId}`)
      } else {
        console.error('Failed to create chat session')
        // Fallback to analysis page
        router.push(`/analysis/${fileId}`)
      }
    } catch (error) {
      console.error('Error creating chat session:', error)
      // Fallback to analysis page
      router.push(`/analysis/${fileId}`)
    }
  }

  const handleChatWithAllDocuments = async () => {
    if (filteredFiles.length === 0) return
    
    try {
      // Create a project ID for this multi-document chat
      const projectId = `project-${user.id}-${Date.now()}`
      const fileIds = filteredFiles.map(file => file.id)
      
      const response = await fetch('/api/chat-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: projectId,
          fileIds: fileIds,
          title: `Chat about ${filteredFiles.length} documents`
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        router.push(`/chat/${data.sessionId}`)
      } else {
        console.error('Failed to create multi-document chat session')
      }
    } catch (error) {
      console.error('Error creating multi-document chat session:', error)
    }
  }

  const handleExportObligations = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/export-obligations-dynamic/${fileId}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileName.replace(/\.[^/.]+$/, '')}-obligations.xlsx`
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      } else {
        console.error('Failed to export obligations')
        setError('Failed to export obligations')
      }
    } catch (error) {
      console.error('Error exporting obligations:', error)
      setError('Error exporting obligations')
    }
  }


  const filteredFiles = userFiles.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || file.lease_type === filterType
    return matchesSearch && matchesFilter
  })

  const uniqueLeaseTypes = [...new Set(userFiles.map(file => file.lease_type).filter(Boolean))]

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Documents</h1>
          <p className="text-gray-600">Manage your saved lease analyses</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueLeaseTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filteredFiles.length > 0 && (
            <>
              <Button 
                asChild
                className="bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
              >
                <Link href="/my-documents/chat-all" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  All Documents
                </Link>
              </Button>
            </>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Documents Grid */}
        {filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-600 text-center">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start by uploading and analyzing a lease document.'}
              </p>
              {(!searchTerm && filterType === 'all') && (
                <Button asChild className="mt-4">
                  <Link href="/upload">Upload Document</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-medium truncate pr-2">
                      {file.file_name}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {file.lease_type && (
                    <Badge variant="secondary">{file.lease_type}</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Uploaded: {new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Size:</span>
                        <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Type:</span>
                        <span>{file.file_type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Status:</span>
                        <Badge variant={file.processed ? "default" : "secondary"}>
                          {file.processed ? "Processed" : "Processing"}
                        </Badge>
                      </div>
                    </div>

                    {file.analysis_modes && file.analysis_modes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Analysis Modes:</p>
                        <div className="flex flex-wrap gap-1">
                          {file.analysis_modes.map((mode) => (
                            <Badge key={mode} variant="outline" className="text-xs">
                              {mode}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 space-y-2">
                      <Button asChild className="w-full">
                        <Link href={`/analysis/${file.id}`} className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          View Analysis
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleStartChat(file.id, file.file_name)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Start Chat
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="w-full"
                        onClick={() => handleExportObligations(file.id, file.file_name)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Extract Obligations
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