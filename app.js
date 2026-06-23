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
  var state = { pool: [], used: [], current: null, revealed: false, direction: 'de', level: 'B1' };

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
    'wohl·fühlen, sich':'Mind & Perception','zusammen·passen':'Mind & Perception',
    // ---- B1 batch 2 separable verbs ----
    'los·fahren':'Movement & Physical','los·gehen':'Movement & Physical',
    'weiter·gehen':'Movement & Physical','weiter·machen':'Work & Daily Actions',
    'durch·setzen, sich':'Communication & Social',
    // ---- B1 batch 3 separable verbs ----
    'zurecht·kommen':'Work & Daily Actions','vor·legen':'Work & Daily Actions',
    // ---- B1 batch 4 separable verbs ----
    'durch·fallen':'Work & Daily Actions',
    // ---- B1 batch 5 separable verbs ----
    'auf·regen, sich':'Mind & Perception','ab·hängen':'Mind & Perception',
    // ---- B1 batch 6 separable verbs ----
    'durch·stellen':'Communication & Social','aus·richten':'Communication & Social',
    'ein·leiten':'Work & Daily Actions',
    // ---- B1 batch 7 separable verbs ----
    'an·zeigen':'Communication & Social',
    // ---- B1 batch 8 separable verbs (Bad Banks xtra) ----
    'ab·schließen':'Work & Daily Actions','aus·halten':'Mind & Perception',
    'hin·kriegen':'Work & Daily Actions',
    // ---- B1 batch 9 separable verbs ----
    'auf·fordern':'Communication & Social'
    // (All others fall through to "Work & Daily Actions" as default.)
  };

  // Adj/adverb → thematic category for the "All levels" descriptor view.
  // Covers every adj and adv entry across A1, A2, B1.
  var DESC_CAT = {
    // Character & Personality
    'nett':'Character & Personality','ehrlich':'Character & Personality',
    'fleißig':'Character & Personality','flink':'Character & Personality',
    'gründlich':'Character & Personality','heiter':'Character & Personality',
    'hilfsbereit':'Character & Personality','höflich':'Character & Personality',
    'klug':'Character & Personality','lieb':'Character & Personality',
    'mutig':'Character & Personality','neugierig':'Character & Personality',
    'schlau':'Character & Personality','selbstbewusst':'Character & Personality',
    'sparsam':'Character & Personality','treu':'Character & Personality',
    'vernünftig':'Character & Personality','vorsichtig':'Character & Personality',
    'zuverlässig':'Character & Personality','bequem':'Character & Personality',
    'dumm':'Character & Personality','faul':'Character & Personality',
    'frech':'Character & Personality','launisch':'Character & Personality',
    'lebhaft':'Character & Personality','ruhelos':'Character & Personality',
    'stur':'Character & Personality','unruhig':'Character & Personality',
    'unsicher':'Character & Personality','ungeduldig':'Character & Personality',
    'verträumt':'Character & Personality','selbstständig':'Character & Personality',
    'unhöflich':'Character & Personality','eingebildet':'Character & Personality',
    'blöd':'Character & Personality','heimlich':'Character & Personality',
    'ängstlich':'Character & Personality','ernst':'Character & Personality',
    'aufmerksam':'Character & Personality','großzügig':'Character & Personality',
    'streng':'Character & Personality','verantwortlich':'Character & Personality',
    'geduldig':'Character & Personality','gehorsam':'Character & Personality',
    'locker':'Character & Personality',
    // Emotions & Mood
    'lustig':'Emotions & Mood','traurig':'Emotions & Mood',
    'begeistert':'Emotions & Mood','zufrieden':'Emotions & Mood',
    'dankbar':'Emotions & Mood','überrascht':'Emotions & Mood',
    'verwirrt':'Emotions & Mood','peinlich':'Emotions & Mood',
    'enttäuscht':'Emotions & Mood','entsetzt':'Emotions & Mood',
    'wahnsinnig':'Emotions & Mood','genervt':'Emotions & Mood',
    'betroffen':'Emotions & Mood',
    'wütend':'Emotions & Mood','stolz':'Emotions & Mood',
    'erschöpft':'Emotions & Mood','verrückt':'Emotions & Mood',
    // Appearance & Physical
    'groß':'Appearance & Physical','klein':'Appearance & Physical',
    'hübsch':'Appearance & Physical','schön':'Appearance & Physical',
    'hässlich':'Appearance & Physical','dünn':'Appearance & Physical',
    'dick':'Appearance & Physical','eng':'Appearance & Physical',
    'weit':'Appearance & Physical','glatt':'Appearance & Physical',
    'wellig':'Appearance & Physical','lockig':'Appearance & Physical',
    'gestreift':'Appearance & Physical','gepunktet':'Appearance & Physical',
    'kariert':'Appearance & Physical','hell':'Appearance & Physical',
    'dunkel':'Appearance & Physical','bunt':'Appearance & Physical',
    'lautstark':'Appearance & Physical','leise':'Appearance & Physical',
    'still':'Appearance & Physical','trocken':'Appearance & Physical',
    'nass':'Appearance & Physical','feucht':'Appearance & Physical',
    'kühl':'Appearance & Physical','bedeckt':'Appearance & Physical',
    'roh':'Appearance & Physical','weich':'Appearance & Physical',
    'breit':'Appearance & Physical','schmal':'Appearance & Physical',
    'versalzen':'Appearance & Physical','verzuckert':'Appearance & Physical',
    'waagerecht':'Appearance & Physical','senkrecht':'Appearance & Physical',
    'geschnitten':'Appearance & Physical',
    'salzig':'Appearance & Physical','süß':'Appearance & Physical',
    'dicht':'Appearance & Physical','knusprig':'Appearance & Physical',
    'sauer':'Appearance & Physical','bitter':'Appearance & Physical',
    'scharf':'Appearance & Physical',
    'schnell':'Appearance & Physical','langsam':'Appearance & Physical',
    'hoch':'Appearance & Physical','niedrig':'Appearance & Physical',
    // Quality & Evaluation
    'gut':'Quality & Evaluation','schlecht':'Quality & Evaluation',
    'leicht':'Quality & Evaluation','schwer':'Quality & Evaluation',
    'gefährlich':'Quality & Evaluation','giftig':'Quality & Evaluation',
    'sicher':'Quality & Evaluation','billig':'Quality & Evaluation',
    'teuer':'Quality & Evaluation','wunderbar':'Quality & Evaluation',
    'unglaublich':'Quality & Evaluation','toll':'Quality & Evaluation',
    'gemütlich':'Quality & Evaluation','günstig':'Quality & Evaluation',
    'gemeinsam':'Quality & Evaluation','verschieden':'Quality & Evaluation',
    'undeutlich':'Quality & Evaluation','wichtig':'Quality & Evaluation',
    'nötig':'Quality & Evaluation','notwendig':'Quality & Evaluation',
    'dringend':'Quality & Evaluation','eilig':'Quality & Evaluation',
    'seltsam':'Quality & Evaluation','schrecklich':'Quality & Evaluation',
    'furchtbar':'Quality & Evaluation','langweilig':'Quality & Evaluation',
    'spitze':'Quality & Evaluation','anstrengend':'Quality & Evaluation',
    'mühsam':'Quality & Evaluation','erfolgreich':'Quality & Evaluation',
    'bekannt':'Quality & Evaluation','berühmt':'Quality & Evaluation',
    'großartig':'Quality & Evaluation','gruselig':'Quality & Evaluation',
    'unerhört':'Quality & Evaluation','echt':'Quality & Evaluation',
    'spannend':'Quality & Evaluation','unsichtbar':'Quality & Evaluation',
    'unnötig':'Quality & Evaluation','preiswert':'Quality & Evaluation',
    'sinnvoll':'Quality & Evaluation','vielseitig':'Quality & Evaluation',
    'nachhaltig':'Quality & Evaluation','vielfältig':'Quality & Evaluation',
    'bezahlbar':'Quality & Evaluation','hochwertig':'Quality & Evaluation',
    'abwechslungsreich':'Quality & Evaluation','erfreulich':'Quality & Evaluation',
    'lieblings-':'Quality & Evaluation','unangenehm':'Quality & Evaluation',
    'strafbar':'Quality & Evaluation','üblich':'Quality & Evaluation',
    'verdächtig':'Quality & Evaluation','wertvoll':'Quality & Evaluation',
    'ungerade':'Quality & Evaluation',
    // State & Condition
    'gesund':'State & Condition','krank':'State & Condition',
    'leer':'State & Condition','voll':'State & Condition',
    'arm':'State & Condition','reich':'State & Condition',
    'ledig':'State & Condition','verheiratet':'State & Condition',
    'geschieden':'State & Condition','verwitwet':'State & Condition',
    'tot':'State & Condition','bereit':'State & Condition',
    'gültig':'State & Condition','besetzt':'State & Condition',
    'müde':'State & Condition','geheim':'State & Condition',
    'gemischt':'State & Condition','satt':'State & Condition',
    'taub':'State & Condition','wach':'State & Condition',
    'ausverkauft':'State & Condition','getrennt':'State & Condition',
    'beschäftigt':'State & Condition','gewohnt sein':'State & Condition',
    'süchtig':'State & Condition','befristet':'State & Condition',
    'verfügbar':'State & Condition','abhängig':'State & Condition',
    'besiedelt':'State & Condition','erreichbar':'State & Condition',
    'schuldig':'State & Condition','verhaftet':'State & Condition',
    'zuständig':'State & Condition','durcheinander':'State & Condition',
    'bewaffnet':'State & Condition',
    // Time & Sequence
    'vorig':'Time & Sequence','folgend':'Time & Sequence',
    'letzte':'Time & Sequence','nächste':'Time & Sequence',
    'früh':'Time & Sequence','spät':'Time & Sequence',
    'ewig':'Time & Sequence','plötzlich':'Time & Sequence',
    'andauernd':'Time & Sequence','übernächste':'Time & Sequence',
    'jetzt':'Time & Sequence','momentan':'Time & Sequence',
    'zurzeit':'Time & Sequence','gerade':'Time & Sequence',
    'sofort':'Time & Sequence','gleich':'Time & Sequence',
    'danach':'Time & Sequence','schon':'Time & Sequence',
    'schließlich':'Time & Sequence','bald':'Time & Sequence',
    'oft':'Time & Sequence','gelegentlich':'Time & Sequence',
    'gestern':'Time & Sequence','heute':'Time & Sequence',
    'morgen':'Time & Sequence','mal':'Time & Sequence',
    'wieder':'Time & Sequence','inzwischen':'Time & Sequence',
    'mehrmals':'Time & Sequence','laufend':'Time & Sequence',
    'zugleich':'Time & Sequence','neulich':'Time & Sequence',
    // Place & Direction
    'weit, fern':'Place & Direction','nah(e)':'Place & Direction',
    'zurück':'Place & Direction','draußen':'Place & Direction',
    'drinnen':'Place & Direction','oben':'Place & Direction',
    'unten':'Place & Direction','überall':'Place & Direction',
    'nirgends':'Place & Direction','da, dort':'Place & Direction',
    'drüben':'Place & Direction','vorbei':'Place & Direction',
    'entlang':'Place & Direction',
    'im Uhrzeigersinn':'Place & Direction',
    'gegen den Uhrzeigersinn':'Place & Direction',
    'nach vorn':'Place & Direction','darauf':'Place & Direction',
    'dorthin':'Place & Direction','voraus':'Place & Direction',
    'außerhalb':'Place & Direction',
    // Degree & Quantity
    'durchschnittlich':'Degree & Quantity','völlig':'Degree & Quantity',
    'häufig':'Degree & Quantity','zufällig':'Degree & Quantity',
    'geringfügig':'Degree & Quantity',
    'zahlreich':'Degree & Quantity','knapp':'Degree & Quantity',
    'ein bisschen':'Degree & Quantity','fast':'Degree & Quantity',
    'genau':'Degree & Quantity','unbedingt':'Degree & Quantity',
    'bestimmt':'Degree & Quantity','höchstwahrscheinlich':'Degree & Quantity',
    'ziemlich':'Degree & Quantity','wahrscheinlich':'Degree & Quantity',
    'vielleicht':'Degree & Quantity','ungefähr':'Degree & Quantity',
    'insgesamt':'Degree & Quantity','besonders':'Degree & Quantity',
    'meist':'Degree & Quantity','hauptsächlich':'Degree & Quantity',
    'vor allem':'Degree & Quantity','auch':'Degree & Quantity',
    'gar, überhaupt':'Degree & Quantity','kaum':'Degree & Quantity',
    'genug':'Degree & Quantity','erheblich':'Degree & Quantity',
    'mindestens':'Degree & Quantity','teilweise':'Degree & Quantity',
    'doppelt':'Degree & Quantity',
    // Connective & Logical
    'umgekehrt':'Connective & Logical',
    'zusammen':'Connective & Logical','denn':'Connective & Logical',
    'trotzdem':'Connective & Logical','außerdem':'Connective & Logical',
    'leider':'Connective & Logical','gern(e)':'Connective & Logical',
    'eigentlich':'Connective & Logical','gleichfalls':'Connective & Logical',
    'ebenfalls':'Connective & Logical',
    'väterlicherseits':'Connective & Logical','deswegen':'Connective & Logical',
    'dagegen':'Connective & Logical','übrigens':'Connective & Logical',
    'einander':'Connective & Logical','sonst':'Connective & Logical',
    'davon':'Connective & Logical','allerdings':'Connective & Logical'
  };

  function sepVerbCategory(v){
    // Ambiguous: an·ziehen means both "put on (clothes)" → Work and
    // "pull/attract" → Movement, depending on entry. Disambiguate via EN.
    if (v.de === 'an·ziehen' && /pull/i.test(v.en || '')) return 'Movement & Physical';
    return SEP_VERB_CATEGORY[v.de] || 'Work & Daily Actions';
  }

  var DESC_ORDER = [
    'Character & Personality','Emotions & Mood','Appearance & Physical',
    'Quality & Evaluation','State & Condition','Time & Sequence',
    'Place & Direction','Degree & Quantity','Connective & Logical'
  ];

  function buildAllLevel(){
    var all = { nouns:{}, verbs:{}, adjectives:[], adverbs:[], descriptors:{}, verbsWithPrep:{} };
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
    // Build categorised descriptor view from the merged adj+adv lists.
    var doi, dcat, dentry;
    for (doi=0; doi<DESC_ORDER.length; doi++) all.descriptors[DESC_ORDER[doi]] = [];
    for (doi=0; doi<all.adjectives.length; doi++){
      dentry = all.adjectives[doi];
      dcat = DESC_CAT[dentry.de] || 'Other';
      if (!all.descriptors[dcat]) all.descriptors[dcat] = [];
      all.descriptors[dcat].push(dentry);
    }
    for (doi=0; doi<all.adverbs.length; doi++){
      dentry = all.adverbs[doi];
      dcat = DESC_CAT[dentry.de] || 'Other';
      if (!all.descriptors[dcat]) all.descriptors[dcat] = [];
      all.descriptors[dcat].push(dentry);
    }
    // Drop any pre-initialised categories that ended up empty.
    for (var dkey in all.descriptors){
      if (all.descriptors.hasOwnProperty(dkey) && all.descriptors[dkey].length === 0)
        delete all.descriptors[dkey];
    }
    // Build "Verbs with prepositions" buckets — every verb that carries a
    // `prep` field, grouped by case (Dativ / Akkusativ / Mixed). Sourced
    // from all levels so this view is meaningful only at the All level.
    var vpGroups = { 'Dativ':[], 'Akkusativ':[], 'Dat & Akk':[] };
    for (var vli=0; vli<levels.length; vli++){
      var vlvl = window.VOCAB_LEVELS[levels[vli]];
      if (!vlvl || !vlvl.verbs) continue;
      for (var vcat in vlvl.verbs){
        if (!vlvl.verbs.hasOwnProperty(vcat)) continue;
        var varr = vlvl.verbs[vcat];
        for (var vi=0; vi<varr.length; vi++){
          var pv = varr[vi];
          if (!pv.prep) continue;
          var hasDat = pv.prep.indexOf('Dat') !== -1;
          var hasAkk = pv.prep.indexOf('Akk') !== -1;
          var vkey = (hasDat && hasAkk) ? 'Dat & Akk' :
                     (hasDat ? 'Dativ' :
                     (hasAkk ? 'Akkusativ' : null));
          if (vkey) vpGroups[vkey].push(pv);
        }
      }
    }
    for (var vpk in vpGroups){
      if (vpGroups.hasOwnProperty(vpk) && vpGroups[vpk].length === 0)
        delete vpGroups[vpk];
    }
    all.verbsWithPrep = vpGroups;
    return all;
  }

  function loadCategoryOptions(){
    var t = $('type').value;
    $('catWrap').style.display = (t==='noun' || t==='verb' || t==='desc' || t==='vp') ? '' : 'none';
    var sel = $('cat'); sel.innerHTML = '';
    var src = (t==='noun') ? window.VOCAB.nouns
            : (t==='verb') ? window.VOCAB.verbs
            : (t==='desc') ? (window.VOCAB.descriptors || null)
            : (t==='vp')   ? (window.VOCAB.verbsWithPrep || null)
            : null;
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
    } else if(t==='desc'){
      arr = (window.VOCAB.descriptors && window.VOCAB.descriptors[$('cat').value]) || [];
      for(i=0;i<arr.length;i++) words.push(copy(arr[i],'adj'));
    } else if(t==='vp'){
      arr = (window.VOCAB.verbsWithPrep && window.VOCAB.verbsWithPrep[$('cat').value]) || [];
      for(i=0;i<arr.length;i++) words.push(copy(arr[i],'verb'));
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
  // Regional/usage label (e.g. "AT/ÖrD" for Austrian-specific terms),
  // rendered as a small superscript right after the German headword. Lives
  // with the German side so it never leaks onto the SK/EN prompt, and is
  // hidden automatically when cardB is covered (the .tap overlay hides all
  // children).
  function regMark(w){
    if(w && w.reg) return '<sup class="reg-mark">' + escapeText(w.reg) + '</sup>';
    return '';
  }
  // "xtra" flag — entry comes from a supplementary source (e.g. TV
  // subtitles), beyond the core wordlist. Same superscript pattern as
  // regMark, fuchsia colour. Boolean field `xtra:true` on the entry.
  function xtraMark(w){
    if(w && w.xtra) return '<sup class="xtra-mark">xtra</sup>';
    return '';
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
      return '<span class="' + cls + '">' + (art ? art + ' ' : '') + escapeText(w.de) + plPart + '</span>' + regMark(w) + xtraMark(w);
    }
    return escapeText(w.de) + regMark(w) + xtraMark(w);
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
    var prepA=$('prepA'), prepB=$('prepB');
    if(!state.current){
      labelA.textContent='—'; wordA.textContent='No words'; subA.textContent='';
      wordB.textContent='—'; subB.textContent=''; metaB.textContent='';
      if(noteA) noteA.textContent='';
      if(prepA) prepA.textContent='';
      if(prepB) prepB.textContent='';
      return;
    }
    var w = state.current;
    if(noteA) noteA.textContent = srcNoteText(w);
    // prep-line (e.g. "von + Dat") lives on the German side. Show in
    // whichever card is currently rendering German, clear the other.
    var prepText = (w._kind === 'verb' && w.prep) ? w.prep : '';
    if(state.direction === 'de'){
      labelA.textContent = 'GERMAN';
      wordA.innerHTML = deHTML(w);
      if(prepA) prepA.textContent = prepText;
      if(w._kind === 'verb' && w.p2){ subA.className = 'sub big'; subA.textContent = w.p2; }
      else { subA.className = 'sub'; subA.textContent = ''; }
    } else {
      labelA.textContent = '';
      wordA.innerHTML = skEnBlock(w);
      if(prepA) prepA.textContent = '';
      subA.className = 'sub'; subA.textContent = '';
    }
    var lblB = cardB.querySelector('.label');
    if(lblB) lblB.textContent = 'ANSWER';
    // Always populate cardB with the real answer — the .tap class merely
    // shows a CSS overlay covering it. This way the card has its proper
    // final height from the start and doesn't grow when revealed.
    if(state.direction === 'de'){
      wordB.innerHTML = skEnBlock(w);
      if(prepB) prepB.textContent = '';
      subB.className = 'sub'; subB.textContent = '';
      metaB.textContent = '';
    } else {
      wordB.innerHTML = deHTML(w);
      if(prepB) prepB.textContent = prepText;
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
      // Show "Adj & Adv (by category)" and "Verbs with prepositions"
      // options only for All level — they merge across A1/A2/B1.
      var typeEl = $('type');
      var dopt = null, vpopt = null;
      for(var oi=0;oi<typeEl.options.length;oi++){
        if(typeEl.options[oi].value==='desc'){dopt=typeEl.options[oi];}
        if(typeEl.options[oi].value==='vp'){vpopt=typeEl.options[oi];}
      }
      if(dopt){
        dopt.style.display = (lvl==='All') ? '' : 'none';
        if(lvl!=='All' && typeEl.value==='desc'){ typeEl.value='adj'; }
      }
      if(vpopt){
        vpopt.style.display = (lvl==='All') ? '' : 'none';
        if(lvl!=='All' && typeEl.value==='vp'){ typeEl.value='verb'; }
      }
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
  // The actual home-transition. All "go back" paths (UI button, hardware
  // back, popstate) ultimately route through this single function so the
  // history stack and UI never disagree.
  function doBackTransition(){
    try {
      $('setup').style.display = '';
      $('learn').style.display = 'none';
      $('review').style.display = 'none';
      $('footer').style.display = 'none';
      $('stats').textContent = '0 / 0';
      if (window.App._showInstallIfEligible) window.App._showInstallIfEligible();
      diag('back to setup');
    } catch(e){ diag('ERR back: ' + e.message); }
  }

  window.App.start = function(){
    try {
      diag('start tapped');
      buildPool();
      if(state.pool.length === 0){ diag('empty pool — pick a category'); return; }
      pickNext();
      $('setup').style.display = 'none';
      $('learn').style.display = 'flex';
      $('footer').style.display = 'flex';
      if (window.App._hideInstall) window.App._hideInstall();
      // Push a history entry so Android's hardware Back button (and the
      // browser back arrow) returns to the home view instead of exiting
      // the PWA. The popstate listener below catches the pop.
      try { history.pushState({view:'learn'}, ''); } catch(e){}
      render();
      diag('learning ' + state.pool.length + ' words, dir=' + state.direction);
    } catch(e){ diag('ERR start: ' + e.message); }
  };
  window.App.back = function(){
    // Drive the back action through history so hardware Back and the UI
    // ← Home button take the same path. popstate handler does the actual
    // transition; if there's nothing on the stack we fall back to a
    // direct transition (defensive).
    if (history.state && history.state.view) {
      try { history.back(); return; } catch(e){}
    }
    doBackTransition();
  };

  // Review mode: display all entries in the chosen pool as DE/SK/EN rows,
  // grouped by category when "All ..." is selected. Words listed in their
  // original (non-shuffled) order, so it works as a reading reference.
  function getReviewGroups(){
    var t = $('type').value;
    var kind = (t.indexOf('verb')>=0 || t === 'vp') ? 'verb'
              : (t.indexOf('noun')>=0) ? 'noun'
              : (t === 'adj' || t === 'desc') ? 'adj' : 'adv';
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
    } else if(t === 'desc'){
      var descs = window.VOCAB.descriptors;
      if(descs) for(var kd in descs) if(descs.hasOwnProperty(kd))
        groups.push({name:kd, words:descs[kd]});
    } else if(t === 'vp'){
      var vps = window.VOCAB.verbsWithPrep;
      if(vps) for(var kvp in vps) if(vps.hasOwnProperty(kvp))
        groups.push({name:kvp, words:vps[kvp]});
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
          deCol = deHTML(w);              // deHTML already appends regMark + xtraMark
        } else if(data.kind === 'verb'){
          deCol = escapeText(w.de) + regMark(w) + xtraMark(w);
          if(w.prep) deCol += '<div class="prep-line">' + escapeText(w.prep) + '</div>';
          if(w.p2) deCol += '<span class="p2">' + escapeText(w.p2) + '</span>';
        } else {
          deCol = escapeText(w.de) + regMark(w) + xtraMark(w);
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
      if (window.App._hideInstall) window.App._hideInstall();
      // Same Back-button affordance as learn mode.
      try { history.pushState({view:'review'}, ''); } catch(e){}
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

  // popstate fires when the user (or App.back) navigates back in history —
  // i.e. hardware Back on Android, the browser back arrow, or our own
  // history.back() call. If a non-home view is currently active, return to
  // home; otherwise let the navigation proceed (which on the home view
  // will exit the PWA, as expected).
  window.addEventListener('popstate', function(){
    if ($('learn').style.display !== 'none' || $('review').style.display !== 'none') {
      doBackTransition();
    }
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

/* PWA install prompt — shows a dismissible bar on the home screen whenever
   the page is NOT already running in standalone mode. Chrome's
   beforeinstallprompt event has unpredictable firing heuristics (requires
   prior engagement, isn't always fired on first visit), so we don't depend
   on it: the bar appears unconditionally for browser visits, and the
   install button uses the native prompt if available or falls back to
   manual instructions otherwise. Session-level dismissal persists via
   localStorage. */
(function(){
  var deferred = null;
  var bar  = document.getElementById('installBar');
  var btn  = document.getElementById('installBtn');
  var dimm = document.getElementById('installDismiss');
  var help = document.getElementById('installHelp');

  function isStandalone(){
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
           window.navigator.standalone === true;
  }
  function wasDismissed(){
    try { return localStorage.getItem('installDismissed') === '1'; } catch(e){ return false; }
  }

  // Helpers exposed to the main app so it can show/hide the bar on view
  // transitions (the bar is now a body-level sibling of <main>, not a
  // child of <section id="setup">, so it no longer auto-hides with it).
  window.App = window.App || {};
  window.App._showInstallIfEligible = function(){
    if (bar && !isStandalone() && !wasDismissed()) bar.style.display = 'flex';
  };
  window.App._hideInstall = function(){
    if (bar)  bar.style.display  = 'none';
    if (help) help.style.display = 'none';
  };

  window.App._showInstallIfEligible();

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferred = e;
    if (bar && !isStandalone() && !wasDismissed()) bar.style.display = 'flex';
  });

  window.addEventListener('appinstalled', function(){
    deferred = null;
    if(bar) bar.style.display = 'none';
    if(help) help.style.display = 'none';
  });

  if(btn) btn.addEventListener('click', function(){
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function(){ deferred = null; });
      if(bar) bar.style.display = 'none';
    } else if (help) {
      // No native prompt available (engagement heuristic not met, already
      // installed elsewhere, etc.) — toggle manual instructions instead.
      help.style.display = (help.style.display === 'block') ? 'none' : 'block';
    }
  });

  if(dimm) dimm.addEventListener('click', function(){
    if(bar) bar.style.display = 'none';
    if(help) help.style.display = 'none';
    try { localStorage.setItem('installDismissed', '1'); } catch(e){}
  });

  // "Reset offline cache" button in legend section — unregisters the SW
  // and clears all cached assets, then hard-reloads. Useful when the user
  // is stuck with a stale icon/code from an old SW.
  var rc = document.getElementById('resetCache');
  if (rc) rc.addEventListener('click', function(){
    if (!confirm('Clear cached app and reload?')) return;
    var done = function(){ window.location.reload(); };
    var unreg = (navigator.serviceWorker && navigator.serviceWorker.getRegistrations)
      ? navigator.serviceWorker.getRegistrations().then(function(regs){
          return Promise.all(regs.map(function(r){ return r.unregister(); }));
        })
      : Promise.resolve();
    unreg.then(function(){
      if (window.caches) {
        return caches.keys().then(function(keys){
          return Promise.all(keys.map(function(k){ return caches.delete(k); }));
        });
      }
    }).then(done, done);
    try { localStorage.removeItem('installDismissed'); } catch(e){}
  });
})();

/* Service worker registration — runs after the IIFE has set up the app.
   Skipped on file:// origins (where SWs aren't allowed). When a new SW
   takes control, force a one-time reload so the page picks up updated
   data/code immediately after a deploy. */
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  window.addEventListener('load', function () {
    // updateViaCache:'none' forces the browser to bypass its HTTP cache when
    // fetching sw.js itself — without this, a stale sw.js can sit in the
    // browser cache for up to 24h and prevent updates from being detected.
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(function (reg) {
        var refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
        // Manually trigger an update check on every load so a fresh deploy
        // is picked up immediately, not only when the browser feels like it.
        if (reg && reg.update) { try { reg.update(); } catch(e){} }
      }).catch(function () { /* SW registration is optional */ });
  });
}
