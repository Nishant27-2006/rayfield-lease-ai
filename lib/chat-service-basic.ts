import { GoogleGenerativeAI } from '@google/generative-ai'

// Real chat service implementation with Gemini
export class ChatService {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor() {
    // Initialize Gemini model
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.3,
      },
    })
  }

  async chatWithDocument(
    sessionId: string,
    fileId: string, 
    message: string,
    extractedText: string,
    analysisResults?: any
  ): Promise<string> {
    try {
      // Build context from document analysis
      const analysisContext = this.extractAnalysisContext(analysisResults)
      
      // Create system prompt for lease document analysis
      const systemPrompt = `You are an expert lease analysis AI assistant. You help users understand lease documents by providing clear, accurate, and actionable insights.

Your role is to:
- Analyze lease documents and their extracted text
- Provide insights based on document analysis results
- Answer questions about specific clauses, risks, obligations, and timelines
- Give practical advice about lease terms and implications
- Be helpful, professional, and accurate in your responses

When responding:
- Always base your answers on the provided document text and analysis
- Be specific and reference relevant clauses or sections when possible
- Explain legal terms in simple language
- Highlight important risks or considerations
- Provide actionable insights when appropriate

Document Context:
${analysisContext}

Document Text (for reference):
${extractedText.substring(0, 2000)}${extractedText.length > 2000 ? '...' : ''}

Remember: Only answer based on the information provided in the document and analysis. If something is not covered in the document, say so clearly.`

      // Create the full prompt
      const fullPrompt = `${systemPrompt}\n\nUser Question: ${message}`

      // Get response from Gemini
      const result = await this.model.generateContent(fullPrompt)
      const response = await result.response
      return response.text()

    } catch (error) {
      console.error('Error in chatWithDocument:', error)
      return `I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  async chatWithProject(
    sessionId: string,
    projectId: string,
    fileIds: string[],
    message: string,
    documentsData?: any[]
  ): Promise<string> {
    try {
      // Build context from multiple documents
      const multiDocContext = this.extractMultiDocumentContext(documentsData)
      
      // Check if this is a summarization request
      const isSummarizationRequest = this.isSummarizationQuery(message)
      
      let systemPrompt = ''
      
      if (isSummarizationRequest) {
        // Enhanced summarization prompt with LangChain-style context
        systemPrompt = `You are an expert lease portfolio analysis AI assistant specialized in document summarization and comparative analysis. You help users understand and summarize multiple lease documents by providing comprehensive insights across their document collection.

Your role is to:
- Provide comprehensive summaries of multiple lease documents
- Extract key insights and patterns across the portfolio
- Identify common themes, risks, and opportunities
- Compare and contrast different lease terms and conditions
- Highlight critical obligations, deadlines, and renewal terms
- Provide actionable recommendations based on portfolio analysis

When summarizing documents:
- Start with a high-level portfolio overview
- Break down analysis by key categories (risks, obligations, terms, etc.)
- Provide specific examples and references to documents
- Highlight similarities and differences between documents
- Identify potential conflicts or inconsistencies
- Give portfolio-level strategic recommendations
- Use clear, structured formatting with bullet points and sections

Portfolio Context:
${multiDocContext}

Document Collection Summary:
${documentsData?.map((doc, index) => 
  `${index + 1}. ${doc.file_name} (${doc.lease_type || 'Unknown type'}) - ${doc.analysis_results ? 'Analyzed' : 'Not analyzed'}`
).join('\n') || 'No document details available'}

Available Document Details:
${this.extractDetailedDocumentContent(documentsData)}

Remember: Provide a comprehensive summary that covers all aspects of the document portfolio. Structure your response with clear sections and actionable insights.`
      } else {
        // Standard multi-document analysis prompt
        systemPrompt = `You are an expert lease portfolio analysis AI assistant. You help users understand and compare multiple lease documents by providing comprehensive insights across their document collection.

Your role is to:
- Analyze patterns and trends across multiple lease documents
- Compare clauses, terms, and conditions between different leases
- Identify common risks, obligations, and opportunities
- Provide portfolio-level insights and recommendations
- Answer questions about relationships between different documents

When responding:
- Consider all documents in the portfolio when answering
- Highlight similarities and differences between documents
- Identify potential conflicts or inconsistencies
- Provide comparative analysis when relevant
- Give portfolio-level recommendations when appropriate

Portfolio Context:
${multiDocContext}

Document Collection Summary:
${documentsData?.map((doc, index) => 
  `${index + 1}. ${doc.file_name} (${doc.lease_type || 'Unknown type'}) - ${doc.analysis_results ? 'Analyzed' : 'Not analyzed'}`
).join('\n') || 'No document details available'}

Remember: Base your answers on the provided document collection. If you need specific document content to answer a question, ask the user to reference the specific document.`
      }

      // Create the full prompt
      const fullPrompt = `${systemPrompt}\n\nUser Question: ${message}`

      // Get response from Gemini
      const result = await this.model.generateContent(fullPrompt)
      const response = await result.response
      return response.text()

    } catch (error) {
      console.error('Error in chatWithProject:', error)
      return `I apologize, but I encountered an error while processing your portfolio analysis request. Please try again or contact support if the issue persists. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  private extractAnalysisContext(analysisResults: any): string {
    let context = ''
    
    try {
      if (!analysisResults) {
        return 'No analysis results available for this document.'
      }

      // Extract key information from different analysis modes
      if (analysisResults.standard) {
        const phases = Object.keys(analysisResults.standard)
        context += `\n- Analysis covers ${phases.length} phases: ${phases.join(', ')}`
        
        // Add specific clause information
        Object.entries(analysisResults.standard).forEach(([phase, clauses]: [string, any]) => {
          if (Array.isArray(clauses) && clauses.length > 0) {
            context += `\n- ${phase}: ${clauses.length} clauses identified`
          }
        })
      }
      
      if (analysisResults.legal?.risks) {
        const highRisks = analysisResults.legal.risks.filter((r: any) => r.severity === 'High' || r.severity === 'Critical')
        const mediumRisks = analysisResults.legal.risks.filter((r: any) => r.severity === 'Medium')
        if (highRisks.length > 0) {
          context += `\n- High/Critical Risks: ${highRisks.length} items`
        }
        if (mediumRisks.length > 0) {
          context += `\n- Medium Risks: ${mediumRisks.length} items`
        }
      }
      
      if (analysisResults.renewal?.timeline) {
        context += `\n- Timeline Events: ${analysisResults.renewal.timeline.length} events tracked`
      }
      
      if (analysisResults.obligations?.obligations) {
        context += `\n- Obligations: ${analysisResults.obligations.obligations.length} obligations mapped`
      }
      
      if (analysisResults.redlining) {
        const { additions = [], removals = [], modifications = [] } = analysisResults.redlining
        context += `\n- Redlining Changes: ${additions.length} additions, ${removals.length} removals, ${modifications.length} modifications`
      }

      // Add lease type if available
      if (analysisResults.lease_type) {
        context += `\n- Lease Type: ${analysisResults.lease_type}`
      }

    } catch (error) {
      console.error('Error extracting analysis context:', error)
      context = 'Analysis data available but format may be incomplete.'
    }
    
    return context || 'Analysis data is available for detailed questions.'
  }

  private extractMultiDocumentContext(documentsData: any[]): string {
    let context = ''
    
    try {
      if (!documentsData || documentsData.length === 0) {
        return 'No documents available for portfolio analysis.'
      }

      const totalDocs = documentsData.length
      let totalClauses = 0
      let totalRisks = 0
      let leaseTypes: string[] = []
      let analysisModes: string[] = []
      
      documentsData.forEach((doc) => {
        // Collect lease types
        if (doc.lease_type && !leaseTypes.includes(doc.lease_type)) {
          leaseTypes.push(doc.lease_type)
        }
        
        // Collect analysis modes
        if (doc.analysis_modes) {
          doc.analysis_modes.forEach((mode: string) => {
            if (!analysisModes.includes(mode)) {
              analysisModes.push(mode)
            }
          })
        }
        
        // Count clauses and risks across all documents
        if (doc.analysis_results) {
          // Count standard clauses
          if (doc.analysis_results.standard) {
            Object.values(doc.analysis_results.standard).forEach((phaseData: any) => {
              if (Array.isArray(phaseData)) {
                totalClauses += phaseData.length
              }
            })
          }
          
          // Count legal risks
          if (doc.analysis_results.legal?.risks) {
            totalRisks += doc.analysis_results.legal.risks.length
          }
        }
      })
      
      context = `
Portfolio Overview:
- Total Documents: ${totalDocs}
- Lease Types: ${leaseTypes.length > 0 ? leaseTypes.join(', ') : 'Various'}
- Analysis Coverage: ${analysisModes.length > 0 ? analysisModes.join(', ') : 'Standard analysis'}
- Total Clauses Extracted: ${totalClauses}
- Total Risk Items: ${totalRisks}
- Document Files: ${documentsData.map(d => d.file_name).join(', ')}`
      
    } catch (error) {
      console.error('Error extracting multi-document context:', error)
      context = 'Multi-document analysis data available but format may be incomplete.'
    }
    
    return context || 'Multi-document analysis data is available for portfolio-level insights.'
  }

  private isSummarizationQuery(message: string): boolean {
    const summarizationKeywords = [
      'summarize', 'summary', 'overview', 'analyze all', 'all documents',
      'compare all', 'what are the', 'common', 'patterns', 'trends',
      'across all', 'portfolio', 'overall', 'key insights', 'main points',
      'highlight', 'breakdown', 'comprehensive', 'full analysis'
    ]
    
    const lowerMessage = message.toLowerCase()
    return summarizationKeywords.some(keyword => lowerMessage.includes(keyword))
  }

  private extractDetailedDocumentContent(documentsData: any[]): string {
    if (!documentsData || documentsData.length === 0) {
      return 'No detailed document content available.'
    }

    let content = ''
    
    documentsData.forEach((doc, index) => {
      content += `\n\n--- Document ${index + 1}: ${doc.file_name} ---\n`
      
      // Add lease type
      if (doc.lease_type) {
        content += `Lease Type: ${doc.lease_type}\n`
      }
      
      // Add key analysis results
      if (doc.analysis_results) {
        // Extract key risks
        if (doc.analysis_results.legal?.risks) {
          const highRisks = doc.analysis_results.legal.risks.filter((r: any) => 
            r.severity === 'High' || r.severity === 'Critical'
          )
          if (highRisks.length > 0) {
            content += `Key Risks: ${highRisks.map((r: any) => r.risk_type || r.title).join(', ')}\n`
          }
        }
        
        // Extract key obligations
        if (doc.analysis_results.obligations?.obligations) {
          const keyObligations = doc.analysis_results.obligations.obligations.slice(0, 3)
          if (keyObligations.length > 0) {
            content += `Key Obligations: ${keyObligations.map((o: any) => o.obligation_type || o.title).join(', ')}\n`
          }
        }
        
        // Extract renewal information
        if (doc.analysis_results.renewal?.timeline) {
          const renewalEvents = doc.analysis_results.renewal.timeline.slice(0, 2)
          if (renewalEvents.length > 0) {
            content += `Renewal Timeline: ${renewalEvents.map((e: any) => e.event_type || e.title).join(', ')}\n`
          }
        }
        
        // Extract standard analysis phases
        if (doc.analysis_results.standard) {
          const phases = Object.keys(doc.analysis_results.standard)
          content += `Analysis Phases: ${phases.join(', ')}\n`
        }
      }
      
      // Add excerpt from document text
      if (doc.extracted_text) {
        const excerpt = doc.extracted_text.substring(0, 500)
        content += `Document Excerpt: ${excerpt}${doc.extracted_text.length > 500 ? '...' : ''}\n`
      }
    })
    
    return content
  }
}

export const chatService = new ChatService()