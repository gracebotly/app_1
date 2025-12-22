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
      // Create a real client row in Supabase so we get a real UUID (no placeholders)
      const agencyId = prompt('Enter your agencyId (UUID) from Supabase:') || '';

      if (!agencyId) {
        alert('agencyId is required to create a client.');
        return;
      }

      const clientName = prompt('Client name (e.g. "ABC Dental"):', 'ABC Dental') || 'ABC Dental';

      const createRes = await fetch('/api/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          name: clientName,
        }),
      });

      if (!createRes.ok) {
        const text = await createRes.text();
        alert(`Failed to create client: ${text}`);
        return;
      }

      const created = (await createRes.json()) as { clientId: string; subdomain: string };

      const clientId = created.clientId;
      const webhookUrl = `https://www.getflowetic.com/api/webhooks/${clientId}`;

      setWebhookClientId(clientId);
      setWebhookStatus('waiting');

      // Trigger webhook setup via prompt (assistant will display the URL)
      const textarea = document.querySelector('textarea[placeholder*="message"]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.value =
          `Great — I created a new client.\n\n` +
          `Client Name: ${clientName}\n` +
          `Client ID: ${clientId}\n` +
          `Webhook URL: ${webhookUrl}\n\n` +
          `Now generate a dashboard preview from my next webhook payload, and tell me when it is ready.`;

        textarea.focus();

        setTimeout(() => {
          const form = textarea.closest('form');
          if (form) {
            form.requestSubmit();
          }
        }, 500);
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <C1Chat 
        apiUrl="/api/chat" 
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
