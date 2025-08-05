import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface TechnicalObligation {
  party: string
  description: string
  timeline: string
  enforceability: string
  phase: string
  consequence?: string
  category?: string
}

const OBLIGATIONS_EXTRACTION_PROMPT = `
You are a legal expert specializing in lease agreements. Your task is to extract and structure technical obligations from the provided lease document text for CSV export.

Analyze the document and extract ALL technical obligations, focusing on:

1. **PARTY OBLIGATIONS**: Who is responsible (Lessor, Lessee, Third Party)
2. **PHASE CLASSIFICATION**: When the obligation applies
   - GENERAL: Basic terms and ongoing obligations
   - DEVELOPMENT: Pre-construction, permits, approvals
   - CONSTRUCTION: Building, installation, completion
   - OPERATIONAL: Operations, maintenance, ongoing duties

3. **DETAILED EXTRACTION**: For each obligation, provide:
   - **party**: Who is responsible (Lessor/Lessee/Third Party)
   - **description**: Clear, detailed description of the obligation (keep concise for CSV)
   - **timeline**: When it's due or triggered (specific dates or triggers)
   - **enforceability**: Level of enforcement (Mandatory/Optional/Conditional)
   - **phase**: Which project phase it applies to (GENERAL/DEVELOPMENT/CONSTRUCTION/OPERATIONAL)
   - **consequence**: What happens if not fulfilled (be specific)
   - **category**: Type of obligation (Payment/Maintenance/Compliance/Insurance/Environmental/Construction/Other)

Focus on extracting obligations related to:
- Construction and development requirements
- Maintenance and operational duties
- Compliance and regulatory obligations
- Financial obligations and payments
- Environmental responsibilities
- Insurance and liability requirements
- Termination and renewal conditions

IMPORTANT: Return ONLY a valid JSON array of obligation objects. Do not include any markdown formatting, explanations, or additional text. Each object must have exactly these fields: party, description, timeline, enforceability, phase, consequence, category.

If no obligations are found, return an empty array: []

Document text to analyze:
`

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params before using
    const { id } = await params

    // Get the document
    const { data: document, error: docError } = await supabase
      .from('user_files')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if we have a valid API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    // Get document text (either from processed content or re-extract from file)
    let documentText = ''
    
    if (document.file_content) {
      documentText = document.file_content
    } else {
      // Download and extract text from the stored file
      const { data: fileData, error: fileError } = await supabase.storage
        .from('documents')
        .download(document.file_path)
      
      if (fileError) {
        return NextResponse.json({ error: 'Failed to access document' }, { status: 500 })
      }

      // For now, use existing analysis results if available
      if (document.analysis_results) {
        documentText = JSON.stringify(document.analysis_results, null, 2)
      } else {
        return NextResponse.json({ error: 'Document not processed yet' }, { status: 400 })
      }
    }

    // Create the full prompt
    const fullPrompt = OBLIGATIONS_EXTRACTION_PROMPT + documentText

    // Generate technical obligations using Gemini
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    let obligationsText = response.text()

    // Clean up the response to extract JSON
    obligationsText = obligationsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // Remove any leading/trailing non-JSON content
    const jsonStart = obligationsText.indexOf('[')
    const jsonEnd = obligationsText.lastIndexOf(']')
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      obligationsText = obligationsText.substring(jsonStart, jsonEnd + 1)
    }
    
    let obligations: TechnicalObligation[]
    try {
      obligations = JSON.parse(obligationsText)
      console.log('Successfully parsed obligations:', obligations.length)
    } catch (parseError) {
      console.error('Failed to parse obligations JSON:', parseError)
      console.error('Raw response:', obligationsText)
      
      // Fallback to existing analysis results if AI parsing fails
      if (document.analysis_results && document.analysis_results.obligations) {
        obligations = document.analysis_results.obligations
        console.log('Using existing obligations from analysis_results:', obligations.length)
      } else {
        return NextResponse.json({ 
          error: 'Failed to extract obligations', 
          details: 'Could not parse AI response as JSON',
          rawResponse: obligationsText.substring(0, 500) // First 500 chars for debugging
        }, { status: 500 })
      }
    }

    // Ensure obligations is an array
    if (!Array.isArray(obligations)) {
      obligations = []
    }

    // If no obligations found, return informative message
    if (obligations.length === 0) {
      console.log('No obligations found, creating sample data')
      obligations = [{
        party: 'N/A',
        description: 'No technical obligations found in this document',
        timeline: 'N/A',
        enforceability: 'N/A',
        phase: 'GENERAL',
        consequence: 'N/A',
        category: 'Information'
      }]
    }

    // Convert to CSV format
    const csvHeaders = [
      'Document Name',
      'Party',
      'Description',
      'Timeline',
      'Enforceability',
      'Phase',
      'Consequence',
      'Category',
      'Lease Type',
      'Upload Date'
    ]

    const csvRows = obligations.map(obligation => [
      document.file_name || '',
      obligation.party || '',
      obligation.description || '',
      obligation.timeline || '',
      obligation.enforceability || '',
      obligation.phase || '',
      obligation.consequence || '',
      obligation.category || '',
      document.lease_type || '',
      new Date(document.created_at).toLocaleDateString()
    ])

    // Escape and format CSV content
    const formatCSVField = (field: string) => {
      const stringField = String(field || '')
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`
      }
      return stringField
    }

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(formatCSVField).join(','))
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${document.file_name.replace(/\.[^/.]+$/, '')}-technical-obligations.csv"`
      }
    })

  } catch (error) {
    console.error('Error exporting obligations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}