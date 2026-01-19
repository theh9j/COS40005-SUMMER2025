// Test AI API directly
async function testAI() {
  try {
    console.log("Testing AI API...");
    
    // Test 1: Check providers
    const providersResponse = await fetch("http://127.0.0.1:8000/api/ai/providers");
    const providers = await providersResponse.json();
    console.log("Providers:", providers);
    
    // Test 2: Try chat without auth (should fail gracefully)
    const chatResponse = await fetch("http://127.0.0.1:8000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: "Hello, this is a test" }
        ]
      })
    });
    
    console.log("Chat response status:", chatResponse.status);
    if (chatResponse.status === 401) {
      console.log("✅ Auth required (expected)");
    } else {
      const chatData = await chatResponse.json();
      console.log("Chat response:", chatData);
    }
    
  } catch (error) {
    console.error("Test error:", error);
  }
}

testAI();