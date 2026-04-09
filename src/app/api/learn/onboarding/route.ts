import Anthropic from "@anthropic-ai/sdk";
import { generateCurriculumFromToolCall } from "@/lib/curriculum-generator";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You create learning curricula. Get the info you need, then generate.

Flow:
1. User says what they want to learn
2. Ask about experience level
3. Ask about focus area (or if they want general coverage)
4. Generate curriculum

Rules:
- ONE question at a time
- NO praise ("great choice", "perfect", "fascinating")
- NO filler ("I'd be happy to", "Let's get started")
- Just ask the question directly
- Keep responses to ONE short sentence

Handling "idk" or uncertainty:
- Treat as beginner
- Just say "Got it" and move on or generate

Example:
User: "economics"
You: "What's your experience level?"
User: "none"
You: "Any specific area, or general coverage?"
User: "general"
[Call generate_curriculum with level="intro"]

Another example:
User: "python"
You: "Experience level?"
User: "idk"
You: "Any specific focus, like web dev or data analysis?"
User: "data"
[Call generate_curriculum with level="intro", specificTopics=["data analysis"]]`;

const TOOL_DEFINITION: Anthropic.Tool = {
  name: "generate_curriculum",
  description: "Generate a personalized learning curriculum based on the conversation. Call this when you have gathered enough information about what the user wants to learn, their level, and any specific interests.",
  input_schema: {
    type: "object" as const,
    properties: {
      subject: {
        type: "string",
        description: "The main subject the user wants to learn (e.g., 'Python', 'Microeconomics', 'Calculus')"
      },
      level: {
        type: "string",
        enum: ["intro", "intermediate", "advanced"],
        description: "The user's experience level: intro (complete beginner), intermediate (some background), advanced (deep dive)"
      },
      specificTopics: {
        type: "array",
        items: { type: "string" },
        description: "Specific areas of focus within the subject (e.g., ['data analysis', 'pandas', 'visualization'] for Python)"
      },
      goals: {
        type: "array",
        items: { type: "string" },
        description: "What the user hopes to achieve or any relevant context (e.g., ['prepare for job interviews', 'build a portfolio project'])"
      }
    },
    required: ["subject", "level"]
  }
};

type OnboardingMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    const { messages } = await request.json() as { messages: OnboardingMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Messages array required" }, { status: 400 });
    }

    // Convert to Anthropic message format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Create streaming response with tool use
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [TOOL_DEFINITION],
      messages: anthropicMessages,
      stream: true
    });

    // Track if we get a tool use
    let toolUseBlock: { id: string; name: string; input: string } | null = null;
    let currentToolInput = "";
    let textContent = "";

    // Create a TransformStream to handle the response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of response) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                toolUseBlock = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  input: ""
                };
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                textContent += event.delta.text;
                // Stream text content to client
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: event.delta.text })}\n\n`));
              } else if (event.delta.type === "input_json_delta" && toolUseBlock) {
                currentToolInput += event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop") {
              if (toolUseBlock && currentToolInput) {
                toolUseBlock.input = currentToolInput;
              }
            } else if (event.type === "message_stop") {
              // Check if we have a tool use to execute
              if (toolUseBlock && toolUseBlock.name === "generate_curriculum") {
                try {
                  const toolInput = JSON.parse(toolUseBlock.input) as {
                    subject: string;
                    level: "intro" | "intermediate" | "advanced";
                    specificTopics?: string[];
                    goals?: string[];
                  };

                  // Signal that we're generating curriculum
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "status", status: "generating_curriculum" })}\n\n`));

                  // Generate the curriculum
                  const curriculum = await generateCurriculumFromToolCall(
                    toolInput.subject,
                    toolInput.level,
                    toolInput.specificTopics,
                    toolInput.goals
                  );

                  // Send the curriculum
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "curriculum", curriculum })}\n\n`));
                } catch (toolError) {
                  console.error("Tool execution error:", toolError);
                  const errorMessage = toolError instanceof Error ? toolError.message : "Failed to generate curriculum";
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`));
                }
              }

              // Signal completion
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            }
          }
        } catch (streamError) {
          console.error("Stream error:", streamError);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Stream error" })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return Response.json(
      { error: "Failed to process onboarding request" },
      { status: 500 }
    );
  }
}
