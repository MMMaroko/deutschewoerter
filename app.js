/* DE Vocab Trainer — application logic. Populates window.App methods. */
(function(){
  function diag(msg){
    var d = document.getElementById('diag');
    if(d) d.textContent = msg;
  }
  function $(id){ return document.getElementById(id); }
  function escapeText(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }
  function shuffle(a){
    a = a.slice();
    for(var i=a.length-1; i>0; i--){
      var j = Math.floor(Math.random()*(i+1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  var GENDER_ARTICLE = {m:'der', f:'die', n:'das', p:'die'};
  var GENDER_CLASS   = {m:'gen-m', f:'gen-f', n:'gen-n', p:'gen-p'};
  var state = { pool: [], used: [], current: null, revealed: false, direction: 'de', level: 'A2' };

  // ----- "All levels" view: merge logic --------------------------------
  // When the user picks the "All" level, the per-level VOCAB objects are
  // combined into a single view. Some noun categories that mean the same
  // thing across levels are unified; the "Separable Verbs" category is
  // dropped and each separable verb is redistributed into the
  // Communication / Mind / Movement / Work category that fits its meaning.

  // Source noun category → target merged category. Categories not listed
  // are kept under their original name.
  var NOUN_CAT_REMAP = {
    'Body':                'Body & Health',
    'Body & Medicine':     'Body & Health',
    'Health':              'Body & Health',
    'Emotions & Feelings': 'Emotions',
    'Family':              'People & Family',
    'People & Society':    'People & Family',
    'Food':                'Food & Dining',
    'Household':           'House & Home',
    'Economy & Work':      'Work & School'
  };

  // Separable-verb → semantic category lookup, keyed by the exact `de` field
  // including any ", sich" suffix. Verbs not listed fall through to
  // "Work & Daily Actions" as the default bucket.
  var SEP_VERB_CATEGORY = {
    // ---- Movement & Physical (motion through space, physical actions) ----
    'ab·biegen':'Movement & Physical','ab·fahren':'Movement & Physical',
    'ab·fliegen':'Movement & Physical','an·fassen':'Movement & Physical',
    'an·kommen':'Movement & Physical','aus·atmen':'Movement & Physical',
    'aus·gehen':'Movement & Physical','aus·steigen':'Movement & Physical',
    'aus·wandern':'Movement & Physical','ein·atmen':'Movement & Physical',
    'ein·biegen':'Movement & Physical','ein·brechen':'Movement & Physical',
    'ein·fahren':'Movement & Physical','ein·steigen':'Movement & Physical',
    'fest·halten (sich)':'Movement & Physical','fest·stecken':'Movement & Physical',
    'hin·fallen':'Movement & Physical','hoch·heben':'Movement & Physical',
    'mit·nehmen':'Movement & Physical','raus·bringen':'Movement & Physical',
    'raus·fallen':'Movement & Physical','runter·bringen':'Movement & Physical',
    'runter·kommen':'Movement & Physical','um·drehen':'Movement & Physical',
    'um·steigen':'Movement & Physical','um·ziehen':'Movement & Physical',
    'weg·fahren':'Movement & Physical','weg·werfen':'Movement & Physical',
    'zurück·bleiben':'Movement & Physical','zurück·bringen':'Movement & Physical',
    'auf·stehen':'Movement & Physical','auf·wachen':'Movement & Physical',
    'ein·schlafen':'Movement & Physical','aus·ruhen, sich':'Movement & Physical',
    // ---- Communication & Social ----
    'ab·lehnen':'Communication & Social','ab·sagen':'Communication & Social',
    'ab·weisen':'Communication & Social','an·bieten':'Communication & Social',
    'an·nehmen':'Communication & Social','an·rufen':'Communication & Social',
    'an·melden':'Communication & Social','auf·treten':'Communication & Social',
    'ein·laden':'Communication & Social','fehl·leiten':'Communication & Social',
    'vor·schlagen':'Communication & Social','vor·stellen':'Communication & Social',
    'vor·tragen':'Communication & Social','zu·geben':'Communication & Social',
    'zurück·rufen':'Communication & Social',
    // ---- Mind & Perception ----
    'an·schauen':'Mind & Perception','auf·passen':'Mind & Perception',
    'aus·schließen':'Mind & Perception','aus·sehen':'Mind & Perception',
    'aus·suchen':'Mind & Perception','aus·wählen':'Mind & Perception',
    'fern·sehen':'Mind & Perception','heraus·finden':'Mind & Perception',
    'kennen·lernen':'Mind & Perception','nach·denken':'Mind & Perception',
    'vor·haben':'Mind & Perception','wieder·holen':'Mind & Perception',
    'wohl·fühlen, sich':'Mind & Perception','zusammen·passen':'Mind & Perception'
    // (All others fall through to "Work & Daily Actions" as default.)
  };

  function sepVerbCategory(v){
    // Ambiguous: an·ziehen means both "put on (clothes)" → Work and
    // "pull/attract" → Movement, depending on entry. Disambiguate via EN.
    if (v.de === 'an·ziehen' && /pull/i.test(v.en || '')) return 'Movement & Physical';
    return SEP_VERB_CATEGORY[v.de] || 'Work & Daily Actions';
  }

  function buildAllLevel(){
    var all = { nouns:{}, verbs:{}, adjectives:[], adverbs:[] };
    var levels = ['A1','A2','B1'];
    for (var li=0; li<levels.length; li++){
      var lvl = window.VOCAB_LEVELS[levels[li]];
      if (!lvl) continue;
      var cat, arr, i, target;
      // Nouns — merge similar categories.
      for (cat in lvl.nouns) {
        if (!lvl.nouns.hasOwnProperty(cat)) continue;
        target = NOUN_CAT_REMAP[cat] || cat;
        if (!all.nouns[target]) all.nouns[target] = [];
        arr = lvl.nouns[cat];
        for (i=0; i<arr.length; i++) all.nouns[target].push(arr[i]);
      }
      // Verbs — keep verb categories aligned; redistribute Separable Verbs.
      for (cat in lvl.verbs) {
        if (!lvl.verbs.hasOwnProperty(cat)) continue;
        arr = lvl.verbs[cat];
        if (cat === 'Separable Verbs') {
          for (i=0; i<arr.length; i++) {
            target = sepVerbCategory(arr[i]);
            if (!all.verbs[target]) all.verbs[target] = [];
            all.verbs[target].push(arr[i]);
          }
        } else {
          if (!all.verbs[cat]) all.verbs[cat] = [];
          for (i=0; i<arr.length; i++) all.verbs[cat].push(arr[i]);
        }
      }
      // Adjectives + adverbs are flat lists — concat.
      for (i=0; i<lvl.adjectives.length; i++) all.adjectives.push(lvl.adjectives[i]);
      for (i=0; i<lvl.adverbs.length;   i++) all.adverbs.push(lvl.adverbs[i]);
    }
    return all;
  }

  function loadCategoryOptions(){
    var t = $('type').value;
    $('catWrap').style.display = (t==='noun' || t==='verb') ? '' : 'none';
    var sel = $('cat'); sel.innerHTML = '';
    var src = (t==='noun') ? window.VOCAB.nouns : (t==='verb') ? window.VOCAB.verbs : null;
    if(!src) return;
    for(var k in src){
      if(!src.hasOwnProperty(k)) continue;
      var o = document.createElement('option');
      o.value = k; o.textContent = k + ' (' + src[k].length + ')';
      sel.appendChild(o);
    }
  }
  function copy(w, kind, cat){
    var o = {}; for(var p in w) if(w.hasOwnProperty(p)) o[p] = w[p];
    o._kind = kind; if(cat) o._cat = cat; return o;
  }
  function buildPool(){
    var t = $('type').value, words = [], k, i, arr;
    if(t==='noun'){
      arr = window.VOCAB.nouns[$('cat').value] || [];
      for(i=0;i<arr.length;i++) words.push(copy(arr[i],'noun'));
    } else if(t==='all-noun'){
      for(k in window.VOCAB.nouns) if(window.VOCAB.nouns.hasOwnProperty(k))
        for(i=0;i<window.VOCAB.nouns[k].length;i++) words.push(copy(window.VOCAB.nouns[k][i],'noun',k));
    } else if(t==='verb'){
      arr = window.VOCAB.verbs[$('cat').value] || [];
      for(i=0;i<arr.length;i++) words.push(copy(arr[i],'verb'));
    } else if(t==='all-verb'){
      for(k in window.VOCAB.verbs) if(window.VOCAB.verbs.hasOwnProperty(k))
        for(i=0;i<window.VOCAB.verbs[k].length;i++) words.push(copy(window.VOCAB.verbs[k][i],'verb',k));
    } else if(t==='adj'){
      for(i=0;i<window.VOCAB.adjectives.length;i++) words.push(copy(window.VOCAB.adjectives[i],'adj'));
    } else if(t==='adv'){
      for(i=0;i<window.VOCAB.adverbs.length;i++) words.push(copy(window.VOCAB.adverbs[i],'adv'));
    }
    state.pool = shuffle(words); state.used = [];
  }
  function pickNext(){
    if(state.pool.length === 0){
      if(state.used.length === 0){ state.current = null; return; }
      state.pool = shuffle(state.used); state.used = [];
    }
    state.current = state.pool.pop();
    state.used.push(state.current);
    state.revealed = false;
  }
  function pluralSuffix(pl){
    if(!pl) return null;
    var s = String(pl).replace(/^-/, '').replace(/^\s+|\s+$/g,'');
    if(!s || s === '-') return null;
    return s;
  }
  function deHTML(w){
    if(w._kind === 'noun'){
      var art = GENDER_ARTICLE[w.g] || '';
      var cls = GENDER_CLASS[w.g] || '';
      var plPart = '';
      // Plural marker conventions (dictionary-style):
      //   pl:"—"   → "der Lärm —"      (no plural exists / uncountable)
      //   pl:"="   → "das Zeichen -"   (plural identical to singular)
      //   pl:"-en" → "die Wahrheit -en" (countable, distinct ending)
      //   pl:"-"   → no marker          (used for professions/countries)
      if(w.pl === '—' || w.pl === '–'){
        plPart = ' —';
      } else if(w.pl === '='){
        plPart = ' -';
      } else {
        var suf = pluralSuffix(w.pl);
        if(suf) plPart = ' -' + escapeText(suf);
      }
      return '<span class="' + cls + '">' + (art ? art + ' ' : '') + escapeText(w.de) + plPart + '</span>';
    }
    return escapeText(w.de);
  }
  function viewH(){
    return (window.visualViewport && window.visualViewport.height) || window.innerHeight || 600;
  }
  // Builds the dual-divider SK/EN block used both as the prompt and as
  // the revealed answer when the German side is active/hidden.
  function skEnBlock(w){
    return '<div class="divider-with-tag"><span class="tag">SK</span></div>' +
           '<div class="lang-text">' + escapeText(w.sk) + '</div>' +
           '<div class="divider-with-tag"><span class="tag">EN</span></div>' +
           '<div class="lang-text">' + escapeText(w.en) + '</div>';
  }

  function srcNoteText(w){
    if(w && w.src === 'kb') return 'This word was included from Kursbuch wordlist and translated by AI';
    return '';
  }
  function render(){
    var labelA=$('labelA'), wordA=$('wordA'), subA=$('subA'), noteA=$('noteA');
    var cardB=$('cardB'), wordB=$('wordB'), subB=$('subB'), metaB=$('metaB');
    if(!state.current){
      labelA.textContent='—'; wordA.textContent='No words'; subA.textContent='';
      wordB.textContent='—'; subB.textContent=''; metaB.textContent='';
      if(noteA) noteA.textContent='';
      return;
    }
    var w = state.current;
    if(noteA) noteA.textContent = srcNoteText(w);
    if(state.direction === 'de'){
      labelA.textContent = 'GERMAN';
      wordA.innerHTML = deHTML(w);
      if(w._kind === 'verb' && w.p2){ subA.className = 'sub big'; subA.textContent = w.p2; }
      else { subA.className = 'sub'; subA.textContent = ''; }
    } else {
      labelA.textContent = '';
      wordA.innerHTML = skEnBlock(w);
      subA.className = 'sub'; subA.textContent = '';
    }
    var lblB = cardB.querySelector('.label');
    if(lblB) lblB.textContent = 'ANSWER';
    // Always populate cardB with the real answer — the .tap class merely
    // shows a CSS overlay covering it. This way the card has its proper
    // final height from the start and doesn't grow when revealed.
    if(state.direction === 'de'){
      wordB.innerHTML = skEnBlock(w);
      subB.className = 'sub'; subB.textContent = '';
      metaB.textContent = '';
    } else {
      wordB.innerHTML = deHTML(w);
      if(w._kind === 'verb' && w.p2){ subB.className = 'sub big'; subB.textContent = w.p2; }
      else { subB.className = 'sub'; subB.textContent = ''; }
      metaB.textContent = '';
    }
    if(state.revealed) cardB.classList.remove('tap');
    else cardB.classList.add('tap');
    var total = state.pool.length + state.used.length;
    $('stats').textContent = state.used.length + ' / ' + total;
  }

  // populate App methods
  if(!window.App){ window.App = {}; }

  window.App.pickLevel = function(btn){
    try {
      var lvl = (btn && btn.dataset && btn.dataset.l) || 'A2';
      if (lvl === 'All') {
        window.VOCAB = buildAllLevel();
      } else {
        if(!window.VOCAB_LEVELS[lvl]){ diag('unknown level: ' + lvl); return; }
        window.VOCAB = window.VOCAB_LEVELS[lvl];
      }
      state.level = lvl;
      var seg = $('lvl');
      var kids = seg.getElementsByTagName('button');
      for(var i=0;i<kids.length;i++) kids[i].classList.remove('on');
      btn.classList.add('on');
      loadCategoryOptions();
      var nc=0, vc=0, k;
      for(k in window.VOCAB.nouns) if(window.VOCAB.nouns.hasOwnProperty(k)) nc++;
      for(k in window.VOCAB.verbs) if(window.VOCAB.verbs.hasOwnProperty(k)) vc++;
      diag('level → ' + lvl + ' · ' + nc + ' noun cats, ' + vc + ' verb cats');
    } catch(e){ diag('ERR pickLevel: ' + e.message); }
  };

  window.App.changeType = function(){
    try { diag('type → ' + $('type').value); loadCategoryOptions(); }
    catch(e){ diag('ERR changeType: ' + e.message); }
  };
  window.App.pickDir = function(btn){
    try {
      diag('dir → ' + (btn && btn.dataset ? btn.dataset.v : '?'));
      var seg = $('dir');
      var kids = seg.getElementsByTagName('button');
      for(var i=0;i<kids.length;i++) kids[i].classList.remove('on');
      btn.classList.add('on');
      state.direction = btn.dataset.v;
    } catch(e){ diag('ERR pickDir: ' + e.message); }
  };
  window.App.start = function(){
    try {
      diag('start tapped');
      buildPool();
      if(state.pool.length === 0){ diag('empty pool — pick a category'); return; }
      pickNext();
      $('setup').style.display = 'none';
      $('learn').style.display = 'flex';
      $('footer').style.display = 'flex';
      render();
      diag('learning ' + state.pool.length + ' words, dir=' + state.direction);
    } catch(e){ diag('ERR start: ' + e.message); }
  };
  window.App.back = function(){
    try {
      $('setup').style.display = '';
      $('learn').style.display = 'none';
      $('review').style.display = 'none';
      $('footer').style.display = 'none';
      $('stats').textContent = '0 / 0';
      diag('back to setup');
    } catch(e){ diag('ERR back: ' + e.message); }
  };

  // Review mode: display all entries in the chosen pool as DE/SK/EN rows,
  // grouped by category when "All ..." is selected. Words listed in their
  // original (non-shuffled) order, so it works as a reading reference.
  function getReviewGroups(){
    var t = $('type').value;
    var kind = (t.indexOf('verb')>=0) ? 'verb'
              : (t.indexOf('noun')>=0) ? 'noun'
              : (t === 'adj') ? 'adj' : 'adv';
    var groups = [];
    if(t === 'noun'){
      var c = $('cat').value;
      groups.push({name:c, words:window.VOCAB.nouns[c]||[]});
    } else if(t === 'all-noun'){
      for(var k1 in window.VOCAB.nouns) if(window.VOCAB.nouns.hasOwnProperty(k1))
        groups.push({name:k1, words:window.VOCAB.nouns[k1]});
    } else if(t === 'verb'){
      var cv = $('cat').value;
      groups.push({name:cv, words:window.VOCAB.verbs[cv]||[]});
    } else if(t === 'all-verb'){
      for(var k2 in window.VOCAB.verbs) if(window.VOCAB.verbs.hasOwnProperty(k2))
        groups.push({name:k2, words:window.VOCAB.verbs[k2]});
    } else if(t === 'adj'){
      groups.push({name:'Adjectives', words:window.VOCAB.adjectives});
    } else if(t === 'adv'){
      groups.push({name:'Adverbs', words:window.VOCAB.adverbs});
    }
    return {kind:kind, groups:groups};
  }

  function buildReviewHTML(data){
    var html = '', total = 0;
    for(var g=0; g<data.groups.length; g++){
      var grp = data.groups[g];
      total += grp.words.length;
      html += '<div class="review-cat-header">' + escapeText(grp.name) + ' · ' + grp.words.length + '</div>';
      for(var i=0; i<grp.words.length; i++){
        var raw = grp.words[i];
        var w = copy(raw, data.kind);
        var deCol;
        if(data.kind === 'noun'){
          deCol = deHTML(w);
        } else if(data.kind === 'verb'){
          deCol = escapeText(w.de);
          if(w.p2) deCol += '<span class="p2">' + escapeText(w.p2) + '</span>';
        } else {
          deCol = escapeText(w.de);
        }
        if(w.src === 'kb') deCol += '<span class="src-marker" title="From Kursbuch wordlist, AI-translated">KB</span>';
        html += '<div class="review-row">'
              +   '<div class="de">' + deCol + '</div>'
              +   '<div class="sk">' + escapeText(w.sk) + '</div>'
              +   '<div class="en">' + escapeText(w.en) + '</div>'
              + '</div>';
      }
    }
    return {html:html, total:total};
  }

  window.App.review = function(){
    try {
      var data = getReviewGroups();
      var built = buildReviewHTML(data);
      if(built.total === 0){ diag('empty list — pick a category'); return; }
      $('reviewList').innerHTML = built.html;
      var typeName = $('type').options[$('type').selectedIndex].text;
      $('reviewTitle').textContent = typeName + ' · ' + built.total + ' entries';
      $('setup').style.display = 'none';
      $('learn').style.display = 'none';
      $('footer').style.display = 'none';
      $('review').style.display = 'block';
      $('stats').textContent = built.total + ' entries';
      diag('review · ' + built.total + ' entries');
    } catch(e){ diag('ERR review: ' + e.message); }
  };
  window.App.reveal = function(){
    try { if(!state.current) return; state.revealed = true; render(); diag('revealed'); }
    catch(e){ diag('ERR reveal: ' + e.message); }
  };
  window.App.next = function(){
    try { pickNext(); render(); diag('next'); }
    catch(e){ diag('ERR next: ' + e.message); }
  };
  window.App._ready = true;

  // ----- Event bindings -----
  // CSP-friendly: no inline onclick/onchange in HTML — every interactive
  // element gets its handler attached here. The synthesised 'click' event
  // works for both mouse and touch on all modern browsers.
  function bind(el, ev, fn){ if(el) el.addEventListener(ev, fn); }

  bind($('start'),     'click',  function(){ App.start(); });
  bind($('reviewBtn'), 'click',  function(){ App.review(); });
  // Tap behaviour: first tap reveals the hidden side, second tap (when
  // already revealed) advances to the next word.
  bind($('cardB'), 'click', function(){
    if (state.revealed) App.next();
    else App.reveal();
  });
  bind($('type'),      'change', function(){ App.changeType(); });

  var _lvlBtns = $('lvl').getElementsByTagName('button');
  for(var _li=0; _li<_lvlBtns.length; _li++){
    (function(b){ bind(b, 'click', function(){ App.pickLevel(b); }); })(_lvlBtns[_li]);
  }
  var _dirBtns = $('dir').getElementsByTagName('button');
  for(var _di=0; _di<_dirBtns.length; _di++){
    (function(b){ bind(b, 'click', function(){ App.pickDir(b); }); })(_dirBtns[_di]);
  }
  var _footerBtns = $('footer').getElementsByTagName('button');
  if(_footerBtns[0]) bind(_footerBtns[0], 'click', function(){ App.back(); });
  if(_footerBtns[1]) bind(_footerBtns[1], 'click', function(){ App.reveal(); });
  if(_footerBtns[2]) bind(_footerBtns[2], 'click', function(){ App.next(); });
  var _reviewBackBtn = $('review').getElementsByTagName('button')[0];
  if(_reviewBackBtn) bind(_reviewBackBtn, 'click', function(){ App.back(); });

  // Force the body to match the *visible* viewport rather than relying on
  // CSS 100svh — older iPad Safari falls back to 100vh, which is the
  // toolbar-hidden viewport, pushing the footer below the visible area.
  // We override with the real visualViewport height instead.
  function fitBody(){
    var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    if (h) document.body.style.height = h + 'px';
  }
  fitBody();
  window.addEventListener('resize', fitBody);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitBody);
  window.addEventListener('orientationchange', fitBody);
  document.addEventListener('keydown', function(e){
    if($('learn').style.display === 'none') return;
    if(e.code === 'Space'){ e.preventDefault(); state.revealed ? window.App.next() : window.App.reveal(); }
    else if(e.code === 'ArrowRight') window.App.next();
    else if(e.code === 'Enter') state.revealed ? window.App.next() : window.App.reveal();
  });

  // init
  try {
    if(typeof window.VOCAB === 'undefined'){ diag('ERR: VOCAB undefined'); return; }
    loadCategoryOptions();
    var nc=0, vc=0, k;
    for(k in window.VOCAB.nouns) if(window.VOCAB.nouns.hasOwnProperty(k)) nc++;
    for(k in window.VOCAB.verbs) if(window.VOCAB.verbs.hasOwnProperty(k)) vc++;
    var ver = window.VOCAB_VERSION || '?';
    var dbEl = $('dbVersion'); if(dbEl) dbEl.textContent = 'Database version: ' + ver;
    diag('ready · DB ' + ver + ' · level ' + state.level + ' · ' + nc + ' noun cats, ' + vc + ' verb cats');
  } catch(e){
    diag('ERR init: ' + e.message);
  }
})();

/* Service worker registration — runs after the IIFE has set up the app.
   Skipped on file:// origins (where SWs aren't allowed). When a new SW
   takes control, force a one-time reload so the page picks up updated
   data/code immediately after a deploy. */
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function () {
      var refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }).catch(function () { /* SW registration is optional */ });
  });
}
