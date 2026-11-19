# Prazos de conservação e fornecedores (subcontratantes)

Documento interno. Versão de 18/11/2026. Os prazos aplicados automaticamente estão em `server/utils/legal.ts` e `server/services/retentionService.ts` (corre no arranque do servidor e a cada 24 horas).

## Prazos de conservação (RGPD, art. 5.º, n.º 1, alínea e))

| Dados | Prazo | Como é aplicado |
|---|---|---|
| Conta, recursos, ficheiros, sessões académicas, documentos | Enquanto a conta existir | Apagados quando a pessoa apaga a conta (Definições → Privacidade) |
| Contas que nunca confirmaram o email | 30 dias após o registo | Limpeza diária automática |
| Sessões | Até expirarem ou até sair | Limpeza diária das expiradas |
| Desafios de passkey | Até expirarem | Limpeza diária |
| Tokens de recuperação de palavra-passe | 1 hora | Limpeza diária dos expirados |
| Registo de consentimentos | Enquanto a conta existir | Apagado em cascata com a conta |
| Imagens para análise de IA | Apagadas logo após a resposta | Já existia no código (`finally` em `server/controllers/ai.ts`) |
| Conversas do AI Tutor | Não são guardadas no servidor | — |
| Contador diário de pedidos de IA (data e número) | 90 dias | Limpeza diária automática; apagado com a conta |
| Registos técnicos do alojamento | Prazo do Render | Configuração do fornecedor |

**Por decidir:** apagar contas inativas (por exemplo, sem início de sessão há 24 meses), com aviso prévio por email. Não está implementado.

## Fornecedores que tratam dados dos utilizadores

Na UE, o contrato com cada subcontratante é **obrigatório** (RGPD, art. 28.º, n.º 3), não apenas uma boa prática. Todos estes fornecedores disponibilizam um acordo de tratamento de dados (DPA) padrão, que normalmente se aceita no painel ou nos termos da conta.

| Fornecedor | O que trata | Onde | O que tens de fazer |
|---|---|---|---|
| Render | Servidor, ficheiros enviados, registos | Frankfurt | Confirmar/aceitar o DPA da Render |
| Neon (Databricks) | Base de dados | Frankfurt (aws-eu-central-1) | Confirmar/aceitar o DPA da Neon |
| Resend | Email e nome nos emails transacionais | UE (eu-west-1) | Confirmar/aceitar o DPA da Resend |
| Google (Gemini API) | Conteúdo enviado à IA | EUA e outros | Ver nota abaixo; aceitar os termos de tratamento de dados do Google Cloud |
| Anthropic (Claude API) | Conteúdo do AI Tutor quando a pessoa escolhe Claude | EUA | Só se definires `ANTHROPIC_API_KEY`; aceitar os Commercial Terms e o DPA da Anthropic |
| OpenAI (OpenAI API) | Conteúdo do AI Tutor quando a pessoa escolhe GPT | EUA | Só se definires `OPENAI_API_KEY`; aceitar o DPA da OpenAI |
| Cloudflare (via Render) | Tráfego de rede | Global | Coberto pelo contrato da Render (confirmar) |

**Nota sobre o Gemini:** o app usa o plano gratuito da API. Os termos adicionais da API Gemini, na versão que conheço, só permitem os **serviços pagos** quando a aplicação é disponibilizada a utilizadores no Espaço Económico Europeu, na Suíça ou no Reino Unido. Como o app serve Portugal, **ativar a faturação** no projeto do Google AI Studio resolve isto e também faz com que a Google deixe de usar o conteúdo para melhorar os seus produtos. Depois de ativar, atualizar a Política de Privacidade (secção 4), o aviso de IA (`src/contexts/ConsentContext.tsx`) e subir `PRIVACY_VERSION`.

## Terceiros sem acesso a dados de utilizadores

- **GitHub:** só código-fonte.
- **Google Fonts:** removido; as fontes são servidas pelo próprio domínio desde 18/11/2026.
- **Pesquisa Google** na barra de pesquisa: só recebe o termo quando a pessoa clica em "Search the Web".
