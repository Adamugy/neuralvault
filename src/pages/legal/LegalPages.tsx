import React from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, ChevronLeft, AlertTriangle } from 'lucide-react';
import { LEGAL, PROCESSORS, missing } from '../../legal/config';

const c = LEGAL.controller;
const contactEmail = missing(c.email);
const isIncomplete = !c.name || !c.taxId || !c.address || !c.email;

const LegalLayout: React.FC<{ title: string; version: string; children: React.ReactNode }> = ({ title, version, children }) => (
  <div className="min-h-screen bg-canvas text-body">
    <header className="border-b border-hairline">
      <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-ink rounded-md">
          <BrainCircuit className="w-6 h-6 text-primary" aria-hidden="true" />
          <span translate="no" className="font-display text-2xl leading-none">NeuralVault</span>
        </Link>
        <Link to="/" className="text-sm text-muted hover:text-ink inline-flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Voltar
        </Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12" lang="pt-PT">
      {isIncomplete && (
        <div role="note" className="mb-8 flex gap-3 p-4 rounded-md border border-amber/40 bg-amber/15 text-sm text-ink">
          <AlertTriangle className="w-5 h-5 text-amber-ink shrink-0" aria-hidden="true" />
          <p>Documento em preparação: faltam dados de identificação do responsável, assinalados como “[por preencher]”.</p>
        </div>
      )}
      <h1 className="font-display text-4xl md:text-5xl text-ink mb-2">{title}</h1>
      <p className="text-sm text-muted mb-10">Versão {version} · em vigor desde {new Date(version).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
      <div className="legal-prose space-y-8 text-[15px] leading-relaxed">{children}</div>
    </main>
    <LegalFooter />
    <style>{`
      .legal-prose h2 { font-family: var(--font-display); font-size: 1.75rem; color: var(--color-ink); margin-bottom: .75rem; line-height: 1.2; }
      .legal-prose ul { list-style: disc; padding-left: 1.25rem; }
      .legal-prose li + li { margin-top: .35rem; }
      .legal-prose p + p { margin-top: .6rem; }
      .legal-prose a { color: var(--color-primary); text-decoration: underline; text-underline-offset: 2px; }
      .legal-prose table { width: 100%; border-collapse: collapse; font-size: 14px; }
      .legal-prose th, .legal-prose td { text-align: left; padding: .5rem; border-bottom: 1px solid var(--color-hairline); vertical-align: top; }
      .legal-prose th { color: var(--color-ink); font-weight: 600; }
    `}</style>
  </div>
);

/** Footer links used on every page (landing, auth, legal pages; the dashboard has its own). */
export const LegalFooter: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <footer className={dark ? '' : 'border-t border-hairline'}>
    <div className={`max-w-3xl mx-auto px-6 py-6 flex flex-wrap gap-x-6 gap-y-2 text-xs ${dark ? 'text-on-dark-soft' : 'text-muted'}`}>
      <Link to="/termos" className="hover:underline underline-offset-2">Termos de Utilização</Link>
      <Link to="/privacidade" className="hover:underline underline-offset-2">Política de Privacidade</Link>
      <Link to="/privacidade#contacto" className="hover:underline underline-offset-2">Contacto de privacidade</Link>
    </div>
  </footer>
);

const Identity = () => (
  <ul>
    <li><strong>Responsável:</strong> {missing(c.name)} (pessoa singular)</li>
    <li><strong>NIF / NUIT:</strong> {missing(c.taxId)}</li>
    <li><strong>Morada:</strong> {missing(c.address)}</li>
    <li><strong>Email:</strong> {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : contactEmail}</li>
  </ul>
);

const Email = () => (c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <>{contactEmail}</>);

export const PrivacyPolicyPage: React.FC = () => (
  <LegalLayout title="Política de Privacidade" version={LEGAL.privacyVersion}>
    <section>
      <p>
        Esta política explica que dados pessoais o NeuralVault trata, para quê, com quem os partilha e como podes exercer os teus direitos.
        Aplica-se o Regulamento Geral sobre a Proteção de Dados (RGPD, Regulamento (UE) 2016/679) e a Lei n.º 58/2019, de 8 de agosto.
        Para quem usa o serviço a partir de Moçambique, aplicamos o mesmo nível de proteção, em respeito pela Constituição da República de
        Moçambique e pela Lei n.º 3/2017, de 9 de janeiro (Lei de Transacções Electrónicas).
      </p>
    </section>

    <section id="contacto">
      <h2>1. Quem é o responsável</h2>
      <Identity />
      <p>Não foi nomeado encarregado de proteção de dados. Para qualquer questão de privacidade, usa o email acima.</p>
    </section>

    <section>
      <h2>2. Que dados tratamos</h2>
      <ul>
        <li><strong>Conta:</strong> email, nome (opcional) e palavra-passe. A palavra-passe é guardada apenas como hash (bcrypt), nunca em texto.</li>
        <li><strong>Perfil (opcional):</strong> apelido, função e fotografia, só se os preencheres nas Definições.</li>
        <li><strong>Conteúdo que guardas:</strong> recursos, ligações, notas, etiquetas, pastas e ficheiros enviados; sessões e documentos do Assistente Académico.</li>
        <li><strong>Conteúdo enviado à IA:</strong> mensagens do AI Tutor, imagens para análise e ficheiros do Assistente Académico. As conversas do AI Tutor não ficam guardadas nos nossos servidores; as imagens para análise são apagadas logo após a resposta.</li>
        <li><strong>Segurança e sessão:</strong> token de sessão, um resumo (hash) do navegador usado para detetar sessões roubadas, datas de início e de último uso, segredo de dupla autenticação e chave pública das passkeys, se as ativares.</li>
        <li><strong>Consentimentos:</strong> o que aceitaste ou recusaste (termos, privacidade, idade, comunicações de marketing, IA), com a versão do documento e a data e hora.</li>
        <li><strong>Registos técnicos do servidor</strong> mantidos pelo fornecedor de alojamento (endereço IP, pedido, data e hora).</li>
      </ul>
      <p>Não pedimos data de nascimento: perguntamos apenas se tens 13 anos ou mais.</p>
    </section>

    <section>
      <h2>3. Para que usamos os dados e com que fundamento</h2>
      <table>
        <thead><tr><th>Finalidade</th><th>Fundamento (RGPD, art. 6.º, n.º 1)</th></tr></thead>
        <tbody>
          <tr><td>Criar e gerir a conta, guardar os teus recursos, enviar emails de confirmação e recuperação</td><td>Execução do contrato (alínea b)</td></tr>
          <tr><td>Funcionalidades de IA (enviar o teu conteúdo ao fornecedor do modelo escolhido: Google, Anthropic, OpenAI ou Moonshot)</td><td>Consentimento (alínea a), pedido antes da primeira utilização</td></tr>
          <tr><td>Comunicações de marketing, se as aceitares</td><td>Consentimento (alínea a); a caixa vem desmarcada</td></tr>
          <tr><td>Segurança, prevenção de abuso (incluindo o limite diário de pedidos de IA) e registo de consentimentos</td><td>Interesse legítimo (alínea f) e dever de demonstrar o consentimento (art. 7.º, n.º 1)</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>4. Inteligência artificial</h2>
      <p>
        No AI Tutor escolhes o modelo, e o conteúdo que envias é processado pelo fornecedor desse modelo: <strong>Google</strong> (Gemini),
        <strong>Anthropic</strong> (Claude), <strong>OpenAI</strong> (GPT) ou <strong>Moonshot AI</strong> (Kimi). A análise de imagem e o Assistente Académico usam sempre o Gemini.
        Na API Gemini usamos o <strong>plano gratuito</strong>: segundo os termos da Google, nesse plano o conteúdo pode ser usado pela Google para
        melhorar os seus produtos e pode ser lido por revisores humanos. Nas APIs da Anthropic e da OpenAI, segundo os termos comerciais desses
        fornecedores, o conteúdo não é usado para treinar os seus modelos por omissão, mas pode ser guardado durante um período limitado para
        deteção de abusos. Só ativamos estas funcionalidades depois de aceitares um aviso próprio, e podes retirar esse consentimento a qualquer
        momento em Definições → Privacidade, sem afetar o resto do serviço.
      </p>
      <p>
        O AI Tutor pode consultar a tua biblioteca (títulos, tipos, etiquetas, notas e pastas) para responder a pedidos como “organiza os meus
        recursos”; essa informação é então enviada ao fornecedor do modelo escolhido. O assistente não altera nada sozinho: uma alteração aparece
        como proposta e só é aplicada se carregares em “Aplicar”. Não consegue apagar recursos.
      </p>
      <p>
        Para controlar custos e abusos, contamos quantos pedidos de IA fazes por dia e aplicamos um limite diário. Esse contador guarda apenas a
        data e o número de pedidos, é apagado ao fim de 90 dias e é apagado com a conta.
      </p>
      <p>O NeuralVault não usa os teus dados para treinar modelos de IA próprios. As respostas geradas por IA estão assinaladas como tal e podem conter erros.</p>
    </section>

    <section>
      <h2>5. Com quem partilhamos (subcontratantes)</h2>
      <p>Não vendemos dados. Recorremos a estes fornecedores, que tratam dados por nossa conta:</p>
      <table>
        <thead><tr><th>Fornecedor</th><th>Para quê</th><th>Onde</th></tr></thead>
        <tbody>
          {PROCESSORS.map(p => <tr key={p.name}><td>{p.name}</td><td>{p.role}</td><td>{p.location}</td></tr>)}
        </tbody>
      </table>
      <p>
        Alguns destes fornecedores estão sediados nos EUA ou tratam dados fora do Espaço Económico Europeu. Essas transferências baseiam-se na
        decisão de adequação do Quadro de Privacidade de Dados UE-EUA, quando o fornecedor está certificado, ou nas cláusulas contratuais-tipo
        aprovadas pela Comissão Europeia (RGPD, arts. 45.º e 46.º).
      </p>
      <p>
        Os modelos Kimi são fornecidos pela Moonshot AI Pte. Ltd., com sede e servidores em Singapura, país sem decisão de adequação da Comissão
        Europeia. A Moonshot não disponibiliza acordo de tratamento de dados nem cláusulas contratuais-tipo, e os seus termos permitem-lhe usar o
        conteúdo recebido para desenvolver e melhorar os seus serviços, incluindo treinar modelos. Os teus direitos podem não ter, em Singapura, a
        mesma proteção ou os mesmos meios de reclamação que na UE. Por isso, o conteúdo só lhe é enviado quando escolhes um modelo Kimi, com base no
        teu consentimento explícito, dado no aviso de IA depois de seres informado destes riscos (RGPD, art. 49.º, n.º 1, alínea a)). Se não
        quiseres esta transferência, escolhe outro modelo.
      </p>
      <p>Se usares a opção “Search the Web” na pesquisa, o termo pesquisado é enviado à Google apenas quando clicas nessa opção.</p>
    </section>

    <section>
      <h2>6. Durante quanto tempo guardamos</h2>
      <table>
        <thead><tr><th>Dados</th><th>Prazo</th></tr></thead>
        <tbody>
          <tr><td>Conta, recursos, ficheiros e documentos</td><td>Enquanto a conta existir; apagados quando apagas a conta</td></tr>
          <tr><td>Contas que nunca confirmaram o email</td><td>Apagadas 30 dias após o registo</td></tr>
          <tr><td>Sessões</td><td>Até expirarem ou até saíres; apagadas automaticamente</td></tr>
          <tr><td>Tokens de recuperação de palavra-passe</td><td>1 hora</td></tr>
          <tr><td>Registo de consentimentos</td><td>Enquanto a conta existir</td></tr>
          <tr><td>Imagens enviadas para análise</td><td>Apagadas logo após a resposta</td></tr>
          <tr><td>Registos técnicos do alojamento</td><td>Segundo o prazo do fornecedor de alojamento</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>7. Os teus direitos</h2>
      <p>
        Tens direito de acesso, retificação, apagamento, limitação, portabilidade e oposição, e de retirar o consentimento a qualquer momento
        (RGPD, arts. 15.º a 22.º e art. 7.º, n.º 3). Em Definições → Privacidade podes descarregar todos os teus dados e apagar a conta, sem custos.
        Para os restantes pedidos, escreve para <Email />. Respondemos no prazo de um mês (RGPD, art. 12.º, n.º 3).
      </p>
      <p>
        Podes apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD), em <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>,
        ou à autoridade de proteção de dados do país da UE onde vives. Em Moçambique, podes recorrer às autoridades e aos tribunais competentes.
      </p>
    </section>

    <section>
      <h2>8. Menores</h2>
      <p>O NeuralVault destina-se a pessoas com 13 anos ou mais (Lei n.º 58/2019, art. 16.º). Não criamos contas a quem declara ter menos de 13 anos.</p>
    </section>

    <section>
      <h2>9. Cookies e armazenamento no navegador</h2>
      <p>
        Não usamos cookies de análise nem de publicidade, nem rastreadores de terceiros. Guardamos apenas o token de sessão no armazenamento local
        do navegador (<code>auth_token</code>), necessário para manter a sessão iniciada. As fontes são servidas pelo nosso próprio domínio.
        Por isso não pedimos consentimento para cookies: só usamos o estritamente necessário (Lei n.º 41/2004, art. 5.º).
      </p>
    </section>

    <section>
      <h2>10. Segurança</h2>
      <p>Usamos ligações cifradas (HTTPS), palavras-passe com hash, dupla autenticação e passkeys opcionais, e acesso restrito à base de dados. Em caso de violação de dados que possa pôr em risco os teus direitos, notificamos a CNPD em até 72 horas e informamos-te sem demora injustificada quando o risco for elevado (RGPD, arts. 33.º e 34.º).</p>
    </section>

    <section>
      <h2>11. Alterações</h2>
      <p>Quando esta política mudar, a versão e a data acima são atualizadas e pedimos-te que a aceites de novo antes de continuares a usar o serviço.</p>
    </section>
  </LegalLayout>
);

export const TermsPage: React.FC = () => (
  <LegalLayout title="Termos de Utilização" version={LEGAL.termsVersion}>
    <section>
      <h2>1. Quem presta o serviço</h2>
      <p>O NeuralVault é prestado por:</p>
      <Identity />
    </section>

    <section>
      <h2>2. O serviço</h2>
      <p>
        O NeuralVault é uma ferramenta de estudo para organizar recursos (ligações, ficheiros, notas) e usar funcionalidades de inteligência
        artificial. O serviço é atualmente <strong>gratuito</strong>. Se no futuro houver planos pagos, estes termos serão atualizados antes de
        qualquer cobrança, com informação sobre o preço total, a renovação e o direito de livre resolução de 14 dias nos contratos celebrados
        à distância (Decreto-Lei n.º 24/2014, de 14 de fevereiro).
      </p>
    </section>

    <section>
      <h2>3. Conta</h2>
      <ul>
        <li>Tens de ter 13 anos ou mais para criar conta.</li>
        <li>És responsável por manter a palavra-passe em segurança e pela atividade na tua conta.</li>
        <li>Podes apagar a conta a qualquer momento em Definições → Privacidade.</li>
      </ul>
    </section>

    <section>
      <h2>4. O teu conteúdo</h2>
      <p>
        O conteúdo que guardas continua a ser teu. Concedes-nos apenas a autorização necessária para o guardar e processar de forma a prestar o
        serviço. Não podes guardar ou enviar conteúdo ilegal, que viole direitos de autor ou outros direitos de terceiros, nem software malicioso.
      </p>
      <p id="denuncias">
        <strong>Denúncias:</strong> para comunicar conteúdo ilegal ou uma violação de direitos de autor, escreve para <Email /> com a descrição,
        a localização do conteúdo e os teus dados de contacto. Analisamos cada denúncia e respondemos.
      </p>
    </section>

    <section>
      <h2>5. Inteligência artificial</h2>
      <ul>
        <li>As respostas do AI Tutor, da análise de imagem e do Assistente Académico são geradas por IA, estão assinaladas como tal e podem conter erros. Verifica a informação antes de a usar.</li>
        <li>Não substituem aconselhamento profissional, médico, jurídico ou académico.</li>
        <li>És responsável por respeitar as regras de integridade académica da tua instituição.</li>
        <li>O uso das funcionalidades de IA depende do teu consentimento, explicado na <Link to="/privacidade">Política de Privacidade</Link>.</li>
      </ul>
    </section>

    <section>
      <h2>6. Disponibilidade</h2>
      <p>Fazemos um esforço razoável para manter o serviço disponível, mas não garantimos um tempo de funcionamento mínimo. Podem ocorrer interrupções para manutenção ou por falhas de fornecedores.</p>
    </section>

    <section>
      <h2>7. Responsabilidade</h2>
      <p>
        Na medida permitida por lei, não respondemos por danos indiretos resultantes da utilização do serviço gratuito. Nada nestes termos exclui
        ou limita a responsabilidade por dolo ou culpa grave, nem os direitos que a lei reconhece aos consumidores.
      </p>
    </section>

    <section>
      <h2>8. Lei aplicável</h2>
      <p>
        Estes termos regem-se pela lei portuguesa, sem prejuízo das normas imperativas de proteção do consumidor do país onde resides,
        incluindo, em Moçambique, a Lei n.º 22/2009, de 28 de setembro (Lei de Defesa do Consumidor).
      </p>
    </section>

    <section>
      <h2>9. Alterações</h2>
      <p>Quando estes termos mudarem, a versão e a data acima são atualizadas e pedimos-te que os aceites de novo.</p>
    </section>
  </LegalLayout>
);
