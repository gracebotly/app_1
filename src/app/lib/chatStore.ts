import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function createThread(name?: string): Promise<string> {
  if (!supabase) {
    throw new Error('Database not available');
  }
  
  const { data, error } = await supabase
    .from('threads')
    .insert({ name })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function saveMessages(threadId: string, messages: { role: string; content?: unknown; tool_calls?: unknown }[]): Promise<void> {
  if (!supabase) {
    console.warn('Database not available, skipping saveMessages');
    return;
  }
  
  const rows = messages.map((m) => ({
    thread_id: threadId,
    role: m.role,
    content: typeof m.content === 'string' ? m.content : (m.content ? JSON.stringify(m.content) : null),
    tool_calls: m.tool_calls ?? null,
    created_at: new Date().toISOString(),
  }));
  await supabase.from('messages').insert(rows);
}

export async function getThreadMessages(threadId: string): Promise<{ role: string; content: string; tool_calls?: unknown }[]> {
  if (!supabase) {
    console.warn('Database not available, returning empty messages');
    return [];
  }
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Failed to load messages:', error);
    return [];
  }
  return data.map((row) => ({
    role: row.role,
    content: row.content,
    tool_calls: row.tool_calls,
  }));
}
