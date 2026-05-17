# 🔌 Arquitetura Técnica: Integração GHL Completa

---

## 🎯 O QUE VOCÊ PRECISA FAZER

```
Seu App (React)
├─ Usuário clica "Connect com GHL"
└─ Abre OAuth flow

GHL OAuth
├─ Usuário autoriza seu app
└─ Você recebe access token + refresh token

Seu Backend (Supabase)
├─ Armazena tokens (criptografado)
├─ Faz chamadas à API GHL
├─ Sincroniza dados
└─ Dispara automações

Sincronização Contínua
├─ Cron job: Sincroniza a cada 15 min
├─ Webhooks: Real-time em eventos importantes
└─ Edge Functions: Processa dados + dispara ações
```

---

## 📐 ARQUITETURA EM CAMADAS

```
┌─────────────────────────────────────────────────────┐
│                Frontend (React)                     │
│  LoginGHL → OAuth → Dashboard → Manage Campaigns   │
└────────────────────┬────────────────────────────────┘
                     │ OAuth redirect + API calls
┌────────────────────┴────────────────────────────────┐
│           Supabase Edge Functions                   │
│  ├─ POST /auth/ghl-callback (OAuth)                 │
│  ├─ POST /sync/pull-customers (sync)               │
│  ├─ POST /actions/send-sms (dispara SMS)           │
│  ├─ POST /webhooks/ghl-events (webhook handler)    │
│  └─ GET /data/rfm-analysis (calcula scores)        │
└────────────────────┬────────────────────────────────┘
                     │ Cron + HTTP requests
┌────────────────────┴────────────────────────────────┐
│               PostgreSQL (Supabase)                 │
│  ├─ ghl_credentials (tokens)                        │
│  ├─ ghl_customers (sync de clientes)               │
│  ├─ ghl_contacts (histórico de contatos)           │
│  ├─ campaigns (automações criadas)                 │
│  ├─ campaign_logs (histórico de disparos)          │
│  └─ rfm_scores (análises calculadas)               │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS API calls
┌────────────────────┴────────────────────────────────┐
│           GHL API (v1 REST)                         │
│  api.gohighlevel.com/v1/...                        │
└─────────────────────────────────────────────────────┘
```

---

## 1️⃣ FLUXO OAUTH (Autenticação)

### Passo 1: Registrar App em GHL

**Acesso:** https://gohighlevel.com/developers/oauth/applications

```
Criar nova aplicação:
├─ Name: "IA Para Lucrar"
├─ Redirect URI: https://seu-dominio.com/auth/ghl-callback
├─ Scopes necessários:
│  ├─ contacts.read (ler contatos)
│  ├─ contacts.write (criar contatos)
│  ├─ messages.write (enviar SMS/Email)
│  └─ conversations.read (histórico)
│
└─ Resultado: 
    ├─ Client ID: abc123...
    └─ Client Secret: xyz789... (GUARDA ISSO!)
```

### Passo 2: Armazenar Secrets (Supabase)

```sql
-- Criar table no Supabase
CREATE TABLE ghl_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  ghl_client_id TEXT NOT NULL,
  ghl_client_secret TEXT NOT NULL, -- Criptografar!
  
  access_token TEXT NOT NULL, -- Criptografar!
  refresh_token TEXT NOT NULL, -- Criptografar!
  token_expires_at TIMESTAMP NOT NULL,
  
  location_id TEXT NOT NULL, -- ID da conta GHL
  business_name TEXT,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, location_id)
);

-- Índices
CREATE INDEX idx_ghl_credentials_user_id ON ghl_credentials(user_id);
CREATE INDEX idx_ghl_credentials_location_id ON ghl_credentials(location_id);
```

### Passo 3: Implementar OAuth Flow (Frontend)

**Button em React:**
```typescript
// src/components/ConnectGHL.tsx

import { Button } from "@/components/ui/button";

export function ConnectGHL() {
  const handleConnect = () => {
    const clientId = process.env.REACT_APP_GHL_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/ghl-callback`;
    const scopes = [
      "contacts.read",
      "contacts.write",
      "messages.write",
      "conversations.read"
    ].join(" ");
    
    const authUrl = new URL("https://api.gohighlevel.com/oauth/authorize");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("scope", scopes);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("state", generateRandomState()); // CSRF protection
    
    window.location.href = authUrl.toString();
  };
  
  return (
    <Button onClick={handleConnect} size="lg">
      Connect com GHL
    </Button>
  );
}

function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

### Passo 4: Handle OAuth Callback (Backend)

**Edge Function em Supabase:**
```typescript
// supabase/functions/auth/ghl-callback/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const clientSecret = Deno.env.get("GHL_CLIENT_SECRET")!;
const clientId = Deno.env.get("GHL_CLIENT_ID")!;

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const locationId = url.searchParams.get("location_id"); // GHL retorna isso
    
    // Validar code + state
    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: "Missing code or state" }),
        { status: 400 }
      );
    }
    
    // Trocar code por tokens
    const tokenRes = await fetch(
      "https://api.gohighlevel.com/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: `${Deno.env.get("SUPABASE_FUNCTION_URL")}/auth/ghl-callback`
        })
      }
    );
    
    if (!tokenRes.ok) {
      throw new Error(`Token request failed: ${tokenRes.statusText}`);
    }
    
    const tokens = await tokenRes.json();
    // {
    //   access_token: "...",
    //   refresh_token: "...",
    //   expires_in: 3600,
    //   token_type: "Bearer"
    // }
    
    // Pegar user_id do JWT
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("User not authenticated");
    }
    
    // Salvar credentials no DB
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    
    const { error: dbError } = await supabase
      .from("ghl_credentials")
      .upsert({
        user_id: user.id,
        ghl_client_id: clientId,
        ghl_client_secret: clientSecret,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        location_id: locationId || "default"
      }, {
        onConflict: "user_id,location_id"
      });
    
    if (dbError) throw dbError;
    
    // Redirecionar pro dashboard
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${Deno.env.get("FRONTEND_URL")}/dashboard?success=true`
      }
    });
    
  } catch (error) {
    console.error("OAuth error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

## 2️⃣ SINCRONIZAÇÃO DE DADOS

### Estrutura de Tables

```sql
-- Clientes sincronizados de GHL
CREATE TABLE ghl_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  ghl_contact_id TEXT NOT NULL, -- ID do GHL
  ghl_location_id TEXT NOT NULL,
  
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- RFM Analysis
  first_purchase_date DATE,
  last_purchase_date DATE,
  total_spent DECIMAL(10, 2),
  purchase_count INT DEFAULT 0,
  
  -- Pipeline stage (journey)
  pipeline_stage TEXT, -- "lead", "agendado", "em_tratamento", "pos_tratamento"
  
  -- Metadata
  tags TEXT[], -- Array de tags do GHL
  custom_fields JSONB, -- Campos customizados
  
  synced_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, ghl_contact_id, ghl_location_id)
);

-- Histórico de contatos (emails, SMSs, etc)
CREATE TABLE ghl_contact_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ghl_customer_id UUID NOT NULL REFERENCES ghl_customers(id),
  
  event_type TEXT, -- "email_sent", "sms_sent", "email_opened", "sms_delivered"
  event_data JSONB,
  
  created_at TIMESTAMP DEFAULT now()
);

-- Campanhas de indicação criadas
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger
  trigger_type TEXT, -- "rfm_score", "customer_age", "manual"
  trigger_config JSONB, -- {rfm_score: 8, min_age_days: 30}
  
  -- Action
  action_type TEXT, -- "sms", "email", "both"
  sms_template TEXT,
  email_template TEXT,
  
  -- Status
  status TEXT DEFAULT "active", -- "active", "paused", "archived"
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Log de campanhas disparadas
CREATE TABLE campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  ghl_customer_id UUID NOT NULL REFERENCES ghl_customers(id),
  
  sent_at TIMESTAMP DEFAULT now(),
  status TEXT, -- "sent", "failed", "bounced"
  error_message TEXT,
  
  ghl_message_id TEXT -- ID retornado por GHL
);

-- RFM Scores calculados
CREATE TABLE rfm_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ghl_customer_id UUID NOT NULL REFERENCES ghl_customers(id),
  
  recency_score INT, -- 1-5
  frequency_score INT, -- 1-5
  monetary_score INT, -- 1-5
  
  rfm_total INT, -- 3-15
  propensity_to_refer DECIMAL(3,2), -- 0-1.0
  
  calculated_at TIMESTAMP DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_ghl_customers_user_id ON ghl_customers(user_id);
CREATE INDEX idx_ghl_customers_location_id ON ghl_customers(ghl_location_id);
CREATE INDEX idx_ghl_contact_events_customer_id ON ghl_contact_events(ghl_customer_id);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_rfm_scores_customer_id ON rfm_scores(ghl_customer_id);
```

### Função de Sincronização (Pull Customers)

```typescript
// supabase/functions/sync/pull-customers/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    // Pegar user_id do header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }
    
    // Buscar credenciais do user
    const { data: creds, error: credsError } = await supabase
      .from("ghl_credentials")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ error: "GHL not connected" }),
        { status: 400 }
      );
    }
    
    // Verificar se token expirou e renovar se needed
    const now = new Date();
    const expiresAt = new Date(creds.token_expires_at);
    
    let accessToken = creds.access_token;
    if (now > expiresAt) {
      // Renovar token
      const refreshRes = await fetch(
        "https://api.gohighlevel.com/oauth/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: creds.ghl_client_id,
            client_secret: creds.ghl_client_secret,
            grant_type: "refresh_token",
            refresh_token: creds.refresh_token
          })
        }
      );
      
      const newTokens = await refreshRes.json();
      accessToken = newTokens.access_token;
      
      // Atualizar no DB
      await supabase
        .from("ghl_credentials")
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000)
        })
        .eq("id", creds.id);
    }
    
    // Buscar contatos da API GHL
    const contactsRes = await fetch(
      `https://api.gohighlevel.com/v1/contacts?locationId=${creds.location_id}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    if (!contactsRes.ok) {
      throw new Error(`GHL API error: ${contactsRes.statusText}`);
    }
    
    const contactsData = await contactsRes.json();
    // {
    //   contacts: [
    //     {
    //       id: "...",
    //       firstName: "João",
    //       lastName: "Silva",
    //       email: "joao@email.com",
    //       phone: "+5511999999999",
    //       tags: [...],
    //       customFields: {},
    //       source: "manual",
    //       dateAdded: 1234567890
    //     }
    //   ]
    // }
    
    // Inserir/atualizar contatos no DB
    const customersToSync = contactsData.contacts.map((contact: any) => ({
      user_id: user.id,
      ghl_contact_id: contact.id,
      ghl_location_id: creds.location_id,
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      email: contact.email,
      phone: contact.phone,
      tags: contact.tags || [],
      custom_fields: contact.customFields || {},
      synced_at: new Date().toISOString()
    }));
    
    const { error: syncError } = await supabase
      .from("ghl_customers")
      .upsert(customersToSync, {
        onConflict: "user_id,ghl_contact_id,ghl_location_id"
      });
    
    if (syncError) throw syncError;
    
    return new Response(
      JSON.stringify({
        success: true,
        synced: customersToSync.length
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
    
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

## 3️⃣ CRON JOB (Sincronização Periódica)

```typescript
// supabase/functions/cron/sync-customers/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Executado a cada 15 minutos via Supabase Cron
serve(async (req) => {
  try {
    // Buscar todos os users com GHL conectado
    const { data: credentials } = await supabase
      .from("ghl_credentials")
      .select("*");
    
    if (!credentials || credentials.length === 0) {
      return new Response(
        JSON.stringify({ message: "No GHL connections found" }),
        { status: 200 }
      );
    }
    
    // Para cada user, sincronizar
    const results = await Promise.all(
      credentials.map(async (cred) => {
        try {
          // Chamar função de sync
          const syncRes = await fetch(
            `${Deno.env.get("SUPABASE_FUNCTION_URL")}/sync/pull-customers`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${cred.access_token}`
              }
            }
          );
          
          return {
            user_id: cred.user_id,
            success: syncRes.ok,
            synced: syncRes.ok ? (await syncRes.json()).synced : 0
          };
        } catch (error) {
          console.error(`Sync failed for user ${cred.user_id}:`, error);
          return {
            user_id: cred.user_id,
            success: false,
            error: error.message
          };
        }
      })
    );
    
    return new Response(
      JSON.stringify({
        message: "Sync cron executed",
        results,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Cron error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

**Setup Cron (via Supabase Dashboard):**
```
Supabase → Edge Functions → cron/sync-customers

Configurar:
├─ Name: sync-customers
├─ Schedule: */15 * * * * (a cada 15 minutos)
└─ Active: true
```

---

## 4️⃣ WEBHOOKS (Real-Time Events)

### Configurar Webhooks em GHL

```
GHL Dashboard → Settings → Webhooks

Criar webhook:
├─ URL: https://seu-dominio.com/webhooks/ghl-events
├─ Events para escutar:
│  ├─ contact.created
│  ├─ contact.updated
│  ├─ message.sent
│  └─ conversation.update
└─ Secret: (GHL vai gerar, use pra validar)
```

### Função de Webhook Handler

```typescript
// supabase/functions/webhooks/ghl-events/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmacSha256 } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const GHL_WEBHOOK_SECRET = Deno.env.get("GHL_WEBHOOK_SECRET")!;

serve(async (req) => {
  // Validar assinatura do webhook
  const signature = req.headers.get("x-ghl-signature");
  const body = await req.text();
  
  const expectedSignature = await hmacSha256(body, GHL_WEBHOOK_SECRET);
  if (signature !== expectedSignature) {
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 401 }
    );
  }
  
  try {
    const event = JSON.parse(body);
    // {
    //   "type": "contact.created",
    //   "locationId": "...",
    //   "contact": {
    //     "id": "...",
    //     "firstName": "João",
    //     "email": "joao@email.com",
    //     ...
    //   },
    //   "timestamp": 1234567890
    // }
    
    switch (event.type) {
      case "contact.created":
      case "contact.updated":
        // Atualizar contato no DB
        const { error: updateError } = await supabase
          .from("ghl_customers")
          .upsert({
            ghl_contact_id: event.contact.id,
            ghl_location_id: event.locationId,
            name: `${event.contact.firstName} ${event.contact.lastName}`.trim(),
            email: event.contact.email,
            phone: event.contact.phone,
            tags: event.contact.tags,
            custom_fields: event.contact.customFields,
            synced_at: new Date().toISOString()
          }, {
            onConflict: "ghl_contact_id,ghl_location_id"
          });
        
        if (updateError) throw updateError;
        break;
      
      case "message.sent":
        // Registrar evento de mensagem
        await supabase
          .from("ghl_contact_events")
          .insert({
            ghl_contact_id: event.contact.id,
            event_type: "message_sent",
            event_data: {
              messageId: event.message.id,
              type: event.message.type, // "sms", "email"
              status: event.message.status
            }
          });
        break;
      
      case "conversation.update":
        // Atualizar histórico de conversa
        console.log("Conversation update:", event);
        break;
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

## 5️⃣ AÇÕES (Enviar SMS/Email via GHL)

### Função de Envio de SMS

```typescript
// supabase/functions/actions/send-sms/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    
    const { customerId, message, userId } = await req.json();
    
    if (!customerId || !message || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }
    
    // Pegar credenciais do user
    const { data: creds, error: credsError } = await supabase
      .from("ghl_credentials")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (credsError || !creds) {
      throw new Error("GHL credentials not found");
    }
    
    // Pegar contato
    const { data: customer, error: customerError } = await supabase
      .from("ghl_customers")
      .select("*")
      .eq("id", customerId)
      .single();
    
    if (customerError || !customer) {
      throw new Error("Customer not found");
    }
    
    // Enviar SMS via GHL
    const smsRes = await fetch(
      "https://api.gohighlevel.com/v1/contacts/messages",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contactId: customer.ghl_contact_id,
          type: "SMS",
          message: message
        })
      }
    );
    
    if (!smsRes.ok) {
      throw new Error(`GHL SMS API error: ${smsRes.statusText}`);
    }
    
    const smsData = await smsRes.json();
    
    // Registrar no log
    await supabase
      .from("campaign_logs")
      .insert({
        ghl_customer_id: customerId,
        sent_at: new Date().toISOString(),
        status: "sent",
        ghl_message_id: smsData.id
      });
    
    return new Response(
      JSON.stringify({
        success: true,
        messageId: smsData.id
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Send SMS error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

## 6️⃣ RFM ANALYSIS (Calcular Scores)

```typescript
// supabase/functions/data/rfm-analysis/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    // Pegar user_id
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    
    // Buscar todos os clientes do user
    const { data: customers, error: customersError } = await supabase
      .from("ghl_customers")
      .select("id, last_purchase_date, purchase_count, total_spent")
      .eq("user_id", user.id);
    
    if (customersError || !customers) {
      throw new Error("Failed to fetch customers");
    }
    
    // Calcular RFM scores
    const now = new Date();
    const scores = customers.map((customer) => {
      // Recency (dias desde última compra)
      const lastPurchase = customer.last_purchase_date 
        ? new Date(customer.last_purchase_date)
        : null;
      const recencyDays = lastPurchase 
        ? Math.floor((now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      // Recency Score (1-5)
      let recencyScore = 1;
      if (recencyDays <= 7) recencyScore = 5;
      else if (recencyDays <= 30) recencyScore = 4;
      else if (recencyDays <= 90) recencyScore = 3;
      else if (recencyDays <= 180) recencyScore = 2;
      
      // Frequency Score (1-5)
      let frequencyScore = 1;
      if (customer.purchase_count >= 10) frequencyScore = 5;
      else if (customer.purchase_count >= 7) frequencyScore = 4;
      else if (customer.purchase_count >= 4) frequencyScore = 3;
      else if (customer.purchase_count >= 2) frequencyScore = 2;
      
      // Monetary Score (1-5)
      const spent = customer.total_spent || 0;
      let monetaryScore = 1;
      if (spent >= 5000) monetaryScore = 5;
      else if (spent >= 2000) monetaryScore = 4;
      else if (spent >= 500) monetaryScore = 3;
      else if (spent >= 100) monetaryScore = 2;
      
      // Total RFM
      const rfmTotal = recencyScore + frequencyScore + monetaryScore;
      
      // Propensity to refer (0-1.0)
      // Higher RFM = higher likelihood to refer
      const propensityToRefer = rfmTotal / 15; // 15 is max (5+5+5)
      
      return {
        user_id: user.id,
        ghl_customer_id: customer.id,
        recency_score: recencyScore,
        frequency_score: frequencyScore,
        monetary_score: monetaryScore,
        rfm_total: rfmTotal,
        propensity_to_refer: parseFloat(propensityToRefer.toFixed(2)),
        calculated_at: new Date().toISOString()
      };
    });
    
    // Armazenar scores
    const { error: scoreError } = await supabase
      .from("rfm_scores")
      .upsert(scores, {
        onConflict: "user_id,ghl_customer_id"
      });
    
    if (scoreError) throw scoreError;
    
    return new Response(
      JSON.stringify({
        success: true,
        scoresCalculated: scores.length,
        scores: scores.slice(0, 10) // Return first 10 for demo
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("RFM analysis error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

## 7️⃣ FRONTEND: Dashboard Integrado

```typescript
// src/pages/Dashboard.tsx

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function Dashboard() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [rfmScores, setRfmScores] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Verificar se GHL conectado
  useEffect(() => {
    checkGHLConnection();
  }, [user]);
  
  async function checkGHLConnection() {
    try {
      const { data } = await supabase
        .from("ghl_credentials")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      setIsConnected(!!data);
    } catch (error) {
      setIsConnected(false);
    }
  }
  
  // Sincronizar clientes
  async function syncCustomers() {
    setLoading(true);
    try {
      const response = await fetch(
        "${process.env.REACT_APP_SUPABASE_FUNCTION_URL}/sync/pull-customers",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.access_token}`
          }
        }
      );
      
      const data = await response.json();
      
      // Buscar clientes do DB
      const { data: customersData } = await supabase
        .from("ghl_customers")
        .select("*")
        .eq("user_id", user.id);
      
      setCustomers(customersData || []);
      
      // Calcular RFM scores
      const { data: scoresData } = await supabase
        .from("rfm_scores")
        .select("*")
        .eq("user_id", user.id);
      
      setRfmScores(scoresData || []);
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setLoading(false);
    }
  }
  
  if (!isConnected) {
    return (
      <div className="p-8">
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Conecte sua conta GHL</h2>
          <p className="text-gray-600 mb-6">
            Autorize IA Para Lucrar a acessar sua base de clientes
          </p>
          <Button 
            onClick={() => window.location.href = "/auth/connect-ghl"}
            size="lg"
          >
            Conectar com GHL
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-8 space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        
        <div className="mb-6">
          <Button 
            onClick={syncCustomers} 
            disabled={loading}
          >
            {loading ? "Sincronizando..." : "Sincronizar Clientes"}
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-gray-600 text-sm">Clientes</p>
            <p className="text-3xl font-bold">{customers.length}</p>
          </Card>
          
          <Card className="p-4">
            <p className="text-gray-600 text-sm">RFM Calculado</p>
            <p className="text-3xl font-bold">{rfmScores.length}</p>
          </Card>
          
          <Card className="p-4">
            <p className="text-gray-600 text-sm">Prontos para indicação</p>
            <p className="text-3xl font-bold">
              {rfmScores.filter(s => s.propensity_to_refer >= 0.7).length}
            </p>
          </Card>
        </div>
        
        {/* Table de clientes + RFM */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Nome</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">RFM Total</th>
                <th className="text-left p-2">Propensity</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const score = rfmScores.find(s => s.ghl_customer_id === customer.id);
                return (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{customer.name}</td>
                    <td className="p-2">{customer.email}</td>
                    <td className="p-2 font-bold">{score?.rfm_total || "-"}/15</td>
                    <td className="p-2">
                      {score ? (score.propensity_to_refer * 100).toFixed(0) : "-"}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
```

---

## 🔒 SEGURANÇA

```typescript
// Criptografar tokens sensíveis
// Usar Supabase Secrets para armazenar client_secret

// .env.local
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
REACT_APP_GHL_CLIENT_ID=abc123...

// .env (server-side, Supabase Functions)
GHL_CLIENT_SECRET=xyz789... (NUNCA expor!)
GHL_WEBHOOK_SECRET=...
```

**Policy de Segurança:**
```sql
-- Apenas o user pode ver suas próprias credenciais
ALTER TABLE ghl_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own credentials"
  ON ghl_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

-- Apenas o backend pode atualizar tokens
CREATE POLICY "Only service role can update credentials"
  ON ghl_credentials
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

```
FASE 1: OAuth
├─ [ ] Registrar app em GHL Developer Dashboard
├─ [ ] Copiar Client ID + Secret
├─ [ ] Criar table ghl_credentials
├─ [ ] Implementar ConnectGHL button
├─ [ ] Edge function: auth/ghl-callback
└─ Teste: Conectar conta GHL e ver tokens salvos

FASE 2: Sincronização
├─ [ ] Criar tables: ghl_customers, ghl_contact_events, etc
├─ [ ] Edge function: sync/pull-customers
├─ [ ] Cron job: executar a cada 15 minutos
├─ [ ] Webhooks: configurar em GHL
├─ [ ] Edge function: webhooks/ghl-events
└─ Teste: Sincronizar 100+ clientes em <5s

FASE 3: Actions
├─ [ ] Edge function: actions/send-sms
├─ [ ] Edge function: actions/send-email
├─ [ ] Template system (SMS/Email)
├─ [ ] Campaign management (criar/editar)
└─ Teste: Enviar SMS real para contato

FASE 4: Analytics
├─ [ ] RFM calculation
├─ [ ] Dashboard com dados
├─ [ ] Charts (Recency, Frequency, Monetary)
└─ Teste: Visualizar top 10 customers por RFM

FASE 5: Frontend
├─ [ ] Dashboard page
├─ [ ] Settings (conectar GHL)
├─ [ ] Campaign creation
├─ [ ] Reporting
└─ Teste: E2E completo (connect → sync → send)
```

---

## 🚀 DEPLOYMENT

```bash
# Deploy Edge Functions
supabase functions deploy auth/ghl-callback
supabase functions deploy sync/pull-customers
supabase functions deploy actions/send-sms
supabase functions deploy webhooks/ghl-events
supabase functions deploy data/rfm-analysis

# Set secrets
supabase secrets set GHL_CLIENT_ID=...
supabase secrets set GHL_CLIENT_SECRET=...
supabase secrets set GHL_WEBHOOK_SECRET=...

# Deploy frontend
npm run build
vercel deploy
```

---

## 📞 PRÓXIMO?

Essa é a arquitetura completa. Quer que eu detalhe:

1. **Implementação passo a passo** (começar com OAuth)?
2. **Tratamento de erros + retry logic**?
3. **Rate limiting e throttling** (GHL tem limite)?
4. **Escalabilidade** (como lidar com 10k+ contatos)?
5. **Outro aspecto**?

