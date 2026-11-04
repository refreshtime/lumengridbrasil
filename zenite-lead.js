/* Zenite — captura de atribuição + envio de lead em paralelo */
(function(){
  var ENDPOINT = "https://ratwnpugnptmfplezgve.supabase.co/functions/v1/make-server-ace36900/ingest/form/af12470b3e33d0fcb202b0d5da9d99fe918d041d9baeab49";
  var KEYS = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content",
              "utm_id","gclid","fbclid","gad_campaignid","campaignid"];
  var TTL = 90 * 864e5; // 90 dias em ms

  // stub: o Pulse carrega async e reproduz esta fila quando chega
  window.zenite = window.zenite || function(){ (window.zenite.q = window.zenite.q || []).push(arguments); };

  window.captureAttribution = function() {
    try {
      var qs = new URLSearchParams(location.search), f = {};
      KEYS.forEach(function(k){ var v = qs.get(k); if(v) f[k] = v.slice(0,200); });
      if(Object.keys(f).length) localStorage.setItem("zn_attr", JSON.stringify(Object.assign({ at: Date.now() }, f)));
    } catch(e) {}
  };

  function readAttribution() {
    try {
      var o = JSON.parse(localStorage.getItem("zn_attr") || "null");
      if(!o || Date.now() - o.at > TTL) return {};
      var r = Object.assign({}, o); delete r.at; return r;
    } catch(e) { return {}; }
  }

  window.sendLeadToZenite = function(d) {
    try {
      window.zenite("event", "Lead", { form: "contato" },
        { email: d.email, phone: d.phone, first_name: d.name ? d.name.split(" ")[0] : undefined });
      fetch(ENDPOINT, {
        method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({}, d, readAttribution(), { _source_url: location.href }))
      }).catch(function(){});
    } catch(e) {}
  };

})();
