/* Evergreen Division · setup interview
   One question per screen, example under each, answers saved in this browser only.
   Usage:
     EvergreenSetup.init({
       id: 'winter-break-calendar',          // storage key
       title: 'Set up your Winter Break plan',
       intro: 'A few questions so this calendar fits your office. Takes ~3 minutes.',
       questions: [
         { key:'launchGoal', q:'How many launches is your goal?', why:'Sets the goal line.', type:'number', example:'20', placeholder:'e.g. 20' },
         { key:'trainDays', q:'Which days do you train?', type:'choice', options:['Thu–Sat','Mon–Wed','Other'], example:'Thu–Sat' },
         { key:'schools', q:'Local schools and break dates', type:'list', fields:[{key:'name',label:'School'},{key:'start',label:'Break starts',type:'date'},{key:'end',label:'Break ends',type:'date'}], example:'Lincoln HS · Dec 19 – Jan 5' },
         { key:'notes', q:'Anything else?', type:'text', optional:true }
       ],
       onDone(answers){ ... apply to the tool ... },   // called on finish and on every page load when answers exist
     });
   Types: text, textarea, number, money, date, choice, list, group (= list with exactly one row, no add button; still stored as a 1-item array).  optional:true lets them skip.
   The tool should also call EvergreenSetup.open('<id>') from its own "Redo setup" button if it wants one;
   a floating "Setup" button is added automatically next to the Evergreen badge. */
(function(){
  const css = `
  .es-ov{position:fixed;inset:0;z-index:2147483646;background:rgba(10,20,15,.72);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  .es-card{background:#f6f3ec;color:#1e3a2f;width:100%;max-width:520px;max-height:92vh;overflow:auto;border-radius:16px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
  .es-top{display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#b0764a;margin-bottom:10px}
  .es-bar{height:4px;background:#e3dccb;border-radius:4px;margin-bottom:18px}.es-bar i{display:block;height:100%;background:#b0764a;border-radius:4px;transition:width .2s}
  .es-q{font-size:20px;font-weight:650;margin:0 0 6px;line-height:1.3}.es-why{color:#5d6b64;font-size:14px;margin:0 0 14px}
  .es-ex{background:#fff;border:1px dashed #d8cfba;border-radius:8px;padding:8px 10px;font-size:13px;color:#5d6b64;margin:10px 0 0}
  .es-card input,.es-card textarea,.es-card select{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #cfc6b2;border-radius:8px;font:inherit;font-size:16px;background:#fff;color:#1e3a2f}
  .es-card textarea{min-height:96px}.es-opts{display:grid;gap:8px}.es-opt{padding:11px 12px;border:1px solid #cfc6b2;border-radius:8px;background:#fff;cursor:pointer;text-align:left;font:inherit;color:#1e3a2f}
  .es-opt.on{border-color:#1e3a2f;background:#1e3a2f;color:#efe9dc}
  .es-row{display:grid;gap:6px;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));margin-bottom:8px;align-items:end}.es-row label{font-size:12px;color:#5d6b64}
  .es-nav{display:flex;gap:8px;justify-content:space-between;margin-top:20px;flex-wrap:wrap}
  .es-b{padding:11px 16px;border-radius:8px;border:1px solid #cfc6b2;background:transparent;font:inherit;font-weight:600;color:#1e3a2f;cursor:pointer}
  .es-b.p{background:#1e3a2f;color:#efe9dc;border-color:#1e3a2f}.es-b.l{border:0;padding:11px 4px;color:#5d6b64;font-weight:500;text-decoration:underline}
  .es-add{margin-top:4px}.es-x{border:0;background:none;color:#a0503c;cursor:pointer;font-size:18px}
  .es-fab{position:fixed;right:12px;bottom:46px;z-index:2147483645;padding:6px 12px;border-radius:999px;border:0;background:#b0764a;color:#1e3a2f;font:600 12px/1 -apple-system,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18)}`;
  const store = {
    get(k){ try{ return JSON.parse(localStorage.getItem('evergreen-setup:'+k)); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem('evergreen-setup:'+k, JSON.stringify(v)); }catch(e){} },
    del(k){ try{ localStorage.removeItem('evergreen-setup:'+k); }catch(e){} }
  };
  const cfgs = {};
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function addCss(){ if(document.getElementById('es-css')) return; const s=document.createElement('style'); s.id='es-css'; s.textContent=css; document.head.appendChild(s); }
  function open(id){
    const cfg = cfgs[id]; if(!cfg) return; addCss();
    const saved = store.get(id); const ans = Object.assign({}, cfg.defaults||{}, saved && saved.answers || {});
    let i = -1; // -1 = intro
    const ov = document.createElement('div'); ov.className='es-ov'; document.body.appendChild(ov);
    const close = () => ov.remove();
    function field(q){
      const v = ans[q.key];
      if(q.type==='choice') return '<div class="es-opts">'+q.options.map(o=>`<button type="button" class="es-opt${v===o?' on':''}" data-o="${esc(o)}">${esc(o)}</button>`).join('')+'</div>';
      if(q.type==='textarea') return `<textarea data-k>${esc(v)}</textarea>`;
      if(q.type==='list'||q.type==='group'){ const one=q.type==='group'; const rows = Array.isArray(v)&&v.length? (one?v.slice(0,1):v) : [{}];
        return '<div data-list>'+rows.map((r,ri)=>'<div class="es-row">'+q.fields.map(f=>`<div><label>${esc(f.label)}</label><input data-f="${f.key}" type="${f.type||'text'}" value="${esc(r[f.key])}"></div>`).join('')+(one?'':`<button type="button" class="es-x" data-del="${ri}" aria-label="Remove">×</button>`)+'</div>').join('')+'</div>'+(one?'':'<button type="button" class="es-b es-add" data-addrow>+ Add another</button>'); }
      const t = q.type==='number'||q.type==='money' ? 'number' : (q.type==='date'?'date':'text');
      return `<input data-k type="${t}" ${q.type==='money'?'step="any" inputmode="decimal"':''} placeholder="${esc(q.placeholder||'')}" value="${esc(v)}">`;
    }
    function read(q){
      if(q.type==='list'||q.type==='group'){ ans[q.key] = [...ov.querySelectorAll('[data-list] .es-row')].map(r=>{const o={}; r.querySelectorAll('[data-f]').forEach(x=>o[x.dataset.f]=x.value.trim()); return o;}).filter(o=>Object.values(o).some(Boolean)); return; }
      if(q.type==='choice') return;
      const el = ov.querySelector('[data-k]'); if(!el) return; let val = el.value.trim();
      if((q.type==='number'||q.type==='money') && val!=='') val = Number(val);
      ans[q.key] = val;
    }
    function render(){
      const n = cfg.questions.length;
      if(i<0){ ov.innerHTML = `<div class="es-card" role="dialog" aria-modal="true"><div class="es-top"><span>Evergreen Division · setup</span></div><p class="es-q">${esc(cfg.title)}</p><p class="es-why">${esc(cfg.intro||'')}</p><p class="es-why">Your answers stay in this browser. Nothing is sent anywhere.</p><div class="es-nav"><button class="es-b l" data-skip>Skip, show me the sample</button><button class="es-b p" data-next>Start</button></div></div>`; }
      else if(i>=n){ ov.innerHTML = `<div class="es-card"><div class="es-top"><span>Done</span></div><p class="es-q">All set.</p><p class="es-why">The tool now uses your answers. Use the “Setup” button any time to change them.</p><div class="es-nav"><button class="es-b" data-back>Back</button><button class="es-b p" data-finish>Open the tool</button></div></div>`; }
      else { const q = cfg.questions[i];
        ov.innerHTML = `<div class="es-card" role="dialog" aria-modal="true"><div class="es-top"><span>Question ${i+1} of ${n}</span><span>${q.optional?'optional':''}</span></div><div class="es-bar"><i style="width:${Math.round(i/n*100)}%"></i></div><p class="es-q">${esc(q.q)}</p>${q.why?`<p class="es-why">${esc(q.why)}</p>`:''}${field(q)}${q.example?`<p class="es-ex">Example: ${esc(q.example)}</p>`:''}<div class="es-nav"><button class="es-b" data-back>Back</button><span><button class="es-b l" data-skipq>Skip</button> <button class="es-b p" data-next>Next</button></span></div></div>`;
        const f = ov.querySelector('[data-k]'); if(f) f.focus(); }
    }
    ov.addEventListener('click', e=>{
      const t = e.target, q = cfg.questions[i];
      if(t.dataset.o!==undefined){ ans[q.key]=t.dataset.o; ov.querySelectorAll('.es-opt').forEach(b=>b.classList.toggle('on', b===t)); return; }
      if(t.hasAttribute('data-addrow')){ read(q); ans[q.key]=(ans[q.key]||[]).concat([{}]); render(); return; }
      if(t.dataset.del!==undefined){ read(q); (ans[q.key]||[]).splice(+t.dataset.del,1); render(); return; }
      if(t.hasAttribute('data-skip')){ store.set(id,{skipped:true,answers:saved&&saved.answers||null}); close(); return; }
      if(t.hasAttribute('data-next')||t.hasAttribute('data-skipq')){ if(q && t.hasAttribute('data-next')) read(q); i++; render(); return; }
      if(t.hasAttribute('data-back')){ if(q) read(q); i=Math.max(-1,i-1); render(); return; }
      if(t.hasAttribute('data-finish')){ store.set(id,{answers:ans,at:new Date().toISOString()}); close(); try{ cfg.onDone && cfg.onDone(ans,{fresh:true}); }catch(err){ console.error(err); } }
    });
    ov.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.tagName==='INPUT'){ e.preventDefault(); const b=ov.querySelector('[data-next]'); b&&b.click(); } if(e.key==='Escape'){ if(!store.get(id)) store.set(id,{skipped:true}); close(); } });
    render();
  }
  function init(cfg){
    cfgs[cfg.id]=cfg; addCss();
    const fab=document.createElement('button'); fab.className='es-fab'; fab.textContent='Setup'; fab.title='Answer a few questions to fit this tool to your office'; fab.onclick=()=>open(cfg.id);
    const go=()=>{ document.body.appendChild(fab); const s=store.get(cfg.id);
      if(s && s.answers){ try{ cfg.onDone && cfg.onDone(s.answers,{fresh:false}); }catch(err){ console.error(err); } }
      else if(!s) open(cfg.id); };
    document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',go) : go();
  }
  window.EvergreenSetup = { init, open, answers:id=>{const s=store.get(id);return s&&s.answers||null;}, reset:id=>store.del(id) };
})();
