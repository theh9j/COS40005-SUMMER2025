from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional, AsyncGenerator
import json
import asyncio
import httpx
from datetime import datetime
import os
from decouple import config

from db.connection import users_collection, homeworks_collection
from core.security import get_current_user

router = APIRouter(prefix="/api/ai", tags=["AI"])

# AI Provider configurations
AI_PROVIDERS = {
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "models": ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
        "api_key_env": "OPENAI_API_KEY"
    },
    "anthropic": {
        "base_url": "https://api.anthropic.com/v1",
        "models": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
        "api_key_env": "ANTHROPIC_API_KEY"
    },
    "google": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "models": [
            "gemini-2.5-flash", 
            "gemini-2.5-pro", 
            "gemini-2.0-flash-exp",
            "gemini-2.0-flash",
            "gemini-flash-latest",
            "gemini-pro-latest"
        ],
        "api_key_env": "GOOGLE_API_KEY"
    }
}

class AIMessage:
    def __init__(self, role: str, content: str):
        self.role = role
        self.content = content

class MedicalContext:
    def __init__(self, data: Dict[str, Any]):
        self.case_id = data.get("caseId")
        self.case_title = data.get("caseTitle")
        self.case_description = data.get("caseDescription")
        self.image_url = data.get("imageUrl")
        self.annotations = data.get("annotations", [])
        self.homework_instructions = data.get("homeworkInstructions")
        self.user_role = data.get("userRole")
        self.user_id = data.get("userId")

async def get_api_key(provider: str) -> str:
    """Get API key for the specified provider"""
    if provider not in AI_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    
    env_key = AI_PROVIDERS[provider]["api_key_env"]
    api_key = config(env_key, default=None)
    
    if not api_key:
        raise HTTPException(
            status_code=500, 
            detail=f"API key not configured for {provider}. Please set {env_key} environment variable."
        )
    
    return api_key

async def call_openai_api_non_stream(
    messages: List[AIMessage], 
    model: str, 
    temperature: float = 0.7,
    max_tokens: int = 1000
) -> Dict[str, Any]:
    """Call OpenAI API for non-streaming response"""
    api_key = await get_api_key("openai")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="OpenAI API error")
        
        return response.json()

async def call_openai_api_stream(
    messages: List[AIMessage], 
    model: str, 
    temperature: float = 0.7,
    max_tokens: int = 1000
) -> AsyncGenerator[str, None]:
    """Call OpenAI API for streaming response"""
    api_key = await get_api_key("openai")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST", 
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload
        ) as response:
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="OpenAI API error")
            
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        if chunk["choices"][0]["delta"].get("content"):
                            yield chunk["choices"][0]["delta"]["content"]
                    except json.JSONDecodeError:
                        continue

async def call_anthropic_api_non_stream(
    messages: List[AIMessage], 
    model: str, 
    temperature: float = 0.7,
    max_tokens: int = 1000
) -> Dict[str, Any]:
    """Call Anthropic API for non-streaming response"""
    api_key = await get_api_key("anthropic")
    
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
    }
    
    # Convert messages format for Anthropic
    system_message = None
    conversation_messages = []
    
    for msg in messages:
        if msg.role == "system":
            system_message = msg.content
        else:
            conversation_messages.append({"role": msg.role, "content": msg.content})
    
    payload = {
        "model": model,
        "messages": conversation_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False
    }
    
    if system_message:
        payload["system"] = system_message
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Anthropic API error")
        
        return response.json()

async def call_google_api_non_stream(
    messages: List[AIMessage], 
    model: str, 
    temperature: float = 0.7,
    max_tokens: int = 1000
) -> Dict[str, Any]:
    """Call Google Gemini API for non-streaming response"""
    api_key = await get_api_key("google")
    
    # Convert messages to Gemini format
    contents = []
    system_instruction = None
    
    for msg in messages:
        if msg.role == "system":
            system_instruction = msg.content
        elif msg.role == "user":
            contents.append({
                "role": "user",
                "parts": [{"text": msg.content}]
            })
        elif msg.role == "assistant":
            contents.append({
                "role": "model",
                "parts": [{"text": msg.content}]
            })
    
    # Gemini API payload
    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "topP": 0.8,
            "topK": 10
        }
    }
    
    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Google API error: {response.text}")
        
        return response.json()

async def call_google_api_stream(
    messages: List[AIMessage], 
    model: str, 
    temperature: float = 0.7,
    max_tokens: int = 1000
) -> AsyncGenerator[str, None]:
    """Call Google Gemini API with fallback - simulate streaming"""
    try:
        # Use fallback system to get response
        full_text = await call_google_api_with_fallback(messages, model, temperature, max_tokens)
        
        print(f"[DEBUG] Got response, simulating stream: {full_text[:100]}...")
        
        # Simulate streaming by yielding words
        words = full_text.split()
        for word in words:
            yield word + " "
            await asyncio.sleep(0.05)  # Small delay for streaming effect
            
    except HTTPException as e:
        # All models failed
        yield f"Xin lỗi, tất cả Gemini models đều bị rate limit. Chi tiết: {str(e.detail)}"

async def call_google_api_with_fallback(
    messages: List[AIMessage], 
    model: str, 
    temperature: float = 0.7,
    max_tokens: int = 1000
) -> str:
    """Call Google Gemini API with model fallback on rate limits"""
    api_key = await get_api_key("google")
    
    # List of models to try in order
    models_to_try = [
        model,  # Try requested model first
        "gemini-2.5-flash",
        "gemini-2.0-flash", 
        "gemini-flash-latest",
        "gemini-2.5-pro",
        "gemini-pro-latest",
        "gemini-2.0-flash-exp"
    ]
    
    # Remove duplicates while preserving order
    unique_models = []
    for m in models_to_try:
        if m not in unique_models:
            unique_models.append(m)
    
    # Convert messages to Gemini format
    contents = []
    system_instruction = None
    
    for msg in messages:
        if msg.role == "system":
            system_instruction = msg.content
        elif msg.role == "user":
            contents.append({
                "role": "user",
                "parts": [{"text": msg.content}]
            })
        elif msg.role == "assistant":
            contents.append({
                "role": "model",
                "parts": [{"text": msg.content}]
            })
    
    # Try each model until one works
    for current_model in unique_models:
        try:
            print(f"[DEBUG] Trying model: {current_model}")
            
            payload = {
                "contents": contents,
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                    "topP": 0.8,
                    "topK": 10
                }
            }
            
            if system_instruction:
                payload["systemInstruction"] = {
                    "parts": [{"text": system_instruction}]
                }
            
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={api_key}"
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload)
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"[DEBUG] Success with model: {current_model}")
                    
                    # Extract text from response
                    if "candidates" in result and len(result["candidates"]) > 0:
                        candidate = result["candidates"][0]
                        if "content" in candidate and "parts" in candidate["content"]:
                            for part in candidate["content"]["parts"]:
                                if "text" in part:
                                    return part["text"]
                    
                    return "Không thể tạo phản hồi từ model này."
                
                elif response.status_code == 429:
                    print(f"[DEBUG] Rate limit hit for {current_model}, trying next model...")
                    continue
                else:
                    print(f"[DEBUG] Error {response.status_code} for {current_model}: {response.text}")
                    continue
                    
        except Exception as e:
            print(f"[DEBUG] Exception with {current_model}: {str(e)}")
            continue
    
    # If all models failed
    raise HTTPException(
        status_code=429, 
        detail="Tất cả Gemini models đều bị rate limit. Vui lòng thử lại sau."
    )

@router.post("/chat")
async def ai_chat(
    payload: Dict[str, Any]
    # current_user: Dict = Depends(get_current_user)  # Tạm thời bỏ auth để test
):
    """Main AI chat endpoint"""
    try:
        provider = payload.get("provider", "openai")
        model = payload.get("model", "gpt-4o-mini")
        temperature = payload.get("temperature", 0.7)
        max_tokens = payload.get("maxTokens", 1000)
        messages_data = payload.get("messages", [])
        context_data = payload.get("context")
        
        # Convert to AIMessage objects
        messages = [AIMessage(msg["role"], msg["content"]) for msg in messages_data]
        
        # Add medical context to system message if provided
        if context_data:
            context = MedicalContext(context_data)
            # Enhance system message with context
            for msg in messages:
                if msg.role == "system":
                    msg.content += f"\n\nCurrent medical case context:\n"
                    if context.case_title:
                        msg.content += f"- Case: {context.case_title}\n"
                    if context.annotations:
                        msg.content += f"- Annotations: {len(context.annotations)} present\n"
                    if context.homework_instructions:
                        msg.content += f"- Assignment: {context.homework_instructions}\n"
                    msg.content += f"- User role: {context.user_role}\n"
                    break
        
        start_time = datetime.now()
        
        if provider == "openai":
            result = await call_openai_api_non_stream(messages, model, temperature, max_tokens)
            content = result["choices"][0]["message"]["content"]
            tokens_used = result["usage"]["total_tokens"]
        elif provider == "anthropic":
            result = await call_anthropic_api_non_stream(messages, model, temperature, max_tokens)
            content = result["content"][0]["text"]
            tokens_used = result["usage"]["input_tokens"] + result["usage"]["output_tokens"]
        elif provider == "google":
            result = await call_google_api_non_stream(messages, model, temperature, max_tokens)
            content = result["candidates"][0]["content"]["parts"][0]["text"]
            tokens_used = result.get("usageMetadata", {}).get("totalTokenCount", 100)
        else:
            raise HTTPException(status_code=400, detail=f"Provider {provider} not implemented")
        
        latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return {
            "content": content,
            "tokensUsed": tokens_used,
            "latencyMs": latency_ms,
            "suggestions": []  # Could add smart suggestions here
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream")
async def ai_chat_stream(
    payload: Dict[str, Any]
    # current_user: Dict = Depends(get_current_user)  # Tạm thời bỏ auth để test
):
    """Streaming AI chat endpoint"""
    try:
        provider = payload.get("provider", "openai")
        model = payload.get("model", "gpt-4o-mini")
        temperature = payload.get("temperature", 0.7)
        max_tokens = payload.get("maxTokens", 1000)
        messages_data = payload.get("messages", [])
        context_data = payload.get("context")
        
        # Convert to AIMessage objects
        messages = [AIMessage(msg["role"], msg["content"]) for msg in messages_data]
        
        # Add medical context to system message if provided
        if context_data:
            context = MedicalContext(context_data)
            for msg in messages:
                if msg.role == "system":
                    msg.content += f"\n\nCurrent medical case context:\n"
                    if context.case_title:
                        msg.content += f"- Case: {context.case_title}\n"
                    if context.annotations:
                        msg.content += f"- Annotations: {len(context.annotations)} present\n"
                    if context.homework_instructions:
                        msg.content += f"- Assignment: {context.homework_instructions}\n"
                    msg.content += f"- User role: {context.user_role}\n"
                    break
        
        async def generate_stream():
            try:
                if provider == "openai":
                    async for chunk in call_openai_api_stream(messages, model, temperature, max_tokens):
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                elif provider == "anthropic":
                    async for chunk in call_anthropic_api_stream(messages, model, temperature, max_tokens):
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                elif provider == "google":
                    try:
                        async for chunk in call_google_api_stream(messages, model, temperature, max_tokens):
                            yield f"data: {json.dumps({'content': chunk})}\n\n"
                    except HTTPException as e:
                        if "429" in str(e.detail) or "quota" in str(e.detail).lower():
                            # Quota exceeded - use beautiful fallback response
                            user_question = messages[-1].content if messages else "câu hỏi của bạn"
                            fallback_response = f"""**🤖 AI Assistant Y Khoa**

Xin chào! Tôi hiểu bạn đang hỏi về: *"{user_question}"*

**📋 Tình trạng hiện tại:**
- Google Gemini API đã vượt quá quota (20 requests/ngày)
- Tất cả models đều tạm thời không khả dụng

**💡 Tôi vẫn có thể hỗ trợ bạn:**
- **Phân tích medical cases** - Giải thích hình ảnh y khoa
- **Đánh giá annotations** - Feedback về các chú thích của bạn  
- **Hướng dẫn học tập** - Giải đáp thắc mắc về bài học
- **Hỗ trợ homework** - Giúp làm bài tập y khoa

**🔧 Để khôi phục AI hoàn toàn:**
1. **Đợi 24h** để quota tự động reset
2. **Tạo Google account mới** → API key mới (20 requests/ngày)
3. **Liên hệ admin** để upgrade API plan

**❓ Bạn có câu hỏi cụ thể nào về medical case không?**

*Tôi sẽ cố gắng trả lời dựa trên kiến thức có sẵn!*"""
                            
                            words = fallback_response.split()
                            for word in words:
                                yield f"data: {json.dumps({'content': word + ' '})}\n\n"
                                await asyncio.sleep(0.03)
                        else:
                            raise e
                else:
                    yield f"data: {json.dumps({'error': f'Provider {provider} not implemented'})}\n\n"
                
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_annotations(
    payload: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Analyze annotations and provide suggestions"""
    try:
        annotations = payload.get("annotations", [])
        context_data = payload.get("context", {})
        provider = payload.get("provider", "openai")
        model = payload.get("model", "gpt-4o-mini")
        
        context = MedicalContext(context_data)
        
        # Build analysis prompt
        analysis_prompt = f"""
        Analyze the following medical case annotations and provide feedback:
        
        Case: {context.case_title or 'Medical Case'}
        Description: {context.case_description or 'N/A'}
        User Role: {context.user_role}
        
        Annotations ({len(annotations)} total):
        """
        
        for i, annotation in enumerate(annotations):
            analysis_prompt += f"\n{i+1}. Type: {annotation.get('type', 'unknown')}, Label: {annotation.get('label', 'unlabeled')}"
        
        analysis_prompt += """
        
        Please provide:
        1. Suggestions for improvement (max 3)
        2. Missing anatomical areas that should be annotated (max 3)
        3. Overall accuracy assessment (0-100%)
        
        Format your response as JSON:
        {
            "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
            "missingAreas": ["area1", "area2", "area3"],
            "accuracy": 85
        }
        """
        
        messages = [
            AIMessage("system", "You are a medical education expert analyzing student annotations."),
            AIMessage("user", analysis_prompt)
        ]
        
        if provider == "openai":
            result = await call_openai_api_non_stream(messages, model)
            content = result["choices"][0]["message"]["content"]
        elif provider == "anthropic":
            result = await call_anthropic_api_non_stream(messages, model)
            content = result["content"][0]["text"]
        elif provider == "google":
            result = await call_google_api_non_stream(messages, model)
            content = result["candidates"][0]["content"]["parts"][0]["text"]
        else:
            raise HTTPException(status_code=400, detail=f"Provider {provider} not implemented")
        
        # Try to parse JSON response
        try:
            analysis_result = json.loads(content)
            return analysis_result
        except json.JSONDecodeError:
            # Fallback if AI doesn't return valid JSON
            return {
                "suggestions": ["Review annotation accuracy", "Add more detailed labels", "Consider anatomical context"],
                "missingAreas": ["Key anatomical structures", "Pathological findings", "Reference landmarks"],
                "accuracy": 75
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-questions")
async def generate_homework_questions(
    payload: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Generate homework questions for a medical case"""
    try:
        case_id = payload.get("caseId")
        difficulty = payload.get("difficulty", "intermediate")
        count = payload.get("count", 5)
        provider = payload.get("provider", "openai")
        model = payload.get("model", "gpt-4o-mini")
        
        # Get case information (you might want to fetch from database)
        question_prompt = f"""
        Generate {count} educational questions for a medical case study.
        
        Difficulty level: {difficulty}
        Question types needed: multiple choice, short answer, annotation tasks
        
        For each question, provide:
        1. Question text
        2. Type (multiple_choice, short_answer, annotation_task)
        3. For multiple choice: 4 options with correct answer
        4. Point value (1-10 based on difficulty)
        
        Focus on:
        - Anatomical identification
        - Pathological findings
        - Clinical reasoning
        - Diagnostic skills
        
        Format as JSON array:
        [
            {
                "type": "multiple_choice",
                "question": "What structure is indicated by the arrow?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": "Option A",
                "points": 5
            },
            {
                "type": "short_answer",
                "question": "Describe the pathological changes visible in this image.",
                "points": 8
            }
        ]
        """
        
        messages = [
            AIMessage("system", "You are a medical education expert creating assessment questions."),
            AIMessage("user", question_prompt)
        ]
        
        if provider == "openai":
            result = await call_openai_api_non_stream(messages, model)
            content = result["choices"][0]["message"]["content"]
        elif provider == "anthropic":
            result = await call_anthropic_api_non_stream(messages, model)
            content = result["content"][0]["text"]
        elif provider == "google":
            result = await call_google_api_non_stream(messages, model)
            content = result["candidates"][0]["content"]["parts"][0]["text"]
        else:
            raise HTTPException(status_code=400, detail=f"Provider {provider} not implemented")
        
        # Try to parse JSON response
        try:
            questions = json.loads(content)
            return {"questions": questions}
        except json.JSONDecodeError:
            # Fallback questions
            return {
                "questions": [
                    {
                        "type": "multiple_choice",
                        "question": "What is the primary anatomical structure visible in this medical image?",
                        "options": ["Heart", "Lung", "Liver", "Kidney"],
                        "correctAnswer": "Heart",
                        "points": 5
                    },
                    {
                        "type": "short_answer",
                        "question": "Describe any abnormal findings you can identify in this case.",
                        "points": 8
                    }
                ]
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vision-analyze")
async def ai_vision_analyze(
    payload: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """AI vision analysis for medical images"""
    try:
        provider = payload.get("provider", "google")
        model = payload.get("model", "gemini-2.5-flash")
        messages_data = payload.get("messages", [])
        context_data = payload.get("context", {})
        image_url = context_data.get("imageUrl")
        
        if not image_url:
            raise HTTPException(status_code=400, detail="Image URL required for vision analysis")
        
        # Convert to AIMessage objects
        messages = [AIMessage(msg["role"], msg["content"]) for msg in messages_data]
        
        # Add medical context to system message
        if context_data:
            context = MedicalContext(context_data)
            for msg in messages:
                if msg.role == "system":
                    msg.content += f"\n\nImage Context: {context.case_title or 'Medical Image'}"
                    if context.user_role:
                        msg.content += f"\nUser: {context.user_role}"
                    break
        
        if provider == "google":
            result = await call_google_vision_api(messages, model, image_url)
            content = result["candidates"][0]["content"]["parts"][0]["text"]
            
            # Try to parse JSON response
            try:
                analysis_result = json.loads(content)
                return analysis_result
            except json.JSONDecodeError:
                # Fallback structured response
                return {
                    "suggestedAreas": [
                        {
                            "region": "Central region",
                            "confidence": 0.7,
                            "reasoning": "This area typically contains key anatomical structures",
                            "priority": "medium"
                        }
                    ],
                    "teachingPoints": [
                        "Consider systematic approach to image review",
                        "Look for symmetry and normal anatomical landmarks"
                    ],
                    "nextSteps": [
                        "Start with overall impression",
                        "Identify normal structures first",
                        "Then look for abnormalities"
                    ]
                }
        else:
            raise HTTPException(status_code=400, detail=f"Vision analysis not supported for {provider}")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def call_google_vision_api(
    messages: List[AIMessage], 
    model: str,
    image_url: str
) -> Dict[str, Any]:
    """Call Google Gemini Vision API"""
    api_key = await get_api_key("google")
    
    # Convert messages to Gemini format with image
    contents = []
    system_instruction = None
    
    for msg in messages:
        if msg.role == "system":
            system_instruction = msg.content
        elif msg.role == "user":
            contents.append({
                "role": "user",
                "parts": [
                    {"text": msg.content},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": await get_image_base64(image_url)
                        }
                    }
                ]
            })
    
    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 8192,
            "topP": 0.8,
            "topK": 10
        }
    }

    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Google Vision API error: {response.text}")
        
        return response.json()

@router.post("/grade-with-vision")
async def grade_with_vision(
    payload: Dict[str, Any]
):
    """AI grading endpoint that uses Gemini Vision to analyze the medical image
    alongside student annotations for disease-specific feedback."""
    try:
        model = payload.get("model", "gemini-2.5-flash")
        image_url = payload.get("imageUrl")
        case_title = payload.get("caseTitle", "Medical Case")
        case_description = payload.get("caseDescription", "")
        case_type = payload.get("caseType", "")
        homework_instructions = payload.get("homeworkInstructions", "")
        annotations_data = payload.get("annotations", [])
        student_answer = payload.get("studentAnswer", "")
        rubric_block = payload.get("rubricBlock", "")

        # Build annotation summary
        annotation_lines = []
        for i, a in enumerate(annotations_data[:20]):
            label = a.get("label", "(no label)")
            atype = a.get("type", "unknown")
            color = a.get("color", "")
            annotation_lines.append(f"{i+1}. Type: {atype}, Label: \"{label}\", Color: {color}")
        annotation_block = "\n".join(annotation_lines) if annotation_lines else "No annotations provided."
        if len(annotations_data) > 20:
            annotation_block += f"\n... and {len(annotations_data) - 20} more annotations"

        system_prompt = f"""You are an expert medical pathology grading assistant with deep knowledge of diseases, anatomy, and clinical findings.

YOUR TASK: Analyze the medical image provided, compare it with the student's annotations, and grade their work. You must identify the SPECIFIC disease/condition visible in the image and evaluate whether the student correctly identified it.

MEDICAL CONTEXT:
- Case Title: {case_title}
- Case Description: {case_description}
- Specialty/Type: {case_type}
- Assignment Instructions: {homework_instructions}

GRADING RUBRIC:
{rubric_block}

CRITICAL INSTRUCTIONS FOR DISEASE IDENTIFICATION:
1. First, analyze the medical image carefully. Identify:
   - The specific disease/condition/pathology visible
   - Key pathological findings (e.g., lesions, masses, inflammation, fractures, abnormal structures)
   - Anatomical location and affected structures
   - Severity and stage if applicable

2. Then, evaluate each student annotation against what you see in the image:
   - Does the annotation correctly identify the pathological finding?
   - Is the label medically accurate for what is shown?
   - Did the student miss any important findings?
   - Are there any incorrectly labeled structures?

3. Provide disease-specific feedback:
   - Name the exact disease/condition (e.g., "Pneumothorax", "Hepatocellular Carcinoma", "Osteoarthritis")
   - Explain what visual features in the image indicate this disease
   - Comment on whether each annotation correctly corresponds to a disease finding

STRICT JSON FORMAT (no markdown, no extra text):
{{
  "diseaseIdentification": {{
    "primaryDiagnosis": "<specific disease name>",
    "confidence": <0-1>,
    "keyFindings": ["<finding 1>", "<finding 2>"],
    "affectedStructures": ["<structure 1>", "<structure 2>"],
    "severity": "<mild|moderate|severe|N/A>",
    "differentialDiagnoses": ["<alt diagnosis 1>", "<alt diagnosis 2>"]
  }},
  "rubricSuggestions": [
    {{"criterionId": "<id>", "levelKey": "excellent|good|fair|poor", "score": <number>, "reasoning": "<1-2 sentences, reference specific disease findings>", "confidence": <0-1>}}
  ],
  "totalScore": <sum>,
  "overallConfidence": <0-1>,
  "strengths": ["<specific praise referencing disease knowledge>"],
  "weaknesses": ["<specific gaps in disease identification>"],
  "feedbackSuggestion": "<3-5 sentences. Reference the specific disease, what the student identified correctly, what they missed, and key learning points about this condition.>",
  "annotationComments": [
    {{"annotationId": "<id>", "annotationLabel": "<label>", "comment": "<1-2 sentences explaining if this annotation correctly identifies a disease finding and why>", "quality": "correct|partial|incorrect|missing-label", "diseaseRelevance": "<how this annotation relates to the identified disease>"}}
  ],
  "improvementSuggestions": ["<disease-specific learning tip>"],
  "encouragement": "<1 sentence referencing their understanding of the condition>"
}}"""

        user_message = f"""Please analyze this medical image and grade the student's submission:

STUDENT ANNOTATIONS ({len(annotations_data)} total):
{annotation_block}

STUDENT ANSWER:
{student_answer or "No text answer provided."}

Look at the image carefully, identify the specific disease/condition, then evaluate the student's annotations and answer against what you observe in the image. Return JSON."""

        # Use vision API if image is available, otherwise fall back to text-only
        if image_url:
            try:
                messages = [
                    AIMessage("system", system_prompt),
                    AIMessage("user", user_message)
                ]
                result = await call_google_vision_api(messages, model, image_url)
                content = result["candidates"][0]["content"]["parts"][0]["text"]
            except Exception as vision_err:
                print(f"[DEBUG] Vision API failed, falling back to text-only: {vision_err}")
                # Fallback to text-only with enhanced prompt
                messages = [
                    AIMessage("system", system_prompt),
                    AIMessage("user", user_message)
                ]
                full_text = await call_google_api_with_fallback(messages, model, 0.2, 2000)
                content = full_text
        else:
            messages = [
                AIMessage("system", system_prompt),
                AIMessage("user", user_message)
            ]
            full_text = await call_google_api_with_fallback(messages, model, 0.2, 2000)
            content = full_text

        # Parse JSON from response
        try:
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                result_json = json.loads(json_match.group())
                return {
                    "content": json.dumps(result_json),
                    "tokensUsed": 0,
                    "latencyMs": 0
                }
        except json.JSONDecodeError:
            pass

        return {
            "content": content,
            "tokensUsed": 0,
            "latencyMs": 0
        }

    except Exception as e:
        print(f"[ERROR] grade-with-vision failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/providers")
async def get_ai_providers():
    """Get available AI providers and models"""
    providers_status = {}
    
    for provider, provider_config in AI_PROVIDERS.items():
        try:
            # Check if API key is available
            api_key = config(provider_config["api_key_env"], default=None)
            is_available = bool(api_key and api_key.strip() and not api_key.endswith("demo"))
            
            providers_status[provider] = {
                "models": provider_config["models"],
                "available": is_available
            }
        except Exception:
            providers_status[provider] = {
                "models": provider_config["models"],
                "available": False
            }
    
    return {"providers": providers_status}
async def get_ai_providers():
    """Get available AI providers and models"""
    providers_status = {}
    
    for provider, provider_config in AI_PROVIDERS.items():
        try:
            # Check if API key is available
            api_key = config(provider_config["api_key_env"], default=None)
            is_available = bool(api_key and api_key.strip() and not api_key.endswith("demo"))
            
            providers_status[provider] = {
                "models": provider_config["models"],
                "available": is_available
            }
        except Exception:
            providers_status[provider] = {
                "models": provider_config["models"],
                "available": False
            }
    
    return {"providers": providers_status}

async def get_image_base64(image_url: str) -> str:
    """Convert image URL to base64 for Gemini Vision"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(image_url)
            if response.status_code == 200:
                import base64
                return base64.b64encode(response.content).decode('utf-8')
            else:
                raise HTTPException(status_code=400, detail="Failed to fetch image")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")