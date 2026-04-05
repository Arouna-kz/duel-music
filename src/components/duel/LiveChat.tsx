import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Send, MessageCircle, Shield, Smile, Reply, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

interface LiveChatProps {
  duelId: string;
  participants?: { id: string; name: string }[];
}

const BAD_WORDS = ["spam", "scam", "idiot", "stupid", "hate", "kill"];
const containsBadWords = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return BAD_WORDS.some(word => lowerText.includes(word));
};

const EMOJI_REACTIONS = ["🔥", "❤️", "👏", "😂", "🎵", "💯", "🏆", "⭐", "🎤", "💎", "🦁", "👑"];

export const LiveChat = ({ duelId, participants = [] }: LiveChatProps) => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    loadCurrentUser();

    const channel = supabase
      .channel(`chat-${duelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "duel_chat_messages", filter: `duel_id=eq.${duelId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          const { data: profArr } = await supabase.rpc("get_display_profiles", { user_ids: [newMsg.user_id] });
          const profile = profArr?.[0] || null;

          setMessages(prev => {
            let reply_to_name: string | undefined;
            let reply_to_message: string | undefined;
            if (newMsg.parent_id) {
              const parent = prev.find(m => m.id === newMsg.parent_id);
              if (parent) {
                reply_to_name = parent.user_name;
                reply_to_message = parent.message;
              }
            }
            return [...prev, {
              ...newMsg,
              user_name: profile?.full_name || t("userDefault"),
              avatar_url: profile?.avatar_url,
              reply_to_name,
              reply_to_message,
            }];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [duelId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadMessages = async () => {
    const { data: msgs } = await supabase
      .from("duel_chat_messages")
      .select("*")
      .eq("duel_id", duelId)
      .eq("is_moderated", false)
      .order("created_at", { ascending: true })
      .limit(100);

    if (msgs && msgs.length > 0) {
      const userIds = [...new Set(msgs.map(m => m.user_id))];
      const { data: profiles } = await supabase.rpc("get_display_profiles", { user_ids: userIds });

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const msgMap = new Map(msgs.map(m => [m.id, m]));
      setMessages(msgs.map(msg => {
        const parent = msg.parent_id ? msgMap.get(msg.parent_id) : null;
        const parentProfile = parent ? profileMap.get(parent.user_id) : null;
        return {
          ...msg,
          user_name: profileMap.get(msg.user_id)?.full_name || t("userDefault"),
          avatar_url: profileMap.get(msg.user_id)?.avatar_url,
          reply_to_name: parentProfile?.full_name || (parent ? t("userDefault") : undefined),
          reply_to_message: parent?.message,
        };
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt !== -1 && lastAt === val.length - 1) {
      setShowMentions(true);
      setMentionFilter("");
    } else if (lastAt !== -1) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(" ")) {
        setShowMentions(true);
        setMentionFilter(afterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    const lastAt = newMessage.lastIndexOf("@");
    setNewMessage(newMessage.slice(0, lastAt) + `@${name} `);
    setShowMentions(false);
    inputRef.current?.focus();
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
      const { error } = await supabase.from("duel_chat_messages").insert({
        duel_id: duelId, user_id: currentUser.id, message: newMessage.trim(),
        parent_id: replyTo?.id || null,
      });
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

  const renderMessage = (text: string) => {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) => 
      part.startsWith("@") ? (
        <span key={i} className="font-bold text-primary">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const allMentionable = [
    ...participants,
    ...messages
      .filter(m => !participants.find(p => p.id === m.user_id))
      .map(m => ({ id: m.user_id, name: m.user_name || t("userDefault") }))
      .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
  ].filter(p => !mentionFilter || p.name.toLowerCase().includes(mentionFilter));

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
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 mb-3"
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={msg.avatar_url || ""} />
                  <AvatarFallback className="text-xs">
                    {msg.user_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{msg.user_name}</span>
                    {participants.find(p => p.id === msg.user_id) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                        {participants.find(p => p.id === msg.user_id)?.name.includes("Manager") ? "🎙️" : "🎤"}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                  </div>
                  <p className="text-sm break-words">{renderMessage(msg.message)}</p>
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
        </ScrollArea>

        {showMentions && allMentionable.length > 0 && (
          <div className="mx-3 mb-1 bg-popover border border-border rounded-lg shadow-lg max-h-32 overflow-y-auto">
            {allMentionable.slice(0, 5).map(p => (
              <button
                key={p.id}
                onClick={() => insertMention(p.name)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                @{p.name}
              </button>
            ))}
          </div>
        )}

        {replyTo && (
          <div className="mx-3 mb-1 bg-primary/10 rounded-lg px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <Reply className="w-3 h-3 text-primary" />
              <span className="font-medium text-primary">{replyTo.user_name}</span>
              <span className="truncate max-w-[150px]">{replyTo.message}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
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
            onChange={handleInputChange}
            placeholder={t("messagePlaceholder")}
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
