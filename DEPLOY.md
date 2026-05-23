# 🚀 Como colocar o Smart Wallet Flow no ar

Este guia mostra como hospedar o app gratuitamente usando **Railway** (servidor) + **Neon** (banco de dados PostgreSQL), para que você e outras pessoas possam testar pelo celular.

---

## Pré-requisitos

- Conta no GitHub com este repositório enviado
- Conta gratuita no [Railway](https://railway.app)
- Conta gratuita no [Neon](https://neon.tech)

---

## Parte 1 — Banco de dados no Neon (PostgreSQL gratuito)

1. Acesse [neon.tech](https://neon.tech) e crie uma conta gratuita
2. Clique em **"New Project"** → dê um nome (ex: `smart-wallet`)
3. Escolha a região mais próxima (ex: `us-east-1` ou `eu-west-2`)
4. Após criar, clique em **"Connection string"** e copie a URL no formato:
   ```
   postgresql://usuario:senha@host/banco?sslmode=require
   ```
5. Guarde essa URL — você vai usá-la como `DATABASE_URL`

---

## Parte 2 — Criar as tabelas no banco

Depois de configurar o banco, rode localmente o comando abaixo para criar todas as tabelas:

```bash
# No seu computador, dentro da pasta do projeto
npm run db:push
```

> **Atenção:** certifique-se que o `.env` local tem a `DATABASE_URL` do Neon apontando para o banco de nuvem (não o localhost).

---

## Parte 3 — Deploy no Railway

1. Acesse [railway.app](https://railway.app) e faça login com o GitHub
2. Clique em **"New Project"** → **"Deploy from GitHub repo"**
3. Escolha o repositório **Smart-Wallet-Flow**
4. Railway vai detectar o projeto automaticamente

### Configurar as variáveis de ambiente no Railway:

Na aba **"Variables"** do seu projeto Railway, adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | A connection string do Neon (copiada no Passo 1) |
| `SESSION_SECRET` | Um valor aleatório forte (ex: rode `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `GEMINI_API_KEY` | Sua chave do Google AI Studio |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |

### Configurar o comando de build:

Na aba **"Settings"** do Railway:
- **Build Command:** `npm run build`
- **Start Command:** `npm start`

5. Clique em **"Deploy"** — aguarde 2-3 minutos
6. Na aba **"Settings"** → **"Domains"** → clique em **"Generate Domain"**

Você vai receber um link público tipo:
```
https://smart-wallet-flow-production.up.railway.app
```

Esse link é o que você compartilha com os testers! 🎉

---

## Parte 4 — Testar pelo celular

1. Abra o link gerado pelo Railway no celular
2. O app já é responsivo — deve funcionar bem em telas pequenas
3. Crie uma conta com email e senha
4. Teste todas as funcionalidades

---

## O que fazer antes de compartilhar com testers

- [ ] Certifique-se que o deploy está funcionando (acesse o link)
- [ ] Crie uma conta de teste para verificar o fluxo completo
- [ ] Adicione algumas transações, contas e cartões de teste
- [ ] Verifique se o chat de IA responde (requer `GEMINI_API_KEY` válida)
- [ ] Confirme que o login e registro funcionam

---

## Problemas comuns

**App não inicia (erro de banco):**
- Verifique se a `DATABASE_URL` está correta no Railway
- Confirme que rodou `npm run db:push` com a URL do Neon

**Sessão expira rapidamente:**
- Verifique se `SESSION_SECRET` está configurado nas variáveis do Railway

**Imagens/voz não funcionam:**
- Verifique se `GEMINI_API_KEY` está configurada e válida

**Cookie não funciona em HTTPS:**
- O app já detecta `NODE_ENV=production` e ativa `secure: true` nos cookies — não precisa fazer nada.

---

## Custos

- **Neon:** Gratuito até 0.5 GB de dados e 191 horas de compute/mês
- **Railway:** Plano gratuito com $5 de crédito/mês (suficiente para testes)

Total estimado para testes: **R$ 0,00** 🎯
