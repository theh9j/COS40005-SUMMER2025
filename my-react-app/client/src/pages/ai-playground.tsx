import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Card, CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Bot, Send, Eraser, PlayCircle, Settings2, FileText, Hourglass, Cpu, Code2, RotateCcw
} from "lucide-react";

// ——————————————————————————————————————————————————————
// Types
// ——————————————————————————————————————————————————————
type Provider = "openai" | "anthropic" | "google" | "local";
type Mode = "chat" | "vision" | "embeddings" | "rerank";

type RunRecord = {
  id: string;
  mode: Mode;
  model: string;
  provider: Provider;
  prompt: string;
  response: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  createdAt: number;
};

// ——————————————————————————————————————————————————————
// Mock “inference” (replace later with your real API call)
// ——————————————————————————————————————————————————————
async function mockInfer({
  prompt,
  latency = 800,
}: {
  prompt: string;
  latency?: number;
}): Promise<{ text: string; tokensOut: number }> {
  // Fake thinking delay
  await new Promise((r) => setTimeout(r, latency));
  const echo = prompt.trim().length ? prompt.trim().slice(0, 400) : "Hello! 👋";
  // Return a playful, short response
  const text = `🔧 Mock AI: I received your prompt (${echo.length} chars).\n\nPreview:\n“${echo}”\n\nReplace mockInfer(...) with your real API call to stream or return responses.`;
  return { text, tokensOut: Math.max(8, Math.round(echo.length / 4)) };
}

// Real AI inference
async function realInfer({
  prompt,
  provider = "openai",
  model = "gpt-4o-mini",
  temperature = 0.7,
  maxTokens = 512,
}: {
  prompt: string;
  provider?: Provider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; tokensOut: number }> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("session_token")}`
    },
    body: JSON.stringify({
      provider,
      model,
      temperature,
      maxTokens,
      messages: [
        { role: "system", content: "You are a helpful AI assistant for medical education." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    text: data.content,
    tokensOut: data.tokensUsed || Math.round(data.content.length / 4)
  };
}

// ——————————————————————————————————————————————————————
// Page
// ——————————————————————————————————————————————————————
export default function AIPlayground() {
  const [, setLocation] = useLocation();

  // Core state
  const [mode, setMode] = useState<Mode>("chat");
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState<string>("gpt-4.1-mini");
  const [prompt, setPrompt] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(512);
  const [jsonMode, setJsonMode] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);

  const outRef = useRef<HTMLDivElement>(null);

  // Simple model presets (swap later with dynamic list per provider)
  const modelOptions: Record<Provider, string[]> = {
    openai: ["gpt-4.1-mini", "gpt-4o-mini", "o3-mini"],
    anthropic: ["claude-3.5-sonnet", "claude-3.5-haiku"],
    google: ["gemini-1.5-pro", "gemini-1.5-flash"],
    local: ["qwen2.5-coder:7b", "llama-3.1:8b", "mistral-nemo:12b"],
  };

  const tokensIn = useMemo(() => Math.max(6, Math.round(prompt.length / 4)), [prompt]);

  useEffect(() => {
    // Scroll output to bottom when new content arrives
    if (outRef.current) {
      outRef.current.scrollTop = outRef.current.scrollHeight;
    }
  }, [response]);

  const resetAll = () => {
    setPrompt("");
    setResponse("");
    setStreaming(false);
  };

  const run = async () => {
    if (!prompt.trim()) return;

    setIsRunning(true);
    setStreaming(true);
    setResponse("");

    const started = performance.now();

    // ——————————————————————————————
    // TODO: Replace this with:
    //
    // const res = await fetch("/api/ai/run", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": jsonMode ? "application/json" : "text/plain",
    //     Authorization: `Bearer ${tokenFromYourAuth}`,
    //   },
    //   body: JSON.stringify({
    //     mode, provider, model, prompt,
    //     temperature, maxTokens, response_format: jsonMode ? "json_object" : "text"
    //   }),
    // });
    //
    // If streaming, use ReadableStream to append chunks to setResponse(prev => prev + chunk)
    // ——————————————————————————————

    // Real AI result
    const { text, tokensOut } = await realInfer({ 
      prompt, 
      provider, 
      model, 
      temperature, 
      maxTokens 
    });
    // Simulate streaming
    for (const chunk of text.split(" ")) {
      await new Promise((r) => setTimeout(r, 12));
      setResponse((p) => (p ? p + " " + chunk : chunk));
    }

    const latencyMs = Math.round(performance.now() - started);
    setStreaming(false);
    setIsRunning(false);

    const record: RunRecord = {
      id: crypto.randomUUID(),
      mode,
      model,
      provider,
      prompt,
      response: text,
      tokensIn,
      tokensOut,
      latencyMs,
      createdAt: Date.now(),
    };
    setHistory((h) => [record, ...h].slice(0, 50));
  };

  return (
    <div className="min-h-screen bg-background" data-testid="ai-playground">
      {/* Header */}
      <header className="bg-card border-b border-border h-16 px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">AI Playground</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setLocation("/student")}>Student</Button>
          <Button variant="ghost" onClick={() => setLocation("/instructor")}>Instructor</Button>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <section className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  <h2 className="font-semibold">Parameters</h2>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setTemperature(0.7);
                    setMaxTokens(512);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>

              {/* Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Mode</Label>
                  <Select value={mode} onValueChange={(v: Mode) => setMode(v)}>
                    <SelectTrigger className="mt-2 h-9">
                      <SelectValue placeholder="Choose mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chat">Chat</SelectItem>
                      <SelectItem value="vision">Vision</SelectItem>
                      <SelectItem value="embeddings">Embeddings</SelectItem>
                      <SelectItem value="rerank">Rerank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Provider</Label>
                  <Select value={provider} onValueChange={(v: Provider) => {
                    setProvider(v);
                    setModel(modelOptions[v][0] || "");
                  }}>
                    <SelectTrigger className="mt-2 h-9">
                      <SelectValue placeholder="Choose provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Model */}
              <div>
                <Label className="text-xs">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="mt-2 h-9">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions[provider].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Temperature / Max tokens */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Temperature ({temperature.toFixed(2)})</Label>
                  <Input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Max tokens ({maxTokens})</Label>
                  <Input
                    type="range"
                    min={16}
                    max={4096}
                    step={16}
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  />
                </div>
              </div>

              {/* JSON mode */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">JSON mode</p>
                    <p className="text-xs text-muted-foreground">Ask the model for structured JSON</p>
                  </div>
                </div>
                <Switch checked={jsonMode} onCheckedChange={setJsonMode} />
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Run Stats
              </h2>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Tokens In</p>
                  <p className="font-semibold">{tokensIn}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tokens Out</p>
                  <p className="font-semibold">
                    {history[0]?.tokensOut ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Latency</p>
                  <p className="font-semibold">
                    {history[0]?.latencyMs ? `${history[0].latencyMs} ms` : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Streaming</span>
                  <span className="text-muted-foreground">{streaming ? "on" : "off"}</span>
                </div>
                <Progress value={streaming ? 66 : isRunning ? 90 : 0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Middle: Prompt & Output */}
        <section className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label className="text-xs">Prompt</Label>
              <Textarea
                className="min-h-[140px]"
                placeholder="Type your prompt or paste JSON schema…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {prompt.trim().length} chars • ~{tokensIn} tokens
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={resetAll}
                    disabled={isRunning}
                  >
                    <Eraser className="h-4 w-4" />
                    Clear
                  </Button>
                  <Button
                    className="gap-2"
                    onClick={run}
                    disabled={isRunning || !prompt.trim()}
                  >
                    {isRunning ? <Hourglass className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {isRunning ? "Running…" : "Run"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <h2 className="font-semibold">Output</h2>
                </div>
                <div className="text-xs text-muted-foreground">
                  {jsonMode ? "Expecting JSON" : "Text mode"}
                </div>
              </div>
              <ScrollArea ref={outRef} className="h-[320px] p-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {response || "Model output will appear here…"}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Recent Runs
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHistory([])}
                >
                  Clear history
                </Button>
              </div>

              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No runs yet.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-lg border hover:bg-secondary/50 cursor-pointer"
                      onClick={() => {
                        setPrompt(r.prompt);
                        setResponse(r.response);
                        setProvider(r.provider);
                        setModel(r.model);
                        setMode(r.mode);
                      }}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-secondary">{r.mode}</span>
                          <span className="text-muted-foreground">{r.provider}/{r.model}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                        <div>In: <b>{r.tokensIn}</b></div>
                        <div>Out: <b>{r.tokensOut}</b></div>
                        <div>Latency: <b>{r.latencyMs} ms</b></div>
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {r.prompt}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
