// Test Gemini API với Socratic teaching style
async function testGeminiDirect() {
  const API_KEY = "AIzaSyAlqmsgHfyLlfZtYYLVIXVNmQCHomvJC8U";
  
  const payload = {
    contents: [{
      role: "user",
      parts: [{ text: "I'm looking at a chest X-ray case. What should I focus on when annotating?" }]
    }],
    systemInstruction: {
      parts: [{ text: "You are a medical education mentor using Socratic teaching method. Guide learning through questions and hints, never give direct answers. Ask guiding questions instead of giving answers. Provide general direction, not specific details. Keep responses SHORT (2-3 sentences max). End with a thought-provoking question." }]
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 400
    }
  };
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    
    console.log("Status:", response.status);
    const data = await response.json();
    
    if (data.candidates && data.candidates[0]) {
      console.log("AI Response:", data.candidates[0].content.parts[0].text);
      console.log("Tokens used:", data.usageMetadata?.totalTokenCount);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testGeminiDirect();