import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Archive, ArrowLeft, GitBranch, Star, Clock, 
  FolderOpen, FileCode, Lock, Globe, HardDrive, GitCommit, FileText,
  Download, Copy, Check, BookOpen
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { marked } from "marked";
import "./axiom-depot.css";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const timeAgo = (date: string | null) => {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

export default function AxiomDepotRepo() {
  const [match, params] = useRoute("/depot/repo/:slug");
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [repo, setRepo] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [readme, setReadme] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"code" | "snapshots">("code");
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState<string | null>(null);

  useEffect(() => {
    if (!match || !params?.slug) return;
    
    setLoading(true);
    fetch(`/api/depot/repos/${params.slug}`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setRepo(data.repo);
        setFiles(data.files || []);
        setSnapshots(data.snapshots || []);
        // Fetch README
        if (data.repo?.id) {
          fetch(`/api/depot/repos/${data.repo.id}/readme`)
            .then(r => r.json())
            .then(d => { if (d.readme) setReadme(d.readme); })
            .catch(() => {});
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [match, params?.slug]);

  if (loading) {
    return (
      <div className="depot-app flex items-center justify-center min-h-screen">
        <div className="depot-spinner w-8 h-8" />
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="depot-app flex flex-col items-center justify-center min-h-screen">
        <Archive className="w-12 h-12 text-[rgba(255,255,255,0.2)] mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Repository Not Found</h2>
        <p className="text-[rgba(255,255,255,0.5)] mb-6">{error || "The repository you are looking for does not exist or is private."}</p>
        <Link href="/depot">
          <button className="depot-btn-primary">Return to Depot</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="depot-app min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="depot-nav sticky top-0 z-50">
        <div className="depot-nav-inner">
          <div className="flex items-center gap-4">
            <Link href="/depot">
              <button className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-cyan-400" />
              <span className="font-semibold text-white text-lg">
                {repo.name}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.1)] text-[10px] text-[rgba(255,255,255,0.6)] font-bold uppercase tracking-wider ml-2 flex items-center gap-1">
                {repo.is_private ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                {repo.is_private ? "Private" : "Public"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="depot-btn-ghost flex items-center gap-2">
              <Star className="w-4 h-4" /> Star ({repo.stars})
            </button>
            <button 
              className="depot-btn-ghost flex items-center gap-2"
              disabled={cloning}
              onClick={async () => {
                setCloning(true);
                setCloneResult(null);
                try {
                  const token = localStorage.getItem('token') || '';
                  const res = await fetch(`/api/depot/repos/${repo.id}/clone`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ conversationId: 'default' }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setCloneResult(`✓ Cloned ${data.imported} files to workspace`);
                  } else {
                    setCloneResult(`✗ ${data.error}`);
                  }
                } catch (err: any) {
                  setCloneResult(`✗ ${err.message}`);
                }
                setCloning(false);
                setTimeout(() => setCloneResult(null), 4000);
              }}
            >
              <Download className="w-4 h-4" /> {cloning ? 'Cloning...' : 'Clone to Workspace'}
            </button>
            {cloneResult && (
              <span className={`text-xs font-medium ${cloneResult.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                {cloneResult}
              </span>
            )}
            <a href="https://axiomstudio.dev" target="_blank" rel="noopener noreferrer">
              <button className="depot-btn-primary">Open in Studio</button>
            </a>
          </div>
        </div>
      </nav>

      {/* Header Stats */}
      <div className="bg-[#0d1117] border-b border-[rgba(255,255,255,0.05)] px-8 py-6">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-[rgba(255,255,255,0.7)] text-base mb-4 max-w-2xl leading-relaxed">
            {repo.description || "No description provided."}
          </p>
          <div className="flex flex-wrap items-center gap-6 text-sm text-[rgba(255,255,255,0.5)]">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              <span className="text-white font-medium">{repo.file_count}</span> files
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span className="text-white font-medium">{formatBytes(Number(repo.total_size_bytes))}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last updated {timeAgo(repo.last_snapshot_at || repo.updated_at)}
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-6 mt-8 border-b border-[rgba(255,255,255,0.1)]">
            <button 
              className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'code' ? 'text-white' : 'text-[rgba(255,255,255,0.5)] hover:text-white'}`}
              onClick={() => setActiveTab('code')}
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4" /> Code
              </div>
              {activeTab === 'code' && <motion.div layoutId="repo-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
            </button>
            <button 
              className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'snapshots' ? 'text-white' : 'text-[rgba(255,255,255,0.5)] hover:text-white'}`}
              onClick={() => setActiveTab('snapshots')}
            >
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4" /> Snapshots <span className="bg-[rgba(255,255,255,0.1)] text-xs px-2 py-0.5 rounded-full">{repo.snapshot_count}</span>
              </div>
              {activeTab === 'snapshots' && <motion.div layoutId="repo-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-8 py-8">
        {activeTab === 'code' ? (
          <>
          <div className="bg-[#0d1117] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm font-medium text-white">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center text-[10px] font-bold">
                  {repo.username?.[0]?.toUpperCase() || (user as any)?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span>{repo.username || 'You'}</span>
                <span className="text-[rgba(255,255,255,0.4)] font-normal text-xs">{snapshots[0]?.message || 'Initial commit'}</span>
              </div>
              <div className="text-[rgba(255,255,255,0.4)] text-xs">
                {timeAgo(snapshots[0]?.created_at || repo.created_at)}
              </div>
            </div>
            
            <div className="divide-y divide-[rgba(255,255,255,0.05)]">
              {files.length === 0 ? (
                <div className="p-8 text-center text-[rgba(255,255,255,0.5)] text-sm">
                  This repository is empty. Push some code from Axiom Studio to get started!
                </div>
              ) : (
                files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                    <div className="flex items-center gap-3">
                      {file.is_directory ? (
                        <FolderOpen className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <FileText className="w-4 h-4 text-[rgba(255,255,255,0.4)] group-hover:text-cyan-200 transition-colors" />
                      )}
                      <span className="text-sm text-[rgba(255,255,255,0.8)] font-medium group-hover:text-cyan-400 transition-colors cursor-pointer">
                        {file.file_path}
                      </span>
                    </div>
                    <div className="text-xs text-[rgba(255,255,255,0.3)] tabular-nums">
                      {formatBytes(Number(file.size_bytes))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* README */}
          {readme && (
            <div className="mt-6 bg-[#0d1117] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
              <div className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)] px-4 py-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">README.md</span>
              </div>
              <div 
                className="p-6 prose prose-invert prose-sm max-w-none"
                style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, fontSize: 14 }}
                dangerouslySetInnerHTML={{ __html: marked.parse(readme, { gfm: true, breaks: true }) as string }}
              />
            </div>
          )}
          </>
        ) : (
          <div className="space-y-4">
            {snapshots.length === 0 ? (
              <div className="p-8 text-center text-[rgba(255,255,255,0.5)] bg-[#0d1117] border border-[rgba(255,255,255,0.1)] rounded-xl text-sm">
                No snapshots have been pushed to this repository yet.
              </div>
            ) : (
              snapshots.map((snap) => (
                <div key={snap.id} className="bg-[#0d1117] border border-[rgba(255,255,255,0.1)] rounded-xl p-5 hover:border-[rgba(255,255,255,0.2)] transition-colors flex items-start gap-4">
                  <div className="mt-1">
                    <GitCommit className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-base mb-1">{snap.message}</h4>
                    <div className="flex items-center gap-4 text-xs text-[rgba(255,255,255,0.4)]">
                      <span>{repo.username || 'You'} committed {timeAgo(snap.created_at)}</span>
                      <span className="flex items-center gap-1.5"><FolderOpen className="w-3 h-3" /> {snap.file_count} files</span>
                      <span className="flex items-center gap-1.5"><HardDrive className="w-3 h-3" /> {formatBytes(Number(snap.total_size_bytes))}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.05)] px-2 py-1 rounded">
                      {snap.id.split('-')[0]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
