const LABELS = ["assessment","interview","accepted","submitted","rejected"];
const NAMES = {assessment:"Assessment",interview:"Interview",accepted:"Accepted",submitted:"Submitted",rejected:"Rejected",other:"Other"};

// Phrases that signal each label. Higher number = stronger signal. Edit freely.
const RULES = {
 rejected:[["unfortunately",3],["regret to inform",4],["not moving forward",4],["will not be moving",4],["decided not to proceed",4],["not selected",4],["other candidates",3],["unable to offer",3],["not be proceeding",4],["not to move forward",4]],
 accepted:[["pleased to offer",5],["offer of employment",5],["job offer",5],["welcome to the team",5],["congratulations",3],["offer letter",4],["excited to extend",4],["start date",2],["happy to offer",5]],
 interview:[["interview",4],["schedule a call",3],["schedule a time",3],["phone screen",3],["meet with",2],["your availability",2],["video call",2],["on-site",2],["speak with you",2]],
 assessment:[["assessment",4],["coding challenge",4],["online test",4],["take-home",4],["hackerrank",4],["codility",4],["complete the test",3],["aptitude",3],["case study",3],["test link",3]],
 submitted:[["application received",5],["received your application",5],["thank you for applying",4],["successfully submitted",5],["has been submitted",5],["application submitted",5],["thanks for applying",4],["application confirmation",4],["under review",2]]
};

function classify(subject, body){
  const t = (subject+" "+subject+" "+body).toLowerCase(); // subject counts double
  let best=null, top=0, why="";
  for(const l of LABELS){
    let s=0, hits=[];
    for(const [p,w] of RULES[l]) if(t.includes(p)){ s+=w; hits.push(p); }
    if(l==="submitted") s*=0.8;
    if(s>top){ top=s; best=l; why='Matched: '+hits.map(h=>'"'+h+'"').join(", "); }
  }
  return best ? {label:best, why} : {label:"other", why:"No application-related phrases found."};
}

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const color = l => "var(--"+l+")";
let token=null, tokenClient=null, mails=[], activeId=null, filter="all";

/* ---------- Gmail ---------- */
function connect(){
  if(!CONFIG.CLIENT_ID || CONFIG.CLIENT_ID.startsWith("PASTE")){
    $("banner").textContent = "Add your Google Client ID in config.js first (see README.md).";
    return;
  }
  if(!window.google || !google.accounts){ $("banner").textContent = "Google sign-in is still loading. Try again in a moment."; return; }
  if(!tokenClient){
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      callback: r => {
        if(r.error){ $("banner").textContent = "Sign-in failed: "+r.error; return; }
        token = r.access_token; loadGmail();
      }
    });
  }
  tokenClient.requestAccessToken({prompt: token ? "" : "consent"});
}

async function gm(path){
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/"+path, {headers:{Authorization:"Bearer "+token}});
  if(!r.ok) throw new Error("Gmail returned "+r.status);
  return r.json();
}

async function loadGmail(){
  $("connect").disabled = true;
  try{
    $("banner").textContent = "Reading your emails...";
    const q = encodeURIComponent($("query").value.trim());
    const max = $("count").value;
    const list = await gm("messages?maxResults="+max+(q?"&q="+q:""));
    const ids = (list.messages||[]).map(m=>m.id);
    mails = []; let done = 0;
    const queue = ids.slice();
    async function worker(){
      while(queue.length){
        const id = queue.shift();
        try{
          const m = await gm("messages/"+id+"?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date");
          const h = n => ((m.payload.headers||[]).find(x=>x.name.toLowerCase()===n)||{}).value||"";
          const mail = {id, subject:h("subject")||"(no subject)", from:h("from"), date:h("date"), body:m.snippet||"", full:false};
          mail.result = classify(mail.subject, mail.body);
          mails.push(mail);
        }catch(e){}
        done++; if(done%10===0) $("banner").textContent = "Reading your emails... "+done+" of "+ids.length;
      }
    }
    await Promise.all(Array.from({length:8}, worker));
    render();
  }catch(e){
    $("banner").textContent = "Could not read Gmail: "+e.message+". If it keeps failing, click Connect Gmail again.";
  }
  $("connect").disabled = false;
  $("connect").textContent = "Refresh from Gmail";
}

function decode(s){
  s = s.replace(/-/g,"+").replace(/_/g,"/");
  const bytes = Uint8Array.from(atob(s), c=>c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function bodyText(payload){
  const plain=[], html=[];
  (function walk(p){
    if(p.parts) p.parts.forEach(walk);
    else if(p.body && p.body.data){
      if(p.mimeType==="text/plain") plain.push(decode(p.body.data));
      else if(p.mimeType==="text/html") html.push(decode(p.body.data));
    }
  })(payload);
  if(plain.length) return plain.join("\n");
  if(html.length) return new DOMParser().parseFromString(html.join("\n"),"text/html").body.textContent.replace(/\n\s*\n+/g,"\n\n");
  return "";
}

async function openMail(id){
  activeId = id; render();
  const m = mails.find(x=>x.id===id);
  if(m && !m.full && token){
    try{
      const full = await gm("messages/"+id+"?format=full");
      const txt = bodyText(full.payload).trim();
      if(txt){ m.body = txt; m.result = classify(m.subject, txt); }
      m.full = true; render();
    }catch(e){}
  }
}

/* ---------- Demo ---------- */
function demo(){
  const S=[
   ["careers@northwind.com","Thank you for applying to Data Analyst","We have received your application for the Data Analyst role. It is under review."],
   ["talent@brightlabs.io","Next step: online coding challenge","Please complete the HackerRank assessment within 5 days. The test link is below."],
   ["recruiter@helixhealth.com","Invitation to interview","We would like to schedule a video call with the hiring manager. Please share your availability."],
   ["hr@cedarworks.com","Congratulations! Offer of employment","We are pleased to offer you the position. Your offer letter and start date are attached."],
   ["no-reply@orbitsoft.com","Update on your application","Unfortunately, we have decided not to move forward. We selected other candidates."],
   ["news@shop.com","Weekend sale","Everything is 20% off."]
  ];
  mails = S.map((s,i)=>({id:"d"+i,from:s[0],subject:s[1],body:s[2],full:true,result:classify(s[1],s[2])}));
  render();
}

/* ---------- UI ---------- */
function render(){
  const all = ["other"].concat(LABELS);
  const counts = {}; all.forEach(l=>counts[l]=mails.filter(m=>m.result.label===l).length);
  const jobs = mails.length - counts.other;
  const parts = LABELS.filter(l=>counts[l]).map(l=>counts[l]+" "+NAMES[l].toLowerCase());
  $("banner").innerHTML = mails.length
    ? "Found <b>"+jobs+" application emails</b>"+(parts.length?": "+parts.join(", "):"")+" (and "+counts.other+" other)."
    : "No emails found. Try a different filter.";
  const chips = [["all","All",mails.length]].concat(LABELS.map(l=>[l,NAMES[l],counts[l]]), [["other","Other",counts.other]]);
  $("chips").innerHTML = chips.map(([k,n,c])=>`<button class="chip" data-k="${k}" aria-pressed="${filter===k}">${k!=="all"?`<span class="dot" style="background:${color(k)}"></span>`:""}${n} (${c})</button>`).join("");
  $("chips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{filter=b.dataset.k;render();});
  const order = l => LABELS.indexOf(l)<0 ? 99 : LABELS.indexOf(l);
  const shown = mails.filter(m=> filter==="all" ? m.result.label!=="other" : m.result.label===filter)
                     .sort((a,b)=>order(a.result.label)-order(b.result.label));
  $("list").innerHTML = shown.length ? shown.map(m=>`<button class="mail ${m.id===activeId?"active":""}" data-id="${esc(m.id)}" style="border-left-color:${color(m.result.label)}"><b>${esc(m.subject)}</b><span class="f">${esc(m.from)}</span><span class="tag" style="color:${color(m.result.label)}">${NAMES[m.result.label]}</span></button>`).join("") : '<p class="empty">No emails here.</p>';
  $("list").querySelectorAll(".mail").forEach(b=>b.onclick=()=>openMail(b.dataset.id));
  const m = mails.find(x=>x.id===activeId);
  if(m){
    $("viewer").innerHTML = `<div class="result" style="border-left:5px solid ${color(m.result.label)}"><span class="tag" style="color:${color(m.result.label)}">${NAMES[m.result.label]}</span><div class="big">This email is: ${NAMES[m.result.label]}</div><p class="why">${esc(m.result.why)}</p></div><b>${esc(m.subject)}</b><div class="why">${esc(m.from)} ${esc(m.date||"")}</div><div class="body">${esc(m.body)}</div>`;
  }
}

$("connect").onclick = connect;
$("demo").onclick = demo;
