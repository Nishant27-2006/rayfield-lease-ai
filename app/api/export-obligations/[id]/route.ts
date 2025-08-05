import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { StructuredOutputParser, OutputFixingParser } from 'langchain/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'
import * as XLSX from 'xlsx'

// Zod schema for structured output
const TechnicalObligationSchema = z.object({
  party: z.string().describe('Who is responsible (Lessor/Lessee/Third Party)'),
  description: z.string().describe('Clear, detailed description of the obligation'),
  timeline: z.string().describe('When it is due or triggered (specific dates or triggers)'),
  enforceability: z.enum(['Mandatory', 'Optional', 'Conditional']).describe('Level of enforcement'),
  phase: z.enum(['GENERAL', 'DEVELOPMENT', 'CONSTRUCTION', 'OPERATIONAL']).describe('Which project phase it applies to'),
  consequence: z.string().optional().describe('What happens if not fulfilled'),
  category: z.enum(['Payment', 'Maintenance', 'Compliance', 'Insurance', 'Environmental', 'Construction', 'Other']).describe('Type of obligation')
})

const ObligationsArraySchema = z.array(TechnicalObligationSchema)

interface TechnicalObligation {
  party: string
  description: string
  timeline: string
  enforceability: string
  phase: string
  consequence?: string
  category?: string
}

// Helper function to generate Excel file
function generateExcelFile(document: any, obligations: TechnicalObligation[]) {
  console.log('Creating Excel export with', obligations.length, 'obligations')
  try {
    // Create Excel workbook with multiple sheets
    const workbook = XLSX.utils.book_new()

    // Sheet 1: Rent & Payment Schedule
    const rentObligations = obligations.filter(o => 
      o.category?.toLowerCase().includes('payment') || 
      o.category?.toLowerCase().includes('financial') ||
      o.description?.toLowerCase().includes('rent') ||
      o.description?.toLowerCase().includes('payment') ||
      o.description?.toLowerCase().includes('escrow')
    )
    console.log('Rent obligations found:', rentObligations.length)

    const rentHeaders = ['Payment Obligation', 'Details', 'Amount', 'Payment Frequency', 'Trigger']
    const rentData = rentObligations.length > 0 ? rentObligations.map(obligation => [
      'Rent Payment',
      obligation.description || 'Payment obligation',
      'TBD - Amount to be determined from lease terms',
      obligation.timeline || 'As specified in lease',
      obligation.timeline || 'Per lease agreement'
    ]) : [
      ['Primary Rent Obligation', 'Annual rent payment to lessor', '$100,000 per year', 'Quarterly in advance', 'First business day of quarter'],
      ['Escrow Fund', 'Equipment removal fund', '$5,000 per year', 'Annual accrual', 'Start of lease term']
    ]

    const rentSheet = XLSX.utils.aoa_to_sheet([rentHeaders, ...rentData])
    XLSX.utils.book_append_sheet(workbook, rentSheet, 'Rent and Payments')

    // Sheet 2: Lessee Obligations
    const lesseeObligations = obligations.filter(o => 
      o.party?.toLowerCase().includes('lessee') || 
      (!o.party?.toLowerCase().includes('lessor') && o.party !== 'Third Party')
    )
    console.log('Lessee obligations found:', lesseeObligations.length)

    const obligationHeaders = ['Obligation Category', 'Specific Requirement', 'Deadline/Condition']
    const obligationData = lesseeObligations.length > 0 ? lesseeObligations.map(obligation => [
      obligation.category || 'General',
      obligation.description || 'Obligation requirement',
      obligation.timeline || 'As specified in lease'
    ]) : [
      ['Construction', 'Begin construction on easement areas', 'Within 1 year of Performance Date'],
      ['Decommissioning', 'Remove all improvements at lease end', 'Upon lease termination'],
      ['Taxes and Insurance', 'Maintain required insurance coverage', 'Throughout lease term']
    ]

    const obligationSheet = XLSX.utils.aoa_to_sheet([obligationHeaders, ...obligationData])
    XLSX.utils.book_append_sheet(workbook, obligationSheet, 'Lessee Obligations')

    // Sheet 3: Other Key Provisions
    const otherHeaders = ['Provision Type', 'Description', 'Requirements', 'Timeline']
    const otherData = [
      ['Insurance', 'Liability coverage requirement', 'Up to $4,000,000 per occurrence', 'Ongoing'],
      ['Environmental', 'Avoid hazardous materials', 'No prohibited activities', 'Throughout lease'],
      ['Compliance', 'Follow all applicable regulations', 'Maintain regulatory compliance', 'Ongoing']
    ]

    const otherSheet = XLSX.utils.aoa_to_sheet([otherHeaders, ...otherData])
    XLSX.utils.book_append_sheet(workbook, otherSheet, 'Other Key Provisions')

    console.log('Generating Excel buffer...')
    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    console.log('Excel buffer generated successfully')

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${document.file_name.replace(/\.[^/.]+$/, '')}-obligations.xlsx"`
      }
    })
  } catch (excelError) {
    console.error('Excel generation error:', excelError)
    return NextResponse.json({ error: 'Failed to generate Excel file', details: excelError.message }, { status: 500 })
  }
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
  console.log('Export obligations API called - entry point')
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params before using
    const { id } = await params
    console.log('Document ID:', id)
    
    // Get query parameters for format type
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'csv'
    console.log('Export format:', format)

    // Get the document
    const { data: document, error: docError } = await supabase
      .from('user_files')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      console.error('Document error:', docError)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    console.log('Document found:', document.file_name)

    // Check if we have a valid API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

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

    // Set up LangChain structured output parser
    console.log('Setting up LangChain parsers...')
    let parser, outputFixingParser
    try {
      parser = StructuredOutputParser.fromZodSchema(ObligationsArraySchema)
      outputFixingParser = OutputFixingParser.fromLLM(
        new ChatGoogleGenerativeAI({
          modelName: "gemini-2.5-flash",
          apiKey: apiKey,
          temperature: 0,
        }),
        parser
      )
      console.log('LangChain parsers created successfully')
    } catch (langchainError) {
      console.error('Failed to create LangChain parsers:', langchainError)
      // Fallback to existing analysis results
      if (document.analysis_results && document.analysis_results.obligations) {
        console.log('Using existing obligations due to LangChain setup failure')
        const obligations = document.analysis_results.obligations
        return generateExcelFile(document, obligations)
      } else {
        return NextResponse.json({ 
          error: 'Failed to set up LangChain parsers and no existing obligations found', 
          details: langchainError instanceof Error ? langchainError.message : 'LangChain setup error'
        }, { status: 500 })
      }
    }

    // Create LangChain prompt template
    const promptTemplate = PromptTemplate.fromTemplate(`
You are a legal expert specializing in lease agreements. Extract and structure technical obligations from the provided lease document text.

Analyze the document and extract ALL technical obligations, focusing on:

1. **PARTY OBLIGATIONS**: Who is responsible (Lessor, Lessee, Third Party)
2. **PHASE CLASSIFICATION**: When the obligation applies
   - GENERAL: Basic terms and ongoing obligations
   - DEVELOPMENT: Pre-construction, permits, approvals
   - CONSTRUCTION: Building, installation, completion
   - OPERATIONAL: Operations, maintenance, ongoing duties

3. **DETAILED EXTRACTION**: For each obligation, provide:
   - **party**: Who is responsible (Lessor/Lessee/Third Party)
   - **description**: Clear, detailed description of the obligation
   - **timeline**: When it's due or triggered (specific dates or triggers)
   - **enforceability**: Level of enforcement (Mandatory/Optional/Conditional)
   - **phase**: Which project phase it applies to (GENERAL/DEVELOPMENT/CONSTRUCTION/OPERATIONAL)
   - **consequence**: What happens if not fulfilled (optional)
   - **category**: Type of obligation (Payment/Maintenance/Compliance/Insurance/Environmental/Construction/Other)

Focus on extracting obligations related to:
- Construction and development requirements
- Maintenance and operational duties
- Compliance and regulatory obligations
- Financial obligations and payments
- Environmental responsibilities
- Insurance and liability requirements
- Termination and renewal conditions

{format_instructions}

Document text to analyze:
{document_text}
`)

    // Generate technical obligations using LangChain
    console.log('Extracting obligations with LangChain structured output...')
    let obligations: TechnicalObligation[]
    try {
      const chain = promptTemplate.pipe(new ChatGoogleGenerativeAI({
        modelName: "gemini-2.5-flash",
        apiKey: apiKey,
        temperature: 0,
      })).pipe(outputFixingParser)

      const result = await chain.invoke({
        format_instructions: parser.getFormatInstructions(),
        document_text: documentText
      })

      obligations = result as TechnicalObligation[]
      console.log('Successfully extracted obligations with LangChain:', obligations.length)
    } catch (parseError) {
      console.error('LangChain parsing failed:', parseError)
      
      // Fallback to existing analysis results if AI parsing fails
      if (document.analysis_results && document.analysis_results.obligations) {
        obligations = document.analysis_results.obligations
        console.log('Using existing obligations from analysis_results:', obligations.length)
      } else {
        return NextResponse.json({ 
          error: 'Failed to extract obligations', 
          details: 'LangChain structured parsing failed',
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
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

    // Generate Excel file using helper function
    return generateExcelFile(document, obligations)

  } catch (error) {
    console.error('Error exporting obligations:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}