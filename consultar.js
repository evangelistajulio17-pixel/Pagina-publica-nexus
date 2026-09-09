/* ============================================================
   SCRIPT DE CONSULTA - mostra os cadastros e inscrições salvos,
   já DESCRIPTOGRAFADOS (o SQLite Viewer sozinho só mostraria o
   texto embaralhado, já que os dados agora ficam protegidos com
   AES-256 dentro do banco).

   COMO USAR:
   1) Certifique-se que o ENCRYPTION_KEY usado aqui é o MESMO que
      estava configurado quando os dados foram salvos (senão a
      descriptografia falha e mostra "[não foi possível ler]").
   2) Na pasta server, rode: node consultar.js
============================================================ */

const Database = require("better-sqlite3");
const crypto = require("crypto");

// TROQUE AQUI: precisa ser IDÊNTICO ao ENCRYPTION_KEY usado no server.js
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "TROQUE_ESTA_CHAVE_ANTES_DE_PUBLICAR_DE_VERDADE";
const CHAVE_32_BYTES = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();

function descriptografar(textoCriptografado) {
  if (!textoCriptografado || typeof textoCriptografado !== "string") return textoCriptografado;
  const partes = textoCriptografado.split(":");
  if (partes.length !== 3) return textoCriptografado;
  try {
    const [ivBase64, tagBase64, dadosBase64] = partes;
    const decifra = crypto.createDecipheriv("aes-256-gcm", CHAVE_32_BYTES, Buffer.from(ivBase64, "base64"));
    decifra.setAuthTag(Buffer.from(tagBase64, "base64"));
    const decriptografado = Buffer.concat([
      decifra.update(Buffer.from(dadosBase64, "base64")),
      decifra.final(),
    ]);
    return decriptografado.toString("utf8");
  } catch {
    return "[não foi possível ler - chave errada?]";
  }
}

const db = new Database("dados.db");

console.log("\n--- CADASTROS ---");
const cadastros = db.prepare("SELECT * FROM cadastros").all();
console.log(
  cadastros.map((linha) => ({
    ...linha,
    nome: descriptografar(linha.nome),
    email: descriptografar(linha.email),
    empresa: descriptografar(linha.empresa),
    telefone: descriptografar(linha.telefone),
  }))
);

console.log("\n--- NEWSLETTER ---");
const newsletter = db.prepare("SELECT * FROM newsletter").all();
console.log(
  newsletter.map((linha) => ({
    ...linha,
    nome: descriptografar(linha.nome),
    email: descriptografar(linha.email),
    telefone: descriptografar(linha.telefone),
  }))
);
