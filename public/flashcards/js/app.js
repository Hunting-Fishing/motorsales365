/* =====================================================================
 * 365 Flash Cards Training — Game Engine (v5)
 * ---------------------------------------------------------------------
 * Flow: Home (mode + category gallery) -> Category detail (sub-category
 * system + difficulty) -> play. Quiz/Identify earn level-weighted points;
 * wrong answers are recorded to a persistent Mistakes history.
 * Storage uses localStorage with an in-memory fallback (works on file://).
 * ===================================================================== */
(function () {
  "use strict";

  var T = window.TAXONOMY;
  var ALL_CARDS = [];
  var CAT_IMG = "assets/categories/";
  var LEVEL_POINTS = { "pre-apprentice":5, "apprentice":10, "technician":15, "journeyman":20, "master":25 };

  /* ---- Persistent store (points + mistakes), graceful fallback ---- */
  var Store = (function () {
    var KEY = "365fct_v1";
    var data = { points: 0, attempts: 0, correct: 0, history: [] };
    try { var s = localStorage.getItem(KEY); if (s) { var p = JSON.parse(s); if (p && typeof p === "object") data = Object.assign(data, p); } } catch (e) {}
    if (!Array.isArray(data.history)) data.history = [];
    function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
    return {
      data: data,
      record: function (ok, pts, mistake) {
        data.attempts++; if (ok) { data.correct++; data.points += pts; }
        else if (mistake) { data.history.unshift(mistake); if (data.history.length > 200) data.history.length = 200; }
        save();
      },
      clearHistory: function () { data.history = []; save(); }
    };
  })();

  var state = {
    mode: "study",
    industry: "", system: "", level: "",     // current category-screen picks
    filters: { industries:new Set(), fuels:new Set(), systems:new Set(), eras:new Set(), regions:new Set(), levels:new Set() },
    deck: [], idx: 0, flipped: false,
    choiceIdx: 0, sessionPoints: 0, answered: false, missed: []
  };

  function $(id){ return document.getElementById(id); }
  function el(tag, cls, text){ var n=document.createElement(tag); if(cls)n.className=cls; if(text!=null)n.textContent=text; return n; }
  function nameOf(dim,id){ var e=T._index[dim]&&T._index[dim][id]; return e?e.name:id; }
  function modeLabel(){ return state.mode==="identify"?"Identify":state.mode==="quiz"?"Quiz":"Study"; }

  /* ---- Card art ---- */
  function imagesFor(card){ var m=(window.CARD_IMAGES&&window.CARD_IMAGES[card.id])||{}, md=card.media||{}; return { front:m.front||md.front||null, back:m.back||md.back||null, sheet:m.sheet||md.sheet||null }; }

  /* ---- Matching ---- */
  function typeOk(c, type){ if(type==="identify") return c.type==="identify"; if(type==="flash") return c.type!=="identify"; return true; }
  function deckTypeForMode(){ return state.mode==="identify" ? "identify" : "flash"; }
  function cardMatch(c, ind, sys, lvl){
    if(!typeOk(c, deckTypeForMode())) return false;
    if(ind && (c.industries||[]).indexOf(ind)===-1) return false;
    if(sys && (c.systems||[]).indexOf(sys)===-1) return false;
    if(lvl && c.level!==lvl) return false;
    return true;
  }
  function deckCards(){ return ALL_CARDS.filter(function(c){ return cardMatch(c, state.industry, state.system, state.level); }); }
  function countMatch(ind, sys, lvl){ var n=0; ALL_CARDS.forEach(function(c){ if(cardMatch(c,ind,sys,lvl)) n++; }); return n; }
  function shuffle(arr){ var a=arr.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t; } return a; }

  /* ---- Header / points ---- */
  function refreshPoints(){ $("pointsBadge").innerHTML = "★ " + Store.data.points.toLocaleString(); }

  /* ---- Mode ---- */
  function setMode(mode){
    state.mode=mode;
    document.querySelectorAll(".mode-card[data-mode], .mode-btn[data-mode]").forEach(function(b){ b.classList.toggle("is-active", b.getAttribute("data-mode")===mode); });
    updateGalleryCounts();
    if(!$("categoryScreen").hidden) renderCategoryScreen(); // refresh counts if open
  }

  /* ---- Home gallery ---- */
  function galleryCategories(){ return [{id:"",name:"All Engines"}].concat(T.industries.map(function(i){ return {id:i.id,name:i.name}; })); }
  // Try a cover image at base.png/.jpg/.jpeg/.webp/.svg; call onFail if none load.
  function coverChain(imgEl, base, onFail){
    var exts=[".png",".jpg",".jpeg",".webp",".svg"], i=0;
    imgEl.onerror=function(){ i++; if(i<exts.length){ imgEl.src=base+exts[i]; } else { imgEl.onerror=null; if(onFail) onFail(); } };
    imgEl.src=base+exts[0];
  }
  function renderCategoryGallery(){
    var g=$("categoryGallery"); g.innerHTML="";
    galleryCategories().forEach(function(cat){
      var card=el("button","gcard"); card.type="button"; card.title=cat.name;
      var art=el("div","gcard-art");
      var img=document.createElement("img"); img.alt=cat.name; img.loading="lazy";
      coverChain(img, CAT_IMG+(cat.id||"all"), function(){ art.classList.add("noimg"); if(img.parentNode)img.parentNode.removeChild(img); art.appendChild(el("span","gcard-fallback",cat.name)); });
      art.appendChild(img); card.appendChild(art);
      var cnt=el("span","gcard-count","0"); card.appendChild(cnt);
      card._catId=cat.id; card._count=cnt;
      card.addEventListener("click",function(){ openCategory(cat.id); });
      g.appendChild(card);
    });
    updateGalleryCounts();
  }
  function updateGalleryCounts(){
    var g=$("categoryGallery"); if(!g) return;
    g.querySelectorAll(".gcard").forEach(function(card){ var n=countMatch(card._catId,"",""); card._count.textContent=n; card.classList.toggle("empty", n===0); });
  }

  /* ---- Category detail (sub-category system + difficulty) ---- */
  function openCategory(industry){ state.industry=industry; state.system=""; state.level=""; renderCategoryScreen(); goScreen("categoryScreen"); }
  function singleChip(label, count, active, disabled, onClick){
    var c=el("button","subchip"+(active?" active":"")+(disabled?" empty":"")); c.type="button";
    c.appendChild(document.createTextNode(label+" "));
    c.appendChild(el("span","subchip-n",String(count)));
    if(!disabled) c.addEventListener("click", onClick);
    return c;
  }
  // System option rendered as an image card (cover art + name bar + count).
  function systile(label, coverBase, count, active, onClick){
    var t=el("button","systile"+(active?" active":"")); t.type="button"; t.title=label;
    var art=el("div","systile-art");
    var img=document.createElement("img"); img.alt=label; img.loading="lazy";
    coverChain(img, coverBase, function(){ art.classList.add("noimg"); if(img.parentNode)img.parentNode.removeChild(img); art.appendChild(el("span","systile-fallback",label)); });
    art.appendChild(img); t.appendChild(art);
    t.appendChild(el("span","systile-n",String(count)));
    t.addEventListener("click",onClick);
    return t;
  }
  function renderCategoryScreen(){
    $("catTitle").textContent = state.industry ? nameOf("industries",state.industry) : "All Engines";
    $("catMode").textContent = modeLabel();
    // systems present in this industry for the current mode
    var sysBox=$("systemChips"); sysBox.innerHTML="";
    sysBox.appendChild(systile("All Systems", CAT_IMG+(state.industry||"all"), countMatch(state.industry,"",state.level), state.system==="", function(){ state.system=""; renderCategoryScreen(); }));
    T.systems.forEach(function(s){
      var n=countMatch(state.industry, s.id, state.level);
      if(n===0 && state.system!==s.id) return; // only show systems that have cards here
      sysBox.appendChild(systile(s.name, CAT_IMG+"sys-"+s.id, n, state.system===s.id, function(){ state.system=s.id; renderCategoryScreen(); }));
    });
    // difficulty levels
    var lvlBox=$("levelChips"); lvlBox.innerHTML="";
    lvlBox.appendChild(singleChip("All Levels", countMatch(state.industry,state.system,""), state.level==="", false, function(){ state.level=""; renderCategoryScreen(); }));
    T.levels.forEach(function(l){
      var n=countMatch(state.industry, state.system, l.id);
      lvlBox.appendChild(singleChip(l.name, n, state.level===l.id, n===0, function(){ if(n>0){ state.level=l.id; renderCategoryScreen(); } }));
    });
    var n=countMatch(state.industry,state.system,state.level), noun=state.mode==="identify"?"engine":"card";
    $("catCount").textContent=n+" "+noun+(n===1?"":"s");
    $("catStart").disabled=n===0;
    $("catStart").textContent=(state.mode==="identify"?"Start identifying":state.mode==="quiz"?"Start quiz":"Start studying")+" →";
  }
  function startFromCategory(){ if(countMatch(state.industry,state.system,state.level)===0) return; startCurrentMode(); }

  /* ---- Tags ---- */
  function tagsFor(card){
    var frag=document.createDocumentFragment();
    if(card.type==="identify") frag.appendChild(el("span","tag id-tag","Identify"));
    frag.appendChild(el("span","tag level",nameOf("levels",card.level)));
    if(card.industries&&card.industries[0]) frag.appendChild(el("span","tag",nameOf("industries",card.industries[0])));
    if(card.systems&&card.systems[0]) frag.appendChild(el("span","tag",nameOf("systems",card.systems[0])));
    var eraCls="tag"+(card.era==="obsolete"?" era-obsolete":card.era==="emerging"?" era-emerging":(card.era==="pioneer"||card.era==="vintage")?" era-heritage":"");
    frag.appendChild(el("span",eraCls,nameOf("eras",card.era)));
    return frag;
  }

  /* ---- Image faces ---- */
  function setFaceImage(faceEl, boxEl, single, sheet, side){
    boxEl.className="face-img"; boxEl.style.backgroundImage=""; boxEl.innerHTML="";
    if(single){ var img=document.createElement("img"); img.src=single; img.alt=""; boxEl.appendChild(img); faceEl.classList.add("img-mode"); return; }
    if(sheet){ boxEl.classList.add("sheet",side); boxEl.style.backgroundImage="url('"+sheet+"')"; faceEl.classList.add("img-mode"); return; }
    faceEl.classList.remove("img-mode");
  }

  /* ---- STUDY ---- */
  function startStudy(){ state.deck=shuffle(deckCards()); state.idx=0; renderStudyCard(); goScreen("studyScreen"); }
  function renderStudyCard(){
    var card=state.deck[state.idx]; if(!card) return;
    state.flipped=false; $("flashcard").classList.remove("flipped");
    var im=imagesFor(card);
    setFaceImage($("faceFront"), $("frontImg"), im.front, im.sheet, "left");
    setFaceImage($("faceBack"),  $("backImg"),  im.back,  im.sheet, "right");
    $("frontTags").innerHTML=""; $("frontTags").appendChild(tagsFor(card));
    $("frontText").textContent=card.front; $("backText").textContent=card.back;
    if(card.hint){ $("hintBtn").hidden=false; $("hintText").hidden=true; $("hintText").textContent=card.hint; } else { $("hintBtn").hidden=true; $("hintText").hidden=true; }
    var rv=$("regionValues");
    if(card.regionValues){ rv.innerHTML=""; if(card.regionValues.imperial)rv.appendChild(rowKV("Imperial",card.regionValues.imperial)); if(card.regionValues.metric)rv.appendChild(rowKV("Metric",card.regionValues.metric)); rv.hidden=false; } else rv.hidden=true;
    $("confidenceRow").hidden=true;
    $("prevBtn").disabled=state.idx===0;
    $("nextBtn").textContent=state.idx===state.deck.length-1?"Finish →":"Next →";
    $("studyProgressFill").style.width=(((state.idx+1)/state.deck.length)*100)+"%";
    $("studyCounter").textContent=(state.idx+1)+" / "+state.deck.length;
  }
  function rowKV(k,v){ var d=el("div"); d.appendChild(el("b",null,k+": ")); d.appendChild(document.createTextNode(v)); return d; }
  function flipCard(){ state.flipped=!state.flipped; $("flashcard").classList.toggle("flipped",state.flipped); $("confidenceRow").hidden=!state.flipped; }
  function studyNext(){ if(state.idx<state.deck.length-1){ state.idx++; renderStudyCard(); } else showResults("study"); }
  function studyPrev(){ if(state.idx>0){ state.idx--; renderStudyCard(); } }

  /* ---- CHOICE (Quiz + Identify) ---- */
  function correctText(card){ return state.mode==="identify" ? (card.engineProfile&&card.engineProfile.name||card.back) : card.back; }
  function distractors(card){
    if(state.mode==="identify"){ var pool=ALL_CARDS.filter(function(c){ return c.type==="identify" && c.id!==card.id && c.engineProfile; }); return shuffle(pool).slice(0,3).map(function(c){ return c.engineProfile.name; }); }
    var pool=ALL_CARDS.filter(function(c){ return c.type!=="identify" && c.id!==card.id && c.systems.some(function(s){ return (card.systems||[]).indexOf(s)!==-1; }); });
    if(pool.length<3) pool=ALL_CARDS.filter(function(c){ return c.type!=="identify" && c.id!==card.id; });
    return shuffle(pool).slice(0,3).map(function(c){ return c.back; });
  }
  function startChoice(){ state.deck=shuffle(deckCards()); state.choiceIdx=0; state.sessionPoints=0; state.missed=[]; renderChoice(); goScreen("quizScreen"); }
  function renderChoice(){
    var card=state.deck[state.choiceIdx]; if(!card) return; state.answered=false;
    $("quizTags").innerHTML=""; $("quizTags").appendChild(tagsFor(card));
    var fig=$("quizFigure"), img=$("quizImage"), im=imagesFor(card);
    var figSrc = im.front || im.sheet || (state.mode==="identify" && card.media && card.media.image) || null;
    if(figSrc){ img.src=figSrc; img.onerror=function(){ fig.hidden=true; }; fig.hidden=false; } else fig.hidden=true;
    $("quizQuestion").textContent=card.front;
    var correct=correctText(card), opts=shuffle([correct].concat(distractors(card)));
    var box=$("quizOptions"); box.innerHTML="";
    opts.forEach(function(text){ var b=el("button","quiz-opt",text); b.type="button"; b.addEventListener("click",function(){ answerChoice(b,text,card,correct); }); box.appendChild(b); });
    $("quizFeedback").hidden=true; $("quizNextBtn").hidden=true;
    $("quizProgressFill").style.width=(((state.choiceIdx+1)/state.deck.length)*100)+"%";
    $("quizCounter").textContent=(state.choiceIdx+1)+" / "+state.deck.length;
    $("quizScore").textContent=state.sessionPoints;
  }
  function answerChoice(btn,chosen,card,correct){
    if(state.answered) return; state.answered=true;
    var ok=chosen===correct, pts=LEVEL_POINTS[card.level]||10;
    $("quizOptions").querySelectorAll(".quiz-opt").forEach(function(b){ b.disabled=true; if(b.textContent===correct) b.classList.add("correct"); });
    var fb=$("quizFeedback");
    if(ok){
      state.sessionPoints+=pts;
      Store.record(true, pts, null); refreshPoints();
      fb.className="quiz-feedback ok"; fb.textContent=(state.mode==="identify"?"Correct (+"+pts+" pts) — "+card.back:"Correct! +"+pts+" pts");
    } else {
      btn.classList.add("wrong"); state.missed.push(card);
      Store.record(false, 0, {
        id:card.id, front:card.front, correct:correct,
        mode:state.mode, industry:(card.industries||[])[0]||"", system:(card.systems||[])[0]||"", level:card.level, ts:Date.now()
      });
      fb.className="quiz-feedback no"; fb.textContent=(state.mode==="identify"?"It's the "+correct+". "+card.back:"Answer: "+correct);
    }
    $("quizScore").textContent=state.sessionPoints; fb.hidden=false;
    var nb=$("quizNextBtn"); nb.hidden=false; nb.textContent=state.choiceIdx===state.deck.length-1?"See results →":"Next →";
  }
  function choiceNext(){ if(state.choiceIdx<state.deck.length-1){ state.choiceIdx++; renderChoice(); } else showResults("choice"); }

  /* ---- Results ---- */
  function showResults(kind){
    var rp=$("resultsPoints");
    if(kind==="choice"){
      var total=state.deck.length, correct=total-state.missed.length, pct=total?Math.round((correct/total)*100):0;
      $("resultsTitle").textContent=state.mode==="identify"?"Identification complete":"Quiz complete";
      $("resultsScore").textContent=pct+"%";
      $("resultsDetail").textContent=correct+" of "+total+" correct"+(state.missed.length?" · "+state.missed.length+" added to your history":" · perfect run!");
      rp.hidden=false; rp.innerHTML="<strong>+"+state.sessionPoints+"</strong> points this round · ★ "+Store.data.points.toLocaleString()+" total";
      $("reviewMissedBtn").hidden=state.missed.length===0;
    } else {
      $("resultsTitle").textContent="Study set complete";
      $("resultsScore").textContent=state.deck.length;
      $("resultsDetail").textContent="You reviewed "+state.deck.length+" card"+(state.deck.length===1?"":"s")+". Try Quiz or Identify to earn points.";
      rp.hidden=true; $("reviewMissedBtn").hidden=true;
    }
    goScreen("resultsScreen");
  }
  function reviewMissed(){ if(!state.missed.length) return; state.deck=shuffle(state.missed.slice()); state.idx=0; setMode("study"); renderStudyCard(); goScreen("studyScreen"); }

  /* ---- History ---- */
  function timeAgo(ts){ var s=Math.floor((Date.now()-ts)/1000); if(s<60)return "just now"; var m=Math.floor(s/60); if(m<60)return m+"m ago"; var h=Math.floor(m/60); if(h<24)return h+"h ago"; return Math.floor(h/24)+"d ago"; }
  function renderHistory(){
    var d=Store.data, acc=d.attempts?Math.round((d.correct/d.attempts)*100):0;
    var sr=$("statsRow"); sr.innerHTML="";
    [["★ "+d.points.toLocaleString(),"Points"],[d.attempts,"Answered"],[acc+"%","Accuracy"],[d.history.length,"To review"]].forEach(function(s){
      var b=el("div","stat"); b.appendChild(el("div","stat-n",String(s[0]))); b.appendChild(el("div","stat-l",s[1])); sr.appendChild(b);
    });
    var list=$("historyList"); list.innerHTML="";
    if(!d.history.length){ list.appendChild(el("p","empty-note","No mistakes recorded yet. Mistakes from Quiz and Identify show up here so you can review them.")); return; }
    d.history.forEach(function(m){
      var row=el("div","hrow");
      var meta=el("div","hrow-meta");
      meta.appendChild(el("span","tag level",nameOf("levels",m.level)));
      if(m.industry) meta.appendChild(el("span","tag",nameOf("industries",m.industry)));
      if(m.system) meta.appendChild(el("span","tag",nameOf("systems",m.system)));
      meta.appendChild(el("span","hrow-time",timeAgo(m.ts)));
      var q=el("div","hrow-q",m.front);
      var a=el("div","hrow-a"); a.appendChild(el("b",null,"Answer: ")); a.appendChild(document.createTextNode(m.correct));
      row.appendChild(meta); row.appendChild(q); row.appendChild(a);
      list.appendChild(row);
    });
  }
  function goHistory(){ renderHistory(); goScreen("historyScreen"); }

  /* ---- Navigation ---- */
  var SCREENS=["setupScreen","categoryScreen","studyScreen","quizScreen","resultsScreen","historyScreen"];
  var PLAY=["studyScreen","quizScreen","resultsScreen"];
  function goScreen(id){ SCREENS.forEach(function(s){ $(s).hidden=(s!==id); }); $("modeNav").hidden=(PLAY.indexOf(id)===-1); window.scrollTo({top:0,behavior:"smooth"}); }
  function startCurrentMode(){ if(state.mode==="study") startStudy(); else startChoice(); }

  /* ---- Logo fallback ---- */
  function wireLogo(){ var logo=$("brandLogo"), badge=$("brandBadge"); if(!logo) return; var tried=false; logo.onerror=function(){ if(!tried){ tried=true; logo.src="assets/brand/logo-365.svg"; } else { badge.classList.add("no-logo"); } }; }

  /* ---- Init ---- */
  function init(){
    ALL_CARDS=window.CARDS||[];
    if(!T || !ALL_CARDS.length){ document.body.innerHTML="<p style='padding:40px;font-family:sans-serif'>Card data failed to load.</p>"; return; }
    var sc=(window.CARD_SECTIONS||[]).length, idn=ALL_CARDS.filter(function(c){return c.type==="identify";}).length;
    $("cardTotal").textContent=ALL_CARDS.length+" cards · "+sc+" sections · "+idn+" engine IDs";
    wireLogo(); refreshPoints(); renderCategoryGallery();

    document.querySelectorAll(".mode-card[data-mode], .mode-btn[data-mode]").forEach(function(b){ b.addEventListener("click",function(){ setMode(b.getAttribute("data-mode")); if(PLAY.indexOf(currentScreen())!==-1) startCurrentMode(); }); });
    $("reconfigBtn").addEventListener("click",function(){ goScreen("setupScreen"); });
    var bh=$("brandHome"); if(bh){ bh.addEventListener("click",function(){ goScreen("setupScreen"); }); bh.addEventListener("keydown",function(e){ if(e.code==="Enter"||e.code==="Space"){ e.preventDefault(); goScreen("setupScreen"); } }); }
    $("catBack").addEventListener("click",function(){ goScreen("setupScreen"); });
    $("catStart").addEventListener("click",startFromCategory);
    $("historyBtn").addEventListener("click",goHistory);
    $("histBack").addEventListener("click",function(){ goScreen("setupScreen"); });
    $("clearHist").addEventListener("click",function(){ Store.clearHistory(); renderHistory(); });

    $("flashcard").addEventListener("click",flipCard);
    $("hintBtn").addEventListener("click",function(e){ e.stopPropagation(); $("hintText").hidden=false; $("hintBtn").hidden=true; });
    $("nextBtn").addEventListener("click",studyNext);
    $("prevBtn").addEventListener("click",studyPrev);
    document.querySelectorAll(".conf-btn").forEach(function(b){ b.addEventListener("click",function(){ if(b.getAttribute("data-conf")==="again"){ state.deck.push(state.deck[state.idx]); } studyNext(); }); });
    $("quizNextBtn").addEventListener("click",choiceNext);
    $("retryBtn").addEventListener("click",startCurrentMode);
    $("reviewMissedBtn").addEventListener("click",reviewMissed);
    $("newDeckBtn").addEventListener("click",function(){ goScreen("setupScreen"); });
    document.addEventListener("keydown",function(e){ if($("studyScreen").hidden) return; if(e.code==="ArrowRight") studyNext(); if(e.code==="ArrowLeft") studyPrev(); });
  }
  function currentScreen(){ for(var i=0;i<SCREENS.length;i++) if(!$(SCREENS[i]).hidden) return SCREENS[i]; return "setupScreen"; }

  function whenDomReady(fn){ if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fn); else fn(); }
  if(window.CARDS && window.CARDS.length) whenDomReady(init);
  else document.addEventListener("cards-ready",function(){ whenDomReady(init); });
})();
