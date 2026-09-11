const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const REMINDERS_KEY="celam-personal-reminders-v1";
const POPUP_KEY="celam-shown-reminders-v1";
const $=s=>document.querySelector(s);

function clone(o){return JSON.parse(JSON.stringify(o))}

function loadReminders(){
  try{
    const s=localStorage.getItem(REMINDERS_KEY);
    const parsed=JSON.parse(s||"[]");
    return Array.isArray(parsed)?parsed:[];
  }catch(e){return []}
}

function saveReminders(){
  localStorage.setItem(REMINDERS_KEY,JSON.stringify(data.reminders));
}

// Datos oficiales: siempre vienen de data.js.
// Solo los recordatorios se guardan localmente en el dispositivo.
let data={
  year:Number(CELAM_DEFAULT_DATA.year)||2026,
  theme:CELAM_DEFAULT_DATA.theme||"Nuestro año juntos",
  people:Array.isArray(CELAM_DEFAULT_DATA.people)?CELAM_DEFAULT_DATA.people.map(p=>Object.freeze({...p})):[],
  reminders:loadReminders()
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
    <div class="reminder-actions"><button class="done-btn" data-done="${i}" aria-label="Marcar completado">${r.done?"↩":"✓"}</button><button class="delete-btn" data-delete="${i}" aria-label="Eliminar">×</button></div>
  </article>`).join("");
  c.querySelectorAll("[data-done]").forEach(b=>b.onclick=()=>{
    const r=rs[Number(b.dataset.done)],real=data.reminders.indexOf(r);
    data.reminders[real].done=!data.reminders[real].done;saveReminders();render();
  });
  c.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{
    const r=rs[Number(b.dataset.delete)];
    data.reminders.splice(data.reminders.indexOf(r),1);saveReminders();render();
  });
}

function populateReminderPeople(){
  const select=$("#reminderPerson");if(!select)return;
  select.innerHTML=data.people.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join("");
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
function openReminder(){
  $("#reminderForm").reset();
  populateReminderPeople();
  $("#reminderDialog").showModal();
}
function checkDueReminders(){
  const today=new Date(),key=dateKey(today.getFullYear(),today.getMonth()+1,today.getDate());
  let shown=[];
  try{shown=JSON.parse(localStorage.getItem(POPUP_KEY)||"[]")}catch(e){}
  const due=data.reminders.filter(r=>!r.done&&r.date===key&&!shown.includes(r.id||`${r.title}-${r.date}`));
  if(!due.length)return;
  const r=due[0],id=r.id||`${r.title}-${r.date}`;
  shown.push(id);localStorage.setItem(POPUP_KEY,JSON.stringify(shown.slice(-100)));
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
  const i=Number($("#reminderPerson").value),p=data.people[i],type=$("#reminderType").value;
  if(!p)return;
  const d=$("#reminderDate").value;
  const title=`${p.name} · ${type==="birthday"?"cumpleaños":"santo"}`;
  data.reminders.push({
    id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,date:d,time:$("#reminderTime").value,note:$("#reminderNote").value.trim(),done:false
  });
  saveReminders();$("#reminderDialog").close();render();
});

$("#notificationBtn")?.addEventListener("click",async()=>{
  if(!("Notification"in window)){alert("Este navegador no admite avisos.");return}
  const p=await Notification.requestPermission();
  alert(p==="granted"?"Avisos activados. CELAM podrá mostrarte el aviso cuando abras la app ese día.":"No se han activado los avisos.");
});
$("#closeBirthdayPopup")?.addEventListener("click",()=>$("#birthdayPopup").close());

if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));
render();
