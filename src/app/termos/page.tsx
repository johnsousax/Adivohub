import type { Metadata } from "next";
import Link from "next/link";
import { canalDePrivacidade, Clausula, PaginaLegal } from "@/components/landing/PaginaLegal";
import { LEGAL, MARCA } from "@/lib/marca";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: `Regras de uso do site e da demonstração do ${MARCA.nome}.`,
  alternates: { canonical: "/termos" },
};

/**
 * Termos de uso do site e da demonstração. A contratação do serviço por um
 * escritório é regida por contrato próprio, que prevalece sobre este texto.
 */
export default function PaginaTermos() {
  const canal = canalDePrivacidade();
  const responsavel = [LEGAL.responsavel, LEGAL.documento].filter(Boolean).join(", ");

  return (
    <PaginaLegal
      titulo="Termos de uso"
      resumo={`Estes termos valem para o site e para a demonstração do ${MARCA.nome}. Ao usar um ou outro, você concorda com eles.`}
    >
      <Clausula titulo="1. O que é o Vade">
        <p>
          O {MARCA.nome} é um sistema de gestão para escritórios de advocacia: casos, prazos, agenda, financeiro e atendimento com apoio de
          inteligência artificial.{responsavel ? ` É oferecido por ${responsavel}.` : ""} O produto está em lançamento, e a página inicial
          indica o que já funciona e o que é ativado na implantação de cada escritório.
        </p>
      </Clausula>

      <Clausula titulo="2. A demonstração">
        <ul>
          <li>É gratuita, aberta e não exige cadastro.</li>
          <li>Mostra um escritório fictício: nomes, processos, valores e conversas são inventados.</li>
          <li>
            O que você cadastra fica só no seu navegador e pode ser apagado a qualquer momento, por você ou por uma atualização do sistema.
          </li>
          <li>
            <strong>Não cadastre dados reais de clientes.</strong> A demonstração não é o ambiente de trabalho de um escritório.
          </li>
          <li>Ela é oferecida como está, sem garantia de disponibilidade.</li>
        </ul>
      </Clausula>

      <Clausula titulo="3. Inteligência artificial e responsabilidade profissional">
        <ul>
          <li>A IA organiza informações, resume e sugere. Ela não dá parecer jurídico e não substitui o advogado.</li>
          <li>
            A contagem de prazos é uma estimativa: considera fins de semana, feriados nacionais e o recesso forense, mas não feriados locais
            nem suspensões de expediente de cada tribunal. Todo prazo precisa ser conferido pelo advogado responsável.
          </li>
          <li>O atendimento virtual se identifica como tal e passa a conversa para uma pessoa sempre que o assunto exige.</li>
          <li>A responsabilidade pelas decisões e pelos atos profissionais é sempre do advogado e do escritório.</li>
        </ul>
      </Clausula>

      <Clausula titulo="4. Uso permitido">
        <p>Ao usar o site e a demonstração, você concorda em não:</p>
        <ul>
          <li>tentar burlar, testar sem autorização ou contornar os mecanismos de segurança;</li>
          <li>usar robôs ou meios automáticos para sobrecarregar o serviço ou copiar o conteúdo em massa;</li>
          <li>tentar acessar áreas, dados ou contas que não são seus;</li>
          <li>usar o serviço para fins ilegais ou para prejudicar terceiros.</li>
        </ul>
        <p>Acessos abusivos podem ser limitados ou bloqueados automaticamente.</p>
      </Clausula>

      <Clausula titulo="5. Planos e contratação">
        <p>
          Valores e recursos são informados pela nossa equipe no atendimento. A contratação é feita diretamente com a nossa equipe e
          formalizada em contrato próprio, que define preço, prazo, suporte, proteção de dados e cancelamento. Em caso de diferença, vale o
          contrato.
        </p>
      </Clausula>

      <Clausula titulo="6. Propriedade intelectual">
        <p>
          A marca, o visual, os textos e o código do {MARCA.nome} pertencem aos seus titulares. Você pode usar o site e a demonstração para
          conhecer o produto, mas não copiar, revender ou criar produto derivado.
        </p>
      </Clausula>

      <Clausula titulo="7. Privacidade">
        <p>
          O tratamento de dados pessoais está descrito na <Link href="/privacidade">política de privacidade</Link>, que faz parte destes
          termos.
        </p>
      </Clausula>

      <Clausula titulo="8. Mudanças e lei aplicável">
        <p>
          Estes termos podem ser atualizados; a versão em vigor é sempre a publicada nesta página, com número e data. Aplicam-se as leis
          brasileiras, e eventuais disputas serão resolvidas no foro que a lei determinar.
        </p>
      </Clausula>

      <Clausula titulo="9. Contato">
        <p>
          Fale com a gente:{" "}
          <a href={canal.href} target={canal.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {canal.rotulo}
          </a>
          .
        </p>
      </Clausula>
    </PaginaLegal>
  );
}
