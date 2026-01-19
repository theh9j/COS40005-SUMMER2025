# AI Integration Documentation

## 🎯 Overview

This document describes the AI integration in the Medical Education Platform, providing intelligent assistance for both students and instructors during medical case studies and annotations.

## 🏗️ Architecture

### Frontend Components
- **AIChatAssistant** (`/components/ai-chat-assistant.tsx`) - Main chat interface
- **AISettings** (`/components/ai-settings.tsx`) - Configuration panel
- **AIService** (`/lib/ai-service.ts`) - Service layer for AI operations

### Backend Routes
- **AI Routes** (`/server/backend/routes/ai.py`) - FastAPI endpoints for AI operations

## 🚀 Features

### 1. Context-Aware Chat Assistant
- **Medical Context**: AI understands current case, annotations, and homework
- **Role-Based Responses**: Different assistance for students vs instructors
- **Real-Time Streaming**: Live response generation
- **Smart Suggestions**: Contextual prompts based on current activity

### 2. Multi-Provider Support
- **OpenAI**: GPT-4o-mini, GPT-4o models
- **Anthropic**: Claude-3.5-Sonnet, Claude-3.5-Haiku
- **Google**: Gemini-1.5-Pro, Gemini-1.5-Flash
- **Configurable**: Easy to add new providers

### 3. Intelligent Analysis
- **Annotation Analysis**: AI reviews student annotations for accuracy
- **Missing Areas Detection**: Identifies anatomical regions not annotated
- **Performance Scoring**: Provides accuracy percentages
- **Improvement Suggestions**: Specific recommendations for better annotations

### 4. Content Generation
- **Homework Questions**: Auto-generate assessment questions
- **Multiple Choice**: With correct answers and distractors
- **Short Answer**: Open-ended medical questions
- **Annotation Tasks**: Specific annotation challenges

## 🔧 Setup & Configuration

### 1. Environment Variables
Create `.env` file with your API keys:

```bash
# AI Provider API Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
GOOGLE_API_KEY=your-google-api-key-here
```

### 2. Install Dependencies
```bash
# Python backend
pip install httpx aiofiles

# Frontend (already included)
# No additional dependencies needed
```

### 3. Backend Setup
The AI routes are automatically included in `main.py`:
```python
from routes import ai
app.include_router(ai.router)
```

## 📡 API Endpoints

### Chat Endpoints
- `POST /api/ai/chat` - Single response chat
- `POST /api/ai/chat/stream` - Streaming chat responses

### Analysis Endpoints  
- `POST /api/ai/analyze` - Analyze annotations
- `POST /api/ai/generate-questions` - Generate homework questions

### Configuration
- `GET /api/ai/providers` - Get available providers and models

## 💡 Usage Examples

### 1. Basic Chat
```typescript
import { aiService } from '@/lib/ai-service';

const response = await aiService.chat([
  {
    id: '1',
    role: 'user',
    content: 'What should I focus on in this chest X-ray?',
    timestamp: Date.now()
  }
], {
  caseId: 'case-1',
  caseTitle: 'Chest X-ray Analysis',
  annotations: currentAnnotations,
  userRole: 'student',
  userId: 'user123'
});
```

### 2. Streaming Chat
```typescript
const stream = aiService.chatStream(messages, context);
for await (const chunk of stream) {
  setResponse(prev => prev + chunk);
}
```

### 3. Annotation Analysis
```typescript
const analysis = await aiService.analyzeAnnotations(
  annotations,
  context
);
console.log(analysis.suggestions); // ["Add more detail to lung fields", ...]
console.log(analysis.accuracy); // 85
```

## 🎨 UI Integration

### 1. Annotation View Integration
The AI chat assistant is integrated into the annotation workspace:

```typescript
// In annotation-view.tsx
<AIChatAssistant
  context={{
    caseId: caseId,
    caseTitle: case_.title,
    annotations: annotation.annotations,
    userRole: user.role,
    userId: user.user_id
  }}
  onClose={() => setShowAIChat(false)}
/>
```

### 2. Floating Chat Window
- Minimizable chat interface
- Persistent across page navigation
- Context automatically updated

### 3. Settings Panel
- Provider selection (OpenAI, Anthropic, Google)
- Model configuration
- Temperature and token limits
- Feature toggles

## 🧠 AI Prompting Strategy

### System Prompts
The AI uses context-aware system prompts:

```
You are a medical education AI assistant helping with medical case studies.

Current Context:
- Case: Chest X-ray Analysis
- Annotations: 3 annotations present
- User role: student
- Assignment: Identify key anatomical structures

For students: Focus on learning and improving annotation skills.
```

### Context Integration
- **Case Information**: Title, description, image URL
- **Current Annotations**: Count, types, labels
- **Homework Context**: Instructions, due dates
- **User Role**: Student vs instructor specific guidance

## 🔒 Security & Privacy

### API Key Management
- Environment variables for secure storage
- No API keys exposed to frontend
- Server-side API calls only

### User Data Protection
- No sensitive medical data sent to AI providers
- Anonymized context when possible
- Configurable data sharing settings

### Rate Limiting
- Built-in request throttling
- Token usage monitoring
- Cost control mechanisms

## 📊 Analytics & Monitoring

### Usage Tracking
- Chat message counts
- Token usage per provider
- Response latency monitoring
- Error rate tracking

### Performance Metrics
- Average response time
- User satisfaction scores
- Feature adoption rates
- Cost per interaction

## 🚀 Future Enhancements

### 1. Advanced Features
- **Image Analysis**: Direct medical image interpretation
- **Voice Interface**: Speech-to-text and text-to-speech
- **Multi-language**: Support for multiple languages
- **Offline Mode**: Local AI models for privacy

### 2. Educational Features
- **Learning Paths**: Personalized study recommendations
- **Progress Tracking**: AI-powered learning analytics
- **Peer Comparison**: AI-assisted peer review
- **Adaptive Testing**: Dynamic question difficulty

### 3. Integration Expansions
- **LMS Integration**: Connect with learning management systems
- **DICOM Support**: Direct medical imaging format support
- **EMR Integration**: Electronic medical record connections
- **Research Tools**: AI-powered research assistance

## 🛠️ Development Guidelines

### Adding New Providers
1. Update `AI_PROVIDERS` in `routes/ai.py`
2. Implement provider-specific API call function
3. Add provider to frontend `AISettings` component
4. Update environment variable documentation

### Extending Context
1. Update `MedicalContext` interface in `ai-service.ts`
2. Modify system prompt generation in backend
3. Update frontend context passing
4. Test with various scenarios

### Custom AI Features
1. Create new endpoint in `routes/ai.py`
2. Add corresponding service method in `ai-service.ts`
3. Implement UI components as needed
4. Document usage and examples

## 📝 Troubleshooting

### Common Issues
1. **API Key Not Working**: Check environment variables and provider status
2. **Slow Responses**: Adjust temperature and token limits
3. **Context Not Loading**: Verify context object structure
4. **Streaming Issues**: Check network connectivity and CORS settings

### Debug Mode
Enable debug logging:
```bash
export FASTMCP_LOG_LEVEL=DEBUG
```

### Testing
```bash
# Test AI connection
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"provider":"openai","model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'
```

## 📚 Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)
- [Google Gemini API](https://ai.google.dev/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Query Documentation](https://tanstack.com/query/latest)

---

**Note**: This AI integration is designed to enhance medical education while maintaining privacy and security standards. Always review AI-generated content for accuracy in medical contexts.