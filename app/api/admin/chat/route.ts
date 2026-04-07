import { NextRequest } from 'next/server'
import { isSessionValid } from '@/lib/auth/session'
import Anthropic from '@anthropic-ai/sdk'
import { tools, executeTool, SYSTEM_PROMPT } from '@/lib/coordinator-chat'

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | Anthropic.ContentBlock[]
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token || !(await isSessionValid(token))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await runConversation(messages, controller, encoder)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`))
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

async function runConversation(
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  // Convert messages to Anthropic format
  let anthropicMessages: Anthropic.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  // Tool use loop — Claude may call tools multiple times
  const MAX_TOOL_ROUNDS = 10
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let fullText = ''
    let toolUseBlocks: Anthropic.ToolUseBlock[] = []

    // Stream the response
    const client = getClient()
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools,
      messages: anthropicMessages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta
        if ('text' in delta && delta.text) {
          fullText += delta.text
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'text', text: delta.text })}\n\n`)
          )
        }
      }
    }

    // Get the final message to check for tool use
    const finalMessage = await stream.finalMessage()
    toolUseBlocks = finalMessage.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    // No tool calls — we're done
    if (toolUseBlocks.length === 0) break

    // Execute tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const toolBlock of toolUseBlocks) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'tool_call', name: toolBlock.name, input: toolBlock.input })}\n\n`)
      )

      const result = await executeTool(toolBlock.name, toolBlock.input as Record<string, unknown>)

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', name: toolBlock.name, result })}\n\n`)
      )

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: result,
      })
    }

    // Add assistant message + tool results to conversation for next round
    anthropicMessages = [
      ...anthropicMessages,
      { role: 'assistant' as const, content: finalMessage.content },
      { role: 'user' as const, content: toolResults },
    ]
  }
}
