import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId, title, projectId, fileIds } = await request.json()
    
    if (!fileId && !projectId) {
      return NextResponse.json({ error: 'File ID or Project ID is required' }, { status: 400 })
    }

    // Create new chat session
    const { data: sessionData, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        file_id: fileId || null,
        project_id: projectId || null,
        title: title || 'New Chat Session',
        file_ids: fileIds || null // Store array of file IDs for multi-document chat
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating chat session:', sessionError)
      return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 })
    }

    return NextResponse.json({
      sessionId: sessionData.id,
      title: sessionData.title,
      projectId: projectId,
      fileIds: fileIds
    })

  } catch (error) {
    console.error('Chat session creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}