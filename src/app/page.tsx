"use client";

import { useState, useEffect } from 'react';
import { C1Chat } from "@thesysai/genui-sdk";
import { AgentSelectionCard } from './components/AgentSelectionCard';


import "@crayonai/react-ui/styles/index.css";

export default function Home() {
  const [showAgentCard, setShowAgentCard] = useState(true);
  const [webhookClientId, setWebhookClientId] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<'waiting' | 'connected' | null>(null);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [previewClientId, setPreviewClientId] = useState<string | null>(null);
  const [previewSubdomain, setPreviewSubdomain] = useState<string | null>(null);
  const [webhookJson, setWebhookJson] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
      try {
        setIsGenerating(true);
        setPreviewError(null);
        
        // Auto-create client using existing endpoint
        const clientRes = await fetch('/api/clients/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Untitled Client' }),
        });
        
        if (!clientRes.ok) {
          throw new Error('Failed to create client');
        }
        
        const { clientId, subdomain } = await clientRes.json();
        setPreviewClientId(clientId);
        setPreviewSubdomain(subdomain);
        setShowPreviewPanel(true);
        setIsGenerating(false);
        
      } catch (err) {
        console.error('Failed to create client:', err);
        setPreviewError('Failed to setup. Please try again.');
        setIsGenerating(false);
      }
    }
  };

  const handleGeneratePreview = async () => {
    if (!previewClientId || !webhookJson.trim()) {
      setPreviewError('Please paste webhook JSON data');
      return;
    }
    
    try {
      setIsGenerating(true);
      setPreviewError(null);
      
      // Validate JSON
      const parsedData = JSON.parse(webhookJson);
      
      // Call internal preview API (NEW ENDPOINT - deterministic save)
      const response = await fetch('/api/preview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: previewClientId,
          webhookData: parsedData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate dashboard');
      }
      
      const result = await response.json();
      
      // Auto-open preview in new tab (spec is guaranteed saved)
      if (result.previewUrl) {
        window.open(result.previewUrl, '_blank');
      }
      
      setIsGenerating(false);
      setPreviewError(null);
      
      // Reset for next generation
      setWebhookJson('');
      
    } catch (err) {
      console.error('Failed to generate preview:', err);
      setPreviewError(err instanceof Error ? err.message : 'Invalid JSON or generation failed');
      setIsGenerating(false);
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
      
      {showPreviewPanel && (
        <div style={{
          position: 'absolute',
          top: '60px',
          right: '20px',
          width: '400px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          padding: '24px',
          zIndex: 10,
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#111' }}>
              🎯 Preview Generator
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
              Client created: <strong>{previewSubdomain}</strong>
            </p>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
              Paste Webhook JSON:
            </label>
            <textarea
              value={webhookJson}
              onChange={(e) => setWebhookJson(e.target.value)}
              placeholder='{"call_id": "123", "status": "completed", ...}'
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                border: '1px solid #ddd',
                borderRadius: '8px',
                resize: 'vertical',
              }}
            />
          </div>
          
          {previewError && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#c00',
            }}>
              {previewError}
            </div>
          )}
          
          <button
            onClick={handleGeneratePreview}
            disabled={isGenerating || !webhookJson.trim()}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              background: isGenerating ? '#999' : '#4F46E5',
              border: 'none',
              borderRadius: '8px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            {isGenerating ? '⏳ Generating...' : '🚀 Generate Preview'}
          </button>
          
          <button
            onClick={() => {
              setShowPreviewPanel(false);
              setShowAgentCard(true);
              setPreviewClientId(null);
              setWebhookJson('');
              setPreviewError(null);
            }}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '8px',
              fontSize: '13px',
              color: '#666',
              background: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
