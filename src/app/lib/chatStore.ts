import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function createThread(name?: string) {
  const { data, error } = await supabase
    .from('threads')
    .insert({ name })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function saveMessages(threadId: string, messages: { role: string; content: unknown; tool_calls?: unknown }[]) {
  const rows = messages.map((m) => ({
    thread_id: threadId,
    role: m.role,
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    tool_calls: m.tool_calls ?? null,
    created_at: new Date().toISOString(),
  }));
  await supabase.from('messages').insert(rows);
}

export async function getThreadMessages(threadId: string) {
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
