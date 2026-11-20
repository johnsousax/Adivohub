import type { Metadata } from "next";
import { canalDePrivacidade, Clausula, PaginaLegal } from "@/components/landing/PaginaLegal";
import { LEGAL, MARCA } from "@/lib/marca";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: `O que o site do ${MARCA.nome} coleta, o que não coleta, e como você exerce seus direitos pela LGPD.`,
  alternates: { canonical: "/privacidade" },
};

/**
 * Política de privacidade. Descreve o que o site faz HOJE (fase de lançamento e
 * demonstração). Ao ligar banco de dados, pagamentos, WhatsApp oficial ou
 * qualquer serviço novo, atualize o texto e a versão em src/lib/marca.ts.
 */
export default function PaginaPrivacidade() {
  const canal = canalDePrivacidade();
  const responsavel = [LEGAL.responsavel, LEGAL.documento].filter(Boolean).join(", ");

  return (
    <PaginaLegal
      titulo="Política de privacidade"
      resumo={`Em resumo: este site não pede cadastro, não usa rastreadores nem anúncios, e a demonstração guarda os dados só no seu navegador. Abaixo está o detalhe, em linguagem direta.`}
    >
      <Clausula titulo="1. Quem responde pelos seus dados">
        <p>
          O {MARCA.nome} é um sistema de gestão para escritórios de advocacia.{" "}
          {responsavel
            ? `O responsável pelo tratamento dos dados deste site (o "controlador", na Lei Geral de Proteção de Dados) é ${responsavel}.`
            : `O responsável pelo tratamento dos dados deste site (o "controlador", na Lei Geral de Proteção de Dados) é a equipe do ${MARCA.nome}, que você alcança pelo canal de privacidade indicado no fim desta página.`}
        </p>
      </Clausula>

      <Clausula titulo="2. O que este site coleta">
        <p>Coletamos o mínimo necessário para o site funcionar e para responder a quem nos procura:</p>
        <ul>
          <li>
            <strong>Registros técnicos de acesso.</strong> Endereço IP, data e hora, página visitada e tipo de navegador. Ficam nos
            registros da hospedagem e servem para manter o site no ar, investigar falhas e bloquear ataques.
          </li>
          <li>
            <strong>Um cookie de sessão.</strong> É criado só quando você abre a demonstração ou entra no painel, expira em 8 horas e serve
            apenas para manter você conectado. Scripts não conseguem lê-lo e ele não é enviado a outros sites.
          </li>
          <li>
            <strong>O que você nos envia pelo WhatsApp.</strong> Ao tocar em um botão de contato, a conversa acontece no WhatsApp. Recebemos
            o seu número, o nome do seu perfil e as mensagens que você mandar, e usamos isso para responder, apresentar o produto e, se você
            contratar, formalizar o contrato.
          </li>
        </ul>
        <p>
          Este site <strong>não</strong> pede cadastro, e-mail ou documento, e <strong>não</strong> usa cookies de publicidade, ferramentas
          de análise de audiência, pixels de redes sociais nem qualquer serviço de terceiros no seu navegador. Por isso não exibimos aviso
          de cookies: o único cookie existente é o estritamente necessário, descrito acima.
        </p>
      </Clausula>

      <Clausula titulo="3. A demonstração">
        <p>
          A demonstração é um escritório fictício. Tudo o que você cadastra nela fica guardado <strong>somente no seu navegador</strong> e
          não é enviado aos nossos servidores. A única exceção são as mensagens que você escreve para o assistente e para o atendente
          virtual: elas passam pelo servidor para gerar a resposta e não são armazenadas.
        </p>
        <p>
          Na demonstração a resposta vem de regras do próprio sistema, sem envio a serviços de inteligência artificial de terceiros. Mesmo
          assim, <strong>não cadastre dados reais de clientes na demonstração</strong>: ela existe para você conhecer o produto.
        </p>
      </Clausula>

      <Clausula titulo="4. Com quem os dados são compartilhados">
        <p>Não vendemos nem alugamos dados. Usamos apenas os fornecedores necessários para o serviço existir:</p>
        <ul>
          <li>
            <strong>Vercel</strong>, que hospeda o site e mantém os registros técnicos de acesso. Pode envolver servidores fora do Brasil.
          </li>
          <li>
            <strong>WhatsApp (Meta)</strong>, o canal pelo qual você fala com a gente, sob a política de privacidade do próprio WhatsApp.
          </li>
          <li>
            <strong>Anthropic</strong>, fornecedora do modelo de inteligência artificial. Só recebe dados quando a IA paga é usada por um
            escritório contratante, dentro do acesso privado dele. Na demonstração pública, nada é enviado.
          </li>
        </ul>
        <p>Podemos também compartilhar dados quando a lei ou uma ordem judicial exigir.</p>
      </Clausula>

      <Clausula titulo={`5. Escritórios que contratam o ${MARCA.nome}`}>
        <p>
          Quando um escritório contrata o {MARCA.nome}, os dados dos clientes e dos processos pertencem ao escritório, que decide como
          usá-los (ele é o controlador). O {MARCA.nome} atua como operador: trata esses dados apenas para prestar o serviço, conforme o
          contrato, que traz as regras de proteção de dados, a lista de fornecedores envolvidos e os prazos de guarda e exclusão.
        </p>
      </Clausula>

      <Clausula titulo="6. Por quanto tempo guardamos">
        <ul>
          <li>Cookie de sessão: até 8 horas, ou até você sair do painel.</li>
          <li>
            Dados da demonstração: ficam no seu navegador até você limpá-los ou usar a opção de restaurar a demonstração, nas configurações.
          </li>
          <li>
            Conversas pelo WhatsApp: pelo tempo necessário para atender você e conduzir a negociação. Você pode pedir a exclusão a qualquer
            momento.
          </li>
          <li>Registros técnicos de acesso: pelo prazo necessário à segurança do site e ao cumprimento da lei.</li>
        </ul>
      </Clausula>

      <Clausula id="seguranca" titulo="7. Como protegemos">
        <ul>
          <li>Conexão sempre criptografada (HTTPS obrigatório).</li>
          <li>O navegador só executa o código do próprio site: scripts injetados por terceiros são bloqueados.</li>
          <li>O site não pode ser exibido dentro de outra página, o que impede cliques enganosos.</li>
          <li>O cookie de sessão é inacessível a scripts e só trafega em conexão segura.</li>
          <li>Tentativas de login são limitadas, com espera crescente a cada erro.</li>
          <li>Chamadas vindas de outros sites são recusadas.</li>
          <li>Eventos de segurança são registrados, sem senhas, tokens ou conteúdo de conversas.</li>
        </ul>
        <p>
          Nenhum sistema é impossível de invadir. Se você encontrar uma falha de segurança, avise pelo canal abaixo: respondemos e
          corrigimos com prioridade.
        </p>
      </Clausula>

      <Clausula titulo="8. Seus direitos">
        <p>
          A LGPD garante a você, entre outros, o direito de confirmar se tratamos seus dados, acessá-los, corrigi-los, pedir a exclusão,
          saber com quem foram compartilhados e revogar um consentimento. Para exercer qualquer um deles, fale com o canal de privacidade.
          Respondemos em até 15 dias. Se não ficar satisfeito, você pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </Clausula>

      <Clausula titulo="9. Crianças e adolescentes">
        <p>Este site é voltado a profissionais do Direito e não se destina a menores de 18 anos.</p>
      </Clausula>

      <Clausula titulo="10. Mudanças nesta política">
        <p>
          Quando o {MARCA.nome} passar a tratar novos dados ou usar novos fornecedores, esta página será atualizada antes, com nova versão e
          data. A versão em vigor é sempre a publicada aqui.
        </p>
      </Clausula>

      <Clausula titulo="11. Canal de privacidade">
        <p>
          Dúvidas, pedidos sobre seus dados ou avisos de segurança:{" "}
          <a href={canal.href} target={canal.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {canal.rotulo}
          </a>
          .
        </p>
      </Clausula>
    </PaginaLegal>
  );
}
