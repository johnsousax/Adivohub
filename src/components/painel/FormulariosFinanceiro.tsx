"use client";

import { addMonths, parseISO } from "date-fns";
import { useMemo, useState, type FormEvent } from "react";
import { avisar } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { Entrada, Selecao } from "@/components/ui/Campos";
import { Modal, RodapeModal } from "@/components/ui/Modal";
import { useLoja } from "@/lib/dados/loja";
import { paraISO } from "@/lib/datas";
import { brl, dataCurta, lerValor } from "@/lib/formatos";
import {
  CATEGORIAS_DESPESA,
  FORMAS_PAGAMENTO,
  TIPOS_CONTRATO,
  type CategoriaDespesa,
  type FormaPagamento,
  type Lancamento,
  type TipoContrato,
} from "@/lib/tipos";
import { useHoje } from "./ganchos";

function campo(dados: FormData, nome: string): string {
  return String(dados.get(nome) ?? "").trim();
}

/* ------------------------------- Lançamento ------------------------------- */

interface PropsFormLancamento {
  aberto: boolean;
  aoFechar: () => void;
  tipo: Lancamento["tipo"];
  clienteId?: string;
  casoId?: string;
}

export function FormLancamento(props: PropsFormLancamento) {
  return (
    <Modal aberto={props.aberto} aoFechar={props.aoFechar} titulo={props.tipo === "receita" ? "Nova cobrança" : "Nova despesa"}>
      <CamposLancamento {...props} />
    </Modal>
  );
}

function CamposLancamento({ aoFechar, tipo, clienteId, casoId }: PropsFormLancamento) {
  const hoje = useHoje();
  const clientes = useLoja((s) => s.clientes);
  const adicionar = useLoja((s) => s.adicionarLancamento);
  const [erro, definirErro] = useState<string>();

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const descricao = campo(dados, "descricao");
    const valor = lerValor(campo(dados, "valor"));
    const vencimento = campo(dados, "vencimento");
    if (!descricao || !vencimento) return definirErro("Preencha a descrição e o vencimento.");
    if (valor <= 0) return definirErro("Informe um valor maior que zero.");

    const jaPago = dados.get("jaPago") === "on";
    adicionar({
      tipo,
      descricao,
      valor,
      vencimento,
      forma: campo(dados, "forma") as FormaPagamento,
      pagoEm: jaPago ? paraISO(hoje) : undefined,
      clienteId: tipo === "receita" ? campo(dados, "clienteId") || undefined : undefined,
      casoId: tipo === "receita" ? casoId : undefined,
      categoria: tipo === "despesa" ? (campo(dados, "categoria") as CategoriaDespesa) : undefined,
    });
    avisar(tipo === "receita" ? `Cobrança de ${brl(valor)} criada.` : `Despesa de ${brl(valor)} lançada.`);
    aoFechar();
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Entrada
        rotulo="Descrição"
        name="descricao"
        placeholder={tipo === "receita" ? "Ex.: Honorários — consulta" : "Ex.: Custas — distribuição"}
        required
        autoFocus
        className="sm:col-span-2"
      />
      <Entrada rotulo="Valor (R$)" name="valor" inputMode="decimal" placeholder="0,00" required />
      <Entrada rotulo="Vencimento" name="vencimento" type="date" defaultValue={paraISO(hoje)} required />
      {tipo === "receita" ? (
        <Selecao rotulo="Cliente" name="clienteId" defaultValue={clienteId ?? ""}>
          <option value="">Sem cliente (avulso)</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Selecao>
      ) : (
        <Selecao rotulo="Categoria" name="categoria" defaultValue="outros">
          {Object.entries(CATEGORIAS_DESPESA).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Selecao>
      )}
      <Selecao rotulo="Forma de pagamento" name="forma" defaultValue="pix">
        {Object.entries(FORMAS_PAGAMENTO).map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </Selecao>
      <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
        <input type="checkbox" name="jaPago" className="size-4 accent-tinta" />
        {tipo === "receita" ? "Já foi recebido" : "Já foi pago"}
      </label>
      {erro && (
        <p role="alert" className="text-sm text-critico sm:col-span-2">
          {erro}
        </p>
      )}
      <div className="sm:col-span-2">
        <RodapeModal>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">{tipo === "receita" ? "Criar cobrança" : "Lançar despesa"}</Botao>
        </RodapeModal>
      </div>
    </form>
  );
}

/* -------------------------------- Contrato -------------------------------- */

interface PropsFormContrato {
  aberto: boolean;
  aoFechar: () => void;
  clienteId?: string;
}

export function FormContrato(props: PropsFormContrato) {
  return (
    <Modal
      aberto={props.aberto}
      aoFechar={props.aoFechar}
      titulo="Novo contrato de honorários"
      descricao="As parcelas entram automaticamente em contas a receber."
      largura="lg"
    >
      <CamposContrato {...props} />
    </Modal>
  );
}

function CamposContrato({ aoFechar, clienteId: clienteInicial }: PropsFormContrato) {
  const hoje = useHoje();
  const clientes = useLoja((s) => s.clientes);
  const casos = useLoja((s) => s.casos);
  const adicionar = useLoja((s) => s.adicionarContrato);

  const [clienteId, definirClienteId] = useState(clienteInicial ?? "");
  const [tipo, definirTipo] = useState<TipoContrato>("parcelado");
  const [valorTexto, definirValorTexto] = useState("");
  const [parcelasTexto, definirParcelasTexto] = useState("6");
  const [primeiroVencimento, definirPrimeiroVencimento] = useState(paraISO(hoje));
  const [erro, definirErro] = useState<string>();

  const temValorFixo = tipo !== "exito";
  const temExito = tipo === "exito" || tipo === "hibrido";
  const quantidade = tipo === "fixo" ? 1 : tipo === "mensal" ? 12 : Math.min(Math.max(Math.trunc(Number(parcelasTexto)) || 1, 1), 60);
  const valor = lerValor(valorTexto);

  /** Parcelas mensais, sempre no mesmo dia do mês. Os centavos que sobram vão na primeira. */
  const parcelas = useMemo(() => {
    if (!temValorFixo || valor <= 0 || !primeiroVencimento) return [];
    const base = parseISO(primeiroVencimento);
    if (tipo === "mensal") {
      return Array.from({ length: 12 }, (_, i) => ({ valor, vencimento: paraISO(addMonths(base, i)) }));
    }
    const centavos = Math.round(valor * 100);
    const porParcela = Math.floor(centavos / quantidade);
    const resto = centavos - porParcela * quantidade;
    return Array.from({ length: quantidade }, (_, i) => ({
      valor: (porParcela + (i === 0 ? resto : 0)) / 100,
      vencimento: paraISO(addMonths(base, i)),
    }));
  }, [temValorFixo, valor, primeiroVencimento, tipo, quantidade]);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const descricao = campo(dados, "descricao");
    const percentual = Number(campo(dados, "percentualExito").replace(",", "."));
    if (!clienteId) return definirErro("Escolha o cliente.");
    if (!descricao) return definirErro("Descreva o contrato.");
    if (temValorFixo && valor <= 0) return definirErro("Informe o valor.");
    if (temExito && !(percentual > 0 && percentual <= 100)) return definirErro("Informe o percentual de êxito (entre 1 e 100).");

    adicionar(
      {
        clienteId,
        casoId: campo(dados, "casoId") || undefined,
        tipo,
        descricao,
        valorTotal: temValorFixo ? valor : 0,
        percentualExito: temExito ? percentual : undefined,
        inicio: paraISO(hoje),
        ativo: true,
      },
      parcelas,
      campo(dados, "forma") as FormaPagamento,
    );
    avisar(
      parcelas.length
        ? `Contrato criado com ${parcelas.length} ${parcelas.length === 1 ? "parcela" : "parcelas"}.`
        : "Contrato de êxito criado.",
    );
    aoFechar();
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Selecao rotulo="Cliente" value={clienteId} onChange={(e) => definirClienteId(e.target.value)} required>
        <option value="" disabled>
          Selecione
        </option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </Selecao>
      <Selecao rotulo="Caso (opcional)" name="casoId" defaultValue="">
        <option value="">Nenhum</option>
        {casos
          .filter((c) => c.clienteId === clienteId)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.titulo}
            </option>
          ))}
      </Selecao>
      <Selecao rotulo="Tipo de honorário" value={tipo} onChange={(e) => definirTipo(e.target.value as TipoContrato)}>
        {Object.entries(TIPOS_CONTRATO).map(([valorOpcao, rotulo]) => (
          <option key={valorOpcao} value={valorOpcao}>
            {rotulo}
          </option>
        ))}
      </Selecao>
      <Entrada rotulo="Descrição" name="descricao" placeholder="Ex.: Honorários — ação trabalhista" required />

      {temValorFixo && (
        <>
          <Entrada
            rotulo={tipo === "mensal" ? "Valor mensal (R$)" : "Valor total (R$)"}
            value={valorTexto}
            onChange={(e) => definirValorTexto(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            required
          />
          {tipo === "fixo" || tipo === "mensal" ? (
            <Entrada
              rotulo={tipo === "mensal" ? "Primeira mensalidade" : "Vencimento"}
              type="date"
              value={primeiroVencimento}
              onChange={(e) => definirPrimeiroVencimento(e.target.value)}
              required
            />
          ) : (
            <Entrada
              rotulo="Número de parcelas"
              type="number"
              min={1}
              max={60}
              value={parcelasTexto}
              onChange={(e) => definirParcelasTexto(e.target.value)}
              required
            />
          )}
          {(tipo === "parcelado" || tipo === "hibrido") && (
            <Entrada
              rotulo="Primeiro vencimento"
              type="date"
              value={primeiroVencimento}
              onChange={(e) => definirPrimeiroVencimento(e.target.value)}
              required
            />
          )}
          <Selecao rotulo="Forma de pagamento" name="forma" defaultValue="pix">
            {Object.entries(FORMAS_PAGAMENTO).map(([valorOpcao, rotulo]) => (
              <option key={valorOpcao} value={valorOpcao}>
                {rotulo}
              </option>
            ))}
          </Selecao>
        </>
      )}
      {temExito && <Entrada rotulo="Percentual de êxito (%)" name="percentualExito" inputMode="decimal" placeholder="30" required />}

      {parcelas.length > 0 && (
        <div className="rounded-2xl bg-fundo p-4 text-sm sm:col-span-2">
          <p className="font-medium">
            {tipo === "mensal"
              ? `12 mensalidades de ${brl(valor)} serão lançadas`
              : parcelas.length === 1
                ? `1 cobrança de ${brl(parcelas[0].valor)}`
                : `${parcelas.length} parcelas de ${brl(parcelas[parcelas.length - 1].valor)}`}
          </p>
          <p className="mt-1 text-mudo">
            De {dataCurta(parcelas[0].vencimento)} a {dataCurta(parcelas[parcelas.length - 1].vencimento)}, todo mês no mesmo dia.
          </p>
        </div>
      )}
      {erro && (
        <p role="alert" className="text-sm text-critico sm:col-span-2">
          {erro}
        </p>
      )}
      <div className="sm:col-span-2">
        <RodapeModal>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">Criar contrato</Botao>
        </RodapeModal>
      </div>
    </form>
  );
}
