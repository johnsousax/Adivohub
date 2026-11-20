# Vade — Plano Completo do Produto

> Plataforma de gestão para escritórios de advocacia com IA nativa.
> Meta comercial: ticket a partir de **R$ 2.000/mês** por escritório.
> Documento de trabalho — versão 1.1 (nov/2026). O nome do produto é **Vade** (de _Vade Mecum_, "vai comigo");
> nas primeiras versões deste plano ele aparecia como "AdvoHub". Falta confirmar a marca no INPI e o domínio.
>
> Apresentações: `Vade-Apresentacao.pdf` (completa, com o plano de execução) e
> `Vade-Apresentacao-Clientes.pdf` (versão para mostrar a escritórios, sem custos, margens e estratégia interna).
> Fonte editável dos slides: `apresentacao/slides.html`.
>
> O aplicativo já existe em modo demonstração (ver `README.md` na raiz): painel, casos, prazos, agenda, clientes,
> financeiro e IA funcionam com dados locais; banco de dados e integrações externas ainda não estão conectados.

---

## 1. Visão

O advogado de escritório pequeno e médio é, ao mesmo tempo, técnico, gestor, vendedor e cobrador.
Ele usa 5 a 8 ferramentas soltas (planilha de honorários, agenda do Google, WhatsApp pessoal,
pasta no Drive, sistema de publicações, banco) e perde dinheiro em três pontos: **prazo perdido**,
**honorário não cobrado** e **cliente/lead sem resposta**.

O Vade junta tudo em um só lugar e coloca uma IA que **trabalha junto**: ela avisa, resume,
responde o cliente, cobra e agenda — sempre sob supervisão do advogado.

**Promessa central:** "Seu escritório organizado, seus prazos sob controle e seus clientes atendidos 24h — sem contratar mais ninguém."

## 2. Público-alvo (ICP)

| Segmento | Perfil | Por que paga R$ 2.000+ |
|---|---|---|
| **Principal** | Escritórios de 2 a 15 advogados, faturamento de R$ 50 mil a R$ 500 mil/mês | Já sentem a dor de gestão e têm margem para investir |
| Secundário | Advogado solo de alto volume (previdenciário, trabalhista, consumidor, família) | Muito lead via WhatsApp, muito processo, pouco tempo |
| Expansão | Departamentos jurídicos e escritórios de 15–50 advogados | Plano Enterprise |

Áreas com melhor encaixe inicial: **previdenciário, trabalhista, família, consumidor e cível** (alto volume de clientes pessoa física, atendimento intenso por WhatsApp).

## 3. Módulos do sistema

### 3.1 Casos e Processos
- Cadastro de casos (judicial, administrativo, consultivo) com número CNJ, partes, vara, fase, valor da causa.
- **Monitoramento automático de processos e publicações** via provedor de dados jurídicos (Escavador, Judit, Codilo ou similar), com captura de andamentos e intimações.
- Quadro Kanban por fase + visão em lista com filtros salvos.
- **Gestão de prazos**: prazo criado a partir da publicação, com responsável, data fatal e data interna (D-2). Alertas escalonados.
- Linha do tempo do caso: andamentos, documentos, tarefas, conversas, lançamentos financeiros.
- Tarefas e checklists por tipo de ação (modelos de fluxo: ex. "Aposentadoria por idade").

### 3.2 Clientes (CRM jurídico)
- Cadastro PF/PJ, contatos, documentos pessoais, histórico.
- **Funil de captação**: lead → consulta → proposta → contrato → cliente ativo.
- Origem do lead (Instagram, Google, indicação) para medir marketing.
- **Portal do Cliente**: o cliente acompanha o processo em linguagem simples, envia documentos e vê boletos.

### 3.3 Agenda
- Audiências, reuniões, prazos e tarefas em uma agenda única (dia/semana/mês) por advogado e do escritório.
- Sincronização bidirecional com Google Calendar e Outlook.
- **Agendamento online**: link público de consulta (estilo Calendly) com pagamento antecipado opcional.
- Lembretes automáticos por WhatsApp/e-mail para advogado e cliente (reduz faltas).

### 3.4 Financeiro e Faturamento
- **Contratos de honorários**: fixo, parcelado, mensal (partido), êxito (% sobre o proveito) e híbrido.
- Cobrança integrada: **Pix, boleto e cartão** (gateway: Asaas, Iugu ou Stripe), com baixa automática.
- Régua de cobrança automática (lembrete antes, no dia e após o vencimento) — feita pela IA no WhatsApp com tom configurável.
- Controle de honorários de êxito: previsão a partir do valor da causa e alerta quando houver alvará/RPV/precatório.
- Despesas do processo (custas, perícia, deslocamento) com reembolso pelo cliente.
- Contas a pagar/receber, fluxo de caixa, DRE simplificado, centro de custo por área/sócio.
- Emissão de **NFS-e** integrada.
- Divisão de honorários entre sócios/parceiros (repasse).
- Timesheet (horas por caso/cliente) para consultivo e cobrança por hora.

### 3.5 Dashboard e Relatórios
- **Painel do sócio**: faturamento do mês, a receber, inadimplência, previsão de êxito, novos clientes, taxa de conversão de leads, prazos da semana, produtividade por advogado.
- Painel operacional: prazos vencendo, tarefas atrasadas, audiências da semana.
- Relatórios exportáveis (PDF/Excel) e metas por advogado.

### 3.6 Inteligência Artificial (o diferencial)

**A) Assistente do Advogado (interno)**
- **Briefing diário no WhatsApp** às 7h: audiências, prazos, publicações novas, quem pagou, quem atrasou.
- Resumo automático de cada publicação/intimação com sugestão de providência e prazo (o advogado confirma).
- Chat com o processo: "o que aconteceu nesse caso nos últimos 6 meses?".
- Leitura de documentos (petições, sentenças, contratos, laudos) com resumo e pontos de atenção.
- Geração de rascunhos: petições a partir dos modelos do escritório, contratos, procurações, e-mails ao cliente.
- Comandos por voz/texto no WhatsApp: "marca audiência do João dia 12 às 14h", "quanto recebi esse mês?".

**B) Atendente IA para Clientes (externo, WhatsApp oficial)**
- Atendimento 24h no número do escritório (WhatsApp Business Platform/API oficial da Meta).
- **Triagem de leads**: coleta dados, identifica área do direito, qualifica e agenda consulta.
- Responde "como está meu processo?" consultando o sistema e traduzindo para linguagem simples.
- Solicita e recebe documentos, que caem direto na pasta do caso.
- Envia lembretes de audiência e cobranças.
- **Transferência para humano** em qualquer momento; o advogado vê a conversa inteira em uma caixa de entrada compartilhada.

**Guardrails de IA (obrigatório)**
- A IA não presta consultoria jurídica nem promete resultado; respostas de mérito vão para o advogado.
- O atendente se identifica como atendimento virtual e só responde contatos iniciados pelo cliente/lead (sem disparo de captação ativa, o que a OAB veda).
- Tudo que a IA envia de sensível passa por aprovação configurável (modo "rascunho" vs. "automático").
- Conformidade com o Código de Ética e Disciplina da OAB, o Provimento 205/2021 (publicidade) e as recomendações do Conselho Federal da OAB sobre uso de IA generativa.
- Registro de auditoria de cada ação da IA.

### 3.7 Documentos (GED)
- Pastas por caso/cliente, versionamento, busca por conteúdo (OCR).
- Modelos com variáveis (contrato, procuração, declaração de hipossuficiência).
- **Assinatura eletrônica** integrada (Clicksign, ZapSign ou D4Sign).

### 3.8 Equipe, segurança e administração
- Perfis e permissões (sócio, advogado, estagiário, financeiro, secretária).
- Multi-escritório/filiais.
- Log de auditoria, 2FA, sessões, LGPD.

## 4. Arquitetura técnica

| Camada | Escolha | Motivo |
|---|---|---|
| Front-end | Next.js + TypeScript + Tailwind + shadcn/ui | Rápido de construir, visual premium, SSR |
| Back-end | Next.js API / Node (NestJS se crescer) | Uma linguagem só |
| Banco | PostgreSQL (Supabase) com **Row Level Security** multi-tenant | Isolamento por escritório, auth pronto |
| Arquivos | Supabase Storage / S3 com criptografia | Documentos sensíveis |
| Filas e automações | Workers (BullMQ/Redis) + n8n para integrações | Monitoramento, régua de cobrança, briefing |
| IA | Claude API (Anthropic) com tool use + busca nos dados do escritório (RAG). Roteamento por tarefa: Haiku para triagem e classificação de alto volume, Sonnet para atendimento e assistente, Opus para peças e análises complexas. Cache de prompt para reduzir custo | Raciocínio jurídico em PT-BR, contexto longo, custo controlado |
| WhatsApp | WhatsApp Business Platform (Cloud API oficial) | Estável, sem risco de banimento |
| Pagamentos | Asaas (Pix/boleto/cartão + NFS-e) | Focado em Brasil, split de pagamento |
| Processos | Provedor de dados jurídicos (Escavador / Judit / Codilo) | Cobertura de tribunais |
| Agenda | Google Calendar API / Microsoft Graph | Sincronização |
| Infra | Vercel + Supabase (região São Paulo) | Dados no Brasil, escala sob demanda |
| Observabilidade | Sentry + logs + métricas de uso por tenant | Suporte proativo |

**Modelo de dados (núcleo):** `escritorios`, `usuarios`, `clientes`, `leads`, `casos`, `partes`,
`andamentos`, `publicacoes`, `prazos`, `tarefas`, `eventos_agenda`, `contratos_honorarios`,
`parcelas`, `cobrancas`, `despesas`, `lancamentos`, `documentos`, `conversas`, `mensagens`,
`acoes_ia`, `auditoria`.

**Segurança e LGPD:** criptografia em trânsito e em repouso, RLS por escritório, 2FA, backups
diários com retenção de 30 dias, termos de tratamento de dados (DPA) com cada escritório,
dados hospedados no Brasil, logs de acesso, política de retenção e exclusão.

## 5. Roadmap de desenvolvimento

| Fase | Duração | Entregas |
|---|---|---|
| **0. Descoberta** | 2 semanas | Entrevistas com 10–15 advogados, protótipo navegável (Figma), validação de preço, 3–5 escritórios piloto |
| **1. MVP Core** | 8 semanas | Auth/multi-tenant, clientes, casos, prazos, agenda (sync Google), financeiro básico (contratos, parcelas, Pix/boleto), dashboard v1 |
| **2. IA + WhatsApp** | 6 semanas | Briefing diário, atendente IA com triagem e agendamento, caixa de entrada, régua de cobrança, resumo de publicações |
| **3. Monitoramento + Documentos** | 4 semanas | Captura de processos/publicações, GED, modelos, assinatura eletrônica, portal do cliente |
| **4. Financeiro avançado** | 4 semanas | Êxito, repasses, NFS-e, DRE, timesheet, relatórios |
| **5. Lançamento** | contínuo | Onboarding assistido, migração de dados, app mobile (PWA → nativo), Enterprise |

**Total até versão comercial completa: ~6 meses.** Pilotos entram no fim da Fase 1 (mês 2–3) com desconto em troca de feedback e depoimento.

**Time mínimo:** 1 tech lead full-stack, 1–2 devs full-stack, 1 designer (parcial), 1 especialista jurídico/produto (pode ser advogado parceiro), suporte/CS a partir do lançamento.

## 6. Planos e preços

| | **Profissional** | **Escritório** | **Enterprise** |
|---|---|---|---|
| Mensalidade | **R$ 2.197/mês** | **R$ 3.497/mês** | a partir de **R$ 5.900/mês** |
| Usuários | até 3 | até 10 | ilimitado |
| Processos monitorados | até 500 | até 2.000 | sob medida |
| Atendente IA no WhatsApp | 1 número, 1.000 conversas/mês | 2 números, 3.000 conversas/mês | sob medida |
| Assistente IA do advogado | ✔ | ✔ | ✔ + modelos treinados no acervo |
| Financeiro + cobrança automática | ✔ | ✔ + NFS-e, repasses | ✔ + multi-filial |
| Portal do cliente | — | ✔ | ✔ |
| Onboarding | remoto | migração de dados | gerente de conta dedicado |

- **Taxa de implantação:** R$ 2.500 a R$ 6.000 (migração, configuração do WhatsApp, treinamento). Isenta no plano anual.
- **Plano anual:** 2 meses grátis (pagamento à vista ou 12x).
- **Excedentes:** pacotes de conversas IA e processos monitorados.

## 7. Por que vale R$ 2.000+ (ROI para o advogado)

| Ganho | Estimativa mensal (escritório de 3–5 advogados) |
|---|---|
| Atendimento/secretariado coberto pela IA (meio período de uma secretária) | R$ 2.000 – R$ 3.000 |
| Redução de inadimplência com régua automática (10–20% de R$ 40 mil a receber) | R$ 4.000 – R$ 8.000 |
| Leads respondidos em < 1 min, 24h (+2 contratos/mês × ticket R$ 3.000) | R$ 6.000 |
| Horas de advogado liberadas (20h × R$ 200/h) | R$ 4.000 |
| **Total potencial** | **R$ 16.000 – R$ 21.000/mês** |

Mensagem de venda: **"O Vade se paga com um contrato a mais por mês."** Um único prazo perdido pode custar mais que um ano de assinatura.

> Os números acima são estimativas de referência para a apresentação comercial e devem ser validados com os escritórios piloto.

## 8. Custos e margem (por escritório, plano Profissional)

| Item | Custo estimado/mês |
|---|---|
| IA (Claude) — atendimento, briefing, resumos, documentos, minutas | R$ 200 – R$ 600 |
| WhatsApp Business Platform (mensagens de lembrete e cobrança) | R$ 80 – R$ 200 |
| Monitoramento de processos/publicações | R$ 100 – R$ 300 |
| Infraestrutura, storage, e-mail | R$ 40 – R$ 80 |
| Gateway/assinatura (repasse ao cliente quando possível) | variável |
| **Total** | **R$ 420 – R$ 1.180** |

**Como chegamos ao custo de IA** (preços de tabela da Anthropic em nov/2026: Sonnet US$ 2 / US$ 10 e Haiku US$ 0,10 / US$ 0,50 por milhão de tokens de entrada/saída):
- Atendimento: 1.000 conversas × ~8 trocas. Só com Sonnet daria ~US$ 80/mês; com ~70% das trocas no Haiku (triagem, perguntas simples) e cache de prompt, cai para ~US$ 25–30.
- Assistente do advogado (briefings, resumo de ~400 publicações, ~60 documentos, ~40 minutas, perguntas sobre processos): ~US$ 30–35.
- Total típico ≈ US$ 60 (≈ R$ 330); com uso intenso, até ~R$ 600.

**Custo típico ≈ R$ 650/mês → margem bruta ≈ 70% no plano Profissional.** No uso mais intenso a margem cai para ~45%, por isso os limites por plano e os pacotes de excedente são obrigatórios.
Meta: com 100 escritórios ativos ≈ R$ 250 mil de MRR (ticket médio de R$ 2.500).

> Todos os custos acima são estimativas para validar na Fase 0 com cotações reais dos fornecedores.

## 9. Concorrência e diferenciação

Mercado tem players consolidados (Astrea/Aurum, Projuris, ADVBOX, Legal One, EasyJur, CPJ).
A maioria é forte em cadastro de processos, mas trata IA como acessório e o WhatsApp como canal externo.

**Diferenciais do Vade:**
1. **IA que age** (agente com ferramentas), não só um chat — ela agenda, cobra, responde e resume.
2. **WhatsApp oficial como centro do atendimento**, com caixa de entrada da equipe.
3. **Financeiro de verdade** (êxito, repasse, cobrança automática, NFS-e) — onde o sócio sente o dinheiro.
4. **Onboarding feito por nós** (migração + configuração), justificando o ticket premium.
5. Visual moderno e simples, pensado para quem não gosta de sistema.

## 10. Go-to-market

1. **Pilotos (mês 2–4):** 5–10 escritórios com 50% de desconto por 3 meses em troca de feedback e case.
2. **Conteúdo e autoridade:** Instagram/LinkedIn/YouTube sobre gestão e IA na advocacia; webinars mensais.
3. **Vendas consultivas:** demo de 30 min + diagnóstico gratuito do escritório (quanto ele perde hoje), com implantação concluída em até 7 dias (meta).
4. **Parcerias:** subseções da OAB, cursos jurídicos, contadores de escritórios, comunidades de advogados.
5. **Indicação:** 1 mês grátis por escritório indicado que fechar.
6. Tráfego pago focado em sócios de escritórios (Meta + Google) com lead para demo.

**Métricas-chave:** MRR, churn mensal (< 2%), CAC, LTV/CAC (> 3), tempo até o primeiro valor
(meta: primeiro briefing de IA no dia 1), NPS, uso semanal ativo por usuário.

## 11. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Ética/OAB no uso de IA com clientes | IA não dá parecer; aprovação humana; só responde contatos iniciados pelo cliente; avisos claros; consultoria jurídica especializada |
| Vazamento de dados (LGPD) | RLS, criptografia, auditoria, pentest antes do lançamento, DPA |
| Erro de IA em prazo | IA só sugere; prazo só vale após confirmação do advogado; dupla checagem |
| Dependência de provedores (WhatsApp, dados jurídicos) | Camada de integração desacoplada; 2º fornecedor homologado |
| Ciclo de venda longo | Piloto com desconto, migração gratuita, demo com dados do próprio escritório |
| Custo de IA crescer | Cache, modelos menores para tarefas simples, limites por plano |

## 12. Próximos passos (próximas 2 semanas)

1. Validar nome e identidade visual (registro de marca + domínio).
2. Agendar 10 entrevistas com advogados/sócios.
3. Montar protótipo navegável das telas: Dashboard, Caso, Agenda, Financeiro, Caixa de entrada IA.
4. Definir provedores (WhatsApp BSP, gateway, dados jurídicos) e levantar custos reais.
5. Iniciar o MVP Core (setup do repositório, banco multi-tenant, autenticação).
