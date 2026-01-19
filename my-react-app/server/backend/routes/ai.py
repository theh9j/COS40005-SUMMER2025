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
        "models": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash-exp"],
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
    """Call Google Gemini API for streaming response"""
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
    
    # Gemini API payload for streaming
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
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?key={api_key}"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", url, json=payload) as response:
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"Google API error: {response.status_code}")
            
            async for line in response.aiter_lines():
                if line.strip():
                    try:
                        # Remove "data: " prefix if present
                        if line.startswith("data: "):
                            line = line[6:]
                        
                        chunk = json.loads(line)
                        if "candidates" in chunk and len(chunk["candidates"]) > 0:
                            candidate = chunk["candidates"][0]
                            if "content" in candidate and "parts" in candidate["content"]:
                                for part in candidate["content"]["parts"]:
                                    if "text" in part:
                                        yield part["text"]
                    except json.JSONDecodeError:
                        continue

@router.post("/chat")
async def ai_chat(
    payload: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
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
    payload: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
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
                    async for chunk in call_google_api_stream(messages, model, temperature, max_tokens):
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
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
            "maxOutputTokens": 1000,
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