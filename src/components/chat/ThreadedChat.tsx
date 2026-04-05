import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Send, MessageCircle, Shield, Smile, Reply, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_name?: string;
  avatar_url?: string;
  parent_id?: string | null;
  reply_to_name?: string;
  reply_to_message?: string;
}

interface ThreadedChatProps {
  chatType: "duel" | "concert" | "live";
  entityId: string;
  participants?: { id: string; name: string }[];
}

const BAD_WORDS = ["spam", "scam", "idiot", "stupid", "hate", "kill"];
const containsBadWords = (text: string): boolean => {
  return BAD_WORDS.some(word => text.toLowerCase().includes(word));
};

const EMOJI_REACTIONS = ["🔥", "❤️", "👏", "😂", "🎵", "💯", "🏆", "⭐", "🎤", "💎", "🦁", "👑"];

const TABLE_MAP = {
  duel: { table: "duel_chat_messages", idCol: "duel_id" },
  concert: { table: "concert_chat_messages", idCol: "concert_id" },
  live: { table: "live_chat_messages", idCol: "live_id" },
} as const;

export const ThreadedChat = ({ chatType, entityId, participants = [] }: ThreadedChatProps) => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { table, idCol } = TABLE_MAP[chatType];

  useEffect(() => {
    loadMessages();
    loadCurrentUser();

    const channel = supabase
      .channel(`${chatType}-chat-${entityId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `${idCol}=eq.${entityId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.is_moderated) return;

          const { data: profArr } = await supabase.rpc("get_display_profiles", { user_ids: [newMsg.user_id] });
          const profile = profArr?.[0] || null;

          let replyName: string | undefined;
          let replyMessage: string | undefined;
          if (newMsg.parent_id) {
            const parent = messages.find(m => m.id === newMsg.parent_id);
            if (parent) {
              replyName = parent.user_name;
              replyMessage = parent.message;
            }
          }

          const enriched: ChatMessage = {
            ...newMsg,
            user_name: profile?.full_name || t("userDefault"),
            avatar_url: profile?.avatar_url,
            reply_to_name: replyName,
            reply_to_message: replyMessage,
          };

          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            if (newMsg.parent_id && !replyName) {
              const p = prev.find(m => m.id === newMsg.parent_id);
              if (p) {
                enriched.reply_to_name = p.user_name;
                enriched.reply_to_message = p.message;
              }
            }
            return [...prev, enriched];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [entityId, chatType]);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadMessages = async () => {
    let query: any;
    if (chatType === "duel") {
      query = supabase.from("duel_chat_messages").select("*").eq("duel_id", entityId).eq("is_moderated", false);
    } else if (chatType === "concert") {
      query = supabase.from("concert_chat_messages").select("*").eq("concert_id", entityId).eq("is_moderated", false);
    } else {
      query = supabase.from("live_chat_messages").select("*").eq("live_id", entityId).eq("is_moderated", false);
    }
    const { data: msgs } = await query.order("created_at", { ascending: true }).limit(100);

    if (msgs && msgs.length > 0) {
      const userIds = [...new Set((msgs as any[]).map((m: any) => m.user_id))] as string[];
      const { data: profiles } = await supabase.rpc("get_display_profiles", { user_ids: userIds });

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const msgMap = new Map<string, any>();

      const enriched = msgs.map((msg: any) => {
        const m: ChatMessage = {
          ...msg,
          user_name: profileMap.get(msg.user_id)?.full_name || t("userDefault"),
          avatar_url: profileMap.get(msg.user_id)?.avatar_url,
        };
        msgMap.set(msg.id, m);
        return m;
      });

      enriched.forEach((m: ChatMessage) => {
        if (m.parent_id) {
          const parent = msgMap.get(m.parent_id);
          if (parent) {
            m.reply_to_name = parent.user_name;
            m.reply_to_message = parent.message;
          }
        }
      });

      setMessages(enriched);
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (!currentUser) {
      toast({ title: t("loginRequired"), description: t("mustBeLoggedToChat"), variant: "destructive" });
      return;
    }

    if (containsBadWords(newMessage)) {
      toast({ title: t("messageRefused"), description: t("inappropriateContent"), variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const insertData: any = {
        [idCol]: entityId,
        user_id: currentUser.id,
        message: newMessage.trim(),
      };
      if (replyTo && (chatType === "duel" || chatType === "concert")) {
        insertData.parent_id = replyTo.id;
      }

      const { error } = await supabase.from(table).insert(insertData);
      if (error) throw error;
      setNewMessage("");
      setReplyTo(null);
    } catch {
      toast({ title: t("errorTitle"), description: t("cannotSendMessage"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(language === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="font-bold text-primary">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          {t("liveChat")}
          <span className="ml-auto" title={t("autoModeration")}>
            <Shield className="w-4 h-4 text-green-500" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4 overflow-x-hidden scrollbar-hidden" ref={scrollRef}>
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 mb-3 group"
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={msg.avatar_url || ""} />
                  <AvatarFallback className="text-xs">
                    {msg.user_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {msg.reply_to_name && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5 bg-muted/50 rounded px-1.5 py-0.5 w-fit">
                      <Reply className="w-2.5 h-2.5" />
                      <span className="font-semibold text-primary">{msg.reply_to_name}</span>
                      <span className="truncate max-w-[120px]">{msg.reply_to_message}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{msg.user_name}</span>
                    {participants.find(p => p.id === msg.user_id) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                        {participants.find(p => p.id === msg.user_id)?.name.includes("Manager") ? "🎙️" : "🎤"}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                    <button
                      onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                    >
                      <Reply className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{renderMessageText(msg.message)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t("beFirstToSendMessage")}</p>
            </div>
          )}
          <div ref={bottomRef} />
        </ScrollArea>

        {replyTo && (
          <div className="mx-3 mb-1 bg-muted/50 border border-border rounded-lg px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <Reply className="w-3 h-3 text-primary shrink-0" />
              <span className="font-medium text-primary">{replyTo.user_name}</span>
              <span className="truncate max-w-[150px]">{replyTo.message}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="p-3 border-t flex gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="shrink-0">
                <Smile className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top" align="start">
              <div className="grid grid-cols-6 gap-1">
                {EMOJI_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="text-xl p-1 hover:bg-muted rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={replyTo ? `${t("replyToPlaceholder")} ${replyTo.user_name}...` : "Message..."}
            maxLength={200}
            disabled={!currentUser}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={sending || !currentUser}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
