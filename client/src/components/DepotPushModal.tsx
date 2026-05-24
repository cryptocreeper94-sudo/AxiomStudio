import React, { useState } from "react";
import { X, GitBranch, ArrowUpCircle, Loader2 } from "lucide-react";

interface DepotPushModalProps {
  onClose: () => void;
  onPush: (message: string) => Promise<void>;
  isPushing: boolean;
}

export default function DepotPushModal({ onClose, onPush, isPushing }: DepotPushModalProps) {
  const [commitMessage, setCommitMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    onPush(commitMessage);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="w-[400px] bg-[#0d1117] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white tracking-wide">AXIOM DEPOT PUSH</h3>
          </div>
          <button onClick={onClose} className="text-[rgba(255,255,255,0.4)] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <p className="text-xs text-[rgba(255,255,255,0.5)]">
            Commit your changes and push them directly to your configured remote repository.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[rgba(255,255,255,0.7)] flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" /> Commit Message
            </label>
            <textarea
              autoFocus
              value={commitMessage}
              onChange={e => setCommitMessage(e.target.value)}
              placeholder="e.g., feat(ui): added new dashboard layout"
              className="w-full h-24 bg-[#010409] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
              disabled={isPushing}
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPushing}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!commitMessage.trim() || isPushing}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold text-black bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              {isPushing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Pushing...
                </>
              ) : (
                <>
                  <ArrowUpCircle className="w-3 h-3" />
                  Commit & Push
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
