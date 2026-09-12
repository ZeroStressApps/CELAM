const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const REMINDERS_KEY="celam-personal-reminders-v1";
const POPUP_KEY="celam-shown-reminders-v1";
const REMINDERS_COLLECTION="reminders";
let REMINDER_USER_UID="";
let REMINDER_USER_NAME="";
let REMINDERS_SYNCING=false;
let EDITING_REMINDER_ID="";

function reminderStorageKey(){
  return REMINDER_USER_UID ? `${REMINDERS_KEY}:${REMINDER_USER_UID}` : null;
}
function popupStorageKey(){
  return REMINDER_USER_UID ? `${POPUP_KEY}:${REMINDER_USER_UID}` : null;
}
function reminderDb(){
  return window.CELAM_FIRESTORE_DB || null;
}
function cacheReminders(){
  const key=reminderStorageKey();
  if(!key)return;
  try{localStorage.setItem(key,JSON.stringify(data.reminders));}catch(e){console.warn("CELAM: no se pudo guardar la copia local",e)}
}
function readCachedReminders(){
  const key=reminderStorageKey();
  if(!key)return [];
  try{
    const parsed=JSON.parse(localStorage.getItem(key)||"[]");
    return Array.isArray(parsed)?parsed:[];
  }catch(e){return []}
}

async function syncRemindersFromFirestore(){
  const db=reminderDb();
  const uid=REMINDER_USER_UID;
  if(!db||!uid)return;
  REMINDERS_SYNCING=true;
  try{
    const snap=await db.collection("users").doc(uid).collection(REMINDERS_COLLECTION).get();
    const remote=snap.docs.map(doc=>({id:doc.id,...doc.data()}));

    if(remote.length===0){
      // Primera sincronización: conserva los recordatorios locales existentes.
      // Solo se suben si Firestore está realmente vacío para ese usuario.
      const local=readCachedReminders();
      if(local.length){
        const batch=db.batch();
        local.forEach(r=>{
          const id=String(r.id||`${Date.now()}-${Math.random().toString(36).slice(2)}`);
          r.id=id;
          batch.set(db.collection("users").doc(uid).collection(REMINDERS_COLLECTION).doc(id),r);
        });
        await batch.commit();
        data.reminders=local;
      }else{
        data.reminders=[];
      }
    }else{
      data.reminders=remote;
    }
    cacheReminders();
    render();
    checkDueReminders();
  }catch(error){
    console.error("CELAM: no se pudieron sincronizar los recordatorios con Firestore:",error);
    // Si Firestore no está disponible, seguimos mostrando la copia local.
    data.reminders=readCachedReminders();
    render();
  }finally{
    REMINDERS_SYNCING=false;
  }
}

function setReminderUser(userOrUid, memberName=""){
  const uid=typeof userOrUid==="string"?userOrUid:(userOrUid?.uid||"");
  REMINDER_USER_UID=uid;
  REMINDER_USER_NAME=String(memberName||"");
  if(!uid){
    data.reminders=[];
    render();
    return;
  }

  data.reminders=readCachedReminders();
  render();
  // Firestore es la fuente compartida entre dispositivos.
  syncRemindersFromFirestore();
}
window.CELAM_SET_REMINDER_USER=setReminderUser;
const $=s=>document.querySelector(s);

function clone(o){return JSON.parse(JSON.stringify(o))}

function loadReminders(){
  return readCachedReminders();
}

async function saveReminders(){
  cacheReminders();
  const db=reminderDb(),uid=REMINDER_USER_UID;
  if(!db||!uid)return;

  try{
    const col=db.collection("users").doc(uid).collection(REMINDERS_COLLECTION);
    const existing=await col.get();
    const currentIds=new Set(data.reminders.map(r=>String(r.id)));
    const batch=db.batch();
    existing.docs.forEach(doc=>{
      if(!currentIds.has(doc.id))batch.delete(doc.ref);
    });
    data.reminders.forEach(r=>{
      const id=String(r.id||`${Date.now()}-${Math.random().toString(36).slice(2)}`);
      r.id=id;
      batch.set(col.doc(id),r);
    });
    await batch.commit();
    cacheReminders();
  }catch(error){
    console.error("CELAM: no se pudieron guardar los recordatorios en Firestore:",error);
  }
}

// Los recordatorios se guardan en Firestore por UID y además mantienen una copia local de respaldo.
// Datos oficiales: siempre vienen de data.js.
// Solo los recordatorios se guardan localmente en el dispositivo.
let data={
  year:Number(CELAM_DEFAULT_DATA.year)||2026,
  theme:CELAM_DEFAULT_DATA.theme||"Nuestro año juntos",
  people:Array.isArray(CELAM_DEFAULT_DATA.people)?CELAM_DEFAULT_DATA.people.map(p=>Object.freeze({...p})):[],
  reminders:[]
};

let viewDate=new Date(data.year,new Date().getMonth(),1);
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function initials(name){return String(name||"?").split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function saintDate(v){
  const m=String(v||"").trim().match(/^(\d{1,2})[\/-](\d{1,2})$/);
  return m?{day:Number(m[1]),month:Number(m[2])}:null;
}
function birthdayDate(p,year){
  if(!p.birthday)return null;
  const d=new Date(p.birthday+"T00:00:00");
  return new Date(year,d.getMonth(),d.getDate());
}
function saintDateFor(p,year){
  const s=saintDate(p.saint);
  return s?new Date(year,s.month-1,s.day):null;
}
function dateKey(y,m,d){return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function nextAnnualDate(p,type,from=new Date()){
  const y=from.getFullYear();
  let d=type==="birthday"?birthdayDate(p,y):saintDateFor(p,y);
  if(!d)return null;
  const today=new Date(y,from.getMonth(),from.getDate());
  if(d<today)d=type==="birthday"?birthdayDate(p,y+1):saintDateFor(p,y+1);
  return d;
}
function render(){
  if(viewDate.getFullYear()!==data.year)viewDate=new Date(data.year,Math.min(viewDate.getMonth(),11),1);
  $("#yearTitle").textContent=data.year;
  $("#themeTitle").textContent=data.theme;
  $("#monthTitle").textContent=MONTHS[viewDate.getMonth()];
  renderCalendar();renderMonthEvents();renderNextBirthday();renderNextReminder();
  renderContacts();renderReminders();renderCalendarSearch("");
  checkDueReminders();
}
function eventsFor(y,m,d){
  const out=[];
  data.people.forEach(p=>{
    const b=birthdayDate(p,y);
    if(b&&b.getMonth()+1===m&&b.getDate()===d)out.push({type:"birthday",title:"🎂 "+p.name});
    const s=saintDateFor(p,y);
    if(s&&s.getMonth()+1===m&&s.getDate()===d)out.push({type:"saint",title:"🌿 "+p.name+" · santo"});
  });
  data.reminders.forEach(r=>{
    if(r.date===dateKey(y,m,d)&&!r.done)out.push({type:"reminder",title:"🔔 "+r.title});
  });
  return out;
}
function renderCalendar(){
  const grid=$("#calendarGrid");grid.innerHTML="";
  const y=viewDate.getFullYear(),m=viewDate.getMonth(),first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate();
  for(let i=0;i<42;i++){
    const offset=i-start+1;let dn=offset,cm=m,cy=y;
    if(offset<1){dn=prev+offset;cm=m-1;if(cm<0){cm=11;cy--}}
    else if(offset>days){dn=offset-days;cm=m+1;if(cm>11){cm=0;cy++}}
    const cell=document.createElement("div");cell.className="day"+(cm!==m?" other-month":"");
    const now=new Date();
    if(cy===now.getFullYear()&&cm===now.getMonth()&&dn===now.getDate()&&cy===data.year)cell.classList.add("today");
    cell.innerHTML=`<div class="day-number">${dn}</div><div class="day-events"></div>`;
    const wrap=cell.querySelector(".day-events"),events=eventsFor(cy,cm+1,dn);
    events.slice(0,3).forEach(e=>{const p=document.createElement("div");p.className=`event-pill ${e.type}`;p.textContent=e.title;wrap.appendChild(p)});
    if(events.length>3){const p=document.createElement("div");p.className="event-pill more";p.textContent=`+${events.length-3} más`;wrap.appendChild(p)}
    grid.appendChild(cell);
  }
}
function renderMonthEvents(){
  const m=viewDate.getMonth()+1,y=viewDate.getFullYear(),items=[];
  data.people.forEach(p=>{
    const d=birthdayDate(p,y);
    if(d&&d.getMonth()+1===m)items.push({day:d.getDate(),icon:"🎂",title:p.name,detail:`Cumpleaños`});
    const s=saintDateFor(p,y);
    if(s&&s.getMonth()+1===m)items.push({day:s.getDate(),icon:"🌿",title:`Santo de ${p.name}`,detail:`${s.getDate()} de ${MONTHS[m-1].toLowerCase()}`});
  });
  data.reminders.filter(r=>!r.done&&r.date.startsWith(`${y}-${String(m).padStart(2,"0")}-`)).forEach(r=>items.push({day:Number(r.date.slice(-2)),icon:"🔔",title:r.title,detail:r.time?`${r.date.slice(-2)} de ${MONTHS[m-1].toLowerCase()} · ${r.time}`:`${r.date.slice(-2)} de ${MONTHS[m-1].toLowerCase()}`}));
  items.sort((a,b)=>a.day-b.day);
  $("#detailTitle").textContent=items.length?`Fechas importantes de ${MONTHS[m-1].toLowerCase()}`:"Fechas importantes";
  $("#monthEvents").innerHTML=items.length?items.map(i=>`<div class="event-item"><div class="event-date">${i.icon}<br>${i.day}</div><div><strong>${esc(i.title)}</strong><span>${esc(i.detail)}</span></div></div>`).join(""):`<div class="empty">Todavía no hay fechas configuradas para este mes.</div>`;
}
function renderNextBirthday(){
  const today=new Date(),c=[];
  data.people.forEach(p=>{const d=nextAnnualDate(p,"birthday",today);if(d)c.push({p,d})});
  c.sort((a,b)=>a.d-b.d);const n=c[0];
  $("#nextBirthdayName").textContent=n?n.p.name:"No hay cumpleaños";
  $("#nextBirthdayDate").textContent=n?`🎂 ${n.d.getDate()} de ${MONTHS[n.d.getMonth()].toLowerCase()}`:"";
}
function renderNextReminder(){
  const now=Date.now(),rs=data.reminders.filter(r=>!r.done&&new Date(`${r.date}T${r.time||"23:59"}`).getTime()>=now).sort((a,b)=>new Date(`${a.date}T${a.time||"23:59"}`)-new Date(`${b.date}T${b.time||"23:59"}`)),r=rs[0];
  $("#nextReminderTitle").textContent=r?r.title:"No hay recordatorios";
  $("#nextReminderDate").textContent=r?`${r.date}${r.time?" · "+r.time:""}`:"Añade uno desde Recordatorios";
}

function renderContacts(){
  const c=$("#contactsList");
  const q=($("#agendaSearch")?.value||"").trim().toLowerCase();

  const people=data.people.filter(p =>
    [p.name,p.phone,p.email,p.address,p.address2]
      .some(v => String(v||"").toLowerCase().includes(q))
  );

  if(!people.length){
    c.innerHTML=`<div class="empty">
      ${q
        ? "No hemos encontrado a nadie con esa búsqueda."
        : "Todavía no hay familiares en la agenda."}
    </div>`;
    return;
  }

  c.innerHTML=people.map(p=>{

    const addresses=[p.address,p.address2].filter(Boolean);

    const addressHtml=addresses.map((address,i)=>{

      if(address==="Con Dios"){
        return `<div>🕊️ Con Dios</div>`;
      }

      return `
        <div class="address-line">
          📍 ${esc(address)}
          <a
            class="map-action"
            target="_blank"
            rel="noopener"
            href="${mapsUrl(address)}"
          >
            📍 Cómo llegar${addresses.length>1 ? ` (${i+1})` : ""}
          </a>
        </div>
      `;
    }).join("");

    const actions=[];

    if(p.phone){
      actions.push(`
        <a href="tel:${esc(p.phone)}">
          📞 Llamar
        </a>
      `);
    }

    if(p.email){
      actions.push(`
        <a href="mailto:${esc(p.email)}">
          ✉️ Email
        </a>
      `);
    }

    return `
      <article class="contact-card">

        <div class="contact-avatar">
          ${esc(initials(p.name))}
        </div>

        <div class="contact-body">

          <strong>${esc(p.name)}</strong>

          <div class="contact-detail">

            ${p.birthday
              ? `🎂 ${formatBirthday(p.birthday)}`
              : ""}

            ${p.saint
              ? `<br>🌿 Santo: ${esc(p.saint)}`
              : ""}

            ${addressHtml}

            ${p.phone
              ? `<br>📞 ${esc(p.phone)}`
              : ""}

            ${p.email
              ? `<br>✉️ ${esc(p.email)}`
              : ""}

          </div>

          <div class="contact-actions">
            ${actions.join("")}
          </div>

        </div>

      </article>
    `;

  }).join("");
}

function formatBirthday(v){const d=new Date(v+"T00:00:00");return `${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()}`}

// Limpia la dirección únicamente para Google Maps.
// Conserva calle + número + código postal + ciudad y elimina el piso/puerta.
// La dirección completa sigue mostrándose en la Agenda.
function mapsAddress(address){
  const parts = String(address || "")
    .split(",")
    .map(p => p.trim())
    .filter(Boolean);

  const cpIndex = parts.findIndex(p => /^\d{5}$/.test(p));

  if (cpIndex >= 2) {
    return [
      ...parts.slice(0, 2),
      ...parts.slice(cpIndex)
    ].join(", ");
  }

  return address;
}

function mapsUrl(address){
  const cleanAddress = mapsAddress(address);

  return "https://www.google.com/maps/dir/?api=1&destination="
    + encodeURIComponent(cleanAddress)
    + "&travelmode=driving";
}

function renderCalendarSearch(query){
  const c=$("#calendarSearchResults");if(!c)return;
  const q=String(query||"").trim().toLowerCase();
  if(!q){c.innerHTML="";return}
  const results=[];
  data.people.forEach((p,index)=>{
    const name=String(p.name||"").toLowerCase();
    if(!name.includes(q))return;
    const b=birthdayDate(p,data.year),s=saintDateFor(p,data.year);
    if(b)results.push({index,type:"birthday",icon:"🎂",label:"Cumpleaños",day:b.getDate(),month:b.getMonth(),person:p});
    if(s)results.push({index,type:"saint",icon:"🌿",label:"Santo",day:s.getDate(),month:s.getMonth(),person:p});
  });
  if(!results.length){c.innerHTML=`<div class="empty">No hemos encontrado a nadie con ese nombre.</div>`;return}
  c.innerHTML=results.map(r=>`<button class="search-result" data-search-person="${r.index}" data-search-month="${r.month}"><span>${r.icon}</span><div><strong>${esc(r.person.name)}</strong><small>${r.label}: ${r.day} de ${MONTHS[r.month].toLowerCase()}</small></div></button>`).join("");
  c.querySelectorAll("[data-search-person]").forEach(b=>b.onclick=()=>{
    viewDate=new Date(data.year,Number(b.dataset.searchMonth),1);
    render();
    document.querySelector("#calendarView .calendar-section")?.scrollIntoView({behavior:"smooth"});
  });
}

function renderReminders(){
  const c=$("#remindersList"),rs=[...data.reminders].sort((a,b)=>new Date(`${a.date}T${a.time||"23:59"}`)-new Date(`${b.date}T${b.time||"23:59"}`));
  if(!rs.length){c.innerHTML=`<div class="empty">No tienes recordatorios todavía.</div>`;return}
  c.innerHTML=rs.map((r,i)=>`<article class="reminder-item ${r.done?"completed":""}">
    <div class="reminder-main"><div class="reminder-icon">🔔</div><div><strong>${esc(r.title)}</strong><span>${esc(r.date)}${r.time?" · "+esc(r.time):""}${r.note?" · "+esc(r.note):""}</span></div></div>
    <div class="reminder-actions"><button class="edit-btn" data-edit="${i}" aria-label="Modificar">✎</button><button class="done-btn" data-done="${i}" aria-label="Marcar completado">${r.done?"↩":"✓"}</button><button class="delete-btn" data-delete="${i}" aria-label="Eliminar">×</button></div>
  </article>`).join("");
  c.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{
    const r=rs[Number(b.dataset.edit)];
    openReminder(r);
  });
  c.querySelectorAll("[data-done]").forEach(b=>b.onclick=()=>{
    const r=rs[Number(b.dataset.done)],real=data.reminders.indexOf(r);
    data.reminders[real].done=!data.reminders[real].done;saveReminders().finally(render);
  });
  c.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{
    const r=rs[Number(b.dataset.delete)];
    data.reminders.splice(data.reminders.indexOf(r),1);saveReminders().finally(render);
  });
}

function populateReminderPeople(){
  const select=$("#reminderPerson");if(!select)return;

  const orderedPeople=data.people
    .map((p,i)=>({p,i}))
    .sort((a,b)=>{
      const aConDios=/\bcon\s+dios\b/i.test(String(a.p.address||""));
      const bConDios=/\bcon\s+dios\b/i.test(String(b.p.address||""));
      return Number(aConDios)-Number(bConDios);
    });

  select.innerHTML=orderedPeople
    .map(({p,i})=>`<option value="${i}">${esc(p.name)}</option>`)
    .join("");

  updateReminderDate();
}
function updateReminderDate(){
  const p=data.people[Number($("#reminderPerson")?.value||0)],type=$("#reminderType")?.value;
  if(!p||!type)return;
  const d=nextAnnualDate(p,type,new Date());
  if(!d)return;
  $("#reminderDate").value=dateKey(d.getFullYear(),d.getMonth()+1,d.getDate());
  $("#reminderPreview").textContent=`Se guardará para el próximo ${type==="birthday"?"cumpleaños":"santo"} de ${p.name}.`;
}
function openReminder(reminder=null){
  EDITING_REMINDER_ID = reminder?.id || "";
  $("#reminderForm").reset();
  populateReminderPeople();
  if(!reminder && $("#reminderType")){
    $("#reminderType").value="birthday";
    $("#reminderType").selectedIndex=0;
  }
  if(reminder){
    const personIndex=data.people.findIndex(p=>{
      const expected=`${p.name} · ${reminder.type==="saint"?"santo":"cumpleaños"}`;
      return expected===reminder.title;
    });
    if(personIndex>=0) $("#reminderPerson").value=String(personIndex);
    if($("#reminderType")) $("#reminderType").value=reminder.type||"birthday";
    if($("#reminderDate")) $("#reminderDate").value=reminder.date||"";
    if($("#reminderTime")) $("#reminderTime").value=reminder.time||"";
    if($("#reminderNote")) $("#reminderNote").value=reminder.note||"";
    $("#reminderDialog h2").textContent="Modificar recordatorio";
    $("#reminderForm button[type=submit]").textContent="Guardar cambios";
  }else{
    $("#reminderDialog h2").textContent="No olvidarlo";
    $("#reminderForm button[type=submit]").textContent="Guardar recordatorio";
  }
  $("#reminderDialog").showModal();
}
function checkDueReminders(){
  const today=new Date(),key=dateKey(today.getFullYear(),today.getMonth()+1,today.getDate());
  if(!REMINDER_USER_UID)return;
  const popupKey=popupStorageKey();
  let shown=[];
  try{shown=JSON.parse(localStorage.getItem(popupKey)||"[]")}catch(e){}
  const due=data.reminders.filter(r=>!r.done&&r.date===key&&!shown.includes(r.id||`${r.title}-${r.date}`));
  if(!due.length)return;
  const r=due[0],id=r.id||`${r.title}-${r.date}`;
  shown.push(id);localStorage.setItem(popupKey,JSON.stringify(shown.slice(-100)));
  $("#popupTitle").textContent="No te olvides de felicitar a...";
  $("#popupText").textContent=r.title;
  $("#birthdayPopup").showModal();
  if("Notification"in window&&Notification.permission==="granted"){
    try{new Notification("CELAM",{body:`No te olvides de felicitar a... ${r.title}`})}catch(e){}
  }
}
function switchView(view){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===view));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===view+"View"));
}
window.switchView=switchView;
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>switchView(t.dataset.view));
$("#prevMonth").onclick=()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1);render()};
$("#nextMonth").onclick=()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1);render()};
function goToday(){viewDate=new Date(data.year,new Date().getFullYear()===data.year?new Date().getMonth():0,1);switchView("calendar");render();window.scrollTo({top:0,behavior:"smooth"})}
$("#todayBtn").onclick=goToday;$("#monthToday").onclick=goToday;

$("#calendarSearch")?.addEventListener("input",e=>renderCalendarSearch(e.target.value));
$("#agendaSearch")?.addEventListener("input",()=>renderContacts());

$("#addReminder")?.addEventListener("click",openReminder);
$("#closeReminder")?.addEventListener("click",()=>$("#reminderDialog").close());
$("#cancelReminder")?.addEventListener("click",()=>$("#reminderDialog").close());
$("#reminderPerson")?.addEventListener("change",updateReminderDate);
$("#reminderType")?.addEventListener("change",updateReminderDate);
$("#reminderForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  if(!REMINDER_USER_UID)return;
  const i=Number($("#reminderPerson").value),p=data.people[i],type=$("#reminderType").value;
  if(!p)return;
  const d=$("#reminderDate").value;
  const title=`${p.name} · ${type==="birthday"?"cumpleaños":"santo"}`;
  if(EDITING_REMINDER_ID){
    const r=data.reminders.find(x=>x.id===EDITING_REMINDER_ID);
    if(r){
      r.title=title; r.date=d; r.time=$("#reminderTime").value; r.note=$("#reminderNote").value.trim(); r.type=type;
    }
  }else{
    data.reminders.push({
      id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,date:d,time:$("#reminderTime").value,note:$("#reminderNote").value.trim(),done:false,type
    });
  }
  saveReminders().finally(()=>{ EDITING_REMINDER_ID=""; $("#reminderDialog").close(); render(); });
});

$("#notificationBtn")?.addEventListener("click",async()=>{
  if(!("Notification"in window)){alert("Este navegador no admite avisos.");return}
  const p=await Notification.requestPermission();
  alert(p==="granted"?"Avisos activados. CELAM podrá mostrarte el aviso cuando abras la app ese día.":"No se han activado los avisos.");
});
$("#closeBirthdayPopup")?.addEventListener("click",()=>$("#birthdayPopup").close());


/* =========================
   RETOS CELAM
   ========================= */
let CELAM_CHALLENGES=[];
let CURRENT_RANKING_MODE="monthly";

function challengesDb(){return window.CELAM_FIRESTORE_DB||null}
function currentUid(){return window.CELAM_CURRENT_USER?.uid||""}
function currentName(){return window.CELAM_CURRENT_USER?.name||"Usuario"}
function isChallengeAdmin(){return !!window.CELAM_IS_ADMIN}
function familyNameByIndex(i){return data.people?.[Number(i)]?.name||""}

async function loadChallenges(){
  const db=challengesDb();
  if(!db)return;
  try{
    const snap=await db.collection("challenges").orderBy("month","desc").get();
    CELAM_CHALLENGES=snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(error){
    console.error("CELAM: no se pudieron cargar los retos",error);
    try{
      const snap=await db.collection("challenges").get();
      CELAM_CHALLENGES=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.month||"").localeCompare(String(a.month||"")));
    }catch(e){CELAM_CHALLENGES=[]}
  }
  renderChallenges();
}

function challengeMonthLabel(month){
  if(!month)return "";
  const [y,m]=String(month).split("-");
  return `${MONTHS[Number(m)-1]||m} ${y}`;
}
function challengeCurrent(){
  const now=new Date();
  const key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  return CELAM_CHALLENGES.find(c=>c.month===key)||CELAM_CHALLENGES[0]||null;
}
function validUrl(u){try{return new URL(u).href}catch(e){return "#"}}

async function getMyParticipation(challengeId){
  const db=challengesDb(),uid=currentUid();
  if(!db||!uid)return null;
  try{
    const doc=await db.collection("challenges").doc(challengeId).collection("participants").doc(uid).get();
    return doc.exists?{id:doc.id,...doc.data()}:null;
  }catch(e){return null}
}

async function markParticipation(challengeId, submissionUrl){
  const db=challengesDb(),uid=currentUid();
  if(!db||!uid)return;
  try{
    await db.collection("challenges").doc(challengeId).collection("participants").doc(uid).set({
      uid,name:currentName(),submittedAt:firebase.firestore.FieldValue.serverTimestamp(),
      submissionUrl:submissionUrl||""
    },{merge:true});
    alert("¡Participación registrada en CELAM!");
    renderChallenges();
  }catch(e){
    console.error(e);
    alert("No se ha podido registrar la participación. Revisa la conexión.");
  }
}


async function isCurrentUserProtagonist(c){
  if(isChallengeAdmin())return true;
  const me=window.CELAM_CURRENT_USER;
  if(!me)return false;
  if(Array.isArray(c.protagonistUids) && c.protagonistUids.includes(me.uid))return true;
  if(c.protagonistUid && c.protagonistUid===me.uid)return true;
  const emails=Array.isArray(c.protagonistEmails)?c.protagonistEmails:[c.protagonistEmail];
  if(emails.filter(Boolean).some(e=>String(e).toLowerCase()===String(me.email||"").toLowerCase()))return true;
  const names=Array.isArray(c.protagonistNames)?c.protagonistNames:[c.protagonistName];
  if(names.filter(Boolean).some(n=>String(n).toLowerCase()===String(me.name||"").toLowerCase()))return true;
  return false;
}

async function renderChallengeCard(c){
  const me=await getMyParticipation(c.id);
  const canScore=isChallengeAdmin() || await isCurrentUserProtagonist(c);
  const video=validUrl(c.videoUrl), upload=validUrl(c.submissionUrl);
  return `<article class="challenge-card">
    <div class="challenge-card-header">
      <div><span class="eyebrow">${esc(challengeMonthLabel(c.month).toUpperCase())}</span><h3>${esc(c.title||"Reto CELAM")}</h3>
      <div class="challenge-meta">⭐ Protagonista: <strong>${esc((c.protagonistNames||[c.protagonistName]).filter(Boolean).join(", ")||"Por decidir")}</strong></div></div>
      <span class="challenge-status ${me?"done":"pending"}">${me?"✓ Participación registrada":"🟢 Abierto"}</span>
    </div>
    <div class="challenge-description">${esc(c.description||"")}</div>
    <div class="challenge-actions">
      ${c.videoUrl?`<a class="challenge-video" href="${video}" target="_blank" rel="noopener">▶️ Ver vídeo</a>`:""}
      ${c.submissionUrl?`<a class="challenge-submit" href="${upload}" target="_blank" rel="noopener">📤 Subir mi participación</a>`:""}
      <button class="challenge-submit" data-mark-participation="${esc(c.id)}">${me?"✓ He participado":"📌 Registrar mi participación"}</button>
      ${canScore?`<button class="challenge-score" data-score-challenge="${esc(c.id)}">🏅 Puntuar participantes</button>`:""}
      ${isChallengeAdmin()?`<button class="challenge-edit" data-edit-challenge="${esc(c.id)}">✎ Editar</button>`:""}
    </div>
  </article>`;
}

async function renderChallenges(){
  const c=$("#challengeList"); if(!c)return;
  if(!currentUid()){
    c.innerHTML=`<div class="empty">Inicia sesión para ver los retos de CELAM.</div>`;return;
  }
  if(!CELAM_CHALLENGES.length){
    c.innerHTML=`<div class="empty">Todavía no hay ningún reto publicado. Cuando llegue el primero, aparecerá aquí.</div>`;
    return;
  }
  const cards=await Promise.all(CELAM_CHALLENGES.map(renderChallengeCard));
  c.innerHTML=cards.join("");
  c.querySelectorAll("[data-mark-participation]").forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.markParticipation;
    const challenge=CELAM_CHALLENGES.find(x=>x.id===id);
    if(!challenge)return;
    const url=challenge.submissionUrl||"";
    await markParticipation(id,url);
  });
  c.querySelectorAll("[data-score-challenge]").forEach(btn=>btn.onclick=()=>openScoreDialog(btn.dataset.scoreChallenge));
  c.querySelectorAll("[data-edit-challenge]").forEach(btn=>btn.onclick=()=>openChallengeDialog(CELAM_CHALLENGES.find(x=>x.id===btn.dataset.editChallenge)));
}

function populateChallengeProtagonists(selectedIds=[]){
  const s=$("#challengeProtagonist");if(!s)return;
  const selected=new Set((Array.isArray(selectedIds)?selectedIds:[selectedIds]).map(String));
  s.innerHTML=(data.people||[]).map((p,i)=>`<option value="${i}" ${selected.has(String(i))?"selected":""}>${esc(p.name)}</option>`).join("");
}
function getChallengeProtagonistIds(challenge){
  if(Array.isArray(challenge?.protagonistIds)) return challenge.protagonistIds.map(String);
  // Compatibilidad con retos antiguos que tuvieran un solo protagonista.
  if(challenge?.protagonistName){
    const i=(data.people||[]).findIndex(p=>p.name===challenge.protagonistName);
    if(i>=0)return [String(i)];
  }
  return [];
}
function openChallengeDialog(challenge=null){
  if(!isChallengeAdmin())return;
  $("#challengeForm").reset();
  $("#challengeId").value=challenge?.id||"";
  populateChallengeProtagonists(getChallengeProtagonistIds(challenge));
  const now=new Date();
  $("#challengeMonth").value=challenge?.month||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  $("#challengeTitle").value=challenge?.title||`Reto del mes de ${MONTHS[Number($("#challengeMonth").value.split("-")[1])-1]||""}`;
  $("#challengeDescription").value=challenge?.description||"";
  $("#challengeVideoUrl").value=challenge?.videoUrl||"";
  $("#challengeSubmissionUrl").value=challenge?.submissionUrl||"";
  $("#challengeDialogTitle").textContent=challenge?"Modificar reto":"Crear reto";
  $("#challengeDialog").showModal();
}
async function saveChallenge(e){
  e.preventDefault();
  const db=challengesDb();if(!db||!isChallengeAdmin())return;
  const id=$("#challengeId").value.trim();
  const selectedOptions=Array.from($("#challengeProtagonist")?.selectedOptions||[]);
  const protagonistIds=selectedOptions.map(o=>String(o.value));
  const people=(data.people||[]);
  const protagonists=protagonistIds.map(i=>people[Number(i)]).filter(Boolean);
  const payload={
    title:$("#challengeTitle").value.trim() || (function(){
      const v=$("#challengeMonth").value;
      if(!v)return "";
      const parts=v.split("-");
      const monthName=MONTHS[Number(parts[1])-1]||"";
      return monthName ? `Reto del mes de ${monthName}` : "";
    })(),
    month:$("#challengeMonth").value,
    protagonistIds,
    protagonistNames:protagonists.map(p=>p.name),
    protagonistEmails:protagonists.map(p=>p.email||"").filter(Boolean),
    // Compatibilidad con el formato anterior de un solo protagonista.
    protagonistName:protagonists[0]?.name||"",
    protagonistEmail:protagonists[0]?.email||"",
    description:$("#challengeDescription").value.trim(),
    videoUrl:$("#challengeVideoUrl").value.trim(),
    submissionUrl:$("#challengeSubmissionUrl").value.trim(),
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  if(!id)payload.createdAt=firebase.firestore.FieldValue.serverTimestamp();
  try{
    const ref=id?db.collection("challenges").doc(id):db.collection("challenges").doc();
    await ref.set(payload,{merge:true});
    $("#challengeDialog").close();
    await loadChallenges();
  }catch(error){
    console.error(error);
    alert("No se ha podido guardar el reto. Revisa las reglas de Firestore.");
  }
}
async function openScoreDialog(challengeId){
  const c=CELAM_CHALLENGES.find(x=>x.id===challengeId);
  if(!c)return;
  if(!(await isCurrentUserProtagonist(c))){
    alert("Solo el protagonista del mes o la administración pueden puntuar.");
    return;
  }
  const db=challengesDb();if(!db)return;
  $("#scoreDialogTitle").textContent=`Puntuaciones · ${challengeMonthLabel(c.month)}`;
  $("#scoreList").innerHTML="<div class='empty'>Cargando participantes…</div>";
  $("#scoreDialog").showModal();
  try{
    const snap=await db.collection("challenges").doc(challengeId).collection("participants").orderBy("submittedAt","asc").get();
    if(snap.empty){$("#scoreList").innerHTML="<div class='empty'>Todavía no hay participaciones registradas.</div>";return}
    $("#scoreList").innerHTML=snap.docs.map(d=>{
      const p=d.data();
      return `<div class="score-row"><div><strong>${esc(p.name||"Participante")}</strong><small>${p.submissionUrl?"Participación enviada":"Participación registrada"}</small></div>
      <input class="score-input" type="number" min="0" max="10" step="1" value="${Number.isFinite(p.score)?p.score:""}" placeholder="0-10" data-score-uid="${esc(d.id)}"></div>`;
    }).join("");
    $("#scoreList").insertAdjacentHTML("beforeend",`<div class="dialog-actions"><button class="primary-button" id="saveScoresBtn">Guardar puntuaciones</button></div>`);
    $("#saveScoresBtn").onclick=async()=>{
      const batch=db.batch();
      $("#scoreList").querySelectorAll("[data-score-uid]").forEach(input=>{
        const score=input.value===""?null:Number(input.value);
        if(score===null||Number.isNaN(score))return;
        const ref=db.collection("challenges").doc(challengeId).collection("participants").doc(input.dataset.scoreUid);
        batch.set(ref,{score,scoredAt:firebase.firestore.FieldValue.serverTimestamp(),scoredBy:currentUid()},{merge:true});
      });
      try{await batch.commit();alert("Puntuaciones guardadas.");$("#scoreDialog").close();renderRanking(CURRENT_RANKING_MODE)}
      catch(e){alert("No se han podido guardar las puntuaciones.")}
    };
  }catch(e){
    console.error(e);
    $("#scoreList").innerHTML="<div class='empty'>No se han podido cargar las participaciones. Revisa las reglas de Firestore.</div>";
  }
}
async function renderRanking(mode="monthly"){
  CURRENT_RANKING_MODE=mode;
  const box=$("#rankingContent");if(!box)return;
  const db=challengesDb();if(!db){box.innerHTML="<div class='empty'>Firestore no está disponible.</div>";return}
  box.innerHTML="<div class='empty'>Cargando ranking…</div>";
  try{
    const challengeDocs=await db.collection("challenges").get();
    const challenges=challengeDocs.docs.map(d=>({id:d.id,...d.data()}));
    const totals={};
    challenges.forEach(c=>{
      const year=String(c.month||"").slice(0,4);
      if(mode==="monthly" && c.month!==challengeCurrent()?.month)return;
      if(mode==="annual" && year!==String(data.year))return;
    });
    for(const c of challenges){
      const year=String(c.month||"").slice(0,4);
      if(mode==="annual" && year!==String(data.year))continue;
      if(mode==="monthly" && c.month!==challengeCurrent()?.month)continue;
      const snap=await db.collection("challenges").doc(c.id).collection("participants").get();
      snap.forEach(d=>{
        const p=d.data(),score=Number(p.score);
        if(!Number.isFinite(score))return;
        totals[p.uid]=totals[p.uid]||{name:p.name||"Participante",points:0};
        totals[p.uid].points+=score;
      });
    }
    const rows=Object.values(totals).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
    if(!rows.length){box.innerHTML="<div class='empty'>Todavía no hay puntuaciones.</div>";return}
    box.innerHTML=`<table class="ranking-table"><thead><tr><th>#</th><th>Participante</th><th>Puntos</th></tr></thead><tbody>${
      rows.map((r,i)=>`<tr><td class="ranking-place">${i<3?["🥇","🥈","🥉"][i]:i+1}</td><td>${esc(r.name)}</td><td><strong>${r.points}</strong></td></tr>`).join("")
    }</tbody></table>`;
  }catch(e){console.error(e);box.innerHTML="<div class='empty'>No se ha podido cargar el ranking.</div>"}
}

async function renderAdminChallenges(){
  const box=$("#adminChallengeList");
  if(!box)return;
  if(!isChallengeAdmin()){
    box.innerHTML="<div class='empty'>Esta zona está reservada para administradores.</div>";
    return;
  }
  if(!CELAM_CHALLENGES.length){
    box.innerHTML=`<div class="empty">Todavía no hay retos creados. Usa <strong>＋ Crear reto</strong> para preparar el primero.</div>`;
    return;
  }
  box.innerHTML=CELAM_CHALLENGES.map(c=>`<article class="admin-challenge-row">
    <div><span class="eyebrow">${esc(challengeMonthLabel(c.month).toUpperCase())}</span><strong>${esc(c.title||"Reto CELAM")}</strong><small>⭐ ${esc((c.protagonistNames||[c.protagonistName]).filter(Boolean).join(", ")||"Por decidir")}</small></div>
    <button class="challenge-edit" data-admin-edit-challenge="${esc(c.id)}">✎ Editar</button>
  </article>`).join("");
  box.querySelectorAll("[data-admin-edit-challenge]").forEach(btn=>btn.onclick=()=>openChallengeDialog(CELAM_CHALLENGES.find(x=>x.id===btn.dataset.adminEditChallenge)));
}

$("#challengeRankingBtn")?.addEventListener("click",async()=>{
  $("#rankingPanel").hidden=false; await renderRanking("monthly");
  $("#rankingPanel").scrollIntoView({behavior:"smooth",block:"start"});
});
$("#closeRankingBtn")?.addEventListener("click",()=>$("#rankingPanel").hidden=true);
document.querySelectorAll("[data-ranking]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-ranking]").forEach(x=>x.classList.toggle("active",x===b));renderRanking(b.dataset.ranking)});
$("#addChallengeBtn")?.addEventListener("click",()=>openChallengeDialog());
$("#adminAddChallengeBtn")?.addEventListener("click",()=>openChallengeDialog());
$("#closeChallenge")?.addEventListener("click",()=>$("#challengeDialog").close());
$("#cancelChallenge")?.addEventListener("click",()=>$("#challengeDialog").close());
$("#challengeForm")?.addEventListener("submit",saveChallenge);
$("#closeScore")?.addEventListener("click",()=>$("#scoreDialog").close());

const _switchView=switchView;
switchView=function(view){
  if(view==="admin" && !isChallengeAdmin()){
    _switchView("calendar");
    return;
  }
  _switchView(view);
  if(view==="challenges") loadChallenges();
  if(view==="admin"){
    loadChallenges().then(renderAdminChallenges);
  }
};

window.CELAM_LOAD_CHALLENGES=loadChallenges;
window.CELAM_RENDER_ADMIN_CHALLENGES=renderAdminChallenges;

if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));
render();
