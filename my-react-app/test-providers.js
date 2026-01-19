// Test providers endpoint
async function testProviders() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/ai/providers");
    const data = await response.json();
    console.log("Providers response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testProviders();