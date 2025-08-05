import { NextRequest } from 'next/server'

// Use global progress store
declare global {
  var progressStore: Map<string, any[]> | undefined
}

const progressStore = global.progressStore || new Map<string, any[]>()
global.progressStore = progressStore

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  
  // Set up Server-Sent Events
  const encoder = new TextEncoder()
  let isConnected = true
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`
      controller.enqueue(encoder.encode(data))
      
      // Set up interval to check for new progress updates
      const interval = setInterval(() => {
        if (!isConnected) {
          clearInterval(interval)
          return
        }
        
        const progress = progressStore.get(sessionId)
        if (progress && progress.length > 0) {
          // Send all accumulated progress updates
          progress.forEach(update => {
            const data = `data: ${JSON.stringify(update)}\n\n`
            controller.enqueue(encoder.encode(data))
          })
          // Clear sent progress
          progressStore.set(sessionId, [])
        }
      }, 100) // Check every 100ms for real-time updates
      
      // Clean up on client disconnect
      request.signal?.addEventListener('abort', () => {
        isConnected = false
        clearInterval(interval)
        progressStore.delete(sessionId)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

// Helper function to emit progress updates
export function emitProgress(sessionId: string, step: string, status: 'active' | 'completed' | 'error', details?: any) {
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
  console.log(`[PROGRESS ${sessionId}] ${step} - ${status}`, details || '')
}