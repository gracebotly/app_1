import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';

export type DBMessage = OpenAI.Chat.ChatCompletionMessageParam & {
  id?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export const getMessageStore = (threadId: string) => {
  return {
    addMessage: async (message: DBMessage) => {
      await supabase.from('chat_messages').insert({
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        thread_id: threadId,
        role: message.role,
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        created_at: new Date().toISOString()
      });
    },

    getMessages: async (): Promise<DBMessage[]> => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to load messages:', error);
        return [];
      }

      return data.map(row => ({
        id: row.id,
        role: row.role,
        content: row.content
      }));
    },

    getOpenAICompatibleMessageList: async () => {
      const messages = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (messages.error || !messages.data) {
        return [];
      }

      return messages.data.map((m) => ({
        role: m.role,
        content: m.content
      }));
    },
  };
};
