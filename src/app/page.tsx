"use client";

import { C1Chat } from "@thesysai/genui-sdk";
import { AgentSelectionCard } from './components/AgentSelectionCard';
import "@crayonai/react-ui/styles/index.css";

export default function Home() {
  const handleSelectAgent = (agent: string) => {
    console.log('Selected agent:', agent);
    // TODO: Send agent selection to chat
  };

  return (
    <C1Chat 
      apiUrl="/api/chat" 
      theme={{ mode: "dark" }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '20px'
      }}>
        <AgentSelectionCard onSelectAgent={handleSelectAgent} />
      </div>
    </C1Chat>
  );
}
