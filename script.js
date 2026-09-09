"use strict";
/* 
  "use strict" faz o navegador ser mais rígido com erros comuns
  de JavaScript (ex: usar uma variável sem declarar) - ajuda a
  pegar bugs cedo em vez de deixar o código falhar silenciosamente.
*/

/* ============================================================
   CONFIGURAÇÕES GERAIS
============================================================ */

// Endereço do seu backend (ver pasta /server).
const API_URL = "http://localhost:3000";

// ID de uma SEGUNDA playlist, usada na página dedicada "Aulas Rápidas"
// (aulas-rapidas.html) - uma playlist diferente da principal.
const AULAS_RAPIDAS_PLAYLIST_ID = "COLE_AQUI_O_ID_DA_PLAYLIST_AULAS_RAPIDAS";

// ID da playlist usada na página dedicada videos-2026.html
const VIDEOS_2026_PLAYLIST_ID = "PLGX4SEYHXRCo";

// ID do vídeo do Vimeo usado como fundo do hero (o número que
// aparece em vimeo.com/123456789). TROQUE AQUI quando trocar o vídeo.
const VIMEO_HERO_ID = "939666018";

// Frases que aparecem uma de cada vez no título principal do hero,
// trocando sozinhas a cada poucos segundos (efeito "letreiro").
// TROQUE AQUI: adicione, remova ou reescreva as frases à vontade -
// a primeira da lista é a que aparece assim que a página carrega.
const TITULOS_HERO = [
  "O ponto de encontro dos negócios do setor",
  "Rodadas de negócios que geram resultado real",
  "Conectando quem decide com quem soluciona",
  "15 edições, milhares de conexões de negócio",
];

// URL do site WordPress onde a equipe de marketing publica o blog
// (sem barra "/" no final). Ex: "https://blog.suaempresa.com.br"
// O site puxa os posts de lá automaticamente pela API do WordPress -
// ninguém precisa editar o código toda vez que sai um post novo.
const WORDPRESS_URL = "COLE_AQUI_A_URL_DO_SEU_WORDPRESS";

// Quantos posts mais recentes mostrar na seção de blog
const QUANTIDADE_POSTS_BLOG = 3;

// Tempo máximo (em milissegundos) que esperamos por uma resposta
// do backend antes de desistir e avisar o usuário. Evita que o
// formulário fique "carregando" para sempre se o servidor cair.
const TIMEOUT_REQUISICAO_MS = 10000;


/* ============================================================
   PEQUENO UTILITÁRIO: fetch com tempo limite
   fetch() sozinho não tem um "timeout" embutido - se o servidor
   nunca responder, a promessa fica pendurada para sempre. Essa
   função usa AbortController para cancelar a requisição depois
   de um tempo máximo, e cai no catch() do lugar que a chamou.
============================================================ */
async function fetchComTimeout(url, opcoes = {}, timeoutMs = TIMEOUT_REQUISICAO_MS) {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    const resposta = await fetch(url, { ...opcoes, signal: controlador.signal });
    return resposta;
  } finally {
    // Roda sempre, tenha dado certo ou errado - evita "vazar" o timer
    clearTimeout(timer);
  }
}


/* ============================================================
   VÍDEO DE FUNDO DO HERO
   Insere o iframe do Vimeo assim que o script roda (a tag <script>
   já tem "defer", então isso já acontece depois do HTML estar
   pronto, sem bloquear a leitura da página). O vídeo "some para
   dentro" (fade) quando terminar de carregar, em vez de aparecer
   de repente.
============================================================ */
(function inicializarVideoHero() {
  const container = document.getElementById("hero-video");
  if (!container || !VIMEO_HERO_ID) return;

  const iframe = document.createElement("iframe");
  iframe.src = `https://player.vimeo.com/video/${VIMEO_HERO_ID}?background=1&autoplay=1&loop=1&muted=1`;
  iframe.setAttribute("allow", "autoplay; fullscreen");
  iframe.setAttribute("title", "");
  iframe.setAttribute("tabindex", "-1");
  iframe.style.opacity = "0";
  iframe.style.transition = "opacity 0.5s ease";

  // Assim que o vídeo terminar de carregar, faz o fade suave até opacidade 1
  iframe.addEventListener("load", () => {
    requestAnimationFrame(() => {
      iframe.style.opacity = "1";
    });
  });

  container.appendChild(iframe);
})();


/* ============================================================
   NAVBAR: efeito vidro ao rolar + menu mobile + scrollspy
============================================================ */
(function inicializarNavbar() {
  const navbar = document.getElementById("navbar");
  const botaoToggle = document.getElementById("navbar-toggle");
  const links = document.getElementById("navbar-links");
  const todosOsLinks = links.querySelectorAll(".nav-btn");

  if (!navbar) return; // se por algum motivo o elemento não existir, não quebra o resto do script

  // --- Efeito "vidro" no fundo da navbar ao rolar ---
  // Usamos um "flag" (jaAplicado) para não ficar mexendo no DOM
  // a cada pixel rolado - só troca a classe quando o estado muda de fato.
  let jaAplicado = false;
  function atualizarFundoNavbar() {
    const deveAplicar = window.scrollY > 40;
    if (deveAplicar !== jaAplicado) {
      navbar.classList.toggle("navbar--rolado", deveAplicar);
      jaAplicado = deveAplicar;
    }
  }
  atualizarFundoNavbar();

  // --- Menu mobile (abrir/fechar) ---
  botaoToggle.addEventListener("click", () => {
    const aberto = links.classList.toggle("navbar__links--aberto");
    botaoToggle.setAttribute("aria-expanded", String(aberto));
  });

  // Fecha o menu mobile automaticamente ao clicar em um link
  todosOsLinks.forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("navbar__links--aberto");
      botaoToggle.setAttribute("aria-expanded", "false");
    });
  });

  // --- Itens de menu com dropdown (Categorias, Expositores) ---
  // Cada item vira um <div class="nav-item--dropdown"> com um botão
  // e um painel de links. Clicar no botão abre/fecha o painel; clicar
  // fora, ou apertar Esc, fecha; e abrir um fecha o outro automaticamente.
  const itensDropdown = document.querySelectorAll(".nav-item--dropdown");

  function fecharTodosOsDropdowns() {
    itensDropdown.forEach((item) => {
      item.dataset.aberto = "false";
      item.querySelector(".nav-btn--pai")?.setAttribute("aria-expanded", "false");
    });
  }

  itensDropdown.forEach((item) => {
    const botao = item.querySelector(".nav-btn--pai");
    if (!botao) return;

    botao.addEventListener("click", (evento) => {
      evento.stopPropagation(); // impede que esse clique já feche o dropdown de novo pelo listener do "document" abaixo
      const estaAberto = item.dataset.aberto === "true";
      fecharTodosOsDropdowns(); // fecha qualquer outro que já estivesse aberto
      item.dataset.aberto = String(!estaAberto);
      botao.setAttribute("aria-expanded", String(!estaAberto));
    });

    // Os links dentro do dropdown também devem fechar o menu mobile ao serem clicados
    item.querySelectorAll(".nav-dropdown__link").forEach((link) => {
      link.addEventListener("click", () => {
        links.classList.remove("navbar__links--aberto");
        botaoToggle.setAttribute("aria-expanded", "false");
      });
    });
  });

  // Clicar fora de qualquer dropdown fecha todos
  document.addEventListener("click", fecharTodosOsDropdowns);

  // Esc fecha todos os dropdowns abertos
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") fecharTodosOsDropdowns();
  });

  // --- Scrollspy: marca o link da seção visível como ativo ---
  // IntersectionObserver é muito mais leve que calcular posições
  // de scroll manualmente - o navegador nos avisa quando cada
  // seção entra/sai da área visível.
  const secoes = document.querySelectorAll("section[id]");
  const observadorScrollspy = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          const id = entrada.target.getAttribute("id");
          todosOsLinks.forEach((link) => {
            link.classList.toggle("nav-btn--ativo", link.getAttribute("href") === `#${id}`);
          });
        }
      });
    },
    { rootMargin: "-45% 0px -45% 0px" } // considera "ativa" a seção perto do meio da tela
  );
  secoes.forEach((secao) => observadorScrollspy.observe(secao));

  // --- Botão "voltar ao topo" some/aparece + fundo da navbar ---
  const botaoTopo = document.getElementById("voltar-topo");
  window.addEventListener(
    "scroll",
    () => {
      atualizarFundoNavbar();
      if (botaoTopo) {
        botaoTopo.classList.toggle("voltar-topo--visivel", window.scrollY > 500);
      }
    },
    { passive: true } // "passive" avisa o navegador que não vamos chamar preventDefault, o que melhora a performance da rolagem
  );
})();


/* ============================================================
   ANIMAÇÃO DE ENTRADA DAS SEÇÕES (SCROLL REVEAL)
============================================================ */
/* ============================================================
   LETREIRO DE EXPOSITORES (MARQUEE ROBUSTO)
   O HTML só tem UM conjunto de logos. Essa função duplica esse
   conjunto automaticamente até preencher pelo menos uma tela de
   largura, e depois duplica tudo mais uma vez para o loop do CSS
   (translateX(-50%)) ficar sem "pulo" - funciona com 3 logos ou
   com 30, sem precisar mexer no HTML depois.
============================================================ */
(function inicializarLetreiro() {
  const container = document.querySelector(".letreiro");
  const track = document.getElementById("letreiro-track");
  if (!container || !track) return;

  // Guarda uma cópia limpa dos itens originais (só o que veio do HTML),
  // para poder remontar do zero sempre que precisar (ex: tela redimensionada).
  const itensOriginais = Array.from(track.children).map((el) => el.cloneNode(true));
  if (itensOriginais.length === 0) return;

  function montarLetreiro() {
    track.innerHTML = "";
    itensOriginais.forEach((item) => track.appendChild(item.cloneNode(true)));

    const larguraContainer = container.clientWidth;

    // Repete o conjunto original até o conteúdo preencher pelo menos
    // uma tela inteira de largura. O limite de tentativas é só uma
    // proteção contra loop infinito (ex: container com largura 0).
    let tentativas = 0;
    while (track.scrollWidth < larguraContainer && tentativas < 30) {
      itensOriginais.forEach((item) => track.appendChild(item.cloneNode(true)));
      tentativas++;
    }

    // Duplica tudo mais uma vez (a "segunda metade" do loop) - o CSS
    // anima de translateX(0) até translateX(-50%), então o conteúdo
    // precisa estar duplicado exatamente ao meio para não dar salto
    // visível quando a animação reinicia.
    const primeiraMetade = Array.from(track.children);
    primeiraMetade.forEach((item) => {
      const copia = item.cloneNode(true);
      copia.setAttribute("aria-hidden", "true"); // é repetição do mesmo conteúdo - leitor de tela não precisa ler de novo
      copia.setAttribute("tabindex", "-1");
      track.appendChild(copia);
    });
  }

  montarLetreiro();

  // Se a janela for redimensionada de forma significativa (ex: virar o
  // celular, ou passar de mobile para desktop), remonta o letreiro para
  // a quantidade de cópias continuar preenchendo a largura certa.
  let larguraAnterior = window.innerWidth;
  let timerRedimensionar;
  window.addEventListener("resize", () => {
    clearTimeout(timerRedimensionar);
    timerRedimensionar = setTimeout(() => {
      if (Math.abs(window.innerWidth - larguraAnterior) > 80) {
        larguraAnterior = window.innerWidth;
        montarLetreiro();
      }
    }, 300); // espera o usuário parar de redimensionar antes de remontar, evita trabalho excessivo
  });
})();


(function inicializarRevealAndStats() {
  const elementosReveal = document.querySelectorAll(".reveal");

  const observador = new IntersectionObserver(
    (entradas, obs) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("reveal--ativo");
          obs.unobserve(entrada.target); // já revelou, não precisa mais observar - economiza processamento
        }
      });
    },
    { threshold: 0.15 }
  );

  elementosReveal.forEach((el) => observador.observe(el));

  // --- Contadores animados do hero (0 até o número final) ---
  const numeros = document.querySelectorAll(".stat__numero");
  const observadorNumeros = new IntersectionObserver(
    (entradas, obs) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        animarContador(entrada.target);
        obs.unobserve(entrada.target);
      });
    },
    { threshold: 0.6 }
  );
  numeros.forEach((el) => observadorNumeros.observe(el));
})();


/* ============================================================
   TÍTULO ROTATIVO DO HERO ("LETREIRO" DE FRASES)
   Troca o texto do <span id="hero-titulo-rotativo"> automaticamente,
   ciclando pela lista TITULOS_HERO. Efeito de SLIDE (como uma
   transição de slide do PowerPoint): a frase atual desliza para a
   esquerda e some, a próxima entra deslizando vinda da direita.
============================================================ */
(function inicializarTituloRotativo() {
  const elemento = document.getElementById("hero-titulo-rotativo");
  if (!elemento || TITULOS_HERO.length <= 1) return; // com 0 ou 1 frase, não tem o que trocar

  // Quem pede menos movimento no sistema não recebe a troca automática -
  // fica só com a primeira frase, parada.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const DURACAO_VISIVEL_MS = 4500; // quanto tempo cada frase fica visível antes de trocar
  const DURACAO_SLIDE_MS = 400;    // tem que bater com a transição definida no CSS (.hero__titulo-texto)

  let indice = 0;

  function trocarFrase() {
    // 1) Frase atual desliza para a esquerda e some
    elemento.classList.add("hero__titulo-texto--saindo");

    setTimeout(() => {
      // 2) Troca o texto por baixo dos panos (já está invisível nesse momento)
      indice = (indice + 1) % TITULOS_HERO.length;
      elemento.textContent = TITULOS_HERO[indice];

      // 3) Reposiciona o texto do lado direito, INSTANTANEAMENTE (sem
      // transição) - se não desligarmos a transição aqui, o navegador
      // tentaria animar esse "pulo" para a direita, o que ficaria
      // errado visualmente.
      elemento.style.transition = "none";
      elemento.classList.remove("hero__titulo-texto--saindo");
      elemento.classList.add("hero__titulo-texto--entrando");

      // Força o navegador a "aplicar" essa posição antes de continuar -
      // sem isso, as duas trocas de classe seguintes se fundiriam numa
      // só e a animação de entrada não aconteceria.
      void elemento.offsetWidth;

      // 4) Liga a transição de novo e tira a classe "entrando" - como o
      // CSS já define a transição em .hero__titulo-texto, remover essa
      // classe agora anima suavemente da direita até a posição normal.
      elemento.style.transition = "";
      elemento.classList.remove("hero__titulo-texto--entrando");
    }, DURACAO_SLIDE_MS);
  }

  setInterval(trocarFrase, DURACAO_VISIVEL_MS);
})();


/**
 * Anima um número de 0 até o valor em data-alvo, ao longo de ~1.2s.
 * Usa requestAnimationFrame em vez de setInterval - fica sincronizado
 * com a taxa de atualização da tela, então roda mais suave.
 * Se o elemento tiver o atributo data-tipo="moeda", o número é
 * formatado como Real brasileiro (ex: R$ 5.000.000) em vez de um
 * número simples.
 */
function animarContador(elemento) {
  const alvo = Number(elemento.dataset.alvo);
  if (!Number.isFinite(alvo)) return; // se o valor não for um número válido, não tenta animar

  const ehMoeda = elemento.dataset.tipo === "moeda";

  /** Formata um número como texto simples (1.234) ou como dinheiro (R$ 1.234), conforme o tipo do elemento. */
  function formatar(valor) {
    if (ehMoeda) {
      return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
    }
    return valor.toLocaleString("pt-BR");
  }

  // Quem prefere menos movimento no sistema já vê o número final direto
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    elemento.textContent = formatar(alvo);
    return;
  }

  const duracaoMs = 1200;
  const inicio = performance.now();

  function passo(agora) {
    const progresso = Math.min((agora - inicio) / duracaoMs, 1);
    const valorAtual = Math.floor(progresso * alvo);
    elemento.textContent = formatar(valorAtual);
    if (progresso < 1) requestAnimationFrame(passo);
  }
  requestAnimationFrame(passo);
}


/* ============================================================
   BLOG (POSTS DO WORDPRESS VIA REST API)
   O WordPress expõe uma API própria em "/wp-json/wp/v2/posts" -
   qualquer site WordPress já vem com isso pronto, sem precisar
   instalar plugin. Buscamos os posts mais recentes e montamos
   os cards na hora, direto no navegador do visitante.
============================================================ */
let blogJaCarregado = false;

async function carregarPostsBlog() {
  if (blogJaCarregado) return;
  blogJaCarregado = true;

  const grid = document.getElementById("blog-grid");
  const status = document.getElementById("blog-status");

  if (WORDPRESS_URL === "COLE_AQUI_A_URL_DO_SEU_WORDPRESS") {
    console.warn("Configure a constante WORDPRESS_URL em js/script.js com a URL real do seu blog.");
    if (status) status.textContent = "Configure a URL do WordPress em js/script.js para exibir o blog aqui.";
    blogJaCarregado = false;
    return;
  }

  try {
    // "_embed" traz junto a imagem de destaque de cada post, numa
    // única requisição (evita ter que buscar a imagem separadamente
    // para cada post, o que deixaria a página mais lenta).
    const url = `${WORDPRESS_URL}/wp-json/wp/v2/posts?_embed&per_page=${QUANTIDADE_POSTS_BLOG}`;
    const resposta = await fetchComTimeout(url);

    if (!resposta.ok) throw new Error("O WordPress respondeu com erro ao buscar os posts.");

    const posts = await resposta.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      if (status) status.textContent = "Nenhuma publicação encontrada ainda.";
      return;
    }

    // Limpa a mensagem de "carregando" e monta um card para cada post
    grid.innerHTML = "";
    posts.forEach((post) => grid.appendChild(criarCardDoPost(post)));
  } catch (erro) {
    console.error("Erro ao carregar posts do blog:", erro);
    if (status) {
      // Erro mais comum aqui: CORS bloqueado pelo WordPress (ver README
      // para o passo a passo de como liberar isso do lado do WordPress).
      status.textContent = "Não foi possível carregar o blog agora.";
    }
    // Deixa disponível um link direto pro blog, mesmo se os posts não carregarem
    if (grid && WORDPRESS_URL !== "COLE_AQUI_A_URL_DO_SEU_WORDPRESS") {
      const link = document.createElement("a");
      link.href = WORDPRESS_URL;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.className = "btn btn--outline";
      link.style.color = "var(--azul-900)";
      link.style.borderColor = "var(--azul-900)";
      link.textContent = "Visitar o blog";
      grid.appendChild(link);
    }
    blogJaCarregado = false; // permite tentar de novo numa próxima visita à seção
  }
}

/**
 * Monta o elemento HTML (card) de um post vindo da API do WordPress.
 * @param {object} post - objeto de post retornado pela WordPress REST API
 */
function criarCardDoPost(post) {
  const card = document.createElement("a");
  card.className = "blog__card";
  card.href = post.link;
  card.target = "_blank";
  card.rel = "noreferrer";

  // A imagem de destaque vem dentro de "_embedded", quando existe.
  // Nem todo post tem imagem, então checamos antes de tentar usar.
  const imagemDestaque = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  if (imagemDestaque) {
    const img = document.createElement("img");
    img.src = imagemDestaque;
    img.alt = "";
    img.loading = "lazy";
    img.className = "blog__card__imagem";
    card.appendChild(img);
  }

  const conteudo = document.createElement("div");
  conteudo.className = "blog__card__conteudo";

  const titulo = document.createElement("h3");
  titulo.className = "blog__card__titulo";
  // O WordPress já manda o título em HTML (post.title.rendered) - usamos
  // textContent de um elemento temporário para tirar qualquer tag e
  // pegar só o texto puro, evitando problemas de segurança com innerHTML.
  titulo.textContent = tirarHtml(post.title?.rendered || "");

  const resumo = document.createElement("p");
  resumo.className = "blog__card__resumo";
  resumo.textContent = tirarHtml(post.excerpt?.rendered || "");

  const data = document.createElement("span");
  data.className = "blog__card__data";
  data.textContent = formatarData(post.date);

  conteudo.append(titulo, resumo, data);
  card.appendChild(conteudo);
  return card;
}

/** Remove tags HTML de uma string, devolvendo só o texto puro. */
function tirarHtml(textoComHtml) {
  const temp = document.createElement("div");
  temp.innerHTML = textoComHtml;
  return (temp.textContent || "").trim();
}

/** Formata uma data ISO (ex: "2026-08-19T12:00:00") como "19 de agosto de 2026". */
function formatarData(dataIso) {
  try {
    return new Date(dataIso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

// Carrega os posts automaticamente quando a seção do blog estiver
// quase visível - mesma estratégia usada no player do YouTube, para
// não gastar uma requisição à toa se o visitante nunca rolar até lá.
(function observarSecaoDeBlog() {
  const secaoBlog = document.getElementById("blog");
  if (!secaoBlog) return;

  const observador = new IntersectionObserver(
    (entradas, obs) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          carregarPostsBlog();
          obs.disconnect();
        }
      });
    },
    { rootMargin: "200px" }
  );
  observador.observe(secaoBlog);
})();



/* ============================================================
   ENVIO DOS FORMULÁRIOS
============================================================ */

/**
 * Avisa o Google Tag Manager (e, por tabela, Google Ads e Meta Ads,
 * se configurados lá dentro) que uma conversão aconteceu - por
 * exemplo, "cadastro_rodada_de_negocios" ou "newsletter". Sem essa
 * função, o site até funciona normal, mas as campanhas pagas não
 * sabem quais cliques viraram cadastro de verdade.
 *
 * Funciona com "silêncio seguro": se o GTM ainda não foi configurado
 * (dataLayer não existe), a função simplesmente não faz nada, sem
 * gerar erro no console.
 * @param {string} nomeEvento - nome do evento de conversão (ex: "gerar_lead")
 * @param {object} detalhes - dados extras sobre a conversão (ex: {categoria: "..."})
 */
function rastrearConversao(nomeEvento, detalhes = {}) {
  if (typeof window.dataLayer !== "undefined") {
    window.dataLayer.push({ event: nomeEvento, ...detalhes });
  }
}

/** Mostra uma mensagem de status (sucesso ou erro) dentro do formulário. */
function mostrarStatus(idElemento, mensagem, tipo) {
  const el = document.getElementById(idElemento);
  if (!el) return;
  el.textContent = mensagem;
  el.className = "form__status form__status--" + tipo; // tipo = "sucesso" ou "erro"
}

function limparStatus(idElemento) {
  const el = document.getElementById(idElemento);
  if (!el) return;
  el.textContent = "";
  el.className = "form__status";
}

/**
 * Liga/desliga o estado de carregamento de um botão de envio,
 * desabilitando-o para evitar clique duplo enquanto a requisição
 * ainda está em andamento.
 */
function definirCarregando(botao, carregando, textoNormal, textoCarregando) {
  botao.disabled = carregando;
  botao.textContent = carregando ? textoCarregando : textoNormal;
}

/**
 * Versão do envio de cadastro para páginas standalone (sem modal) -
 * usada em rodada-de-negocios.html, conexao-saude.html e
 * seja-um-expositor.html. A categoria já vem fixa no HTML (campo
 * escondido), então o formulário inteiro é dedicado a ela.
 * @param {SubmitEvent} evento
 * @param {string} idStatus - id do elemento onde mostrar a mensagem de status nessa página
 */
async function enviarFormularioPagina(evento, idStatus) {
  evento.preventDefault();
  const form = evento.target;
  const botao = form.querySelector("button[type='submit']");
  const dados = Object.fromEntries(new FormData(form));
  const textoOriginalBotao = botao.dataset.textoOriginal || botao.textContent;
  botao.dataset.textoOriginal = textoOriginalBotao;

  limparStatus(idStatus);

  if (dados.site) {
    // Honeypot preenchido = robô. Finge sucesso sem enviar nada.
    mostrarStatus(idStatus, "Cadastro realizado com sucesso!", "sucesso");
    form.reset();
    return false;
  }

  definirCarregando(botao, true, textoOriginalBotao, "Enviando...");

  try {
    const resposta = await fetchComTimeout(`${API_URL}/api/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      throw new Error(corpo.erro || "Não foi possível concluir o cadastro.");
    }

    mostrarStatus(idStatus, "Cadastro realizado com sucesso! Em breve entraremos em contato.", "sucesso");
    // Avisa o GTM/Google Ads/Meta Ads que essa conversão aconteceu de verdade -
    // o nome do evento inclui a categoria pra dar pra separar campanhas depois
    // (ex: "gerar_lead" com categoria "Rodada de Negócios" ou "Seja um Expositor")
    rastrearConversao("gerar_lead", { categoria: dados.categoria });
    form.reset();
  } catch (erro) {
    const mensagem =
      erro.name === "AbortError"
        ? "O servidor demorou para responder. Tente novamente."
        : erro.message || "Não foi possível enviar seu cadastro agora.";
    mostrarStatus(idStatus, mensagem, "erro");
    console.error("Erro ao enviar cadastro (página standalone):", erro);
  } finally {
    definirCarregando(botao, false, textoOriginalBotao, "Enviando...");
  }

  return false;
}

async function enviarNewsletter(evento) {
  evento.preventDefault();
  const form = evento.target;
  const botao = form.querySelector("button[type='submit']");
  const dados = Object.fromEntries(new FormData(form));

  limparStatus("status-newsletter");
  definirCarregando(botao, true, "Quero receber", "Enviando...");

  try {
    const resposta = await fetchComTimeout(`${API_URL}/api/newsletter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    const corpo = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(corpo.erro || "Não foi possível concluir a inscrição.");
    }

    mostrarStatus("status-newsletter", corpo.aviso || "Inscrição feita com sucesso! Obrigado.", "sucesso");
    rastrearConversao("newsletter_inscricao");
    form.reset();
  } catch (erro) {
    const mensagem =
      erro.name === "AbortError"
        ? "O servidor demorou para responder. Tente novamente."
        : erro.message || "Não foi possível concluir sua inscrição agora.";
    mostrarStatus("status-newsletter", mensagem, "erro");
    console.error("Erro ao enviar newsletter:", erro);
  } finally {
    definirCarregando(botao, false, "Quero receber", "Enviando...");
  }

  return false;
}


/* ============================================================
   GALERIA: LIGHTBOX
============================================================ */
const lightbox = document.getElementById("lightbox");
const lightboxConteudo = document.getElementById("lightbox-conteudo");
let ultimoFocoAntesDoLightbox = null;

/**
 * Abre o lightbox mostrando a imagem em tamanho grande, ou o player
 * do Vimeo incorporado (via iframe) quando for vídeo. O Vimeo não
 * fornece um arquivo .mp4 direto para usar numa tag <video> comum -
 * por isso o vídeo é sempre mostrado dentro de um <iframe>.
 * @param {string} src - URL da imagem, ou URL de embed do player do Vimeo (formato https://player.vimeo.com/video/ID)
 * @param {"imagem"|"video"} tipo
 */
function abrirLightbox(src, tipo) {
  lightboxConteudo.innerHTML = ""; // limpa o conteúdo anterior

  let elemento;
  if (tipo === "video") {
    elemento = document.createElement("iframe");
    // "autoplay=1" começa o vídeo assim que o lightbox abre.
    // O separador entre parâmetros muda conforme o link já ter "?" ou não.
    const separador = src.includes("?") ? "&" : "?";
    elemento.src = `${src}${separador}autoplay=1`;
    elemento.allow = "autoplay; fullscreen; picture-in-picture";
    elemento.allowFullscreen = true;
    elemento.className = "lightbox__conteudo lightbox__conteudo--video";
    lightboxConteudo.appendChild(elemento);
  } else {
    elemento = document.createElement("img");
    elemento.src = src;
    elemento.alt = "";
    elemento.className = "lightbox__conteudo";
    lightboxConteudo.appendChild(elemento);
  }

  ultimoFocoAntesDoLightbox = document.activeElement;
  lightbox.hidden = false;
  document.addEventListener("keydown", fecharLightboxComEsc);
}

function fecharLightbox() {
  lightbox.hidden = true;
  lightboxConteudo.innerHTML = ""; // remove o <iframe>/<img> - importante para parar o vídeo, se estiver tocando
  document.removeEventListener("keydown", fecharLightboxComEsc);
  if (ultimoFocoAntesDoLightbox) ultimoFocoAntesDoLightbox.focus();
}

function fecharLightboxComEsc(evento) {
  if (evento.key === "Escape") fecharLightbox();
}

lightbox.addEventListener("click", (evento) => {
  if (evento.target === lightbox) fecharLightbox();
});


/* ============================================================
   PLAYER(ES) DE VÍDEOS DO YOUTUBE (CARREGAMENTO SOB DEMANDA)
   Em vez de carregar a API do YouTube já na abertura da página,
   só inserimos o script dela quando o usuário realmente quer ver
   os vídeos: ao clicar na capa, ou quando a seção chega perto da
   tela. Essa versão suporta MAIS DE UM player na mesma página
   (ex: o player principal + a seção "Aulas Rápidas"), já que o
   script do YouTube só pode ser inserido uma vez.
============================================================ */
let scriptYoutubeInserido = false;
let apiYoutubePronta = false;
let filaDeEsperaDaApi = []; // funções que estão esperando a API do YouTube terminar de carregar

/** Insere o script oficial do YouTube na página, mas só uma vez, não importa quantos players existam. */
function garantirScriptYouTube() {
  if (scriptYoutubeInserido) return;
  scriptYoutubeInserido = true;
  const script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(script);
  // Quando terminar de carregar, o próprio script do YouTube chama
  // a função global "onYouTubeIframeAPIReady" definida mais abaixo.
}

/**
 * Cria um player do YouTube tocando uma playlist específica em ordem
 * aleatória, dentro do elemento com o id informado. O player começa
 * MUDO de propósito: navegadores só permitem autoplay sem interação
 * do usuário quando o vídeo está sem som (é uma regra do Chrome/Safari/
 * Firefox, não uma escolha nossa) - quem quiser som clica no ícone de
 * volume dentro do próprio player.
 * @param {string} idElementoPlayer - id da <div> onde o player vai nascer
 * @param {string} playlistId
 * @param {Function} aoFalhar - chamada se o player der erro
 */
function criarPlayerDePlaylist(idElementoPlayer, playlistId, aoFalhar) {
  function inicializar() {
    try {
      new YT.Player(idElementoPlayer, {
        playerVars: { listType: "playlist", list: playlistId, shuffle: 1, rel: 0, mute: 1, autoplay: 1 },
        events: {
          onReady: (evento) => {
            evento.target.setShuffle(true);
            evento.target.mute(); // reforça o mudo por garantia - alguns navegadores ignoram playerVars.mute isoladamente
            evento.target.playVideo();
          },
          onError: (evento) => {
            // Códigos de erro da API do YouTube: 2, 5, 100, 101, 150
            console.error(`Erro ao carregar o player "${idElementoPlayer}". Código:`, evento.data);
            if (aoFalhar) aoFalhar();
          },
        },
      });
    } catch (erro) {
      // Se a API do YouTube mudar ou falhar ao instanciar, isso evita
      // que o erro quebre o restante dos scripts da página.
      console.error(`Falha ao iniciar o player "${idElementoPlayer}":`, erro);
      if (aoFalhar) aoFalhar();
    }
  }

  // Se a API ainda não terminou de carregar, guarda essa inicialização
  // numa fila e ela roda automaticamente assim que a API ficar pronta.
  if (apiYoutubePronta) inicializar();
  else filaDeEsperaDaApi.push(inicializar);
}

// eslint-disable-next-line no-unused-vars
function onYouTubeIframeAPIReady() {
  apiYoutubePronta = true;
  filaDeEsperaDaApi.forEach((inicializar) => inicializar());
  filaDeEsperaDaApi = [];
}

/** Mostra uma mensagem simples no lugar do player, caso ele falhe ao carregar. */
function mostrarFalhaDoPlayer(idElementoPlayer) {
  const elementoPlayer = document.getElementById(idElementoPlayer);
  const wrapper = elementoPlayer?.closest(".player-wrapper");
  if (wrapper) {
    wrapper.innerHTML = '<p style="color:#fff; text-align:center; padding:24px;">Não foi possível carregar os vídeos agora.</p>';
  }
}

/**
 * Função genérica usada por cada seção de vídeo da página (vídeo
 * principal, Aulas Rápidas, Vídeos 2026). Cada seção guarda seu
 * próprio "estado" (objeto com {carregado: false}) para não se
 * confundir com o estado das outras.
 */
function carregarPlayerGenerico(estado, idElementoPlayer, playlistId, nomeConstante) {
  if (estado.carregado) return;
  estado.carregado = true;

  if (!playlistId || playlistId.startsWith("COLE_AQUI")) {
    console.warn(`Configure a constante ${nomeConstante} em js/script.js com o ID real da playlist do YouTube.`);
    estado.carregado = false;
    return;
  }

  garantirScriptYouTube();
  criarPlayerDePlaylist(idElementoPlayer, playlistId, () => mostrarFalhaDoPlayer(idElementoPlayer));
}

// --- Aulas Rápidas (agora página dedicada aulas-rapidas.html) ---
const estadoAulasRapidas = { carregado: false };
function carregarAulasRapidas() {
  carregarPlayerGenerico(estadoAulasRapidas, "youtube-player-aulas", AULAS_RAPIDAS_PLAYLIST_ID, "AULAS_RAPIDAS_PLAYLIST_ID");
}

// --- Vídeos 2026 (página dedicada videos-2026.html) ---
const estadoVideos2026 = { carregado: false };
function carregarVideos2026() {
  carregarPlayerGenerico(estadoVideos2026, "youtube-player-2026", VIDEOS_2026_PLAYLIST_ID, "VIDEOS_2026_PLAYLIST_ID");
}

// Carrega e toca os players automaticamente assim que a seção correspondente
// fica perto de aparecer na tela - sem precisar de clique em nada. Cada
// página de vídeo (Vídeos 2026, Aulas Rápidas) observa sua própria seção,
// já que agora cada uma vive numa página HTML separada.
function observarEAutoCarregar(idSecao, ...funcoesDeCarregamento) {
  const secao = document.getElementById(idSecao);
  if (!secao) return;

  const observador = new IntersectionObserver(
    (entradas, obs) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          funcoesDeCarregamento.forEach((funcao) => funcao());
          obs.disconnect();
        }
      });
    },
    { rootMargin: "200px" } // começa a carregar um pouco antes da seção realmente aparecer
  );
  observador.observe(secao);
}

observarEAutoCarregar("secao-videos-2026", carregarVideos2026);
observarEAutoCarregar("secao-aulas-rapidas", carregarAulasRapidas);
