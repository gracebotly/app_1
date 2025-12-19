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
    // TODO: Pass agent selection to chat
  };

  return (
    <>
      <C1Chat apiUrl="/api/chat" theme={{ mode: "dark" }} />
      
      {showAgentCard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 20, 25, 0.95)',
          zIndex: 1000,
          padding: '20px'
        }}>
          <AgentSelectionCard onSelectAgent={handleSelectAgent} />
        </div>
      )}
    </>
  );
}
