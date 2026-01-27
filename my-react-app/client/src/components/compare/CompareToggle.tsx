import React, { useState } from "react";
import type { Version } from "@/types/collab";
import { Eye, ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompareToggle({
  peers, onChange,
}: { peers: Version[]; onChange: (peer?: Version, alpha?: number) => void }) {
  const [showPeerAnnotations, setShowPeerAnnotations] = useState<boolean>(false);
  const [selectedPeerId, setSelectedPeerId] = useState<string>("");
  const [opacityPercent, setOpacityPercent] = useState<number>(50);
  const [comparisonMode, setComparisonMode] = useState<"overlay" | "side-by-side">("overlay");

  const selectedPeer = peers.find(p => p.id === selectedPeerId);

  const handleToggleChange = (enabled: boolean) => {
    setShowPeerAnnotations(enabled);
    if (!enabled) {
      onChange(undefined, 0.5);
    } else if (selectedPeer) {
      onChange(selectedPeer, opacityPercent / 100);
    }
  };

  const handlePeerSelect = (peerId: string) => {
    setSelectedPeerId(peerId);
    const peer = peers.find(p => p.id === peerId);
    if (peer) {
      onChange(peer, opacityPercent / 100);
    }
  };

  const handleOpacityChange = (value: number) => {
    setOpacityPercent(value);
    if (selectedPeer) {
      onChange(selectedPeer, value / 100);
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-card space-y-4">
      <h4 className="font-semibold text-sm">Peer Comparison</h4>
      
      {/* Comparison Mode Selection */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={comparisonMode === "overlay" ? "default" : "outline"}
          className="flex-1 text-xs h-8"
          onClick={() => setComparisonMode("overlay")}
        >
          <Layers className="h-3 w-3 mr-1" />
          Overlay
        </Button>
        <Button
          size="sm"
          variant={comparisonMode === "side-by-side" ? "default" : "outline"}
          className="flex-1 text-xs h-8"
          onClick={() => setComparisonMode("side-by-side")}
        >
          <Layers className="h-3 w-3 mr-1" />
          Side-by-Side
        </Button>
      </div>

      {/* Toggle switch */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <Eye className="h-4 w-4" />
          Show Peer Annotations
        </label>
        <button
          onClick={() => handleToggleChange(!showPeerAnnotations)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showPeerAnnotations
              ? "bg-black dark:bg-white"
              : "bg-gray-300 dark:bg-gray-600"
          }`}
          title={showPeerAnnotations ? "Hide peer annotations" : "Show peer annotations"}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black transition-transform ${
              showPeerAnnotations ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Peer Selection - shown when toggle is enabled */}
      {showPeerAnnotations && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Choose a Peer</label>
          <div className="relative">
            <select
              value={selectedPeerId}
              onChange={(e) => handlePeerSelect(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-900 dark:border-gray-700"
              title="Select a peer to compare with"
            >
              <option value="">— Select a peer —</option>
              {peers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.authorName} • {new Date(p.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      )}

      {/* Opacity slider - shown when toggle is enabled */}
      {showPeerAnnotations && comparisonMode === "overlay" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Peer Opacity: {opacityPercent}%</label>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={opacityPercent}
            onChange={(e) => handleOpacityChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
            title="Adjust peer annotation opacity"
          />
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-muted-foreground">
        Compare your annotations with peer submissions to learn different approaches
      </p>
    </div>
  );
}
