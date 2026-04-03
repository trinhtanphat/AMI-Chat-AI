'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState } from 'react'

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  isStreaming?: boolean
}

function formatTime() {
  const now = new Date()
  return now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === 'user'
  const [copied, setCopied] = useState(false)

  const copyMessage = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`msg-row ${isUser ? 'user' : ''}`}>
      {/* Avatar */}
      <div className={`msg-avatar ${isUser ? 'user-avatar' : 'ami'}`}>
        {isUser ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>AI</span>
        )}
      </div>

      {/* Body */}
      <div className="msg-body">
        <div className="msg-header">
          <span className="msg-name">{isUser ? 'Bạn' : 'VNSO AI'}</span>
          <span className="msg-time">{formatTime()}</span>
        </div>

        <div className="msg-content">
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
          ) : content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  const isInline = !match
                  if (isInline) {
                    return <code className={className} {...props}>{children}</code>
                  }
                  return (
                    <CodeBlock language={match[1]}>
                      {String(children).replace(/\n$/, '')}
                    </CodeBlock>
                  )
                },
              }}
            >
              {content}
            </ReactMarkdown>
          ) : null}
          {isStreaming && (
            <span className="typing-indicator" style={{ display: 'inline-flex', marginLeft: 4, padding: '0 4px', background: 'none' }}>
              <span /><span /><span />
            </span>
          )}
        </div>

        {/* Actions */}
        {!isUser && content && !isStreaming && (
          <div className="msg-actions">
            <button className="msg-action-btn" onClick={copyMessage} title={copied ? 'Đã copy!' : 'Copy'}>
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'relative', margin: '6px 0 8px', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px', background: 'rgba(0,0,0,0.4)', fontSize: 11, color: 'rgba(255,255,255,0.4)'
      }}>
        <span>{language}</span>
        <button
          onClick={handleCopy}
          style={{ background: 'none', border: 'none', color: copied ? '#4ade80' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '12px',
          background: 'rgba(0,0,0,0.3)',
          fontSize: '13px',
          borderRadius: 0,
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}
