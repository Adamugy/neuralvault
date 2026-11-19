# Plano: AI Tutor com vários modelos e agentes

Estado: **plano, nada implementado**. Trabalho agendado para quarta-feira, 18/11/2026.
Escrito em 15/11/2026, com base no código do `master` em `eefdd94`.

## 1. Objetivo

1. O "Gemini Pro Tutor" deixa de estar preso a um único modelo: o utilizador escolhe entre vários modelos de LLM.
2. O app ganha agentes de IA que ajudam a gerir os recursos (organizar, etiquetar, resumir, planear estudo) e outras atividades, executando ações reais na biblioteca com aprovação do utilizador.

## 2. Como está hoje

| Parte | Situação atual |
|---|---|
| Chat | `POST /api/ai/chat` em `server/controllers/ai.ts`. Modelo fixo `gemini-2.5-flash`, com streaming e timeout de 120 s. |
| SDK | Só `@google/generative-ai` 0.21, usado diretamente em 2 controllers (`ai.ts`, `academic.ts`). Não há camada comum. |
| Histórico do chat | Vive só na memória do navegador. Recarregar a página apaga a conversa. |
| "Deep Reasoning" | O botão envia `thinkingMode`, mas o servidor ignora esse campo. |
| Contexto dos recursos | O chat recebe `resources` no componente, mas não os envia ao modelo. A IA não sabe o que há na biblioteca. |
| Ações sobre recursos | Só pela interface. Endpoints existentes: criar, editar, apagar recurso; criar e apagar pasta (`server/routes/resources.ts`, lógica em `ResourceService`). |
| Planos | Só existe o plano `free` no banco. Há 29 pontos na interface que tratam de "premium", sem efeito real. |
| Nome | A interface diz "Gemini Pro" em vários sítios (cabeçalho do chat, landing, rodapé do chat). |

## 3. Decisões que preciso de ti antes de começar

1. **Quais provedores entram na primeira versão?** Sugestão: Gemini (já existe), Claude (Anthropic) e OpenAI. Cada um exige uma chave de API e tem custo próprio.
2. **Quem coloca as chaves?** As chaves ficam nas variáveis de ambiente do Render, postas por ti. Um modelo só aparece no seletor se a chave dele existir.
3. **Biblioteca.** Duas opções:
   - **AI SDK da Vercel (recomendado):** uma interface única para streaming e chamada de ferramentas em todos os provedores. Exige instalar `ai` e um pacote por provedor.
   - **SDKs oficiais de cada provedor:** sem dependência intermediária, mas a camada comum e o formato de ferramentas de cada um têm de ser escritos e mantidos no projeto.
4. **Autonomia dos agentes.** Sugestão: leitura é livre; criar e editar pedem aprovação num cartão; apagar pede sempre confirmação explícita.
5. **Limites de uso.** Sem limites, qualquer conta gasta a tua chave à vontade. Sugestão: limite diário de mensagens por utilizador desde a primeira versão.
6. **Idioma do agente.** Hoje o tutor responde no idioma da pergunta. Mantemos isso?

## 4. Fases

### Fase 1 — Vários modelos

- **Camada comum no servidor:** `server/services/llm/` com um registo de provedores e uma interface única (`streamChat`, `generate`). Os controllers deixam de importar o SDK do Gemini diretamente.
- **Lista de modelos:** `GET /api/ai/models` devolve só os modelos cuja chave está configurada, com nome, provedor e se suportam imagem e ferramentas.
- **Chat:** `POST /api/ai/chat` aceita `model`. Sem o campo, usa o modelo padrão, para não partir clientes antigos.
- **Interface:** seletor de modelo no cabeçalho do AI Tutor, no lugar do rótulo "Gemini Pro". A escolha fica guardada no navegador.
- **Nome:** "Gemini Pro Tutor" passa a "AI Tutor" na interface e na landing.
- **"Deep Reasoning":** passa a ter efeito real, ativando o modo de raciocínio do modelo quando ele existir, ou é removido.
- **Variáveis novas:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (opcionais) e `AI_DEFAULT_MODEL`, em `env.ts`, `.env.example`, `render.yaml` e `docs/DEPLOY.md`.

Modelos candidatos (IDs a confirmar na documentação de cada provedor no dia):
- Gemini: `gemini-2.5-flash` (o atual) e um modelo "pro".
- Claude: `claude-sonnet-5-5` como padrão, `claude-haiku-5-5` como económico, `claude-opus-5-5` como avançado.
- OpenAI: um modelo geral e um económico.

**Pronto quando:** dá para trocar de modelo no chat e receber resposta em streaming de cada provedor configurado; sem chave, o modelo não aparece.

### Fase 2 — Conversas guardadas

- **Banco:** tabelas `ChatSession` e `ChatMessage` (uma migration), no mesmo padrão de `AcademicSession`.
- **Interface:** lista de conversas no AI Tutor, com continuar e apagar.
- **Porquê antes dos agentes especializados:** os agentes precisam de histórico para tarefas em vários passos e para o registo do que fizeram.

**Pronto quando:** recarregar a página mantém a conversa.

### Fase 3 — Agente da biblioteca (ferramentas)

O modelo passa a poder chamar ferramentas do servidor. Todas passam pelo `ResourceService` com o `userId` da sessão, nunca com um ID vindo do modelo.

| Ferramenta | Tipo | Aprovação |
|---|---|---|
| `list_resources`, `search_resources`, `list_folders` | leitura | não |
| `get_library_stats` (totais, tags, concluídos) | leitura | não |
| `create_resource`, `create_folder` | escrita | cartão de aprovação |
| `update_resource` (tags, pasta, notas, concluído) | escrita | cartão de aprovação |
| `bulk_update` (ex.: etiquetar ou mover vários) | escrita | cartão com a lista completa |
| `delete_resource`, `delete_folder` | destrutiva | confirmação explícita, sempre |

- **Ciclo do agente no servidor:** o modelo propõe uma chamada, o servidor executa (ou pede aprovação), devolve o resultado e o modelo continua. Limite de passos por pedido.
- **Interface:** os passos aparecem no chat ("A procurar recursos sobre Transformers…"). As ações de escrita aparecem como cartão com **Aprovar** e **Recusar**, mostrando exatamente o que vai mudar.
- **Atualização da tela:** depois de uma ação aprovada, Recursos atualiza sem recarregar.

**Pronto quando:** "organiza os meus recursos sem pasta" produz uma proposta, e só muda o banco depois de aprovada.

### Fase 4 — Agentes especializados

Cada um é um conjunto de instruções mais um subconjunto das ferramentas da Fase 3:

- **Organizador:** sugere tags e pastas, encontra duplicados, propõe arrumação em lote.
- **Leitor:** resume um recurso (link ou PDF enviado) e gera perguntas de revisão. Guarda o resumo nas notas, com aprovação.
- **Planeador de estudo:** monta um plano semanal a partir dos recursos ativos e marca o progresso.
- **Assistente académico:** liga o agente ao Academic Helper, usando os recursos da biblioteca como contexto do documento.

Entrada na interface: ações rápidas na tela de Recursos ("Organizar a biblioteca", "Resumir") e no ecrã inicial do AI Tutor.

### Fase 5 — Limites, custos e registo

- **Uso:** tabela `AiUsage` (utilizador, modelo, tokens, data) e limite diário por utilizador.
- **Registo de ações:** tabela `AgentAction` com o que o agente propôs, o que foi aprovado e o resultado.
- **Planos:** se quiseres planos pagos, é aqui que modelo e limites passam a depender do plano. Hoje só existe `free`.

## 5. Segurança

- **Isolamento por utilizador:** as ferramentas só veem e alteram dados do utilizador autenticado.
- **Conteúdo externo é dado, não instrução:** texto de páginas e PDFs lidos pelo agente pode conter instruções escondidas. O agente não executa ações de escrita a partir desse conteúdo sem aprovação.
- **Ler URLs:** se o Leitor for buscar páginas, bloquear endereços internos (SSRF), limitar tamanho e tempo.
- **Chaves:** só no servidor. Nada de chave de provedor no navegador.
- **Limite de passos e timeout** em cada execução, para um agente não ficar em ciclo a gastar tokens.

## 6. Testes e verificação

- **Automáticos:** testes dos provedores e do ciclo do agente com modelos simulados, no padrão de `server/controllers/ai.stream.test.ts`. Testes das ferramentas contra o banco de teste local.
- **No navegador:** trocar de modelo, streaming, cartão de aprovação, recusar, e confirmar que nada muda sem aprovação.
- **Com modelos reais:** só é possível com as chaves. Sem chave local, isso fica para testar em produção, como aconteceu com o streaming.

## 7. Proposta para quarta-feira

1. Fechar as 6 decisões da secção 3.
2. Fase 1 completa (vários modelos), num branch próprio.
3. Fase 3 em versão mínima: ferramentas de leitura e `update_resource` com cartão de aprovação.
4. Fases 2, 4 e 5 ficam para sessões seguintes, por esta ordem.

Regras de trabalho: branch novo a partir do `master`, um commit por parte, testar antes de propor deploy, e **nenhum push para o `master` sem pedido teu** (cada push publica em produção no Render).

## 8. Riscos

- **Custo:** três provedores e agentes com vários passos gastam mais tokens. Sem a Fase 5, não há teto.
- **Diferenças entre provedores:** nem todos os modelos suportam ferramentas, imagem ou raciocínio da mesma forma. O seletor tem de mostrar só o que cada um faz.
- **Ações erradas do agente:** mitigado pela aprovação e pelo registo; apagar nunca é automático.
- **Tamanho do JavaScript:** a interface dos agentes entra no bloco do AI Tutor, que já é carregado sob demanda.
