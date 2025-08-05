"use client"

import type React from "react"
import { Suspense } from "react"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Upload, FileText, X, Zap, CheckCircle, AlertCircle, Loader2, MessageSquare, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProgressStep {
  id: string
  name: string
  status: 'pending' | 'active' | 'completed' | 'error'
  message?: string
}

function FileUploadPageContent() {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const leaseType = searchParams.get('leaseType') || 'solar'
  const selectedModes = searchParams.get('modes')?.split(',') || ['standard']
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
    }
    checkAuth()
  }, [router, supabase])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files).filter(
        (file) =>
          file.type === "application/pdf" ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword",
      )
      setFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        (file) =>
          file.type === "application/pdf" ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword",
      )
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const initializeProgress = (sessionId: string) => {
    const steps: ProgressStep[] = [
      { id: 'Parsing form data...', name: 'Parsing form data', status: 'pending' },
      { id: 'Converting file to buffer...', name: 'Converting file to buffer', status: 'pending' },
      { id: 'Uploading to storage...', name: 'Uploading to storage', status: 'pending' },
      { id: 'Extracting text with Gemini...', name: 'Extracting text with Gemini', status: 'pending' },
      ...selectedModes.map(mode => ({
        id: `Running ${mode} analysis...`,
        name: `Running ${mode} analysis`,
        status: 'pending' as const
      })),
      { id: 'Analysis completed, saving to database...', name: 'Saving to database', status: 'pending' }
    ]
    setProgressSteps(steps)
    setProgress(0)
    setCurrentStep('')
    
    // Set up real-time progress listening
    setupProgressListener(sessionId)
  }

  const setupProgressListener = (sessionId: string) => {
    // Close existing connection
    if (eventSource) {
      eventSource.close()
    }
    
    const es = new EventSource(`/api/progress/${sessionId}`)
    setEventSource(es)
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'progress') {
          updateProgressFromServer(data.step, data.status, data.details)
        }
      } catch (error) {
        console.error('Error parsing progress data:', error)
      }
    }
    
    es.onerror = (error) => {
      console.error('EventSource error:', error)
    }
  }
  
  const updateProgressFromServer = (step: string, status: 'active' | 'completed' | 'error', details?: any) => {
    console.log(`[FRONTEND] Received progress: ${step} - ${status}`, details)
    
    setProgressSteps(prev => {
      const newSteps = prev.map(s => {
        // Find step by exact match or partial match
        const stepMatch = s.id === step || 
                         s.id.includes(step.replace('...', '')) || 
                         step.includes(s.id.replace('...', '')) ||
                         s.name.toLowerCase().includes(step.toLowerCase().replace(/\.\.\./g, ''))
        
        if (stepMatch) {
          return { ...s, status, message: details ? JSON.stringify(details) : undefined }
        }
        return s
      })
      
      // Calculate progress percentage
      const completedSteps = newSteps.filter(s => s.status === 'completed').length
      const totalSteps = newSteps.length
      
      if (status === 'active') {
        setCurrentStep(step)
        // Show partial progress for active step
        setProgress(((completedSteps + 0.1) / totalSteps) * 100)
      } else if (status === 'completed') {
        // Recalculate completed steps after status update
        const newCompletedCount = newSteps.filter(s => s.status === 'completed').length
        setProgress((newCompletedCount / totalSteps) * 100)
        
        // If all steps completed, set to 100%
        if (newCompletedCount === totalSteps) {
          setProgress(100)
        }
      }
      
      return newSteps
    })
  }
  
  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [eventSource])

  // Remove simulation - we now use real-time progress

  const handleUpload = async () => {
    if (files.length === 0 || !user) return

    setUploading(true)
    setError(null)
    
    try {
      const results = []
      
      for (const file of files) {
        console.log(`Starting upload for: ${file.name}`)
        
        // Generate a session ID and start progress tracking immediately
        const sessionId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        initializeProgress(sessionId)
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('leaseType', leaseType)
        formData.append('analysisModes', selectedModes.join(','))
        formData.append('sessionId', sessionId) // Send sessionId to server
        
        // Make the API call
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          const errorMessage = errorData.error || 'Upload failed'
          const errorContext = errorData.context || 'Unknown'
          const detailedError = `${errorMessage} (${errorContext})`
          
          // Log detailed error for debugging
          console.error('Upload failed:', {
            error: errorMessage,
            context: errorContext,
            timestamp: errorData.timestamp,
            response: errorData
          })
          
          throw new Error(detailedError)
        }
        
        const result = await response.json()
        console.log('Upload completed:', result)
        
        results.push(result)
        
        // Mark as completed
        setProgress(100)
        
        // Close event source after completion
        setTimeout(() => {
          if (eventSource) {
            eventSource.close()
            setEventSource(null)
          }
        }, 2000) // Give time for final progress updates
      }
      
      setAnalysisResults(results)
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setError(errorMessage)
      
      // Close event source on error
      if (eventSource) {
        eventSource.close()
        setEventSource(null)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="gradient-ring-1 absolute top-20 -right-40 w-96 h-96 rounded-full border-4 border-transparent bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 opacity-10"></div>
        <div className="gradient-ring-2 absolute bottom-20 -left-40 w-80 h-80 rounded-full border-4 border-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 opacity-8"></div>
      </div>

      {/* Header */}
      <header className="glass-light sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-slate-900">Rayfield Lease</span>
                <span className="text-xl font-bold gradient-text-blue">AI</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/features" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
                Features
              </Link>
              <Link href="/upload" className="text-slate-900 font-semibold">
                Upload
              </Link>
              {user ? (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 border-0"
                  asChild
                >
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 border-0"
                  asChild
                >
                  <Link href="/auth/login">Log In</Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Upload Your Lease Documents</h1>
          <p className="text-slate-600">Upload PDF or DOCX files to begin breakthrough AI analysis</p>
        </div>

        {/* File Upload Area */}
        <Card className="mb-8 glass-light border-slate-200">
          <CardContent className="p-8">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50",
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Drag & drop PDF/DOCX</h3>
              <p className="text-slate-500 mb-4">or click to browse</p>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 bg-white">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Browse Files
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Uploaded Files */}
        {files.length > 0 && (
          <Card className="mb-8 glass-light border-slate-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Uploaded Files</h3>
              <div className="space-y-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{file.name}</p>
                        <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-slate-500 hover:text-red-500 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Bar */}
        {uploading && (
          <Card className="mb-8 glass-light border-slate-200">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Processing Document</h3>
                  <span className="text-sm text-slate-600">{Math.round(progress)}%</span>
                </div>
                
                <Progress value={progress} className="w-full" />
                
                <div className="space-y-2">
                  {progressSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center",
                        step.status === 'completed' && "bg-green-500",
                        step.status === 'active' && "bg-blue-500",
                        step.status === 'error' && "bg-red-500",
                        step.status === 'pending' && "bg-gray-300"
                      )}>
                        {step.status === 'active' && (
                          <Loader2 className="w-3 h-3 text-white animate-spin" />
                        )}
                        {step.status === 'completed' && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                        {step.status === 'error' && (
                          <X className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={cn(
                          "text-sm",
                          step.status === 'completed' && "text-green-700 font-medium",
                          step.status === 'active' && "text-blue-700 font-medium",
                          step.status === 'error' && "text-red-700 font-medium",
                          step.status === 'pending' && "text-gray-500"
                        )}>
                          {step.name}
                        </p>
                        {step.message && (
                          <p className="text-xs text-gray-600 mt-1">{step.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div>
                <p className="font-medium">Upload Failed</p>
                <p className="text-sm mt-1">{error}</p>
                <div className="mt-3 text-xs text-red-600">
                  <p className="font-medium">Common solutions:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Ensure your PDF file is valid and not corrupted</li>
                    <li>Check that the file size is under 50MB</li>
                    <li>Verify you have a stable internet connection</li>
                    <li>Try refreshing the page and uploading again</li>
                  </ul>
                  <p className="mt-2">Check the browser console (F12) for detailed error information.</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Analysis Results */}
        {analysisResults && (
          <Card className="mb-8 glass-light border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-slate-900">Analysis Complete! 🎉</h3>
              </div>
              
              <div className="space-y-6">
                {analysisResults.map((result: any, index: number) => (
                  <div key={index} className="p-6 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">{result.file.file_name}</h4>
                    <p className="text-sm text-green-700 mb-4">Successfully processed with {selectedModes.join(', ')} analysis</p>
                    
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => router.push(`/analysis/${result.file.id}`)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Analysis
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/chat-session', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                fileId: result.file.id,
                                title: `Chat about ${result.file.file_name}`
                              }),
                            })
                            
                            if (response.ok) {
                              const data = await response.json()
                              router.push(`/chat/${data.sessionId}`)
                            } else {
                              // Fallback to analysis page with chat anchor
                              router.push(`/analysis/${result.file.id}#chat`)
                            }
                          } catch (error) {
                            console.error('Error creating chat session:', error)
                            // Fallback to analysis page
                            router.push(`/analysis/${result.file.id}`)
                          }
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Start Chat
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => router.push('/my-documents')}
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        My Documents
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Quick Navigation Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-slate-900 mb-4">What would you like to do next?</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/upload')}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Upload className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">New Upload</p>
                        <p className="text-xs text-slate-600">Analyze another document</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/chat-history')}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Chat History</p>
                        <p className="text-xs text-slate-600">View previous conversations</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/my-documents')}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FolderOpen className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">My Documents</p>
                        <p className="text-xs text-slate-600">Manage saved analyses</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 px-8 py-3 border-0 shadow-2xl shadow-blue-500/25"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading || !user}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </span>
            ) : (
              "Start Analysis"
            )}
          </Button>
          <Button variant="ghost" asChild className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
            <Link href="/upload" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Options
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}

export default function FileUploadPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FileUploadPageContent />
    </Suspense>
  )
}
