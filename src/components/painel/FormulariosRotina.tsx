"use client";

import { Calculator } from "lucide-react";
import { useState, type FormEvent } from "react";
import { avisar } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { Entrada, Selecao } from "@/components/ui/Campos";
import { Modal, RodapeModal } from "@/components/ui/Modal";
import { useLoja } from "@/lib/dados/loja";
import { paraISO, somarDiasUteis, sugerirPrazo } from "@/lib/datas";
import { dataSemana } from "@/lib/formatos";
import { TIPOS_EVENTO, type TipoEvento } from "@/lib/tipos";
import { useHoje, useSessao } from "./ganchos";

function campo(dados: FormData, nome: string): string {
  return String(dados.get(nome) ?? "").trim();
}

/* ---------------------------------- Prazo --------------------------------- */

interface PropsFormPrazo {
  aberto: boolean;
  aoFechar: () => void;
  casoId?: string;
}

export function FormPrazo(props: PropsFormPrazo) {
  return (
    <Modal
      aberto={props.aberto}
      aoFechar={props.aoFechar}
      titulo="Novo prazo"
      descricao="Informe a data fatal ou calcule pelo prazo em dias úteis."
    >
      <CamposPrazo {...props} />
    </Modal>
  );
}

function CamposPrazo({ aoFechar, casoId }: PropsFormPrazo) {
  const hoje = useHoje();
  const sessao = useSessao();
  const usuarios = useLoja((s) => s.usuarios);
  const casos = useLoja((s) => s.casos);
  const adicionar = useLoja((s) => s.adicionarPrazo);

  const [dataFatal, definirDataFatal] = useState("");
  const [dataInterna, definirDataInterna] = useState("");
  const [intimacao, definirIntimacao] = useState(paraISO(hoje));
  const [dias, definirDias] = useState("15");
  const [erro, definirErro] = useState<string>();

  function calcular() {
    const quantidade = Number(dias);
    if (!intimacao || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 365) {
      definirErro("Informe a data da intimação e um número de dias entre 1 e 365.");
      return;
    }
    const sugestao = sugerirPrazo(intimacao, quantidade);
    definirDataFatal(sugestao.dataFatal);
    definirDataInterna(sugestao.dataInterna);
    definirErro(undefined);
  }

  function aoMudarFatal(valor: string) {
    definirDataFatal(valor);
    // A data interna acompanha a fatal (2 dias úteis antes).
    if (valor) definirDataInterna(paraISO(somarDiasUteis(valor, -2, { recesso: true })));
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const titulo = campo(dados, "titulo");
    const caso = campo(dados, "casoId");
    if (!titulo || !caso || !dataFatal) return definirErro("Preencha o título, o caso e a data fatal.");
    if (dataInterna && dataInterna > dataFatal) return definirErro("A data interna precisa ser anterior à data fatal.");

    adicionar({
      casoId: caso,
      titulo,
      dataFatal,
      dataInterna: dataInterna || dataFatal,
      responsavelId: campo(dados, "responsavelId"),
      origem: "manual",
    });
    avisar(`Prazo criado para ${dataSemana(dataFatal)}.`);
    aoFechar();
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Entrada
        rotulo="O que precisa ser feito"
        name="titulo"
        placeholder="Ex.: Réplica à contestação"
        required
        autoFocus
        className="sm:col-span-2"
      />
      <Selecao rotulo="Caso" name="casoId" defaultValue={casoId ?? ""} required>
        <option value="" disabled>
          Selecione
        </option>
        {casos
          .filter((c) => c.fase !== "encerrado")
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.titulo}
            </option>
          ))}
      </Selecao>
      <Selecao rotulo="Responsável" name="responsavelId" defaultValue={sessao.id}>
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
          </option>
        ))}
      </Selecao>

      <fieldset className="rounded-2xl bg-fundo p-4 sm:col-span-2">
        <legend className="sr-only">Calcular em dias úteis</legend>
        <p className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Calculator className="size-4 text-ouro-700" aria-hidden="true" />
          Calcular em dias úteis
        </p>
        <div className="grid grid-cols-[1fr_6rem_auto] items-end gap-3">
          <Entrada rotulo="Intimação em" type="date" value={intimacao} onChange={(e) => definirIntimacao(e.target.value)} />
          <Entrada rotulo="Dias úteis" type="number" min={1} max={365} value={dias} onChange={(e) => definirDias(e.target.value)} />
          <Botao variante="secundario" onClick={calcular}>
            Calcular
          </Botao>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-mudo">
          Considera fins de semana, feriados nacionais e o recesso de 20/12 a 20/01. Feriados locais e suspensões do tribunal não entram:
          confira antes de salvar.
        </p>
      </fieldset>

      <Entrada rotulo="Data fatal" type="date" value={dataFatal} onChange={(e) => aoMudarFatal(e.target.value)} required />
      <Entrada
        rotulo="Data interna"
        type="date"
        value={dataInterna}
        onChange={(e) => definirDataInterna(e.target.value)}
        dica="Sugerida: 2 dias úteis antes."
      />

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
          <Botao type="submit">Criar prazo</Botao>
        </RodapeModal>
      </div>
    </form>
  );
}

/* --------------------------------- Evento --------------------------------- */

interface PropsFormEvento {
  aberto: boolean;
  aoFechar: () => void;
  /** Dia pré-selecionado (AAAA-MM-DD). */
  dia?: string;
  casoId?: string;
  clienteId?: string;
}

export function FormEvento(props: PropsFormEvento) {
  return (
    <Modal aberto={props.aberto} aoFechar={props.aoFechar} titulo="Novo compromisso">
      <CamposEvento {...props} />
    </Modal>
  );
}

function CamposEvento({ aoFechar, dia, casoId, clienteId }: PropsFormEvento) {
  const hoje = useHoje();
  const sessao = useSessao();
  const usuarios = useLoja((s) => s.usuarios);
  const casos = useLoja((s) => s.casos);
  const clientes = useLoja((s) => s.clientes);
  const adicionar = useLoja((s) => s.adicionarEvento);
  const [erro, definirErro] = useState<string>();

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const titulo = campo(dados, "titulo");
    const data = campo(dados, "data");
    const inicio = campo(dados, "inicio");
    const fim = campo(dados, "fim");
    if (!titulo || !data || !inicio || !fim) return definirErro("Preencha o título, a data e os horários.");
    if (fim <= inicio) return definirErro("O término precisa ser depois do início.");

    const caso = campo(dados, "casoId");
    const cliente = campo(dados, "clienteId") || casos.find((c) => c.id === caso)?.clienteId || "";
    adicionar({
      titulo,
      tipo: campo(dados, "tipo") as TipoEvento,
      inicio: `${data}T${inicio}:00`,
      fim: `${data}T${fim}:00`,
      local: campo(dados, "local") || undefined,
      casoId: caso || undefined,
      clienteId: cliente || undefined,
      responsavelId: campo(dados, "responsavelId"),
    });
    avisar(`Compromisso marcado para ${dataSemana(data)} às ${inicio}.`);
    aoFechar();
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Entrada rotulo="Título" name="titulo" placeholder="Ex.: Audiência de conciliação" required autoFocus className="sm:col-span-2" />
      <Selecao rotulo="Tipo" name="tipo" defaultValue="reuniao">
        {Object.entries(TIPOS_EVENTO).map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </Selecao>
      <Entrada rotulo="Data" name="data" type="date" defaultValue={dia ?? paraISO(hoje)} required />
      <Entrada rotulo="Início" name="inicio" type="time" defaultValue="10:00" required />
      <Entrada rotulo="Término" name="fim" type="time" defaultValue="11:00" required />
      <Entrada rotulo="Local" name="local" placeholder="Fórum, escritório ou online" className="sm:col-span-2" />
      <Selecao rotulo="Caso (opcional)" name="casoId" defaultValue={casoId ?? ""}>
        <option value="">Nenhum</option>
        {casos
          .filter((c) => c.fase !== "encerrado")
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.titulo}
            </option>
          ))}
      </Selecao>
      <Selecao rotulo="Cliente (opcional)" name="clienteId" defaultValue={clienteId ?? ""}>
        <option value="">Nenhum</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </Selecao>
      <Selecao rotulo="Responsável" name="responsavelId" defaultValue={sessao.id} className="sm:col-span-2">
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
          </option>
        ))}
      </Selecao>
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
          <Botao type="submit">Marcar</Botao>
        </RodapeModal>
      </div>
    </form>
  );
}
