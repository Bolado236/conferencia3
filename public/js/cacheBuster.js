/**
 * Script para forçar atualização dos arquivos JS e CSS adicionando timestamp nas URLs
 */

(function() {
  const timestamp = Date.now();
  // Atualiza links CSS
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute('href').split('?')[0];
    link.setAttribute('href', href + '?v=' + timestamp);
  });
  // Atualiza scripts
  document.querySelectorAll('script[src]').forEach(script => {
    const src = script.getAttribute('src').split('?')[0];
    script.setAttribute('src', src + '?v=' + timestamp);
  });
})();
