## Objectif

Ajouter Moneroo (https://docs.moneroo.io/) comme alternative à CinetPay pour les recharges (PayIn) et retraits (PayOut), et permettre à l'admin d'activer/désactiver indépendamment chaque moyen de paiement (CinetPay, Moneroo, Stripe carte) depuis l'onglet **Plateforme**.

## 1. Backend — Edge Functions Moneroo

Créer 4 nouvelles edge functions calquées sur la structure CinetPay :

- `supabase/functions/moneroo-payin-init/index.ts` — Initialise un paiement Moneroo (Mobile Money + cartes), retourne `checkout_url`.
- `supabase/functions/moneroo-payout-init/index.ts` — Initialise un transfert/retrait vers Mobile Money.
- `supabase/functions/moneroo-webhook-payin/index.ts` — Réception callback PayIn, vérification signature, crédit du wallet via `cinetpay_credit_wallet` RPC (réutilisé, ou nouvelle RPC générique).
- `supabase/functions/moneroo-webhook-payout/index.ts` — Réception callback PayOut.
- `supabase/functions/_shared/moneroo.ts` — Client partagé : `monerooFetch`, `initPayment`, `initPayout`, `verifyWebhookSignature`, constantes.

Moneroo API:
- Base : `https://api.moneroo.io/v1`
- Auth : `Authorization: Bearer ${MONEROO_API_KEY}` (clé unique, pas d'OAuth par pays)
- PayIn : `POST /payments/initialize` → renvoie `checkout_url`
- PayOut : `POST /payouts/initialize`
- Webhooks : HMAC signature dans header `X-Moneroo-Signature`

Avantage clé : **un seul endpoint, IP whitelist non requise** → pas besoin du proxy Fly.io.

`supabase/config.toml` : ajouter `verify_jwt = false` pour les deux webhooks Moneroo.

## 2. Secrets

Demander à l'utilisateur via `add_secret` :
- `MONEROO_API_KEY` (clé secrète)
- `MONEROO_WEBHOOK_SECRET` (pour vérifier les signatures)

## 3. Base de données

Migration :
- Nouvelle table `moneroo_transactions` (miroir de `cinetpay_transactions` : `merchant_transaction_id`, `user_id`, `amount`, `currency`, `status`, `type` payin/payout, `metadata`).
- Nouvelles RPCs `moneroo_credit_wallet`, `moneroo_reserve_payout`, `moneroo_confirm_payout` (copie des RPCs CinetPay).
- Nouveau setting dans `platform_settings` :
  ```json
  key: "payment_providers_config"
  value: { "cinetpay_enabled": true, "moneroo_enabled": false, "stripe_enabled": true }
  ```

## 4. Frontend — Onglet Plateforme

`src/components/admin/PlatformConfigManager.tsx` :
- Nouvelle Card **"Moyens de paiement"** avec 3 switches : CinetPay, Moneroo, Stripe (carte).
- Chargement/sauvegarde via `payment_providers_config`.
- Validation : au moins un fournisseur doit rester actif.

## 5. Frontend — Formulaire de recharge

`src/components/wallet/CinetPayRechargeForm.tsx` (à renommer en `WalletRechargeForm.tsx` ou garder + créer adjacent) :
- Lire `payment_providers_config` via `usePlatformSetting`.
- Afficher un sélecteur de fournisseur (tabs ou radio) parmi ceux activés.
- Router vers l'edge function correspondante (`cinetpay-payin-init` / `moneroo-payin-init` / Stripe `create-checkout`).

Idem pour le formulaire de retrait artistes/managers (`WithdrawalForm.tsx`) : afficher uniquement les providers de retrait actifs (CinetPay, Moneroo).

## 6. Traductions

Ajouter dans `src/contexts/LanguageContext.tsx` (FR/EN) :
- `adminPaymentProvidersTitle`, `adminPaymentProvidersDesc`
- `adminProviderCinetpay`, `adminProviderMoneroo`, `adminProviderStripe`
- `adminProviderEnableDesc`, `adminProviderAtLeastOne`
- `walletChooseProvider`, `walletProviderMobileMoney`, `walletProviderCard`

## Détails techniques

**Moneroo payload PayIn :**
```json
{
  "amount": 1000,
  "currency": "XOF",
  "description": "Recharge wallet",
  "customer": { "email": "...", "first_name": "...", "last_name": "..." },
  "return_url": "<app_url>/wallet?status=success",
  "metadata": { "user_id": "...", "credits": 100 }
}
```

**Webhook verification :** HMAC-SHA256 du body brut avec `MONEROO_WEBHOOK_SECRET`, comparaison constant-time avec `X-Moneroo-Signature`.

**Atomicité :** réutiliser le pattern RPC `*_credit_wallet` / `*_reserve_payout` / `*_confirm_payout` pour éviter les doubles crédits.

## Hors scope

- Le proxy Fly.io CinetPay reste en place mais devient optionnel (peut être désactivé si seul Moneroo est utilisé).
- Pas de migration des transactions historiques.

Confirme pour que je lance l'implémentation (et que je te demande les 2 secrets Moneroo).
