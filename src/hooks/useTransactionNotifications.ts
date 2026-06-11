/**
 * useTransactionNotifications
 * ---------------------------
 * Souscrit à `notifications` filtrée par user_id pour afficher des toasts
 * temps réel sur les évènements financiers (recharge confirmée, retrait
 * validé/refusé, cadeau reçu, vote crédité, etc.).
 *
 * Doit être monté UNE seule fois au top-level (App.tsx ou layout) pour
 * éviter les doublons.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Coins, Gift, Banknote, ShoppingCart } from "lucide-react";
import { createElement } from "react";

/**
 * Subscribes to realtime changes on transactional tables for the
 * current user and surfaces a toast when one is confirmed.
 * Covers: credit purchases (top-ups), gifts received,
 * withdrawal request status changes, and ticket purchases.
 *
 * Mounted once on the Profile page so users see the confirmation
 * even if they were on another tab when the change happened.
 */
export const useTransactionNotifications = (userId: string | null) => {
  const { t } = useLanguage();

  useEffect(() => {
    if (!userId) return;

    const fmt = (n: number) =>
      `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

    // Credit purchases (top-ups)
    const purchasesChannel = supabase
      .channel(`tx-notif-purchases-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "credit_purchases",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row?.status !== "completed") return;
          toast.success(t("txNotifPurchaseTitle"), {
            description: `+${fmt(row.credits_amount)} ${t("txNotifCredits")} (${fmt(
              row.paid_amount,
            )} ${row.currency})`,
            icon: createElement(Coins, { className: "w-4 h-4" }),
          });
        },
      )
      .subscribe();

    // Gifts received
    const giftsChannel = supabase
      .channel(`tx-notif-gifts-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gift_transactions",
          filter: `to_user_id=eq.${userId}`,
        },
        () => {
          toast.success(t("txNotifGiftTitle"), {
            description: t("txNotifGiftDesc"),
            icon: createElement(Gift, { className: "w-4 h-4" }),
          });
        },
      )
      .subscribe();

    // Tickets purchased (concerts)
    const ticketsChannel = supabase
      .channel(`tx-notif-tickets-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "concert_tickets",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const row = payload.new;
          toast.success(t("txNotifTicketTitle"), {
            description: `${t("txNotifTicketDesc")} (${fmt(row.price_paid)} ${t(
              "txNotifCredits",
            )})`,
            icon: createElement(ShoppingCart, { className: "w-4 h-4" }),
          });
        },
      )
      .subscribe();

    // Withdrawal requests (insert + status updates)
    const withdrawalsChannel = supabase
      .channel(`tx-notif-withdrawals-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawal_requests",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          if (payload.eventType === "INSERT") {
            toast.success(t("txNotifWithdrawalSentTitle"), {
              description: `$${fmt(row.amount)} — ${t("txNotifWithdrawalPending")}`,
              icon: createElement(Banknote, { className: "w-4 h-4" }),
            });
          } else if (
            payload.eventType === "UPDATE" &&
            payload.old?.status !== row.status
          ) {
            const isCompleted = row.status === "completed";
            const isRejected = row.status === "rejected";
            const fn = isRejected ? toast.error : toast.success;
            fn(
              isCompleted
                ? t("txNotifWithdrawalCompletedTitle")
                : isRejected
                  ? t("txNotifWithdrawalRejectedTitle")
                  : t("txNotifWithdrawalUpdatedTitle"),
              {
                description: `$${fmt(row.amount)} — ${row.status}`,
                icon: createElement(Banknote, { className: "w-4 h-4" }),
              },
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(purchasesChannel);
      supabase.removeChannel(giftsChannel);
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(withdrawalsChannel);
    };
  }, [userId, t]);
};
