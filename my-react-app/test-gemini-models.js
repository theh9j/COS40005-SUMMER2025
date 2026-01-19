// List available Gemini models
async function listGeminiModels() {
  const API_KEY = "AIzaSyAlqmsgHfyLlfZtYYLVIXVNmQCHomvJC8U";
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    
    console.log("Status:", response.status);
    const data = await response.json();
    
    if (data.models) {
      console.log("Available models:");
      data.models.forEach(model => {
        console.log(`- ${model.name} (${model.displayName})`);
        if (model.supportedGenerationMethods) {
          console.log(`  Methods: ${model.supportedGenerationMethods.join(", ")}`);
        }
      });
    } else {
      console.log("Response:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listGeminiModels();