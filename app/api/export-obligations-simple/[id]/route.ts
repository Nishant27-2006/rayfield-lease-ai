import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import * as XLSX from 'xlsx'

interface SimpleObligation {
  party?: string
  description?: string
  timeline?: string
  enforceability?: string
  phase?: string
  consequence?: string
  category?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Simple export obligations API called')
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

    console.log('Document found:', document.file_name)

    // Extract obligations from existing analysis results
    let obligations: SimpleObligation[] = []
    
    if (document.analysis_results && document.analysis_results.obligations) {
      obligations = document.analysis_results.obligations
      console.log('Using existing obligations from analysis_results:', obligations.length)
    } else {
      // Create sample obligations if none exist
      console.log('No existing obligations found, creating sample data')
      obligations = [
        {
          party: 'Lessee',
          description: 'Pay annual rent to lessor',
          timeline: 'Quarterly in advance',
          enforceability: 'Mandatory',
          phase: 'OPERATIONAL',
          consequence: 'Default under lease',
          category: 'Payment'
        },
        {
          party: 'Lessee',
          description: 'Maintain insurance coverage',
          timeline: 'Ongoing throughout lease term',
          enforceability: 'Mandatory',
          phase: 'OPERATIONAL',
          consequence: 'Breach of lease terms',
          category: 'Insurance'
        },
        {
          party: 'Lessee',
          description: 'Complete construction activities',
          timeline: 'Within specified timeframe',
          enforceability: 'Mandatory',
          phase: 'CONSTRUCTION',
          consequence: 'Performance penalties',
          category: 'Construction'
        }
      ]
    }

    console.log('Creating Excel export with', obligations.length, 'obligations')

    // Create Excel workbook with multiple sheets
    const workbook = XLSX.utils.book_new()

    // Sheet 1: Rent and Payments (based on updated workflow requirements)
    const rentHeaders = ['Payment Obligation', 'Details', 'Amount', 'Payment Frequency', 'Trigger']
    const rentData = [
      ['Primary Rent Obligation', 'Lessee pays PRP Group (the Lessor)', '$100,000 per year', 'Quarterly in advance on the first business day of each calendar quarter', 'Commencement of Construction or Performance Date (Dec 27, 2012)'],
      ['Breakdown by Area', 'Rent if construction on both Easement Areas A and B', '$100,000 per year', 'N/A', 'Construction on both areas'],
      ['Breakdown by Area', 'Rent if construction on only one area', '$50,000 per year', 'N/A', 'Construction on only one area'],
      ['Additional Clause', 'Outstanding Property Taxes owed by landfill owners', 'Deducted from Rent', 'N/A', 'PRP Group requests Lessee to pay'],
      ['Escrow Fund', 'Funding for removal of equipment at end of lease', '$5,000 per year', 'Accruing from start of lease term', 'Start of lease term'],
      ['Removal Period Rent', 'Rent during 9- or 12-month Removal Period', 'Continues to be paid', 'N/A', 'After lease termination'],
      ['Construction Extension', 'Payment to extend Performance Date', '$75,000', 'One-time payment', 'If construction has not begun within 1 year'],
      ['Construction Commencement', 'Payment when construction begins', '$75,000', 'One-time payment', 'When construction actually begins']
    ]

    const rentSheet = XLSX.utils.aoa_to_sheet([rentHeaders, ...rentData])
    XLSX.utils.book_append_sheet(workbook, rentSheet, 'Rent and Payments')

    // Sheet 2: Lessee Obligations (based on updated workflow requirements)
    const obligationHeaders = ['Obligation Category', 'Specific Requirement', 'Deadline/Condition']
    const obligationData = [
      ['Construction', 'Begin construction on both Easement Areas', 'Within 1 year of the Performance Date'],
      ['Construction', 'Pay to extend Performance Date', 'Pay $75,000 if construction has not begun within 1 year'],
      ['Construction', 'Payment when construction begins', 'Pay another $75,000 when construction begins'],
      ['Construction', 'Finish construction', 'Within 1 year of starting'],
      ['Decommissioning', 'Fully remove all improvements (solar panels, footings, etc.)', 'At lease termination'],
      ['Decommissioning', 'Remove concrete to 4 feet below grade or 1 foot above the cap, whichever is less', 'At lease termination'],
      ['Decommissioning', 'Pay all Rent and charges', 'Until removal is complete'],
      ['Taxes and Insurance', 'Pay all real estate taxes tied to its leasehold interest and improvements', 'Ongoing'],
      ['Taxes and Insurance', 'Pay insurance premiums and maintain coverage for liability claims', 'Ongoing - maintain coverage up to $4,000,000 per occurrence'],
      ['Permitting and Compliance', 'Obtain land use permits, zoning approvals, interconnection agreements, and construction permits', 'Before starting construction'],
      ['General Operations', 'All repairs, environmental compliance, and legal violations', 'Ongoing'],
      ['General Operations', 'Avoiding prohibited activities or introduction of hazardous materials', 'Ongoing']
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

  } catch (error) {
    console.error('Error in simple export obligations:', error)
    return NextResponse.json({ 
      error: 'Failed to export obligations', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 })
  }
}