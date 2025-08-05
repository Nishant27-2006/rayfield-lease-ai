import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { StructuredOutputParser, OutputFixingParser } from 'langchain/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'
import * as XLSX from 'xlsx'

// Zod schemas for structured extraction
const RentPaymentSchema = z.object({
  obligation: z.string().describe('Type of payment obligation'),
  details: z.string().describe('Detailed description of the payment'),
  amount: z.string().describe('Specific amount or formula'),
  frequency: z.string().describe('How often payment is due'),
  trigger: z.string().describe('What triggers this payment obligation')
})

const LesseeObligationSchema = z.object({
  category: z.string().describe('Category of obligation (Construction, Decommissioning, etc.)'),
  requirement: z.string().describe('Specific requirement or task'),
  deadline: z.string().describe('When this must be completed or condition that triggers it')
})

const KeyProvisionSchema = z.object({
  type: z.string().describe('Type of provision (Insurance, Environmental, etc.)'),
  description: z.string().describe('Description of the provision'),
  requirements: z.string().describe('Specific requirements or limits'),
  timeline: z.string().describe('Timeline or duration')
})

const DocumentExtractionSchema = z.object({
  rentPayments: z.array(RentPaymentSchema).describe('All rent and payment obligations found in the document'),
  lesseeObligations: z.array(LesseeObligationSchema).describe('All lessee obligations found in the document'),
  keyProvisions: z.array(KeyProvisionSchema).describe('Other important provisions found in the document'),
  documentSummary: z.object({
    lessor: z.string().describe('Name of the lessor/landowner'),
    lessee: z.string().describe('Name of the lessee/tenant'),
    propertyDescription: z.string().describe('Description of the leased property'),
    leaseStartDate: z.string().describe('Start date of the lease'),
    leaseDuration: z.string().describe('Duration or end date of the lease')
  }).describe('Key document metadata')
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('Dynamic export obligations API called')
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

    console.log('Document found:', {
      id: document.id,
      file_name: document.file_name,
      hasExtractedText: !!document.extracted_text,
      hasFileContent: !!document.file_content,
      hasAnalysisResults: !!document.analysis_results
    })

    // Check if we have a valid API key
    if (!process.env.GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY environment variable not set')
      return NextResponse.json({ error: 'Server configuration error: Missing Google API key' }, { status: 500 })
    }

    // Get document text for analysis
    let documentText = ''
    
    if (document.extracted_text) {
      documentText = document.extracted_text
      console.log('Using extracted_text field')
    } else if (document.file_content) {
      documentText = document.file_content
      console.log('Using file_content field')
    } else if (document.analysis_results) {
      documentText = JSON.stringify(document.analysis_results, null, 2)
      console.log('Using analysis_results as fallback')
    } else {
      return NextResponse.json({ error: 'Document content not available for processing' }, { status: 400 })
    }

    console.log('Document text length:', documentText.length)

    // Set up LangChain structured output parser
    console.log('Setting up LangChain parsers for document extraction...')
    const parser = StructuredOutputParser.fromZodSchema(DocumentExtractionSchema)
    
    // Initialize the model with the API key from environment variables
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash",
      temperature: 0,
    })

    const outputFixingParser = OutputFixingParser.fromLLM(llm, parser)

    // Create comprehensive extraction prompt
    const extractionPrompt = PromptTemplate.fromTemplate(`
You are a legal document expert specializing in lease agreements. Your task is to extract specific information from this lease document to populate an Excel spreadsheet with real data from the document.

Extract the following information from the lease document:

1. **RENT AND PAYMENT OBLIGATIONS**: Find all financial obligations, including:
   - Base rent amounts and payment schedules
   - Additional fees, deposits, or escrow requirements
   - Payment due dates and frequencies
   - Conditions that trigger payments
   - Construction-related payments or penalties

2. **LESSEE OBLIGATIONS**: Find all non-financial obligations of the lessee, including:
   - Construction requirements and timelines
   - Decommissioning and removal obligations
   - Insurance and tax responsibilities
   - Permitting and compliance requirements
   - Operational restrictions and requirements

3. **KEY PROVISIONS**: Find other important contractual provisions, including:
   - Insurance coverage requirements
   - Environmental restrictions
   - Compliance obligations
   - Default conditions and remedies

4. **DOCUMENT METADATA**: Extract key document information:
   - Names of lessor and lessee
   - Property description
   - Lease start date and duration

Be very specific and extract exact amounts, dates, and conditions as they appear in the document. If an amount or date is not specified, note that clearly.

{format_instructions}

LEASE DOCUMENT TEXT:
{document_text}
`)

    console.log('Extracting document data with LangChain...')
    let extractedData
    try {
      const chain = extractionPrompt.pipe(llm).pipe(outputFixingParser)

      extractedData = await chain.invoke({
        format_instructions: parser.getFormatInstructions(),
        document_text: documentText
      })

      console.log('Successfully extracted document data:', {
        rentPayments: extractedData?.rentPayments?.length || 0,
        lesseeObligations: extractedData?.lesseeObligations?.length || 0,
        keyProvisions: extractedData?.keyProvisions?.length || 0,
        hasDocumentSummary: !!extractedData?.documentSummary
      })
    } catch (extractionError) {
      console.error('Document extraction failed:', extractionError)
      console.error('Stack trace:', extractionError instanceof Error ? extractionError.stack : 'No stack trace')
      
      // Create fallback data structure if extraction fails
      extractedData = {
        rentPayments: [{
          obligation: 'Extraction Failed',
          details: 'Unable to extract payment details from document',
          amount: 'Please review document manually',
          frequency: 'N/A',
          trigger: 'N/A'
        }],
        lesseeObligations: [{
          category: 'Extraction Failed',
          requirement: 'Unable to extract obligations from document',
          deadline: 'Please review document manually'
        }],
        keyProvisions: [{
          type: 'Extraction Failed',
          description: 'Unable to extract provisions from document',
          requirements: 'Please review document manually',
          timeline: 'N/A'
        }],
        documentSummary: {
          lessor: 'Not extracted',
          lessee: 'Not extracted', 
          propertyDescription: 'Not extracted',
          leaseStartDate: 'Not extracted',
          leaseDuration: 'Not extracted'
        }
      }
      console.log('Using fallback data structure due to extraction failure')
    }

    // Create Excel workbook with extracted data
    console.log('Creating Excel file with extracted document data...')
    const workbook = XLSX.utils.book_new()

    // Sheet 1: Rent and Payments (populated with actual document data)
    const rentHeaders = ['Payment Obligation', 'Details', 'Amount', 'Payment Frequency', 'Trigger']
    const rentData = extractedData.rentPayments && extractedData.rentPayments.length > 0 
      ? extractedData.rentPayments.map(payment => [
          payment.obligation || 'Payment Obligation',
          payment.details || 'Payment details not specified',
          payment.amount || 'Amount not specified',
          payment.frequency || 'Frequency not specified',
          payment.trigger || 'Trigger not specified'
        ])
      : [['No payment obligations found in document', 'Please review document manually', 'N/A', 'N/A', 'N/A']]

    const rentSheet = XLSX.utils.aoa_to_sheet([rentHeaders, ...rentData])
    XLSX.utils.book_append_sheet(workbook, rentSheet, 'Rent and Payments')

    // Sheet 2: Lessee Obligations (populated with actual document data)
    const obligationHeaders = ['Obligation Category', 'Specific Requirement', 'Deadline/Condition']
    const obligationData = extractedData.lesseeObligations && extractedData.lesseeObligations.length > 0
      ? extractedData.lesseeObligations.map(obligation => [
          obligation.category || 'General Obligation',
          obligation.requirement || 'Requirement not specified',
          obligation.deadline || 'Deadline not specified'
        ])
      : [['No lessee obligations found in document', 'Please review document manually', 'N/A']]

    const obligationSheet = XLSX.utils.aoa_to_sheet([obligationHeaders, ...obligationData])
    XLSX.utils.book_append_sheet(workbook, obligationSheet, 'Lessee Obligations')

    // Sheet 3: Other Key Provisions (populated with actual document data)
    const provisionHeaders = ['Provision Type', 'Description', 'Requirements', 'Timeline']
    const provisionData = extractedData.keyProvisions && extractedData.keyProvisions.length > 0
      ? extractedData.keyProvisions.map(provision => [
          provision.type || 'General Provision',
          provision.description || 'Description not specified',
          provision.requirements || 'Requirements not specified',
          provision.timeline || 'Timeline not specified'
        ])
      : [['No key provisions found in document', 'Please review document manually', 'N/A', 'N/A']]

    const provisionSheet = XLSX.utils.aoa_to_sheet([provisionHeaders, ...provisionData])
    XLSX.utils.book_append_sheet(workbook, provisionSheet, 'Other Key Provisions')

    // Sheet 4: Document Summary
    const summaryHeaders = ['Field', 'Value']
    const summaryData = [
      ['Document Name', document.file_name || 'Unnamed Document'],
      ['Document ID', document.id || 'Unknown'],
      ['Lessor', extractedData.documentSummary?.lessor || 'Not specified'],
      ['Lessee', extractedData.documentSummary?.lessee || 'Not specified'],
      ['Property Description', extractedData.documentSummary?.propertyDescription || 'Not specified'],
      ['Lease Start Date', extractedData.documentSummary?.leaseStartDate || 'Not specified'],
      ['Lease Duration', extractedData.documentSummary?.leaseDuration || 'Not specified'],
      ['Analysis Date', new Date().toLocaleDateString()],
      ['Generated By', 'Rayfield Lease AI - Dynamic Document Extraction']
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryData])
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Document Summary')

    console.log('Generating Excel buffer...')
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    console.log('Excel buffer generated successfully')

    // Generate safe filename
    const safeFileName = document.file_name 
      ? document.file_name.replace(/\.[^/.]+$/, '') 
      : `document-${document.id?.substring(0, 8) || 'unknown'}`
    
    console.log('Generated filename:', `${safeFileName}-extracted-obligations.xlsx`)

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeFileName}-extracted-obligations.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error in dynamic export obligations:', error)
    return NextResponse.json({ 
      error: 'Failed to process document and generate Excel', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 })
  }
}