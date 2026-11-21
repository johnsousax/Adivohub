"use client";

import { useState, type FormEvent } from "react";
import { avisar } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { AreaTexto, Entrada, Selecao } from "@/components/ui/Campos";
import { Modal, RodapeModal } from "@/components/ui/Modal";
import { mascararCNJ, validarCNJ } from "@/lib/cnj";
import { useLoja } from "@/lib/dados/loja";
import { paraISO } from "@/lib/datas";
import { lerValor } from "@/lib/formatos";
import {
  AREAS,
  ETAPAS_FUNIL,
  FASES,
  ORIGENS,
  TEMPERATURAS,
  type AreaDireito,
  type Caso,
  type Cliente,
  type EtapaFunil,
  type FaseCaso,
  type OrigemCliente,
  type Temperatura,
} from "@/lib/tipos";
import { useSessao } from "./ganchos";

function campo(dados: FormData, nome: string): string {
  return String(dados.get(nome) ?? "").trim();
}

/* -------------------------------- Cliente --------------------------------- */

interface PropsFormCliente {
  aberto: boolean;
  aoFechar: () => void;
  cliente?: Cliente;
  /** Abre já marcado como contato do funil. */
  comoLead?: boolean;
  aoSalvar?: (cliente: Cliente) => void;
}

export function FormCliente(props: PropsFormCliente) {
  const titulo = props.cliente ? "Editar cadastro" : props.comoLead ? "Novo contato" : "Novo cliente";
  return (
    <Modal aberto={props.aberto} aoFechar={props.aoFechar} titulo={titulo} largura="lg">
      {/* O conteúdo só existe com a janela aberta: o formulário recomeça limpo a cada vez. */}
      <CamposCliente {...props} />
    </Modal>
  );
}

function CamposCliente({ aoFechar, cliente, comoLead = false, aoSalvar }: PropsFormCliente) {
  const sessao = useSessao();
  const usuarios = useLoja((s) => s.usuarios);
  const adicionar = useLoja((s) => s.adicionarCliente);
  const atualizar = useLoja((s) => s.atualizarCliente);
  const converterLead = useLoja((s) => s.converterLead);
  const [tipo, definirTipo] = useState<Cliente["tipo"]>(cliente?.tipo ?? "PF");
  const [status, definirStatus] = useState<Cliente["status"]>(cliente?.status ?? (comoLead ? "lead" : "ativo"));
  const [erro, definirErro] = useState<string>();

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const nome = campo(dados, "nome");
    if (nome.length < 2) return definirErro("Informe o nome.");

    const comum = {
      tipo,
      nome,
      documento: campo(dados, "documento"),
      email: campo(dados, "email"),
      telefone: campo(dados, "telefone").replace(/\D/g, ""),
      cidade: campo(dados, "cidade"),
      origem: campo(dados, "origem") as OrigemCliente,
      responsavelId: campo(dados, "responsavelId"),
      observacoes: campo(dados, "observacoes") || undefined,
      status,
      // Perdido guarda a etapa e a área em que parou, para os indicadores e para reabrir.
      etapaFunil: status === "lead" ? (campo(dados, "etapaFunil") as EtapaFunil) : status === "perdido" ? cliente?.etapaFunil : undefined,
      areaInteresse:
        status === "lead" ? (campo(dados, "areaInteresse") as AreaDireito) : status === "perdido" ? cliente?.areaInteresse : undefined,
      ...(status === "lead"
        ? {
            valorEstimado: lerValor(campo(dados, "valorEstimado")) || undefined,
            temperatura: (campo(dados, "temperatura") || undefined) as Temperatura | undefined,
          }
        : {}),
    } satisfies Partial<Cliente>;

    if (cliente) {
      // Fechar negócio pelo formulário passa pelo mesmo caminho do CRM (data de conversão e marco no histórico).
      const fechou = cliente.status === "lead" && status === "ativo";
      atualizar(cliente.id, fechou ? { ...comum, status: "lead", etapaFunil: cliente.etapaFunil } : comum);
      if (fechou) converterLead(cliente.id);
      avisar(fechou ? `${nome} agora é cliente.` : "Cadastro atualizado.");
      aoSalvar?.({ ...cliente, ...comum });
    } else {
      const hoje = paraISO(new Date());
      const novo = adicionar({ ...comum, criadoEm: hoje, ...(status === "lead" ? { etapaDesde: hoje } : {}) });
      avisar(status === "lead" ? "Contato adicionado ao CRM." : "Cliente cadastrado.");
      aoSalvar?.(novo);
    }
    aoFechar();
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Selecao rotulo="Situação" value={status} onChange={(e) => definirStatus(e.target.value as Cliente["status"])}>
        <option value="ativo">Cliente (já contratou)</option>
        <option value="lead">Contato em negociação (CRM)</option>
        {cliente && cliente.status !== "lead" && <option value="inativo">Cliente inativo</option>}
        {cliente?.status === "perdido" && <option value="perdido">Contato perdido</option>}
      </Selecao>
      <Selecao rotulo="Tipo" value={tipo} onChange={(e) => definirTipo(e.target.value as Cliente["tipo"])}>
        <option value="PF">Pessoa física</option>
        <option value="PJ">Pessoa jurídica</option>
      </Selecao>
      <Entrada
        rotulo={tipo === "PF" ? "Nome completo" : "Razão social"}
        name="nome"
        defaultValue={cliente?.nome}
        erro={erro}
        required
        autoFocus
        className="sm:col-span-2"
      />
      <Entrada rotulo={tipo === "PF" ? "CPF" : "CNPJ"} name="documento" defaultValue={cliente?.documento} inputMode="numeric" />
      <Entrada rotulo="WhatsApp" name="telefone" type="tel" defaultValue={cliente?.telefone} placeholder="(98) 90000-0000" />
      <Entrada rotulo="E-mail" name="email" type="email" defaultValue={cliente?.email} />
      <Entrada rotulo="Cidade" name="cidade" defaultValue={cliente?.cidade ?? "São Luís - MA"} />
      <Selecao rotulo="Como chegou" name="origem" defaultValue={cliente?.origem ?? "indicacao"}>
        {Object.entries(ORIGENS).map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </Selecao>
      <Selecao rotulo="Responsável" name="responsavelId" defaultValue={cliente?.responsavelId ?? sessao.id}>
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
          </option>
        ))}
      </Selecao>
      {status === "lead" && (
        <>
          <Selecao rotulo="Etapa do funil" name="etapaFunil" defaultValue={cliente?.etapaFunil ?? "novo"}>
            {Object.entries(ETAPAS_FUNIL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Selecao>
          <Selecao rotulo="Área de interesse" name="areaInteresse" defaultValue={cliente?.areaInteresse ?? "civel"}>
            {Object.entries(AREAS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Selecao>
          <Entrada
            rotulo="Honorários estimados (R$)"
            name="valorEstimado"
            inputMode="decimal"
            defaultValue={cliente?.valorEstimado ? String(cliente.valorEstimado).replace(".", ",") : ""}
            placeholder="Ex.: 15.000"
          />
          <Selecao rotulo="Temperatura" name="temperatura" defaultValue={cliente?.temperatura ?? ""}>
            <option value="">Sem avaliação</option>
            {Object.entries(TEMPERATURAS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Selecao>
        </>
      )}
      <AreaTexto rotulo="Observações" name="observacoes" defaultValue={cliente?.observacoes} className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <RodapeModal>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">{cliente ? "Salvar" : "Cadastrar"}</Botao>
        </RodapeModal>
      </div>
    </form>
  );
}

/* ---------------------------------- Caso ---------------------------------- */

interface PropsFormCaso {
  aberto: boolean;
  aoFechar: () => void;
  caso?: Caso;
  /** Cliente já selecionado (ao criar a partir da ficha do cliente). */
  clienteId?: string;
  aoSalvar?: (caso: Caso) => void;
}

export function FormCaso(props: PropsFormCaso) {
  return (
    <Modal aberto={props.aberto} aoFechar={props.aoFechar} titulo={props.caso ? "Editar caso" : "Novo caso"} largura="lg">
      <CamposCaso {...props} />
    </Modal>
  );
}

function CamposCaso({ aoFechar, caso, clienteId, aoSalvar }: PropsFormCaso) {
  const sessao = useSessao();
  const usuarios = useLoja((s) => s.usuarios);
  const clientes = useLoja((s) => s.clientes);
  const adicionar = useLoja((s) => s.adicionarCaso);
  const atualizar = useLoja((s) => s.atualizarCaso);
  const [cnj, definirCnj] = useState(caso?.numeroCNJ ?? "");
  const [erros, definirErros] = useState<{ titulo?: string; clienteId?: string; cnj?: string }>({});

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const titulo = campo(dados, "titulo");
    const cliente = campo(dados, "clienteId");
    const novosErros: typeof erros = {};
    if (titulo.length < 3) novosErros.titulo = "Dê um título ao caso (ex.: Silva × INSS).";
    if (!cliente) novosErros.clienteId = "Escolha o cliente.";
    if (cnj && !validarCNJ(cnj)) novosErros.cnj = "Número inválido: confira os 20 dígitos e o dígito verificador.";
    definirErros(novosErros);
    if (Object.keys(novosErros).length) return;

    const comum = {
      titulo,
      clienteId: cliente,
      numeroCNJ: cnj || undefined,
      area: campo(dados, "area") as AreaDireito,
      tipoAcao: campo(dados, "tipoAcao"),
      orgao: campo(dados, "orgao") || "A distribuir",
      parteContraria: campo(dados, "parteContraria") || "—",
      fase: campo(dados, "fase") as FaseCaso,
      responsavelId: campo(dados, "responsavelId"),
      valorCausa: lerValor(campo(dados, "valorCausa")),
      descricao: campo(dados, "descricao") || undefined,
    } satisfies Partial<Caso>;

    if (caso) {
      atualizar(caso.id, comum);
      avisar("Caso atualizado.");
      aoSalvar?.({ ...caso, ...comum });
    } else {
      const novo = adicionar({ ...comum, criadoEm: paraISO(new Date()) });
      avisar("Caso criado.");
      aoSalvar?.(novo);
    }
    aoFechar();
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Entrada
        rotulo="Título"
        name="titulo"
        defaultValue={caso?.titulo}
        placeholder="Ex.: Silva × INSS"
        erro={erros.titulo}
        required
        autoFocus
        className="sm:col-span-2"
      />
      <Selecao rotulo="Cliente" name="clienteId" defaultValue={caso?.clienteId ?? clienteId ?? ""} erro={erros.clienteId} required>
        <option value="" disabled>
          Selecione
        </option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </Selecao>
      <Selecao rotulo="Área" name="area" defaultValue={caso?.area ?? "civel"}>
        {Object.entries(AREAS).map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </Selecao>
      <Entrada rotulo="Tipo de ação" name="tipoAcao" defaultValue={caso?.tipoAcao} placeholder="Ex.: Aposentadoria por idade" required />
      <Entrada rotulo="Parte contrária" name="parteContraria" defaultValue={caso?.parteContraria} />
      <Entrada
        rotulo="Número do processo (CNJ)"
        value={cnj}
        onChange={(e) => definirCnj(mascararCNJ(e.target.value))}
        placeholder="0000000-00.0000.0.00.0000"
        inputMode="numeric"
        erro={erros.cnj}
        dica="Opcional. Deixe em branco para casos consultivos."
      />
      <Entrada rotulo="Vara ou órgão" name="orgao" defaultValue={caso?.orgao} placeholder="Ex.: 3ª Vara do Trabalho de São Luís" />
      <Selecao rotulo="Fase" name="fase" defaultValue={caso?.fase ?? "inicial"}>
        {Object.entries(FASES).map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </Selecao>
      <Selecao rotulo="Responsável" name="responsavelId" defaultValue={caso?.responsavelId ?? sessao.id}>
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
          </option>
        ))}
      </Selecao>
      <Entrada
        rotulo="Valor da causa (R$)"
        name="valorCausa"
        defaultValue={caso?.valorCausa ? caso.valorCausa.toLocaleString("pt-BR") : ""}
        inputMode="decimal"
        placeholder="0,00"
      />
      <AreaTexto rotulo="Resumo do caso" name="descricao" defaultValue={caso?.descricao} className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <RodapeModal>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">{caso ? "Salvar" : "Criar caso"}</Botao>
        </RodapeModal>
      </div>
    </form>
  );
}
