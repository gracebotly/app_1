"use client";

import { useState, useEffect } from 'react';
import { C1Chat, useThreadManager, useThreadListManager } from "@thesysai/genui-sdk";
import { AgentSelectionCard } from './components/AgentSelectionCard';


import "@crayonai/react-ui/styles/index.css";

export default function Home() {
  const [showAgentCard, setShowAgentCard] = useState(true);
  const [webhookClientId, setWebhookClientId] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<'waiting' | 'connected' | null>(null);
  
  const { selectedThreadId, createNewThread, selectThread } = useThreadManager();
  const { threads } = useThreadListManager();

  useEffect(() => {
    if (!webhookClientId || webhookStatus === 'connected') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/webhooks-status/${webhookClientId}`);
        const data = await res.json();
        
        if (data.dashboardReady) {
          setWebhookStatus('connected');
          clearInterval(pollInterval);
          
          // Automatically open the preview in a new tab
          window.open(data.previewUrl, "_blank");
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [webhookClientId, webhookStatus]);

  const handleSelectAgent = async (agent: string) => {
    console.log('Selected agent:', agent);
    setShowAgentCard(false);
    
    if (agent === 'webhook') {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const webhookUrl = `https://getflowetic.com/api/webhooks/${clientId}`;
      
      setWebhookClientId(clientId);
      setWebhookStatus('waiting');
      
      // Trigger webhook setup via prompt
      const textarea = document.querySelector('textarea[placeholder*="message"]') as HTMLTextAreaElement | null;
      const editableDiv = document.querySelector('div[contenteditable="true"]') as HTMLDivElement | null;
      const inputEl = textarea ?? editableDiv;
      if (inputEl) {
        if (inputEl instanceof HTMLTextAreaElement) {
          inputEl.value = `Create a webhook URL for me. My client ID is ${clientId} and the URL should be: ${webhookUrl}`;
        } else {
          inputEl.textContent = `Create a webhook URL for me. My client ID is ${clientId} and the URL should be: ${webhookUrl}`;
        }
        inputEl.dispatchEvent(new InputEvent("input"));
        setTimeout(() => {
          const form = inputEl.closest('form');
          form?.requestSubmit();
        }, 500);
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div>
        <button onClick={() => createNewThread()} className="my-2">+ New Chat</button>
        {threads.map((t) => (
          <div key={t.id} onClick={() => selectThread(t.id)} style={{ cursor: 'pointer', padding: '4px', background: t.id === selectedThreadId ? '#333' : 'transparent' }}>
            {t.name || 'Untitled'}
          </div>
        ))}
      </div>
      
      <C1Chat 
        apiUrl={`/api/chat?threadId=${selectedThreadId ?? ''}`} 
        theme={{ mode: "dark" }}
      />
      
      {showAgentCard && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '340px',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          <div style={{ pointerEvents: 'all' }}>
            <AgentSelectionCard onSelectAgent={handleSelectAgent} />
          </div>
        </div>
      )}
      
      {webhookStatus === 'waiting' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
          zIndex: 50
        }}>
          ⏳ Listening for webhook events...
        </div>
      )}
    </div>
  );
}
