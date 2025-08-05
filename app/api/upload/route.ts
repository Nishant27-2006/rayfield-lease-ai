import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'
// Global progress store for real-time updates
declare global {
  var progressStore: Map<string, any[]> | undefined
}

const progressStore = global.progressStore || new Map<string, any[]>()
global.progressStore = progressStore

// Helper function to emit progress updates
const emitProgress = (sessionId: string, step: string, status: 'active' | 'completed' | 'error', details?: any) => {
  if (!progressStore.has(sessionId)) {
    progressStore.set(sessionId, [])
  }
  
  const progressData = {
    type: 'progress',
    step,
    status,
    details,
    timestamp: new Date().toISOString()
  }
  
  progressStore.get(sessionId)!.push(progressData)
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const LEASE_ANALYSIS_PROMPTS = {
  standard: `Extract all clauses from this lease document and organize them by phase:
  1. GENERAL PHASE: Basic terms, definitions, parties, property description
  2. DEVELOPMENT PHASE: Permits, approvals, construction rights, timelines
  3. CONSTRUCTION PHASE: Construction obligations, completion requirements
  4. OPERATIONAL PHASE: Operations, maintenance, ongoing obligations
  
  For each clause, provide:
  - Clause text
  - Summary (1-2 sentences)
  - Category (payment, duration, obligations, etc.)
  - Tags (relevant keywords)
  - Phase classification
  
  Return as structured JSON with phases as top-level keys.`,
  
  parsing: `Extract metadata from this lease document:
  - Parcel ID/Property ID
  - Acreage/Area
  - Legal description
  - Lessor contact information
  - Lessee contact information
  - Lease term/duration
  - Payment terms
  - Key dates
  
  Return as clean JSON object suitable for database storage.`,
  
  redlining: `Compare this lease against standard lease templates and identify:
  1. ADDITIONS: Clauses added beyond standard template
  2. REMOVALS: Standard clauses that are missing
  3. MODIFICATIONS: Standard clauses that have been changed
  4. DEVIATIONS: Unusual or non-standard provisions
  
  For each deviation, explain:
  - What changed
  - Why it might be significant
  - Risk level (Low/Medium/High)
  - Recommended action
  
  Return as structured JSON with categories for additions, removals, modifications, and deviations.`,
  
  obligations: `Create an obligations matrix breaking down all obligations by:
  1. PARTY (Lessor/Lessee/Third Party)
  2. PHASE (Development/Construction/Operational)
  3. TIMELINE (When due)
  4. ENFORCEABILITY (Mandatory/Optional/Conditional)
  
  For each obligation, provide:
  - Description
  - Responsible party
  - Due date/trigger
  - Consequences of non-compliance
  - Enforceability level
  
  Return as structured JSON matrix.`,
  
  renewal: `Analyze this lease for renewal and expiry information:
  1. INITIAL TERM: Start date, end date, duration
  2. RENEWAL OPTIONS: Number of renewals, duration, conditions
  3. EXPIRY CONDITIONS: What triggers expiry
  4. NOTICE REQUIREMENTS: When and how to provide notice
  5. KEY DATES: All important dates and deadlines
  
  Generate a timeline of all critical dates and suggest alert schedules.
  Return as structured JSON with timeline array and alert recommendations.`,
  
  legal: `Identify potential legal risks and flag problematic clauses:
  1. VAGUE LANGUAGE: Unclear or ambiguous terms
  2. UNUSUAL PROVISIONS: Non-standard clauses
  3. RISK FACTORS: Provisions that could cause disputes
  4. MISSING PROTECTIONS: Standard protections that are absent
  
  For each risk, provide:
  - Risk description
  - Severity level (Low/Medium/High/Critical)
  - Potential consequences
  - Recommended mitigation
  - Common disputes this might cause
  
  Return as structured JSON with risk categories and recommendations.`
}

// Helper function to log progress with detailed error info
const logProgress = (step: string, details?: any, sessionId?: string) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${step}`, details ? JSON.stringify(details, null, 2) : '')
  
  // Emit real-time progress if sessionId provided
  if (sessionId) {
    emitProgress(sessionId, step, 'active', details)
  }
}

const logProgressCompleted = (step: string, details?: any, sessionId?: string) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${step}`, details ? JSON.stringify(details, null, 2) : '')
  
  // Emit completion progress if sessionId provided
  if (sessionId) {
    emitProgress(sessionId, step, 'completed', details)
  }
}

// Helper function to handle errors with detailed logging
const handleError = (error: any, context: string) => {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] ERROR in ${context}:`, {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    name: error?.name,
    cause: error?.cause
  })
  
  return {
    error: error?.message || 'Unknown error occurred',
    context,
    timestamp
  }
}

export async function POST(request: NextRequest) {
  let sessionId = ''
  
  try {
    // Check if Gemini API key is set
    if (!process.env.GEMINI_API_KEY) {
      const error = 'GEMINI_API_KEY is not set in environment variables'
      console.error(error)
      return NextResponse.json(handleError(new Error(error), 'API Configuration'), { status: 500 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get current user
    logProgress('Getting user authentication', undefined, sessionId)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      return NextResponse.json(handleError(userError, 'User Authentication'), { status: 401 })
    }
    
    if (!user) {
      const error = new Error('No authenticated user found')
      return NextResponse.json(handleError(error, 'User Authentication'), { status: 401 })
    }

    logProgressCompleted('User authenticated successfully', { userId: user.id }, sessionId)

    // Parse form data
    const formData = await request.formData()
    sessionId = (formData.get('sessionId') as string) || `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    logProgress('Parsing form data...', undefined, sessionId)
    const file = formData.get('file') as File
    const leaseType = formData.get('leaseType') as string || 'solar'
    const analysisModes = (formData.get('analysisModes') as string || 'standard').split(',')
    
    logProgressCompleted('Form data parsed successfully', {
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      leaseType,
      analysisModes
    }, sessionId)
    
    if (!file) {
      const error = new Error('No file was provided in the request')
      return NextResponse.json(handleError(error, 'File Validation'), { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      const error = new Error(`Invalid file type: ${file.type}. Only PDF files are allowed.`)
      return NextResponse.json(handleError(error, 'File Validation'), { status: 400 })
    }

    // Check file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      const error = new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed size is 50MB.`)
      return NextResponse.json(handleError(error, 'File Validation'), { status: 400 })
    }

    // Convert file to buffer for processing
    logProgress('Converting file to buffer...', undefined, sessionId)
    let fileBuffer: ArrayBuffer
    try {
      fileBuffer = await file.arrayBuffer()
    } catch (bufferError) {
      if (sessionId) emitProgress(sessionId, 'Converting file to buffer', 'error', handleError(bufferError, 'File Buffer Conversion'))
      return NextResponse.json(handleError(bufferError, 'File Buffer Conversion'), { status: 400 })
    }
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    logProgressCompleted('File converted to buffer', undefined, sessionId)
    
    // Upload to Supabase Storage
    logProgress('Uploading to storage...', { fileName, fileSize: file.size }, sessionId)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      if (sessionId) emitProgress(sessionId, 'Uploading to storage', 'error', handleError(uploadError, 'File Upload to Storage'))
      return NextResponse.json(handleError(uploadError, 'File Upload to Storage'), { status: 500 })
    }

    logProgressCompleted('File uploaded successfully to storage', { path: uploadData.path }, sessionId)

    // Extract text from PDF using Gemini
    logProgress('Extracting text with Gemini...', { model: 'gemini-2.5-flash' }, sessionId)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    let extractedText = ''
    try {
      const textResult = await model.generateContent([
        'Extract all text content from this PDF document. Return only the text content, no additional formatting or comments.',
        {
          inlineData: {
            data: Buffer.from(fileBuffer).toString('base64'),
            mimeType: file.type
          }
        }
      ])
      extractedText = textResult.response.text()
      logProgressCompleted('Text extracted successfully', { textLength: extractedText.length }, sessionId)
    } catch (geminiError) {
      const errorInfo = handleError(geminiError, 'Gemini Text Extraction')
      if (sessionId) emitProgress(sessionId, 'Extracting text with Gemini', 'error', errorInfo)
      console.error('Gemini text extraction failed, continuing with limited functionality')
      extractedText = `Text extraction failed: ${errorInfo.error}`
    }
    
    // Perform analysis based on selected modes
    logProgress('Starting analysis...', { modes: analysisModes, leaseType }, sessionId)
    const analysisResults: any = {}
    
    // Check if we have valid text to analyze
    if (extractedText === 'Text extraction failed' || extractedText.length < 100) {
      const error = new Error('Insufficient text content extracted from PDF for analysis')
      return NextResponse.json(handleError(error, 'Text Analysis Prerequisite'), { status: 400 })
    }
    
    // Perform analysis for each selected mode
    for (const mode of analysisModes) {
      if (LEASE_ANALYSIS_PROMPTS[mode as keyof typeof LEASE_ANALYSIS_PROMPTS]) {
        try {
          const prompt = LEASE_ANALYSIS_PROMPTS[mode as keyof typeof LEASE_ANALYSIS_PROMPTS]
          const contextualPrompt = `${prompt}\n\nLease Type: ${leaseType}\n\nDocument Content:\n${extractedText.substring(0, 8000)}` // Increased limit
          
          logProgress(`Running ${mode} analysis...`, undefined, sessionId)
          const analysisResult = await model.generateContent(contextualPrompt)
          
          const analysisText = analysisResult.response.text()
          analysisResults[mode] = analysisText
          logProgressCompleted(`${mode} analysis completed`, undefined, sessionId)
        } catch (analysisError) {
          const errorInfo = handleError(analysisError, `${mode} Analysis`)
          if (sessionId) emitProgress(sessionId, `Running ${mode} analysis`, 'error', errorInfo)
          analysisResults[mode] = {
            error: true,
            message: errorInfo.error,
            timestamp: errorInfo.timestamp
          }
          logProgress(`${mode} analysis failed`, errorInfo)
        }
      } else {
        logProgress(`Skipping unknown analysis mode: ${mode}`)
      }
    }

    logProgress('Analysis completed, saving to database...', { 
      resultsCount: Object.keys(analysisResults).length,
      modesProcessed: Object.keys(analysisResults)
    }, sessionId)

    // Save file metadata to database
    const { data: fileData, error: dbError } = await supabase
      .from('user_files')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        processed: true,
        extracted_text: extractedText,
        analysis_results: analysisResults,
        lease_type: leaseType,
        analysis_modes: analysisModes
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json(handleError(dbError, 'Database Save'), { status: 500 })
    }

    logProgressCompleted('Upload and analysis completed successfully', { fileId: fileData.id }, sessionId)

    return NextResponse.json({
      message: 'File uploaded and analyzed successfully',
      file: fileData,
      analysis: analysisResults,
      sessionId // Return sessionId for frontend to stop listening
    })

  } catch (error) {
    const errorInfo = handleError(error, 'Upload Process')
    return NextResponse.json({
      ...errorInfo,
      message: 'An unexpected error occurred during upload and analysis'
    }, { status: 500 })
  }
}