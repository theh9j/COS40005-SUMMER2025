import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Bot, Zap, Brain, AlertCircle } from "lucide-react";
import { aiService, AIProvider } from "@/lib/ai-service";

interface AISettingsProps {
  onClose?: () => void;
}

interface ProviderInfo {
  models: string[];
  available: boolean;
}

export default function AISettings({ onClose }: AISettingsProps) {
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [enableSuggestions, setEnableSuggestions] = useState(true);
  const [enableAnalysis, setEnableAnalysis] = useState(true);
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>("");

  // Load available providers on mount
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await fetch("/api/ai/providers");
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers);
      }
    } catch (error) {
      console.error("Failed to load AI providers:", error);
    }
  };

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    const providerInfo = providers[newProvider];
    if (providerInfo?.models.length > 0) {
      setModel(providerInfo.models[0]);
    }
  };

  const handleSaveSettings = () => {
    aiService.updateConfig({
      provider,
      model,
      temperature,
      maxTokens
    });

    // Save to localStorage for persistence
    localStorage.setItem("ai-settings", JSON.stringify({
      provider,
      model,
      temperature,
      maxTokens,
      enableSuggestions,
      enableAnalysis
    }));

    onClose?.();
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult("");

    try {
      const testMessage = {
        id: "test",
        role: "user" as const,
        content: "Hello, this is a test message. Please respond briefly.",
        timestamp: Date.now()
      };

      const response = await aiService.chat([testMessage]);
      setTestResult(`✅ Success! Response: ${response.content.slice(0, 100)}...`);
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load saved settings on mount
  useEffect(() => {
    const saved = localStorage.getItem("ai-settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setProvider(settings.provider || "openai");
        setModel(settings.model || "gpt-4o-mini");
        setTemperature(settings.temperature || 0.7);
        setMaxTokens(settings.maxTokens || 1000);
        setEnableSuggestions(settings.enableSuggestions ?? true);
        setEnableAnalysis(settings.enableAnalysis ?? true);
      } catch (error) {
        console.error("Failed to load AI settings:", error);
      }
    }
  }, []);

  const currentProviderInfo = providers[provider];
  const isProviderAvailable = currentProviderInfo?.available ?? false;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>AI Assistant Settings</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">AI Provider</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(providers).map(([key, info]) => (
              <Button
                key={key}
                variant={provider === key ? "default" : "outline"}
                className="justify-start h-auto p-3"
                onClick={() => handleProviderChange(key as AIProvider)}
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium capitalize">{key}</div>
                    <div className="text-xs text-muted-foreground">
                      {info.available ? (
                        <Badge variant="secondary" className="text-xs">
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          No API Key
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Model Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {currentProviderInfo?.models.map((modelName) => (
                <SelectItem key={modelName} value={modelName}>
                  {modelName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Parameters */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Temperature</Label>
              <span className="text-sm text-muted-foreground">
                {temperature.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[temperature]}
              onValueChange={(value) => setTemperature(value[0])}
              max={2}
              min={0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Higher values make output more creative, lower values more focused
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Max Tokens</Label>
              <span className="text-sm text-muted-foreground">{maxTokens}</span>
            </div>
            <Slider
              value={[maxTokens]}
              onValueChange={(value) => setMaxTokens(value[0])}
              max={4000}
              min={100}
              step={100}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Maximum length of AI responses
            </p>
          </div>
        </div>

        <Separator />

        {/* Features */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Features</Label>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Smart Suggestions</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Get contextual suggestions based on your case
              </p>
            </div>
            <Switch
              checked={enableSuggestions}
              onCheckedChange={setEnableSuggestions}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span className="text-sm font-medium">Annotation Analysis</span>
              </div>
              <p className="text-xs text-muted-foreground">
                AI analysis of your annotations for improvement
              </p>
            </div>
            <Switch
              checked={enableAnalysis}
              onCheckedChange={setEnableAnalysis}
            />
          </div>
        </div>

        <Separator />

        {/* Test Connection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Test Connection</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isLoading || !isProviderAvailable}
              className="flex-1"
            >
              {isLoading ? "Testing..." : "Test AI Connection"}
            </Button>
          </div>
          
          {!isProviderAvailable && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>API key not configured for {provider}</span>
            </div>
          )}
          
          {testResult && (
            <div className="p-3 rounded-lg bg-muted text-sm">
              {testResult}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSaveSettings}>
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}