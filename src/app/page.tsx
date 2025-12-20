"use client";

import { useState, useEffect } from 'react';
import { C1Chat } from "@thesysai/genui-sdk";
import { AgentSelectionCard } from './components/AgentSelectionCard';
import "@crayonai/react-ui/styles/index.css";

export default function Home() {
  const [showAgentCard, setShowAgentCard] = useState(true);
  const [webhookClientId, setWebhookClientId] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<'waiting' | 'connected' | null>(null);

  useEffect(() => {
    if (!webhookClientId || webhookStatus === 'connected') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/webhooks-status/${webhookClientId}`);
        const data = await res.json();
        
        if (data.dashboardReady) {
          setWebhookStatus('connected');
          clearInterval(pollInterval);
          
          // Send success notification to chat
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: {
                role: 'user',
                content: 'Webhook connected successfully',
                id: `msg_success_${Date.now()}`
              },
              threadId: 'main-thread',
              responseId: `resp_success_${Date.now()}`,
              webhookSuccess: {
                previewUrl: data.previewUrl,
                templateName: data.templateName
              }
            })
          }).catch(err => console.error('Failed to send success message:', err));
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
      
      // Send message to chat API to trigger AI response
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: {
            role: 'user',
            content: 'I want to set up a webhook connection for my dashboard.',
            id: `msg_${Date.now()}`
          },
          threadId: 'main-thread',
          responseId: `resp_${Date.now()}`,
          webhookData: {
            clientId,
            webhookUrl
          }
        })
      }).catch(err => console.error('Failed to send webhook message:', err));
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <C1Chat apiUrl="/api/chat" theme={{ mode: "dark" }} />
      
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
          background: '#1f2937',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          zIndex: 50
        }}>
          ⏳ Waiting for webhook connection...
        </div>
      )}
    </div>
  );
}
