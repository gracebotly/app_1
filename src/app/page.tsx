"use client";

import { useState } from 'react';
import { C1Chat } from "@thesysai/genui-sdk";
import { AgentSelectionCard } from './components/AgentSelectionCard';
import "@crayonai/react-ui/styles/index.css";

export default function Home() {
  const [showAgentCard, setShowAgentCard] = useState(true);

  const handleSelectAgent = (agent: string) => {
    console.log('Selected agent:', agent);
    setShowAgentCard(false);
    
    if (agent === 'webhook') {
      // Generate unique client ID
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const webhookUrl = `https://getflowetic.com/api/webhooks/${clientId}`;
      
      // Send system message to chat with webhook URL
      const chatInput = document.querySelector('textarea[placeholder*="message"]') as HTMLTextAreaElement;
      if (chatInput) {
        const message = `WEBHOOK_URL_GENERATED:${webhookUrl}:${clientId}`;
        chatInput.value = message;
        
        // Trigger submit
        const form = chatInput.closest('form');
        if (form) {
          form.requestSubmit();
        }
      }
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
    </div>
  );
}
