import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { analysisResults, fileName, leaseType, analysisModes } = await request.json()
    
    if (!analysisResults) {
      return NextResponse.json({ error: 'Analysis results are required' }, { status: 400 })
    }

    // Create a comprehensive prompt for Gemini to convert JSON to human-readable text
    const prompt = `
You are a professional lease analysis expert. Convert the following JSON analysis results into a comprehensive, human-readable report that a business professional could easily understand and share.

File Name: ${fileName}
Lease Type: ${leaseType}
Analysis Modes: ${analysisModes.join(', ')}

Analysis Results (JSON):
${JSON.stringify(analysisResults, null, 2)}

Please create a professional report with the following structure:

# LEASE ANALYSIS REPORT

## Executive Summary
Provide a brief overview of the key findings and recommendations.

## Document Information
- File Name: [filename]
- Lease Type: [type]
- Analysis Date: [current date]
- Analysis Modes: [modes used]

## Detailed Analysis

For each analysis mode, create clear sections with:
- Section heading
- Key findings in bullet points
- Important details
- Recommendations or risk assessments where applicable

## Key Terms and Clauses
Summarize the most important lease terms and clauses identified.

## Risk Assessment
Highlight any risks, unusual clauses, or areas requiring attention.

## Recommendations
Provide actionable recommendations based on the analysis.

## Timeline and Important Dates
List any critical dates, deadlines, or renewal periods.

Please format this as professional, clear text that could be printed and shared in a business meeting. Use proper headings, bullet points, and clear language. Avoid JSON structure and technical jargon - make it accessible to business professionals.
    `

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    const humanReadableText = result.response.text()

    return NextResponse.json({
      success: true,
      humanReadableText,
      metadata: {
        fileName,
        leaseType,
        analysisModes,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Convert to text error:', error)
    return NextResponse.json({ 
      error: 'Failed to convert analysis to readable text',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}