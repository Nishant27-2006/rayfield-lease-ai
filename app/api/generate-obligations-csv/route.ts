import { NextRequest, NextResponse } from 'next/server'
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
You are a legal expert specializing in lease agreements. Your task is to extract and structure technical obligations from the provided lease document analysis text for CSV export.

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

Document analysis text to analyze:
`

export async function POST(request: NextRequest) {
  try {
    const { humanReadableText, fileName, leaseType } = await request.json()

    if (!humanReadableText) {
      return NextResponse.json({ error: 'No analysis text provided' }, { status: 400 })
    }

    // Check if we have a valid API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // Create the full prompt
    const fullPrompt = OBLIGATIONS_EXTRACTION_PROMPT + humanReadableText

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
      
      // Return a sample obligation if parsing fails
      obligations = [{
        party: 'N/A',
        description: 'Failed to extract obligations from document analysis',
        timeline: 'N/A',
        enforceability: 'N/A',
        phase: 'GENERAL',
        consequence: 'N/A',
        category: 'Information'
      }]
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
      'Generated Date'
    ]

    const csvRows = obligations.map(obligation => [
      fileName || 'Unknown Document',
      obligation.party || '',
      obligation.description || '',
      obligation.timeline || '',
      obligation.enforceability || '',
      obligation.phase || '',
      obligation.consequence || '',
      obligation.category || '',
      leaseType || '',
      new Date().toLocaleDateString()
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

    // Return CSV content as JSON so the frontend can handle the download
    return NextResponse.json({
      csvContent,
      fileName: `${fileName?.replace(/\.[^/.]+$/, '') || 'document'}-technical-obligations.csv`,
      obligationsCount: obligations.length
    })

  } catch (error) {
    console.error('Error generating obligations CSV:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}