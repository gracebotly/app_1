"use client";

import { AgentSelectionCard } from './components/AgentSelectionCard';

export default function Home() {
  const handleSelectAgent = (agent: string) => {
    console.log('Selected agent:', agent);
    // TODO: Navigate to next step (webhook configuration)
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <AgentSelectionCard onSelectAgent={handleSelectAgent} />
    </div>
  );
}
