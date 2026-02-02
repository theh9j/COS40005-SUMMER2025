import { Annotation } from "@shared/schema";

// AI Provider types
export type AIProvider = "openai" | "anthropic" | "google";

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  context?: {
    caseId?: string;
    annotations?: Annotation[];
    homeworkId?: string;
    userRole?: "student" | "instructor";
  };
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  latencyMs: number;
  suggestions?: string[];
}

export interface MedicalContext {
  caseId: string;
  caseTitle?: string;
  caseDescription?: string;
  imageUrl?: string;
  annotations: Annotation[];
  homeworkInstructions?: string;
  userRole: "student" | "instructor";
  userId: string;
}

class AIService {
  private config: AIConfig;
  private baseUrl = "http://127.0.0.1:8000/api/ai";

  constructor(config: AIConfig) {
    this.config = config;
  }

  // Main chat method with medical context
  async chat(
    messages: ChatMessage[],
    context?: MedicalContext
  ): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    
    const payload = {
      provider: this.config.provider,
      model: this.config.model,
      temperature: this.config.temperature || 0.7,
      maxTokens: this.config.maxTokens || 1000,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      context
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("session_token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // If API fails, return mock response for demo
        console.warn("AI API failed, using mock response");
        return {
          content: `🤖 Mock AI Response: I understand you're asking about "${messages[messages.length - 1]?.content.slice(0, 50)}..."\n\nThis is a demo response since no real API key is configured. In a real setup, I would provide detailed medical guidance based on your case context.\n\nContext I can see:\n${context?.caseTitle ? `- Case: ${context.caseTitle}` : ''}\n${context?.annotations?.length ? `- Annotations: ${context.annotations.length} present` : ''}\n${context?.userRole ? `- Your role: ${context.userRole}` : ''}`,
          tokensUsed: 150,
          latencyMs: 500,
          suggestions: ["Ask about anatomy", "Request annotation feedback", "Get study tips"]
        };
      }

      return response.json();
    } catch (error) {
      console.error("AI service error:", error);
      // Fallback mock response
      return {
        content: `🤖 AI Assistant: I'm having trouble connecting to the AI service right now. This is a fallback response.\n\nYour message: "${messages[messages.length - 1]?.content}"\n\nPlease check your network connection or try again later.`,
        tokensUsed: 50,
        latencyMs: 100,
        suggestions: []
      };
    }
  }

  // Vision analysis for medical images
  async analyzeImage(
    imageUrl: string,
    context: MedicalContext,
    analysisType: "overview" | "detailed" | "teaching" = "teaching"
  ): Promise<{
    suggestedAreas: Array<{
      region: string;
      confidence: number;
      reasoning: string;
      priority: "high" | "medium" | "low";
    }>;
    teachingPoints: string[];
    nextSteps: string[];
  }> {
    const visionPrompt = this.buildVisionPrompt(analysisType, context);
    
    const payload = {
      provider: "google",
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: visionPrompt },
        { role: "user", content: "Please analyze this medical image for educational purposes." }
      ],
      context: {
        ...context,
        imageUrl,
        analysisType
      },
      includeImage: true
    };

    try {
      const response = await fetch(`${this.baseUrl}/vision-analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("session_token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Vision analysis failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error("Vision analysis error:", error);
      return {
        suggestedAreas: [
          {
            region: "Central area",
            confidence: 0.7,
            reasoning: "This area often contains important findings",
            priority: "medium"
          }
        ],
        teachingPoints: ["Consider systematic approach to image review"],
        nextSteps: ["Start with overall impression", "Look for obvious abnormalities"]
      };
    }
  }

  private buildVisionPrompt(analysisType: string, context?: MedicalContext): string {
    let prompt = `You are a medical education AI analyzing medical images. Your goal is to guide learning, not provide direct diagnoses.

ANALYSIS TYPE: ${analysisType}

FOR TEACHING MODE:
- Suggest general areas of interest without revealing findings
- Provide educational guidance about systematic review
- Encourage student discovery rather than giving answers
- Focus on learning objectives

RESPONSE FORMAT (JSON):
{
  "suggestedAreas": [
    {
      "region": "general area description",
      "confidence": 0.8,
      "reasoning": "why this area is educationally important",
      "priority": "high/medium/low"
    }
  ],
  "teachingPoints": ["educational insights"],
  "nextSteps": ["suggested learning actions"]
}

IMPORTANT: Guide learning, don't diagnose. Encourage systematic thinking.`;

    if (context?.userRole === "student") {
      prompt += `\n\nFOR STUDENT: Provide hints and guidance that promote discovery learning.`;
    } else {
      prompt += `\n\nFOR INSTRUCTOR: Suggest teaching strategies and common student challenges.`;
    }

    return prompt;
  }
  async assessStudentUnderstanding(
    studentResponse: string,
    context: MedicalContext
  ): Promise<{
    understanding: "low" | "medium" | "high";
    nextQuestion: string;
    encouragement: string;
  }> {
    const assessmentPrompt = `Student said: "${studentResponse}"
    
    Assess their understanding level and provide:
    1. Understanding level (low/medium/high)
    2. A follow-up question to deepen learning
    3. Brief encouragement
    
    Format as JSON: {"understanding": "level", "nextQuestion": "question", "encouragement": "message"}`;

    try {
      const response = await this.chat([{
        id: Date.now().toString(),
        role: "user",
        content: assessmentPrompt,
        timestamp: Date.now()
      }], context);

      return JSON.parse(response.content);
    } catch (error) {
      return {
        understanding: "medium",
        nextQuestion: "What else do you notice in this area?",
        encouragement: "Good observation! Keep exploring."
      };
    }
  }
  async generateProgressiveHint(
    question: string,
    context: MedicalContext,
    hintLevel: 1 | 2 | 3 = 1
  ): Promise<AIResponse> {
    const hintPrompts = {
      1: "Give a very general hint that encourages observation without revealing answers",
      2: "Provide a slightly more specific hint about the general area or approach",
      3: "Give a more direct hint but still require the student to make the final connection"
    };

    const systemPrompt = this.buildSystemPrompt(context) + 
      `\n\nHINT LEVEL ${hintLevel}: ${hintPrompts[hintLevel]}`;

    return this.chat([{
      id: Date.now().toString(),
      role: "user",
      content: `Student asks: "${question}". Provide hint level ${hintLevel}.`,
      timestamp: Date.now()
    }], context);
  }
  async *chatStream(
    messages: ChatMessage[],
    context?: MedicalContext
  ): AsyncGenerator<string, void, unknown> {
    console.log("[DEBUG] Starting chatStream with messages:", messages);
    
    const systemPrompt = this.buildSystemPrompt(context);
    
    const payload = {
      provider: this.config.provider,
      model: this.config.model,
      temperature: this.config.temperature || 0.7,
      maxTokens: this.config.maxTokens || 2000,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      context,
      stream: true
    };

    console.log("[DEBUG] Payload:", payload);

    try {
      const response = await fetch(`${this.baseUrl}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("session_token")}`
        },
        body: JSON.stringify(payload)
      });

      console.log("[DEBUG] Response status:", response.status);

      if (!response.ok) {
        console.log("[DEBUG] Response not ok, using fallback");
        yield "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Bạn có thể thử lại không?";
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        console.error("[DEBUG] No response body reader");
        yield "Không thể đọc phản hồi từ server.";
        return;
      }

      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("[DEBUG] Stream done");
            break;
          }
          
          const chunk = decoder.decode(value);
          console.log("[DEBUG] Raw chunk:", chunk);
          
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              console.log("[DEBUG] Data line:", data);
              
              if (data === '[DONE]') {
                console.log("[DEBUG] Stream completed with [DONE]");
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  console.log("[DEBUG] Yielding content:", parsed.content);
                  yield parsed.content;
                }
              } catch (e) {
                console.log("[DEBUG] Failed to parse JSON:", data, e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error("[DEBUG] Streaming error:", error);
      yield "Lỗi kết nối. Vui lòng thử lại.";
    }
  }

  // Build context-aware system prompt
  private buildSystemPrompt(context?: MedicalContext): string {
    let prompt = `Bạn là một AI assistant hỗ trợ y khoa. 

QUY TẮC QUAN TRỌNG:
- Trả lời NGẮN GỌN, đi thẳng vào vấn đề
- Tối đa 2-3 câu cho mỗi câu trả lời
- Chỉ trả lời đúng những gì được hỏi
- Không giải thích quá chi tiết trừ khi được yêu cầu
- Dùng tiếng Việt tự nhiên

PHONG CÁCH:
- Súc tích và chính xác
- Tập trung vào điểm chính
- Nếu cần thêm thông tin, hỏi "Bạn muốn tôi giải thích thêm về điều gì?"`;

    if (context) {
      prompt += `\n\nCONTEXT:`;
      
      if (context.caseTitle) {
        prompt += ` Trường hợp: ${context.caseTitle}.`;
      }
      
      if (context.annotations && context.annotations.length > 0) {
        prompt += ` Có ${context.annotations.length} annotations.`;
      }
      
      if (context.userRole) {
        prompt += ` User: ${context.userRole}.`;
      }
    }

    return prompt;
  }

  // Analyze annotations for suggestions
  async analyzeAnnotations(
    annotations: Annotation[],
    context: MedicalContext
  ): Promise<{
    suggestions: string[];
    missingAreas: string[];
    accuracy: number;
  }> {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("session_token")}`
      },
      body: JSON.stringify({
        annotations,
        context,
        provider: this.config.provider,
        model: this.config.model
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis error: ${response.statusText}`);
    }

    return response.json();
  }

  // Generate homework questions
  async generateHomeworkQuestions(
    caseId: string,
    difficulty: "beginner" | "intermediate" | "advanced",
    count: number = 5
  ): Promise<{
    questions: Array<{
      type: "multiple_choice" | "short_answer" | "annotation_task";
      question: string;
      options?: string[];
      correctAnswer?: string;
      points: number;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/generate-questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("session_token")}`
      },
      body: JSON.stringify({
        caseId,
        difficulty,
        count,
        provider: this.config.provider,
        model: this.config.model
      })
    });

    if (!response.ok) {
      throw new Error(`Question generation error: ${response.statusText}`);
    }

    return response.json();
  }

  // Update configuration
  updateConfig(newConfig: Partial<AIConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// AI service with concise responses
export const aiService = new AIService({
  provider: "google",
  model: "gemini-2.5-flash",
  temperature: 0.3, // Giảm để response tập trung hơn
  maxTokens: 300    // Giảm để response ngắn gọn hơn
});

export default AIService;