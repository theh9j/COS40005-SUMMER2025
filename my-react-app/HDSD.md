# 📋 HƯỚNG DẪN SỬ DỤNG - MEDICAL EDUCATION PLATFORM

## 🚀 SETUP BAN ĐẦU

### 1. Clone và cài đặt dependencies

```bash
# Clone project
git clone <repository-url>
cd my-react-app

# Cài đặt Node.js dependencies
npm install

# Cài đặt Python dependencies cho backend
cd server/backend
pip install -r dependencies.txt
cd ../..
```

### 2. Cấu hình Environment Variables

**Tạo file `.env` trong thư mục gốc:**
```env
# Google Gemini AI API Key (BẮT BUỘC)
GOOGLE_API_KEY=AIzaSyAlqmsgHfyLlfZtYYLVIXVNmQCHomvJC8U

# Optional: Các AI providers khác
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Database (nếu có)
DATABASE_URL=your_database_url_here
```

**Tạo file `server/backend/.env`:**
```env
# Copy same content as above
GOOGLE_API_KEY=AIzaSyAlqmsgHfyLlfZtYYLVIXVNmQCHomvJC8U
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

## 🏃‍♂️ CHẠY DỰ ÁN

### Cách 1: Chạy từng service riêng biệt

**Terminal 1 - Frontend:**
```bash
cd my-react-app
npm run dev
# Frontend sẽ chạy tại: http://localhost:3000
```

**Terminal 2 - Backend:**
```bash
cd my-react-app/server/backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
# Backend sẽ chạy tại: http://127.0.0.1:8000
```

### Cách 2: Chạy đồng thời (nếu có script)
```bash
cd my-react-app
npm run dev:all  # (nếu đã setup script này)
```

## 🎯 TÍNH NĂNG CHÍNH

### 1. **AI Chat Assistant**
- **Vị trí**: Nút "AI Assistant" ở header annotation view
- **Chức năng**: Hỗ trợ học sinh với phương pháp Socratic (đặt câu hỏi thay vì đưa đáp án)
- **API**: Sử dụng Google Gemini 2.5 Flash

### 2. **AI Vision Analysis**
- **Vị trí**: Nút "AI Vision" ở header annotation view  
- **Chức năng**: Phân tích hình ảnh y tế, gợi ý vùng cần chú ý
- **API**: Sử dụng Google Gemini Vision

### 3. **Annotation System**
- Vẽ annotations trên hình ảnh y tế
- Lưu version, so sánh với peers
- Collaborative editing real-time

### 4. **Homework System**
- Submit bài tập với files đính kèm
- Tracking deadline và scoring
- Integration với AI feedback

## 🔧 TROUBLESHOOTING

### Lỗi thường gặp:

**1. AI không hoạt động:**
```bash
# Kiểm tra API key
echo $GOOGLE_API_KEY
# Hoặc check trong .env file
```

**2. Backend không start:**
```bash
# Kiểm tra Python dependencies
pip list | grep fastapi
pip list | grep uvicorn

# Reinstall nếu cần
pip install -r server/backend/dependencies.txt
```

**3. Frontend không connect backend:**
- Đảm bảo backend chạy port 8000
- Check CORS settings trong backend
- Kiểm tra URL trong `client/src/lib/ai-service.ts`

**4. AI Vision trả về mock data:**
- Kiểm tra GOOGLE_API_KEY có đúng không
- Check network connection
- Xem logs backend để debug

## 📁 CẤU TRÚC PROJECT

```
my-react-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── lib/           # Services (AI, API calls)
│   │   ├── pages/         # Page components
│   │   └── hooks/         # Custom React hooks
├── server/
│   ├── backend/           # Python FastAPI backend
│   │   ├── routes/        # API endpoints
│   │   ├── core/          # Security, config
│   │   └── db/           # Database models
│   └── index.ts          # Node.js middleware
├── shared/               # Shared TypeScript types
└── .env                 # Environment variables
```

## 🧪 TESTING

### Test AI Integration:
```bash
# Test Gemini API directly
node test-gemini-direct.js

# Test all providers
node test-providers.js
```

### Test Frontend:
```bash
npm run test
```

### Test Backend:
```bash
cd server/backend
python -m pytest  # (nếu có tests)
```

## 🔑 API ENDPOINTS

### AI Endpoints:
- `POST /api/ai/chat` - Chat với AI
- `POST /api/ai/vision-analyze` - Phân tích hình ảnh
- `POST /api/ai/analyze` - Phân tích annotations
- `GET /api/ai/providers` - Danh sách AI providers

### Other Endpoints:
- `GET /api/cases` - Danh sách cases
- `POST /api/annotations` - Lưu annotations
- `GET /api/presence/:caseId` - Real-time presence

## 📝 NOTES CHO DEVELOPERS

### 1. **AI Configuration**
- Mặc định sử dụng Google Gemini (tốt nhất cho medical)
- Temperature = 0.3 (focused responses)
- MaxTokens = 500 (concise answers)

### 2. **Teaching Philosophy**
- AI sử dụng Socratic method
- Không đưa đáp án trực tiếp
- Khuyến khích học sinh tự khám phá

### 3. **Security**
- API keys được lưu trong .env
- Authentication qua JWT tokens
- CORS configured cho localhost

### 4. **Performance**
- AI responses cached khi có thể
- Images lazy loaded
- Real-time updates qua WebSocket

## 🆘 SUPPORT

Nếu gặp vấn đề:
1. Check logs trong browser console
2. Check backend logs trong terminal
3. Verify API keys và network connection
4. Restart cả frontend và backend

---

**Tác giả**: [Tên của bạn]  
**Cập nhật**: [Ngày hiện tại]  
**Version**: 1.0