# Deploy: Render + Neon + Google AI Studio

Guia para pôr o NeuralVault no ar sem Google Cloud.

| Peça | Serviço | Custo |
|---|---|---|
| Aplicação (Docker) | [Render](https://render.com) | Grátis (adormece após 15 min sem uso) ou Starter 7 USD/mês |
| Base de dados PostgreSQL | [Neon](https://neon.tech) | Grátis (0,5 GB) |
| Gemini API | [Google AI Studio](https://aistudio.google.com/apikey) | Grátis (com limites) |

As migrações da base de dados correm automaticamente sempre que a aplicação arranca (`prisma migrate deploy` no `Dockerfile`).

## 1. Base de dados (Neon)

1. Criar conta em neon.tech → **New Project** (região: *Europe (Frankfurt)*).
2. Copiar a **connection string** (formato `postgresql://...neon.tech/neondb?sslmode=require`).
   Usar a ligação **directa** (sem `-pooler` no host), porque as migrações do Prisma precisam dela.

## 2. Chave Gemini (Google AI Studio)

1. Ir a https://aistudio.google.com/apikey → **Create API key**.
2. Não precisa de faturação no Google Cloud.

## 3. Aplicação (Render)

1. Criar conta em render.com e ligar o GitHub.
2. **New → Blueprint** → escolher o repositório `neuralvault`. O Render lê o `render.yaml`.
3. Preencher as variáveis pedidas:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | connection string do Neon |
| `GEMINI_API_KEY` | chave do AI Studio |
| `APP_URL` | `https://neuralvault.onrender.com` (ou o domínio próprio) |
| `CORS_ORIGIN` | igual a `APP_URL` |
| `DOMAIN` | `neuralvault.onrender.com` (ou o domínio próprio) |
| `PASSKEY_RP_ID` | igual a `DOMAIN` |
| `PASSKEY_ORIGIN` | igual a `APP_URL` |
| `RESEND_API_KEY` | opcional, para emails (reposição de senha) |

`JWT_SECRET` é gerado automaticamente pelo Render.

> Importante: se `PASSKEY_RP_ID`/`PASSKEY_ORIGIN` ficarem vazios, a aplicação usa `nvaulty.online`
> e as passkeys não funcionam noutro domínio.

4. **Apply**. O primeiro deploy demora alguns minutos.

## 4. Domínio próprio (opcional)

Render → serviço → **Settings → Custom Domains** → adicionar o domínio e criar no DNS o registo
CNAME indicado. Depois actualizar `APP_URL`, `CORS_ORIGIN`, `DOMAIN`, `PASSKEY_RP_ID` e `PASSKEY_ORIGIN`.

## Ficheiros enviados (uploads)

Os ficheiros de recursos são guardados em `UPLOADS_DIR` (`/var/data/uploads` no Render).

- **Plano grátis:** o disco é temporário. Os ficheiros perdem-se em cada deploy ou reinício.
  O resto (contas, notas, links, pastas) fica na base de dados e não se perde.
- **Para guardar ficheiros de forma permanente:** mudar o plano para *Starter* e descomentar o bloco
  `disk:` no `render.yaml` (disco de 1 GB ≈ 0,25 USD/mês).

## Desenvolvimento local

```bash
cp .env.example .env.local   # preencher DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
npm install
npm run prisma:migrate
npm run dev:full
```

## Ficheiros antigos do Google Cloud

`cloudbuild.yaml`, `cloudbuild-sync.yaml` e `.gcloudignore` já não são usados.
Podem ser apagados quando o deploy no Render estiver a funcionar.
