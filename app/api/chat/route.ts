import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { chatService } from '@/lib/chat-service-basic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'AI service is not configured. Please contact support.' 
      }, { status: 500 })
    }

    const { message, fileId, sessionId, projectId, fileIds } = await request.json()
    
    if (!message || (!fileId && !projectId)) {
      return NextResponse.json({ error: 'Message and either file ID or project ID are required' }, { status: 400 })
    }

    // Get file data for single document chat or project files
    let fileData = null
    let projectFiles = []
    
    if (fileId) {
      // Single document chat
      const { data, error: fileError } = await supabase
        .from('user_files')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single()

      if (fileError || !data) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      fileData = data
    } else if (projectId) {
      // Project-wide chat - get fileIds from session if not provided
      let targetFileIds = fileIds
      
      if (!targetFileIds) {
        // Get fileIds from chat session
        const { data: sessionData, error: sessionError } = await supabase
          .from('chat_sessions')
          .select('file_ids')
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .single()
        
        if (sessionError || !sessionData?.file_ids) {
          return NextResponse.json({ error: 'Session file IDs not found' }, { status: 404 })
        }
        
        targetFileIds = sessionData.file_ids
      }
      
      // Get all documents in the project
      const { data, error: projectError } = await supabase
        .from('user_files')
        .select('*')
        .in('id', targetFileIds)
        .eq('user_id', user.id)

      if (projectError || !data) {
        return NextResponse.json({ error: 'Project files not found' }, { status: 404 })
      }
      projectFiles = data
    }

    // Create or get chat session
    let currentSessionId = sessionId
    if (!currentSessionId) {
      const sessionTitle = fileData 
        ? `Chat about ${fileData.file_name}`
        : `Project chat (${projectFiles.length} documents)`
      
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          file_id: fileId || null,
          project_id: projectId || null,
          title: sessionTitle
        })
        .select()
        .single()

      if (sessionError) {
        return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 })
      }

      currentSessionId = newSession.id
    }

    // Save user message
    const { error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        user_id: user.id,
        content: message,
        role: 'user'
      })

    if (messageError) {
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // Generate response using LangChain chat service
    let response: string

    try {
      if (fileData) {
        // Single document chat - include analysis results if available
        response = await chatService.chatWithDocument(
          currentSessionId,
          fileId,
          message,
          fileData.extracted_text,
          fileData.analysis_results
        )
      } else if (projectId) {
        // Project-wide chat - pass all document data for context
        const targetFileIds = fileIds || projectFiles.map(f => f.id)
        response = await chatService.chatWithProject(
          currentSessionId,
          projectId,
          targetFileIds,
          message,
          projectFiles // Pass full document data for enhanced context
        )
      } else {
        throw new Error('Invalid chat configuration')
      }
    } catch (error) {
      console.error('Chat service error:', error)
      return NextResponse.json({ 
        error: 'Failed to generate AI response. Please try again.' 
      }, { status: 500 })
    }

    // Save assistant response
    const { error: responseError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        user_id: user.id,
        content: response,
        role: 'assistant'
      })

    if (responseError) {
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
    }

    return NextResponse.json({
      message: response,
      sessionId: currentSessionId,
      chatType: fileData ? 'document' : 'project'
    })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}