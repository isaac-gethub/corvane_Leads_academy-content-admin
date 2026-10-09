import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import{unzipSync}from'https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm';
const sb=createClient('https://blfgwysgekfqhcafofhe.supabase.co','sb_publishable_ThLetpd4hj49fjce-kXoFA_v4ghwIqV');const $=x=>document.getElementById(x);
const courses=[
['corvane_controls_project','Corvane Energy SAP Controls Project'],
['pm_to_controls_lead','PM to Controls Lead'],
['pm_to_grc_security_lead','PM to GRC & Security Lead']
];
async function apiStatus(){const r=await sb.functions.invoke('academy-content-admin',{body:{action:'status'}});if(r.error)throw r.error;return r.data}
async function boot(){const q=await sb.auth.getSession();if(!q.data.session)return;try{const s=await apiStatus();$('login').classList.add('hidden');$('app').classList.remove('hidden');$('who').textContent=q.data.session.user.email;render(s.stats||{})}catch(e){$('msg').innerHTML='<div class="msg error">'+e.message+'</div>';await sb.auth.signOut()}}
function render(stats){$('courses').innerHTML=courses.map(([id,name])=>{const s=stats[id]||{trainee:0,instructor:0,total:0};return `<div class="card"><h3>${name}</h3><div class="muted">Protected materials: ${s.total} · Trainee: ${s.trainee} · Instructor: ${s.instructor}</div><div class="field"><label>Approved course ZIP</label><input type="file" accept=".zip" data-file="${id}"></div><button class="btn secondary" data-preview="${id}">1. PREVIEW CLASSIFICATION</button> <button class="btn primary" data-upload="${id}" disabled>2. INGEST ZIP</button><div id="pv-${id}"></div><div id="r-${id}" class="muted" style="margin-top:10px"></div></div>`}).join('');document.querySelectorAll('[data-upload]').forEach(b=>b.onclick=()=>upload(b.dataset.upload));document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>preview(b.dataset.preview));document.querySelectorAll('[data-file]').forEach(i=>i.onchange=()=>{const id=i.dataset.file;$('pv-'+id).innerHTML='';document.querySelector(`[data-upload="${id}"]`).disabled=true})}
async function upload(id){const inp=document.querySelector(`[data-file="${id}"]`),f=inp?.files?.[0];if(!f){alert('Choose the approved ZIP first.');return};const el=$('r-'+id);el.textContent='Uploading and classifying...';const fd=new FormData();fd.append('app_course_id',id);fd.append('file',f);const {data:{session}}=await sb.auth.getSession();const r=await fetch('https://blfgwysgekfqhcafofhe.supabase.co/functions/v1/academy-content-admin',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,apikey:'sb_publishable_ThLetpd4hj49fjce-kXoFA_v4ghwIqV'},body:fd});const d=await r.json();if(!r.ok||!d.success){el.textContent=d.error||'Upload failed';return};document.querySelector(`[data-upload="${id}"]`).disabled=true;el.textContent=`Uploaded ${d.uploaded} files (${d.trainee} trainee / ${d.instructor} instructor); skipped ${d.skipped}.`;const s=await apiStatus();render(s.stats||{})}
// ---- Preview: same rules as the academy-content-admin server function, run in the browser before anything is stored ----
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safePath=s=>s.replace(/\\/g,'/').split('/').filter(x=>x&&x!=='.'&&x!=='..').join('/');
const stripOuterRoot=p=>{const a=p.split('/').filter(Boolean);return a.length>1?a.slice(1).join('/'):p};
const okType=n=>/\.(docx|xlsx|pdf|zip|txt)$/i.test(n);
function classifyAudience(path){const p=path.toLowerCase();return(p.includes('instructor_only')||p.includes('answer_key')||p.includes('answer key')||p.includes('assessor')||p.includes('scoring_sheet')||p.includes('scoring sheet')||/(^|\/)p\d+_key_/.test(p))?'instructor':'trainee'}
const SUSPECT=/(answer|solution|marking|mark[ _-]?scheme|rubric|(^|[^a-z])key([^a-z]|$)|instructor|facilitator|teacher|trainer|assessor|scoring|grading|(^|[^a-z])exam([^a-z]|$))/i;
async function preview(id){
  const inp=document.querySelector(`[data-file="${id}"]`),f=inp?.files?.[0],box=$('pv-'+id),btn=document.querySelector(`[data-upload="${id}"]`);
  if(!f){alert('Choose the approved ZIP first.');return}
  box.innerHTML='<div class="muted">Reading ZIP…</div>';
  const names=[];
  try{unzipSync(new Uint8Array(await f.arrayBuffer()),{filter:x=>{names.push(x.name);return false}})}catch(e){box.innerHTML='<div class="msg error">Could not read this ZIP: '+esc(e.message)+'</div>';return}
  const instr=[],train=[],skip=[];
  for(const raw of names){if(raw.endsWith('/'))continue;const rel=safePath(stripOuterRoot(raw)),low=rel.toLowerCase();
    if(!rel||low.includes('tib_security_extension_build_sources/')||(id==='corvane_controls_project'&&low==='corvane_energy_sap_controls_project.zip')||!okType(rel)){skip.push(rel||raw);continue}
    (classifyAudience(rel)==='instructor'?instr:train).push(rel)}
  const suspect=train.filter(p=>SUSPECT.test(p.split('/').pop()));
  const list=(a,cls)=>a.length?`<ul class="pv-list ${cls||''}">${a.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:'<div class="muted">None.</div>';
  box.innerHTML=`<div class="pv"><p><b>${instr.length+train.length}</b> files will be stored: <b>${train.length}</b> visible to trainees, <b>${instr.length}</b> instructor-only. ${skip.length} skipped (folders, unsupported types or excluded build sources).</p>
   <h4>Instructor-only (trainees will NOT see these)</h4>${list(instr)}
   <h4>${suspect.length?'⚠ Check these: marked for trainees, but the name suggests answers or instructor material':'Name check'}</h4>${suspect.length?list(suspect,'warn')+'<p class="muted">If any of these must be hidden, rename the file in the ZIP to include <b>Instructor_Only</b> (or Answer_Key), rebuild the ZIP, choose it again and preview again.</p>':'<div class="muted">No trainee file names look like answer or instructor material.</div>'}
   <details><summary>All ${train.length} trainee files</summary>${list(train)}</details>
   <label class="pv-ok"><input type="checkbox" id="ok-${id}"> I have checked the instructor-only list and the warnings</label></div>`;
  btn.disabled=true;$('ok-'+id).onchange=e=>{btn.disabled=!e.target.checked};
}
$('signin').onclick=async()=>{const r=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(r.error){$('msg').innerHTML='<div class="msg error">'+r.error.message+'</div>';return}boot()};
$('logout').onclick=async()=>{await sb.auth.signOut();location.reload()};boot();