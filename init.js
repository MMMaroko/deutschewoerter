/* Earliest-running script. Installs a global error catcher so any syntax
   or runtime errors in data.js / app.js (loaded after this) are surfaced
   in the on-screen #diag bar instead of failing silently. Loaded with
   <script src="init.js"></script> in <head>. */
window.addEventListener('error', function(e){
  var d = document.getElementById('diag');
  var msg = (e && (e.message || (e.error && e.error.message))) || 'unknown';
  if(e && e.filename) msg += ' @ line ' + (e.lineno || '?');
  if(d) d.textContent = 'ERR: ' + msg;
}, true);
