#!/usr/bin/env node
// Gera o valor de ACESSO_SENHA_HASH a partir de uma senha digitada no terminal.
// Uso: npm run senha
// A senha não aparece na tela, não vai para o histórico do terminal e não é gravada em lugar nenhum.
import { randomBytes, scryptSync } from "node:crypto";
import { stdin, stdout } from "node:process";

const TAMANHO_MINIMO = 12;
const PARAMETROS = { logN: 15, r: 8, p: 3 };

function perguntarSemEco(pergunta) {
  return new Promise((resolver, rejeitar) => {
    if (!stdin.isTTY) {
      // Sem terminal interativo (ex.: `echo senha | npm run senha`): lê a primeira linha.
      let dados = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (pedaco) => (dados += pedaco));
      stdin.on("end", () => resolver(dados.split(/\r?\n/)[0] ?? ""));
      return;
    }
    stdout.write(pergunta);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let senha = "";
    const aoDigitar = (tecla) => {
      if (tecla === "\u0003") {
        stdin.setRawMode(false);
        rejeitar(new Error("Cancelado."));
      } else if (tecla === "\r" || tecla === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", aoDigitar);
        stdout.write("\n");
        resolver(senha);
      } else if (tecla === "\u007f" || tecla === "\b") {
        senha = senha.slice(0, -1);
      } else {
        senha += tecla;
      }
    };
    stdin.on("data", aoDigitar);
  });
}

try {
  const senha = await perguntarSemEco(`Senha do acesso privado (mínimo de ${TAMANHO_MINIMO} caracteres): `);
  if (senha.length < TAMANHO_MINIMO) {
    console.error(`A senha precisa ter pelo menos ${TAMANHO_MINIMO} caracteres. Uma frase com várias palavras funciona bem.`);
    process.exit(1);
  }
  const sal = randomBytes(16);
  const { logN, r, p } = PARAMETROS;
  const hash = scryptSync(senha.normalize("NFKC"), sal, 64, { N: 2 ** logN, r, p, maxmem: 96 * 1024 * 1024 });
  const valor = ["scrypt", logN, r, p, sal.toString("base64"), hash.toString("base64")].join(":");
  console.log("\nCadastre na Vercel (Settings → Environment Variables), marcando como Sensitive:\n");
  console.log(`ACESSO_SENHA_HASH=${valor}\n`);
  console.log("Cadastre também ACESSO_EMAIL com o e-mail de login e faça um novo deploy.");
} catch (falha) {
  console.error(falha instanceof Error ? falha.message : falha);
  process.exit(1);
}
