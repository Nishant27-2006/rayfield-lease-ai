'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Calendar,
  Download,
  ArrowLeft,
  Zap,
  Save,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'

interface AnalysisData {
  id: string
  file_name: string
  lease_type: string
  analysis_modes: string[]
  analysis_results: any
  created_at: string
}

const ANALYSIS_MODE_LABELS = {
  standard: 'Standard Clause Extraction',
  parsing: 'Data Parsing & Mapping',
  redlining: 'Redlining / Deviation Detection',
  obligations: 'Obligations Matrix',
  renewal: 'Renewal & Expiry Timeline',
  legal: 'Legal Review Risk Flagging'
}

export default function AnalysisPage() {
  const { id } = useParams()
  const router = useRouter()
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [convertingText, setConvertingText] = useState(false)
  const [humanReadableText, setHumanReadableText] = useState<string | null>(null)
  const [convertedResults, setConvertedResults] = useState<{[key: string]: string}>({})
  const [convertingMode, setConvertingMode] = useState<string | null>(null)
  const [exportingObligations, setExportingObligations] = useState(false)
  const supabase = createClientComponentClient()
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchAnalysis = async () => {
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
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (error) {
          setError('Analysis not found')
          return
        }

        setAnalysisData(data)
        
        // Auto-convert to readable text when data loads
        if (data.analysis_results) {
          autoConvertToReadableText(data)
        }
      } catch (error) {
        setError('Failed to load analysis')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [id, router, supabase])

  const autoConvertToReadableText = async (data: AnalysisData) => {
    setConvertingText(true)
    try {
      const response = await fetch('/api/convert-to-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisResults: data.analysis_results,
          fileName: data.file_name,
          leaseType: data.lease_type,
          analysisModes: data.analysis_modes
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setHumanReadableText(result.humanReadableText)
      }
    } catch (error) {
      console.error('Auto-conversion failed:', error)
    } finally {
      setConvertingText(false)
    }
  }

  const handleExportPDF = () => {
    window.print()
  }

  const handleConvertToText = async () => {
    if (!analysisData || !user) return
    
    setConvertingText(true)
    try {
      const response = await fetch('/api/convert-to-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisResults: analysisData.analysis_results,
          fileName: analysisData.file_name,
          leaseType: analysisData.lease_type,
          analysisModes: analysisData.analysis_modes
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to convert to readable text')
      }

      const data = await response.json()
      setHumanReadableText(data.humanReadableText)
    } catch (error) {
      console.error('Error converting to text:', error)
      setError('Failed to convert analysis to readable text')
    } finally {
      setConvertingText(false)
    }
  }

  const convertModeToText = async (mode: string, data: any) => {
    if (convertedResults[mode] || convertingMode === mode) return convertedResults[mode]
    
    setConvertingMode(mode)
    try {
      const response = await fetch('/api/convert-to-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisResults: { [mode]: data },
          fileName: analysisData?.file_name,
          leaseType: analysisData?.lease_type,
          analysisModes: [mode]
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to convert to readable text')
      }

      const result = await response.json()
      const convertedText = result.humanReadableText
      setConvertedResults(prev => ({ ...prev, [mode]: convertedText }))
      return convertedText
    } catch (error) {
      console.error('Error converting mode to text:', error)
      return null
    } finally {
      setConvertingMode(null)
    }
  }

  const handleDownloadTextPDF = () => {
    if (!humanReadableText) return
    
    // Create a new window with the human-readable text for printing
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Lease Analysis Report - ${analysisData?.file_name}</title>
            <style>
              body { 
                font-family: 'Times New Roman', serif;
                line-height: 1.6;
                max-width: 800px;
                margin: 40px auto;
                padding: 20px;
                color: #333;
              }
              h1 { 
                color: #2563eb;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 10px;
                font-size: 28px;
              }
              h2 { 
                color: #1d4ed8;
                margin-top: 30px;
                font-size: 20px;
              }
              h3 { 
                color: #1e40af;
                margin-top: 20px;
                font-size: 16px;
              }
              ul, ol { 
                margin-left: 20px;
              }
              li { 
                margin-bottom: 5px;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #ccc;
                font-size: 12px;
                color: #666;
                text-align: center;
              }
              @media print {
                body { margin: 20px; }
              }
            </style>
          </head>
          <body>
            <div style="white-space: pre-wrap;">${humanReadableText.replace(/\n/g, '<br>')}</div>
            <div class="footer">
              Generated by Rayfield Lease AI | ${new Date().toLocaleDateString()}
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }
  }

  const handleSaveLease = async () => {
    if (!analysisData || !user) return
    
    setSaveStatus('saving')
    try {
      const { error } = await supabase
        .from('saved_leases')
        .upsert({
          user_id: user.id,
          file_id: analysisData.id,
          file_name: analysisData.file_name,
          lease_type: analysisData.lease_type,
          analysis_modes: analysisData.analysis_modes,
          analysis_results: analysisData.analysis_results,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,file_id'
        })

      if (error) throw error
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Error saving lease:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  const handleStartChat = async () => {
    if (!analysisData || !user) return
    
    try {
      // Create a new chat session for this document
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          file_id: analysisData.id,
          title: `Chat about ${analysisData.file_name}`,
          project_id: null
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error creating chat session:', sessionError)
        return
      }

      // Navigate to the chat page
      router.push(`/chat/${sessionData.id}`)
    } catch (error) {
      console.error('Error starting chat:', error)
    }
  }

  const handleExportObligations = async () => {
    if (!analysisData || !humanReadableText) {
      alert('Please generate the readable report first before exporting obligations.')
      return
    }
    
    setExportingObligations(true)
    try {
      const response = await fetch('/api/generate-obligations-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          humanReadableText,
          fileName: analysisData.file_name,
          leaseType: analysisData.lease_type
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Create and download CSV file
        const blob = new Blob([data.csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = data.fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        
        // Show success message
        alert(`Technical obligations exported successfully! Found ${data.obligationsCount} obligations.`)
      } else {
        console.error('Response status:', response.status, response.statusText)
        const errorData = await response.json()
        console.error('Failed to export obligations:', errorData)
        alert(`Failed to export technical obligations: ${errorData.error || 'Unknown error'}. Please try again.`)
      }
    } catch (error) {
      console.error('Error exporting obligations:', error)
      alert('Error exporting technical obligations. Please try again.')
    } finally {
      setExportingObligations(false)
    }
  }

  const AnalysisContent = ({ mode, data }: { mode: string; data: any }) => {
    const [showRawData, setShowRawData] = useState(false)
    const [convertedText, setConvertedText] = useState<string | null>(convertedResults[mode] || null)
    
    useEffect(() => {
      if (!convertedText && convertingMode !== mode && typeof data === 'object') {
        convertModeToText(mode, data).then(text => {
          if (text) setConvertedText(text)
        })
      }
    }, [mode, data, convertedText, convertingMode])

    if (typeof data === 'string') {
      return (
        <div className="prose max-w-none">
          <div className="text-sm leading-relaxed p-4 bg-gray-50 rounded-lg">
            {data.split('\n').map((line, index) => (
              <p key={index} className="mb-2">{line || '\u00A0'}</p>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {convertingMode === mode && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Converting to readable text...
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRawData(!showRawData)}
            className="text-xs"
          >
            {showRawData ? 'Show Readable Text' : 'Show Raw Data'}
          </Button>
        </div>

        {!showRawData && convertedText ? (
          <div className="prose max-w-none">
            <div className="text-sm leading-relaxed p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="whitespace-pre-wrap">{convertedText}</div>
            </div>
          </div>
        ) : showRawData || (!convertedText && convertingMode !== mode) ? (
          <div className="space-y-4">
            {renderRawAnalysisContent(mode, data)}
          </div>
        ) : null}
      </div>
    )
  }

  const renderAnalysisContent = (mode: string, data: any) => {
    return <AnalysisContent mode={mode} data={data} />
  }

  const renderRawAnalysisContent = (mode: string, data: any) => {
    switch (mode) {
      case 'standard':
        return (
          <div className="space-y-6">
            {Object.entries(data).map(([phase, clauses]: [string, any]) => (
              <Card key={phase}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {phase.toUpperCase()} PHASE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(clauses) ? (
                    <div className="space-y-4">
                      {clauses.map((clause: any, index: number) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{clause.category}</Badge>
                            {clause.tags?.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <p className="font-medium mb-2">{clause.summary}</p>
                          <p className="text-sm text-gray-600">{clause.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">{JSON.stringify(clauses, null, 2)}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )

      case 'legal':
        return (
          <div className="space-y-4">
            {data.risks?.map((risk: any, index: number) => (
              <Alert key={index} variant={risk.severity === 'High' || risk.severity === 'Critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={risk.severity === 'High' || risk.severity === 'Critical' ? 'destructive' : 'outline'}>
                        {risk.severity}
                      </Badge>
                      <span className="font-medium">{risk.description}</span>
                    </div>
                    <p className="text-sm">{risk.consequences}</p>
                    <p className="text-sm font-medium">Recommendation: {risk.mitigation}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )) || <p className="text-gray-600">No specific risks identified</p>}
          </div>
        )

      case 'renewal':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.timeline?.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{item.event}</p>
                        <p className="text-sm text-gray-600">{item.date}</p>
                      </div>
                    </div>
                  )) || <p className="text-gray-600">No timeline data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'obligations':
        return (
          <div className="space-y-4">
            {data.obligations?.map((obligation: any, index: number) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{obligation.party}</Badge>
                    <Badge variant="secondary">{obligation.phase}</Badge>
                  </div>
                  <p className="font-medium mb-2">{obligation.description}</p>
                  <div className="text-sm text-gray-600">
                    <p>Due: {obligation.timeline}</p>
                    <p>Enforceability: {obligation.enforceability}</p>
                  </div>
                </CardContent>
              </Card>
            )) || <p className="text-gray-600">No obligations data available</p>}
          </div>
        )

      case 'parsing':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Extracted Metadata
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(data).map(([key, value]: [string, any]) => (
                    <div key={key} className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700 capitalize">
                        {key.replace(/_/g, ' ')}
                      </h4>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">
                          {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'redlining':
        return (
          <div className="space-y-6">
            {data.additions && data.additions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    Additions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.additions.map((addition: any, index: number) => (
                      <div key={index} className="border-l-4 border-green-500 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {addition.riskLevel || 'Medium'}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{addition.description}</p>
                        <p className="text-xs text-gray-600 mt-1">{addition.significance}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {data.removals && data.removals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Removals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.removals.map((removal: any, index: number) => (
                      <div key={index} className="border-l-4 border-red-500 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            {removal.riskLevel || 'High'}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{removal.description}</p>
                        <p className="text-xs text-gray-600 mt-1">{removal.significance}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {data.modifications && data.modifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <Clock className="h-5 w-5" />
                    Modifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.modifications.map((modification: any, index: number) => (
                      <div key={index} className="border-l-4 border-yellow-500 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            {modification.riskLevel || 'Medium'}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{modification.description}</p>
                        <p className="text-xs text-gray-600 mt-1">{modification.significance}</p>
                        {modification.recommendedAction && (
                          <p className="text-xs text-blue-600 mt-1 font-medium">
                            Action: {modification.recommendedAction}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {data.deviations && data.deviations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <AlertTriangle className="h-5 w-5" />
                    Deviations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.deviations.map((deviation: any, index: number) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            {deviation.riskLevel || 'High'}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{deviation.description}</p>
                        <p className="text-xs text-gray-600 mt-1">{deviation.significance}</p>
                        {deviation.recommendedAction && (
                          <p className="text-xs text-blue-600 mt-1 font-medium">
                            Action: {deviation.recommendedAction}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      default:
        if (typeof data === 'object' && data !== null) {
          return (
            <div className="space-y-4">
              {Object.entries(data).map(([key, value]: [string, any]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-base capitalize">{key.replace(/_/g, ' ')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {typeof value === 'string' ? (
                      <p className="text-sm leading-relaxed">{value}</p>
                    ) : Array.isArray(value) ? (
                      <div className="space-y-2">
                        {value.map((item, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                            {typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm bg-gray-50 p-3 rounded">
                        {JSON.stringify(value, null, 2)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        }
        return (
          <div className="prose max-w-none">
            <div className="text-sm bg-gray-50 p-4 rounded-lg">
              {JSON.stringify(data, null, 2)}
            </div>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !analysisData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || 'Analysis not found'}</AlertDescription>
        </Alert>
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
            <div className="flex items-center gap-4">
              <Button variant="outline" asChild>
                <Link href="/dashboard" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
                <Link href="/get-started">Get Started</Link>
              </Button>
              <Button 
                onClick={handleStartChat}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <MessageSquare className="h-4 w-4" />
                Start Chat
              </Button>
              <Button 
                onClick={handleSaveLease}
                variant="outline"
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saveStatus === 'saving' ? 'Saving...' : 
                 saveStatus === 'saved' ? 'Saved!' : 
                 saveStatus === 'error' ? 'Error' : 'Save Lease'}
              </Button>
              <Button 
                onClick={handleExportPDF}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Raw Data
              </Button>
              <Button 
                onClick={handleConvertToText}
                disabled={convertingText}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {convertingText ? 'Converting...' : 'Generate Report'}
              </Button>
              {humanReadableText && (
                <Button 
                  onClick={handleDownloadTextPDF}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  Download Report PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8" ref={printRef}>
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-before: always;
            }
          }
        `}</style>
        <div className="print-area">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Lease Analysis Results</h1>
              <Button 
                onClick={handleExportObligations}
                disabled={exportingObligations || !humanReadableText}
                variant="outline"
                className="flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 disabled:opacity-50"
              >
                {exportingObligations ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                    Generating CSV...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Obligations CSV
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span>File: {analysisData.file_name}</span>
              <span>Type: {analysisData.lease_type}</span>
              <span>Analyzed: {new Date(analysisData.created_at).toLocaleDateString()}</span>
            </div>
            <div className="text-sm text-gray-500 print:block hidden">
              Generated by Rayfield Lease AI - {new Date().toLocaleDateString()}
            </div>
          </div>

          {/* Main Content - Show readable text by default */}
          {humanReadableText ? (
            <div className="mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Lease Analysis Report</h2>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleDownloadTextPDF}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button 
                      onClick={() => setHumanReadableText(null)}
                      variant="outline"
                    >
                      Show Raw Data
                    </Button>
                  </div>
                </div>
                <div className="prose max-w-none text-gray-800">
                  <div className="whitespace-pre-wrap font-serif leading-relaxed text-base">
                    {humanReadableText}
                  </div>
                </div>
              </div>
            </div>
          ) : convertingText ? (
            <div className="mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <div>
                    <h2 className="text-xl font-semibold text-blue-900">Converting Analysis to Readable Text</h2>
                    <p className="text-blue-700">Please wait while we generate your human-readable report...</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <Tabs defaultValue={analysisData.analysis_modes[0]} className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Raw Analysis Data</h2>
                  <Button 
                    onClick={handleConvertToText}
                    disabled={convertingText}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Generate Readable Report
                  </Button>
                </div>
                
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 no-print">
                  {analysisData.analysis_modes.map((mode) => (
                    <TabsTrigger key={mode} value={mode} className="text-xs">
                      {ANALYSIS_MODE_LABELS[mode as keyof typeof ANALYSIS_MODE_LABELS]?.split(' ')[0] || mode}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {analysisData.analysis_modes.map((mode, index) => (
                  <TabsContent key={mode} value={mode} className="space-y-6 print:block">
                    <div className="mb-4 ${index > 0 ? 'page-break' : ''}">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {ANALYSIS_MODE_LABELS[mode as keyof typeof ANALYSIS_MODE_LABELS] || mode}
                      </h2>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:shadow-none print:border-0">
                      {renderAnalysisContent(mode, analysisData.analysis_results[mode])}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}