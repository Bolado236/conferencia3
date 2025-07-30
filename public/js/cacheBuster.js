(function () {
  const timestamp = Date.now();
  const origin = location.origin;

  // Atualiza apenas arquivos CSS locais
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute('href');
    if (href.startsWith(origin) || href.startsWith('.') || !href.includes('http')) {
      const cleanHref = href.split('?')[0];
      link.setAttribute('href', cleanHref + '?v=' + timestamp);
    }
  });

  // Atualiza apenas arquivos JS locais, exceto este próprio script
  document.querySelectorAll('script[src]').forEach(script => {
    const src = script.getAttribute('src');
    if (
      (src.startsWith(origin) || src.startsWith('.') || !src.includes('http')) &&
      !src.includes('cacheBuster.js')
    ) {
      const cleanSrc = src.split('?')[0];
      script.setAttribute('src', cleanSrc + '?v=' + timestamp);
    }
  });
})();
