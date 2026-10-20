/**
 * Redirige las URLs de CDN que usa dc-runtime (support.js) hacia copias en el mismo origen.
 * Muchos firewalls corporativos (Palo Alto, Zscaler, etc.) bloquean categorías "CDN" o dominios
 * como unpkg.com aunque el sitio sea legítimo. Debe cargarse antes de support.js.
 */
(function () {
  var LOCAL = {
    "https://unpkg.com/react@18.3.1/umd/react.production.min.js": "/vendor/react.production.min.js",
    "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js":
      "/vendor/react-dom.production.min.js",
  };
  var base = window.__resources;
  window.__resources = typeof base === "object" && base !== null ? base : {};
  for (var url in LOCAL) {
    if (Object.prototype.hasOwnProperty.call(LOCAL, url)) {
      window.__resources[url] = LOCAL[url];
    }
  }
})();
