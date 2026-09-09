/* ============================================================
   BACKEND SIMPLES - RECEBE OS CADASTROS DO SITE
   Tecnologias: Node.js + Express + SQLite (banco de dados
   em arquivo, não precisa instalar servidor de banco separado -
   ótimo para começar; dá pra trocar por Postgres/MySQL depois).

   COMO RODAR:
   1) Instale o Node.js (nodejs.org)
   2) Na pasta /server, rode:  npm init -y
   3) Depois:  npm install express better-sqlite3 cors
   4) Depois:  node server.js
   O servidor vai subir em http://localhost:3000
============================================================ */

const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const crypto = require("crypto"); // módulo nativo do Node.js - não precisa instalar nada extra

const app = express();
const PORTA = 3000;

/* ============================================================
   CRIPTOGRAFIA DOS DADOS PESSOAIS (AES-256-GCM)
   Protege nome, e-mail, telefone e empresa no banco de dados -
   mesmo que alguém consiga acessar o arquivo dados.db diretamente
   (ex: um backup vazado, ou acesso indevido ao servidor), os dados
   aparecem como texto ilegível sem a chave certa.

   AES-256-GCM foi escolhido por 2 motivos:
   1) É o mesmo padrão usado por bancos e no WhatsApp - 256 bits é
      o "tamanho de chave" considerado seguro hoje (64 bits, por
      comparação, já foi quebrado publicamente em poucas horas).
   2) O "GCM" no nome quer dizer que ele também detecta se alguém
      tentou adulterar o dado criptografado - não só embaralha,
      como avisa se foi mexido.

   ⚠️ MUITO IMPORTANTE: troque ENCRYPTION_KEY abaixo por um valor
   secreto de verdade antes de publicar o site. Trate essa chave
   como uma senha de banco: nunca comita ela no Git, nunca
   compartilhe por e-mail/WhatsApp. No Render/Railway, configure
   ela como "variável de ambiente" (Environment Variable) no painel
   do serviço, não direto no código.
   Se você TROCAR essa chave depois de já ter dados salvos, os
   dados antigos ficam permanentemente ilegíveis (é assim que
   criptografia forte funciona - não tem "esqueci minha senha").
============================================================ */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "TROQUE_ESTA_CHAVE_ANTES_DE_PUBLICAR_DE_VERDADE";

// AES-256 exige uma chave de exatamente 32 bytes (256 bits). Como a
// string acima pode ter qualquer tamanho, passamos ela por um hash
// SHA-256 - isso sempre devolve exatamente 32 bytes, não importa o
// tamanho do texto original.
const CHAVE_32_BYTES = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();

/**
 * Criptografa um texto com AES-256-GCM. Cada chamada gera um
 * resultado DIFERENTE mesmo para o mesmo texto de entrada (por
 * causa do IV aleatório) - isso é uma proteção a mais (impede
 * comparar dois registros criptografados pra descobrir se o valor
 * original é igual), mas também significa que não dá pra usar
 * "WHERE email = ?" direto no banco - por isso usamos um hash
 * separado (função hashParaBusca) só para permitir buscas/checagem
 * de duplicidade, sem enfraquecer a criptografia em si.
 */
function criptografar(textoPlano) {
  if (textoPlano === null || textoPlano === undefined || textoPlano === "") return textoPlano;
  const iv = crypto.randomBytes(12); // tamanho de IV recomendado para GCM
  const cifra = crypto.createCipheriv("aes-256-gcm", CHAVE_32_BYTES, iv);
  const criptografado = Buffer.concat([cifra.update(String(textoPlano), "utf8"), cifra.final()]);
  const tagDeAutenticacao = cifra.getAuthTag(); // "selo" que comprova que o dado não foi adulterado
  // Guarda os 3 pedaços juntos (separados por ":"), em base64 para caber numa coluna de texto comum
  return [iv.toString("base64"), tagDeAutenticacao.toString("base64"), criptografado.toString("base64")].join(":");
}

/** Desfaz a criptografia de um texto salvo pela função acima. */
function descriptografar(textoCriptografado) {
  if (!textoCriptografado || typeof textoCriptografado !== "string") return textoCriptografado;
  const partes = textoCriptografado.split(":");
  if (partes.length !== 3) return textoCriptografado; // não parece um valor criptografado por esta função - devolve como está
  try {
    const [ivBase64, tagBase64, dadosBase64] = partes;
    const decifra = crypto.createDecipheriv("aes-256-gcm", CHAVE_32_BYTES, Buffer.from(ivBase64, "base64"));
    decifra.setAuthTag(Buffer.from(tagBase64, "base64"));
    const decriptografado = Buffer.concat([
      decifra.update(Buffer.from(dadosBase64, "base64")),
      decifra.final(),
    ]);
    return decriptografado.toString("utf8");
  } catch (erro) {
    // Acontece se a chave estiver errada, ou o dado foi adulterado -
    // por segurança, nunca mostramos o erro detalhado pra fora.
    console.error("Falha ao descriptografar um campo:", erro.message);
    return "[não foi possível ler este dado]";
  }
}

/**
 * Gera uma "impressão digital" (hash) de um texto - sempre o MESMO
 * resultado para o mesmo texto de entrada, ao contrário da função
 * criptografar() acima. Usado só para permitir checar duplicidade
 * de e-mail (ex: impedir 2 inscrições com o mesmo e-mail na
 * newsletter) sem precisar descriptografar todos os registros do
 * banco um por um para comparar.
 */
function hashParaBusca(texto) {
  return crypto.createHash("sha256").update(String(texto).trim().toLowerCase()).digest("hex");
}

// Permite que o navegador (rodando em outro endereço/porta) acesse este backend.
// Em produção, troque "*" pelo endereço real do seu site por segurança.
app.use(cors({ origin: "*" }));

// Permite receber JSON no corpo das requisições (o front-end envia JSON).
// O limite de "10kb" evita que alguém tente travar o servidor mandando
// um corpo de requisição gigante (proteção simples contra abuso).
app.use(express.json({ limit: "10kb" }));

/* ============================================================
   CABEÇALHOS DE SEGURANÇA BÁSICOS
   Normalmente isso viria do pacote "helmet", mas para manter o
   projeto simples (sem depender de mais um pacote), aplicamos
   manualmente os cabeçalhos mais importantes.
============================================================ */
app.use((requisicao, resposta, proximo) => {
  resposta.setHeader("X-Content-Type-Options", "nosniff"); // impede o navegador de "adivinhar" tipos de arquivo
  resposta.setHeader("X-Frame-Options", "DENY");            // impede que o site seja carregado dentro de um <iframe> de terceiros (proteção contra clickjacking)
  resposta.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  proximo();
});

/* ============================================================
   LIMITADOR DE REQUISIÇÕES (RATE LIMIT) SIMPLES
   Guarda em memória quantas requisições cada IP fez recentemente.
   Se passar do limite, a pessoa recebe um erro 429 e precisa
   esperar. Isso é básico (reinicia se o servidor reiniciar, e
   não funciona bem com múltiplos servidores ao mesmo tempo) -
   para um projeto maior, trocar pelo pacote "express-rate-limit".
============================================================ */
const registroDeRequisicoes = new Map(); // ip -> [timestamps das últimas requisições]
const JANELA_MS = 60 * 1000; // janela de 1 minuto
const LIMITE_POR_JANELA = 10; // no máximo 10 envios de formulário por minuto por IP

function limitarRequisicoes(requisicao, resposta, proximo) {
  const ip = requisicao.ip;
  const agora = Date.now();
  const historico = (registroDeRequisicoes.get(ip) || []).filter((t) => agora - t < JANELA_MS);

  if (historico.length >= LIMITE_POR_JANELA) {
    return resposta.status(429).json({ erro: "Muitas tentativas. Aguarde um instante e tente novamente." });
  }

  historico.push(agora);
  registroDeRequisicoes.set(ip, historico);
  proximo();
}


/* ============================================================
   BANCO DE DADOS (SQLite)
   Cria o arquivo "dados.db" na primeira vez que o servidor roda,
   e cria as tabelas se elas ainda não existirem.
============================================================ */
const db = new Database("dados.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS cadastros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria TEXT NOT NULL,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    empresa TEXT,
    cargo TEXT,
    telefone TEXT,
    consentimento INTEGER NOT NULL,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS newsletter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    email TEXT NOT NULL,
    email_hash TEXT NOT NULL UNIQUE,
    telefone TEXT,
    consentimento INTEGER NOT NULL,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);


/* ============================================================
   FUNÇÕES DE VALIDAÇÃO
   Nunca confie só na validação do navegador (front-end) -
   qualquer pessoa pode enviar dados direto para a API sem
   passar pelo site, então validamos tudo de novo aqui.
============================================================ */

/** Confere se um e-mail tem um formato minimamente válido */
function emailValido(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Remove tags HTML simples de um texto, para evitar injeção de código */
function limparTexto(texto) {
  if (typeof texto !== "string") return "";
  return texto.replace(/<[^>]*>/g, "").trim();
}


/* ============================================================
   ROTA: POST /api/cadastro
   Recebe os cadastros por categoria (Rodada de Negócios,
   Conexão Saúde, etc.)
============================================================ */
app.post("/api/cadastro", limitarRequisicoes, (requisicao, resposta) => {
  const { categoria, nome, email, empresa, cargo, telefone, consentimento, site } = requisicao.body;

  // Proteção honeypot (redundante com o front-end, mas o backend
  // é a barreira que realmente importa - o front pode ser burlado).
  if (site) {
    // Fingimos sucesso para não dar dica ao robô de que foi bloqueado.
    return resposta.status(200).json({ ok: true });
  }

  // Validações obrigatórias
  if (!limparTexto(nome) || !emailValido(email) || !limparTexto(categoria)) {
    return resposta.status(400).json({ erro: "Dados inválidos. Confira nome, e-mail e categoria." });
  }

  // LGPD: sem consentimento explícito, não gravamos o dado.
  if (!consentimento) {
    return resposta.status(400).json({ erro: "É necessário aceitar a Política de Privacidade." });
  }

  db.prepare(`
    INSERT INTO cadastros (categoria, nome, email, empresa, cargo, telefone, consentimento)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    limparTexto(categoria), // categoria fica em texto puro - não é um dado pessoal sensível, e precisa ser lida/filtrada facilmente
    criptografar(limparTexto(nome)),
    criptografar(email.trim().toLowerCase()),
    criptografar(limparTexto(empresa)),
    limparTexto(cargo), // cargo não foi pedido para criptografar - fica como está
    criptografar(limparTexto(telefone)),
    1
  );

  resposta.status(201).json({ ok: true });
});


/* ============================================================
   ROTA: POST /api/newsletter
   Recebe as inscrições para receber comunicações.
============================================================ */
app.post("/api/newsletter", limitarRequisicoes, (requisicao, resposta) => {
  const { nome, email, telefone, consentimento } = requisicao.body;

  if (!limparTexto(nome)) {
    return resposta.status(400).json({ erro: "Nome é obrigatório." });
  }
  
  if (!emailValido(email)) {
    return resposta.status(400).json({ erro: "E-mail inválido." });
  }

  if (!limparTexto(telefone)) {
    return resposta.status(400).json({ erro: "Telefone é obrigatório." });
  }

  if (!consentimento) {
    return resposta.status(400).json({ erro: "É necessário aceitar a Política de Privacidade." });
  }

  try {
    db.prepare(`
      INSERT INTO newsletter (nome, email, email_hash, telefone, consentimento) VALUES (?, ?, ?, ?, ?)
    `).run(
      criptografar(limparTexto(nome)),
      criptografar(email.trim().toLowerCase()),
      hashParaBusca(email), // permite checar "já existe esse e-mail?" sem descriptografar tudo
      criptografar(limparTexto(telefone)),
      1
    );

    resposta.status(201).json({ ok: true });
  } catch (erro) {
    // Erro mais comum aqui: e-mail duplicado (por causa do UNIQUE em email_hash)
    if (String(erro).includes("UNIQUE")) {
      return resposta.status(200).json({ ok: true, aviso: "Este e-mail já estava cadastrado." });
    }
    console.error(erro);
    resposta.status(500).json({ erro: "Erro interno ao salvar." });
  }
});


/* ============================================================
   INICIA O SERVIDOR
============================================================ */
app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});


/* ============================================================
   OBSERVAÇÕES DE SEGURANÇA PARA QUANDO FOR PARA PRODUÇÃO:

   1) HTTPS obrigatório - use um serviço de hospedagem que já
      forneça certificado SSL automático (ex: Render, Railway,
      Vercel para o front + Render/Railway para este backend).

   2) Troque cors({ origin: "*" }) pelo domínio real do seu site,
      ex: cors({ origin: "https://www.suaempresa.com.br" })

   3) Adicione um rate-limit (ex: pacote "express-rate-limit")
      para impedir que alguém envie milhares de cadastros por
      minuto (ataque de força bruta / spam).

   4) Nunca exponha o arquivo dados.db publicamente. Ele deve
      ficar só no servidor, nunca em uma pasta acessível pelo
      navegador.

   5) Tenha uma página real de Política de Privacidade (o HTML
      já linka para "politica-de-privacidade.html") explicando
      quais dados são coletados, por quê, e por quanto tempo
      ficam armazenados - exigência da LGPD.

   6) A chave de criptografia (ENCRYPTION_KEY) precisa ser configurada
      como variável de ambiente no serviço de hospedagem (Render,
      Railway etc), NUNCA deixada com o valor de exemplo do código.
      Guarde essa chave em um lugar seguro (ex: gerenciador de senhas)
      - se ela for perdida, os dados já salvos ficam ilegíveis para
      sempre, sem exceção.
============================================================ */
