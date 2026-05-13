import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, ShieldAlert } from 'lucide-react';
import '../ide.css';

interface MarkdownViewerProps {
  content: string;
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className="markdown-viewer" style={{
      padding: '2rem',
      maxWidth: '900px',
      margin: '0 auto',
      color: '#e2e8f0',
      fontFamily: "'Inter', sans-serif",
      lineHeight: 1.6,
      overflowY: 'auto',
      height: '100%',
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ node, ...props }) => <h1 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '2rem 0 1rem', color: '#fff', letterSpacing: '-0.02em' }} {...props} />,
          h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '1.5rem 0 0.75rem', color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }} {...props} />,
          h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '1.25rem 0 0.5rem', color: '#cbd5e1' }} {...props} />,
          p: ({ node, ...props }) => <p style={{ margin: '0 0 1rem 0' }} {...props} />,
          ul: ({ node, ...props }) => <ul style={{ margin: '0 0 1rem 0', paddingLeft: '1.5rem', listStyleType: 'disc' }} {...props} />,
          ol: ({ node, ...props }) => <ol style={{ margin: '0 0 1rem 0', paddingLeft: '1.5rem', listStyleType: 'decimal' }} {...props} />,
          li: ({ node, ...props }) => <li style={{ margin: '0.25rem 0' }} {...props} />,
          a: ({ node, ...props }) => <a style={{ color: '#06b6d4', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#38bdf8'} onMouseOut={e => e.currentTarget.style.color = '#06b6d4'} {...props} />,
          table: ({ node, ...props }) => (
            <div style={{ overflowX: 'auto', margin: '1.5rem 0', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} {...props} />
            </div>
          ),
          th: ({ node, ...props }) => <th style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, color: '#f8fafc' }} {...props} />,
          td: ({ node, ...props }) => <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }} {...props} />,
          blockquote: ({ node, ...props }) => {
            const strContent = String(props.children);
            let icon = <Info style={{ width: 18, height: 18, color: '#3b82f6', flexShrink: 0 }} />;
            let borderColor = '#3b82f6';
            let bg = 'rgba(59, 130, 246, 0.05)';
            
            if (strContent.includes('[!NOTE]')) {
              icon = <Info style={{ width: 18, height: 18, color: '#3b82f6', flexShrink: 0 }} />;
              borderColor = '#3b82f6'; bg = 'rgba(59, 130, 246, 0.05)';
            } else if (strContent.includes('[!TIP]')) {
              icon = <CheckCircle2 style={{ width: 18, height: 18, color: '#10b981', flexShrink: 0 }} />;
              borderColor = '#10b981'; bg = 'rgba(16, 185, 129, 0.05)';
            } else if (strContent.includes('[!IMPORTANT]')) {
              icon = <AlertCircle style={{ width: 18, height: 18, color: '#8b5cf6', flexShrink: 0 }} />;
              borderColor = '#8b5cf6'; bg = 'rgba(139, 92, 246, 0.05)';
            } else if (strContent.includes('[!WARNING]')) {
              icon = <AlertTriangle style={{ width: 18, height: 18, color: '#f59e0b', flexShrink: 0 }} />;
              borderColor = '#f59e0b'; bg = 'rgba(245, 158, 11, 0.05)';
            } else if (strContent.includes('[!CAUTION]')) {
              icon = <ShieldAlert style={{ width: 18, height: 18, color: '#ef4444', flexShrink: 0 }} />;
              borderColor = '#ef4444'; bg = 'rgba(239, 68, 68, 0.05)';
            } else {
              return <blockquote style={{ borderLeft: '4px solid rgba(255,255,255,0.2)', paddingLeft: '1rem', marginLeft: 0, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }} {...props} />;
            }

            // Remove the [!TYPE] text from rendering
            const cleanContent = React.Children.map(props.children, child => {
              if (typeof child === 'string') {
                return child.replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/g, '');
              }
              // If it's a <p> element, we need to clean its children too
              if (React.isValidElement(child) && child.props.children) {
                const cleanedGrandchildren = React.Children.map(child.props.children, gc => {
                  if (typeof gc === 'string') return gc.replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/g, '');
                  return gc;
                });
                return React.cloneElement(child, { ...child.props, children: cleanedGrandchildren });
              }
              return child;
            });

            return (
              <div style={{ display: 'flex', gap: '0.75rem', margin: '1.5rem 0', padding: '1rem', borderLeft: `4px solid ${borderColor}`, backgroundColor: bg, borderRadius: '0 8px 8px 0' }}>
                {icon}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '-0.1rem' }}>
                  {cleanContent}
                </div>
              </div>
            );
          },
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = inline || !match;
            
            if (isInline) {
              return (
                <code style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.2em 0.4em', borderRadius: '4px', fontSize: '0.85em', fontFamily: "'Fira Code', 'Consolas', monospace", color: '#a855f7' }} {...props}>
                  {children}
                </code>
              );
            }
            
            return (
              <div style={{ margin: '1.5rem 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {match[1]}
                </div>
                <pre style={{ margin: 0, padding: '1rem', backgroundColor: 'rgba(0,0,0,0.3)', overflowX: 'auto' }}>
                  <code style={{ fontSize: '0.85em', fontFamily: "'Fira Code', 'Consolas', monospace", color: '#e2e8f0' }} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
