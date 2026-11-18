# Roteiro de resposta a violações de dados

Documento interno. Não substitui aconselhamento jurídico. Versão de 18/11/2026.

## Base legal

- **Portugal / UE:** RGPD, art. 33.º (notificar a autoridade de controlo em até **72 horas** depois de ter conhecimento, salvo se a violação não for suscetível de resultar num risco para os direitos e liberdades das pessoas) e art. 34.º (comunicar às pessoas afetadas **sem demora injustificada** quando o risco for **elevado**). Autoridade: **CNPD**, https://www.cnpd.pt. O art. 33.º, n.º 5, obriga a documentar **todas** as violações, mesmo as que não são notificadas.
- **Moçambique:** até à data deste documento, não identifiquei uma lei geral de proteção de dados com prazo de notificação em vigor. Aplicamos o mesmo procedimento (72 horas e comunicação às pessoas afetadas). **Confirmar com advogado em Moçambique.**

## Passos

1. **Conter (primeira hora).** Revogar as chaves comprometidas (Render, Neon, Resend, Google), terminar todas as sessões (apagar as linhas da tabela `Session` no Neon) e, se preciso, suspender o serviço no Render.
2. **Avaliar (até 24 horas).** O que aconteceu, quando, que dados (email, conteúdo, ficheiros, consentimentos), quantas pessoas, se os dados estavam cifrados e qual o risco provável (roubo de identidade, exposição de conteúdo privado, phishing).
3. **Decidir sobre a notificação.**
   - Há risco para as pessoas? Notificar a **CNPD** em até 72 horas desde o conhecimento. Se faltar informação, notificar na mesma e completar depois (art. 33.º, n.º 4).
   - O risco é elevado? Comunicar também às pessoas afetadas, por email, em linguagem simples: o que aconteceu, que dados, o que fizemos, o que devem fazer (mudar a palavra-passe, desconfiar de emails) e o contacto.
4. **Registar.** Preencher o registo abaixo, mesmo sem notificação.
5. **Corrigir e rever.** Corrigir a causa, rodar todas as chaves e rever este roteiro.

## Registo de violações (RGPD, art. 33.º, n.º 5)

| Data em que soubemos | O que aconteceu | Dados e nº de pessoas | Risco | Notificada à CNPD? Quando | Comunicada às pessoas? | Medidas tomadas |
|---|---|---|---|---|---|---|
| | | | | | | |
