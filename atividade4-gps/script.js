/* =========================================================
   ATIVIDADE 4 — Geolocation · localStorage · Drag and Drop
   ========================================================= */

(() => {
  'use strict';

  /* -------------------------------------------------------
     0. CONSTANTES E REFERÊNCIAS
     ------------------------------------------------------- */
  const STORAGE_KEY = 'atividade4:ultimaLocalizacao';
  const DELTA_MAPA  = 0.004; // "zoom" da caixa do mini-mapa

  const $ = (id) => document.getElementById(id);

  const refs = {
    // Banner
    banner:       $('banner'),
    bannerCoords: $('bannerCoords'),
    bannerDate:   $('bannerDate'),
    // GPS
    status:       $('status'),
    coords:       $('coords'),
    lat:          $('lat'),
    lng:          $('lng'),
    precisao:     $('precisao'),
    hora:         $('hora'),
    btn:          $('btn'),
    // Mapa
    mapa:         $('mapa'),
    mapaVazio:    $('mapaVazio'),
    // Drag & Drop
    papel:        $('papel'),
    lixeira:      $('lixeira'),
    restaurar:    $('restaurar'),
    // Toast
    toast:        $('toast')
  };

  /* -------------------------------------------------------
     1. UTILITÁRIOS
     ------------------------------------------------------- */
  const formatarData = (ts) =>
    new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  let toastTimer;
  function toast(mensagem, tipo = 'ok') {
    refs.toast.textContent = mensagem;
    refs.toast.className = 'toast is-visible' + (tipo === 'erro' ? ' is-error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => refs.toast.classList.remove('is-visible'), 3400);
  }

  function definirStatus(texto, tipo = '') {
    refs.status.textContent = texto;
    refs.status.className = 'status' + (tipo ? ` ${tipo}` : '');
  }

  /* -------------------------------------------------------
     2. PERSISTÊNCIA — localStorage
     ------------------------------------------------------- */
  function lerSalva() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('localStorage corrompido — limpando.', err);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function salvarLocalizacao(dados) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    } catch (err) {
      console.warn('Não foi possível salvar no localStorage:', err);
    }
  }

  function limparLocalizacao() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /* -------------------------------------------------------
     3. RENDERIZAÇÃO
     ------------------------------------------------------- */
  function renderCoords(dados, ehAtual) {
    refs.lat.textContent = dados.lat.toFixed(6);
    refs.lng.textContent = dados.lng.toFixed(6);
    refs.precisao.textContent = `Precisão: ±${Math.round(dados.precisao || 0)} m`;
    refs.hora.textContent = formatarData(dados.ts);

    // dados antigos (vindos do localStorage) ficam "apagadinhos"
    refs.coords.classList.toggle('is-stale', !ehAtual);
  }

  function mostrarBanner(dados) {
    refs.bannerCoords.textContent = `${dados.lat.toFixed(6)}, ${dados.lng.toFixed(6)}`;
    refs.bannerDate.textContent = `Salva em ${formatarData(dados.ts)}`;
    refs.banner.classList.remove('is-hidden');
  }

  function atualizarMapa(dados) {
    const d = DELTA_MAPA;
    const bbox = [dados.lng - d, dados.lat - d, dados.lng + d, dados.lat + d].join('%2C');

    refs.mapa.src =
      `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${dados.lat}%2C${dados.lng}`;

    refs.mapa.classList.add('is-active');
    refs.mapaVazio.classList.add('is-hidden');
  }

  function resetarPainel() {
    refs.lat.textContent = '--.------';
    refs.lng.textContent = '--.------';
    refs.precisao.textContent = 'Precisão: --';
    refs.hora.textContent = '--';
    refs.coords.classList.add('is-stale');

    refs.mapa.classList.remove('is-active');
    refs.mapa.removeAttribute('src');
    refs.mapaVazio.classList.remove('is-hidden');

    refs.banner.classList.add('is-hidden');
  }

  /* -------------------------------------------------------
     4. GEOLOCATION
     ------------------------------------------------------- */
  function capturarLocalizacao() {
    if (!('geolocation' in navigator)) {
      definirStatus('Geolocalização não suportada 😕', 'erro');
      toast('Seu navegador não suporta geolocalização', 'erro');
      return;
    }

    definirStatus('Localizando…', 'carregando');
    refs.btn.disabled = true;
    refs.btn.querySelector('.btn__text').textContent = 'Buscando sinal…';
    refs.btn.querySelector('.btn__icon').textContent = '🛰️';

    navigator.geolocation.getCurrentPosition(aoSucesso, aoErro, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    });
  }

  function aoSucesso(pos) {
    const dados = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      precisao: pos.coords.accuracy || 0,
      ts: pos.timestamp || Date.now()
    };

    salvarLocalizacao(dados);   // 💾 persistência
    renderCoords(dados, true);  // 📺 exibição
    mostrarBanner(dados);
    atualizarMapa(dados);

    definirStatus('Localização capturada ✓', 'ok');
    toast('📍 Coordenadas salvas no navegador!');
    restaurarBotao();
  }

  function aoErro(err) {
    const mensagens = {
      1: 'Permissão negada. Libere o acesso à localização 🔒',
      2: 'Sinal de GPS indisponível no momento 📡',
      3: 'Tempo esgotado ao buscar o sinal ⏱️'
    };
    const msg = mensagens[err.code] || 'Não foi possível obter a localização';

    definirStatus(msg, 'erro');
    toast(msg, 'erro');
    restaurarBotao();
  }

  function restaurarBotao() {
    refs.btn.disabled = false;
    refs.btn.querySelector('.btn__text').textContent = 'Atualizar minha localização';
    refs.btn.querySelector('.btn__icon').textContent = '📍';
  }

  /* -------------------------------------------------------
     5. DRAG & DROP (HTML5) — papel → lixeira
     ------------------------------------------------------- */
  function configurarDragAndDropNativo() {
    refs.papel.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', 'papel'); // necessário no Firefox
      e.dataTransfer.effectAllowed = 'move';
      refs.papel.classList.add('is-dragging');
      refs.lixeira.classList.add('is-ready');
    });

    refs.papel.addEventListener('dragend', () => {
      refs.papel.classList.remove('is-dragging');
      refs.lixeira.classList.remove('is-ready', 'is-over');
    });

    refs.lixeira.addEventListener('dragover', (e) => {
      e.preventDefault(); // permite o drop
      e.dataTransfer.dropEffect = 'move';
      refs.lixeira.classList.add('is-over');
    });

    refs.lixeira.addEventListener('dragleave', () => {
      refs.lixeira.classList.remove('is-over');
    });

    refs.lixeira.addEventListener('drop', (e) => {
      e.preventDefault();
      refs.lixeira.classList.remove('is-over', 'is-ready');
      apagarTudo();
    });
  }

  /* -------------------------------------------------------
     6. FALLBACK TOUCH (celular / tablet)
     ------------------------------------------------------- */
  function seSobrepoem(a, b) {
    const r1 = a.getBoundingClientRect();
    const r2 = b.getBoundingClientRect();
    return !(
      r1.right < r2.left ||
      r1.left > r2.right ||
      r1.bottom < r2.top ||
      r1.top > r2.bottom
    );
  }

  function configurarDragTouch() {
    let arrastando = false;
    const offset = { x: 0, y: 0 };

    refs.papel.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      const r = refs.papel.getBoundingClientRect();

      offset.x = t.clientX - r.left;
      offset.y = t.clientY - r.top;
      arrastando = true;

      Object.assign(refs.papel.style, {
        position: 'fixed',
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        zIndex: '999'
      });

      refs.papel.classList.add('is-touch-dragging');
      refs.lixeira.classList.add('is-ready');
    }, { passive: true });

    refs.papel.addEventListener('touchmove', (e) => {
      if (!arrastando) return;
      e.preventDefault();

      const t = e.touches[0];
      refs.papel.style.left = `${t.clientX - offset.x}px`;
      refs.papel.style.top  = `${t.clientY - offset.y}px`;

      refs.lixeira.classList.toggle('is-over', seSobrepoem(refs.papel, refs.lixeira));
    }, { passive: false });

    refs.papel.addEventListener('touchend', () => {
      if (!arrastando) return;
      arrastando = false;

      const acertou = seSobrepoem(refs.papel, refs.lixeira);

      limparEstiloTouch();
      refs.papel.classList.remove('is-touch-dragging');
      refs.lixeira.classList.remove('is-ready', 'is-over');

      if (acertou) apagarTudo();
    });
  }

  function limparEstiloTouch() {
    Object.assign(refs.papel.style, {
      position: '',
      left: '',
      top: '',
      width: '',
      height: '',
      zIndex: ''
    });
  }

  /* -------------------------------------------------------
     7. AÇÃO PRINCIPAL — apagar tudo
     ------------------------------------------------------- */
  function apagarTudo() {
    limparLocalizacao();          // 🔥 limpa o localStorage

    refs.papel.classList.add('is-eaten');
    refs.lixeira.classList.add('is-swallowing');

    toast('🗑️ Dados apagados do localStorage!');
    definirStatus('Nenhum dado salvo');

    setTimeout(() => {
      resetarPainel();
      refs.papel.classList.add('is-hidden');
      refs.lixeira.classList.remove('is-swallowing');
      refs.restaurar.classList.remove('is-hidden');
    }, 560);
  }

  /* -------------------------------------------------------
     8. INICIALIZAÇÃO
     ------------------------------------------------------- */
  function init() {
    refs.btn.addEventListener('click', capturarLocalizacao);

    refs.restaurar.addEventListener('click', () => {
      refs.papel.classList.remove('is-eaten', 'is-hidden');
      refs.restaurar.classList.add('is-hidden');
      toast('📄 Papel de volta! Capture a localização novamente 😉');
    });

    configurarDragAndDropNativo();
    configurarDragTouch();

    // Mostra imediatamente o que estava guardado no localStorage
    const salva = lerSalva();
    if (salva) {
      renderCoords(salva, false);
      mostrarBanner(salva);
      atualizarMapa(salva);
      definirStatus('Mostrando dados salvos');
    } else {
      definirStatus('Nenhum dado salvo ainda');
    }

    // Pede a localização atual logo depois de carregar
    setTimeout(capturarLocalizacao, 700);
  }

  document.addEventListener('DOMContentLoaded', init);
})();