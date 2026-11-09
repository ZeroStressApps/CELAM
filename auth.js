const firebaseConfig = {
  apiKey: "AIzaSyCYhTWwCvFh2Qua5A-E8kpxMPw5uPZG7iI",
  authDomain: "celam-5de2e.firebaseapp.com",
  projectId: "celam-5de2e",
  storageBucket: "celam-5de2e.firebasestorage.app",
  messagingSenderId: "745683231702",
  appId: "1:745683231702:web:c256869ba5df3ccee4ba77"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
window.CELAM_FIRESTORE_DB = db;

const authScreen = document.getElementById("authScreen");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authMessage = document.getElementById("authMessage");
const authSubmit = document.getElementById("authSubmit");
const forgotPassword = document.getElementById("forgotPassword");
const logoutBtn = document.getElementById("logoutBtn");
const userBar = document.getElementById("userBar");
const currentUserName = document.getElementById("currentUserName");
const currentUserRole = document.getElementById("currentUserRole");
const userMenuBtn = document.getElementById("userMenuBtn");
const userMenu = document.getElementById("userMenu");
const menuReminders = document.getElementById("menuReminders");
const menuPassword = document.getElementById("menuPassword");
const menuAdmin = document.getElementById("menuAdmin");
const passwordDialog = document.getElementById("passwordDialog");
const passwordForm = document.getElementById("passwordForm");
const closePassword = document.getElementById("closePassword");
const cancelPassword = document.getElementById("cancelPassword");
const passwordMessage = document.getElementById("passwordMessage");
const profileBtn = document.getElementById("profileBtn");
const profileDialog = document.getElementById("profileDialog");
const closeProfileBtn = document.getElementById("closeProfileBtn");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileRole = document.getElementById("profileRole");
const profileUid = document.getElementById("profileUid");
const identityDialog = document.getElementById("identityDialog");
const identityForm = document.getElementById("identityForm");
const identityPerson = document.getElementById("identityPerson");

let registerMode = false;

function showAuthMessage(message, error = true){
  authMessage.textContent = message || "";
  authMessage.classList.toggle("error", !!error);
  authMessage.classList.toggle("success", !error);
}

function setAuthMode(isRegister){
  registerMode = isRegister;

  document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.authTab === (isRegister ? "register" : "login"));
  });

  document.querySelectorAll(".register-only").forEach(element => {
    element.classList.toggle("hidden", !isRegister);
  });

  authSubmit.textContent = "Entrar";
  forgotPassword.classList.remove("hidden");
authTitle.textContent = "Entrar en CELAM";
authSubtitle.textContent =
  "Inicia sesión para acceder a tu calendario familiar.";

  const password = document.getElementById("authPassword");
  password.autocomplete = isRegister ? "new-password" : "current-password";
  password.value = "";


  showAuthMessage("");
}

document.querySelectorAll("[data-auth-tab]").forEach(button => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authTab === "register"));
});

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showAuthMessage("");

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  try{
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    await auth.signInWithEmailAndPassword(email, password);
  }catch(error){
    showAuthMessage(friendlyAuthError(error));
  }
});

forgotPassword?.addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  if(!email){
    showAuthMessage("Escribe primero tu email y después pulsa aquí.");
    return;
  }

 try{
  auth.languageCode = "en";
  await auth.sendPasswordResetEmail(email);
  showAuthMessage("Te hemos enviado un email para restablecer la contraseña.", false);
}catch(error){
    showAuthMessage(friendlyAuthError(error));
  }
});

function closeUserMenu(){
  if(!userMenu)return;
  userMenu.hidden=true;
  userMenuBtn?.setAttribute("aria-expanded","false");
}

function openUserMenu(){
  if(!userMenu)return;
  userMenu.hidden=false;
  userMenuBtn?.setAttribute("aria-expanded","true");
}

userMenuBtn?.addEventListener("click", (event)=>{
  event.stopPropagation();
  if(userMenu?.hidden) openUserMenu(); else closeUserMenu();
});

document.addEventListener("click", (event)=>{
  if(userMenu && !userMenu.hidden && !event.target.closest(".user-menu-wrap")) closeUserMenu();
});

document.addEventListener("keydown", (event)=>{
  if(event.key === "Escape") closeUserMenu();
});

menuReminders?.addEventListener("click", ()=>{
  closeUserMenu();
  if(typeof window.switchView === "function") window.switchView("reminders");
  else document.querySelector('[data-view="reminders"]')?.click();
  window.scrollTo({top:0,behavior:"smooth"});
});

function showPasswordMessage(message="", error=false){
  if(!passwordMessage)return;
  passwordMessage.textContent=message;
  passwordMessage.classList.toggle("error",!!error);
  passwordMessage.classList.toggle("success",!error && !!message);
}

function openPasswordDialog(){
  closeUserMenu();
  passwordForm?.reset();
  showPasswordMessage("");
  if(passwordDialog && !passwordDialog.open) passwordDialog.showModal();
}

menuPassword?.addEventListener("click", openPasswordDialog);
menuAdmin?.addEventListener("click", ()=>{
  closeUserMenu();
  if(window.CELAM_IS_ADMIN && typeof window.switchView === "function"){
    window.switchView("admin");
    window.scrollTo({top:0,behavior:"smooth"});
  }
});
closePassword?.addEventListener("click", ()=>passwordDialog?.close());
cancelPassword?.addEventListener("click", ()=>passwordDialog?.close());

passwordForm?.addEventListener("submit", async (event)=>{
  event.preventDefault();
  showPasswordMessage("");
  const p1=document.getElementById("newPassword")?.value || "";
  const p2=document.getElementById("newPassword2")?.value || "";
  if(p1.length < 6){
    showPasswordMessage("La contraseña debe tener al menos 6 caracteres.",true);
    return;
  }
  if(p1 !== p2){
    showPasswordMessage("Las contraseñas no coinciden.",true);
    return;
  }
  const user=auth.currentUser;
  if(!user){
    showPasswordMessage("No hay una sesión iniciada.",true);
    return;
  }
  try{
    await user.updatePassword(p1);
    showPasswordMessage("Contraseña cambiada correctamente.",false);
    setTimeout(()=>passwordDialog?.close(),900);
  }catch(error){
    if(error?.code === "auth/requires-recent-login"){
      try{
        await auth.sendPasswordResetEmail(user.email);
        showPasswordMessage("Por seguridad, te hemos enviado un email para cambiarla. Revisa tu correo.",true);
      }catch(resetError){
        showPasswordMessage(friendlyAuthError(resetError),true);
      }
    }else{
      showPasswordMessage(friendlyAuthError(error),true);
    }
  }
});

logoutBtn?.addEventListener("click", async () => {
  closeUserMenu();
  try{
    await auth.signOut();
  }catch(error){
    showAuthMessage(friendlyAuthError(error));
  }
});

function friendlyAuthError(error){
  const code = error?.code || "";
  const messages = {
    "auth/invalid-email": "El email no tiene un formato válido.",
    "auth/user-not-found": "No existe una cuenta con ese email.",
    "auth/wrong-password": "La contraseña no es correcta.",
    "auth/invalid-credential": "El email o la contraseña no son correctos.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese email.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Espera un poco y vuelve a intentarlo.",
    "auth/network-request-failed": "No hay conexión con Firebase. Comprueba Internet.",
    "auth/operation-not-allowed": "El acceso por email y contraseña no está habilitado en Firebase."
  };
  return messages[code] || "No se ha podido completar la operación. Inténtalo de nuevo.";
}








function escHtml(value=""){
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));
}

function escAttr(value=""){
  return escHtml(value);
}


const PRIVACY_POLICY_VERSION = "2026-10-27-v1";
const FAMILY_ADMIN_UID = "lqWElrZXexdLnROvWAcwj3WNTNI2";
const authorizedUsersCol = db.collection("authorizedUsers");
const privacyConsentDialog = document.getElementById("privacyConsentDialog");
const privacyConsentCheck = document.getElementById("privacyConsentCheck");
const acceptPrivacyConsent = document.getElementById("acceptPrivacyConsent");
const declinePrivacyConsent = document.getElementById("declinePrivacyConsent");
const privacyConsentMessage = document.getElementById("privacyConsentMessage");
const accessDeniedDialog = document.getElementById("accessDeniedDialog");
const deniedSignOut = document.getElementById("deniedSignOut");
const requestAccessBtn = document.getElementById("requestAccessBtn");
const accessRequestMessage = document.getElementById("accessRequestMessage");
const accessRequestsCol = db.collection("accessRequests");
let pendingAuthorizedProfile = null;
let pendingAuthUser = null;

function setLocked(locked){
  document.body.classList.toggle("celam-locked", !!locked);
}

function setPrivacyMessage(message="", isError=true){
  if(!privacyConsentMessage) return;
  privacyConsentMessage.textContent=message;
  privacyConsentMessage.classList.toggle("error",!!isError && !!message);
  privacyConsentMessage.classList.toggle("success",!isError && !!message);
}

function updateAdminMenu(isAdmin){
  if(!menuAdmin)return;
  const canAdmin = isAdmin === true && window.CELAM_CURRENT_USER?.role === "administrador";
  menuAdmin.hidden = !canAdmin;
  menuAdmin.setAttribute("aria-hidden", canAdmin ? "false" : "true");
}

function setCurrentUserContext(user, familyMember = null, role = "usuario"){
  if(!user){
    window.CELAM_CURRENT_USER = null;
    window.CELAM_IS_ADMIN = false;
    updateAdminMenu(false);
    return;
  }
  const safeRole = role === "administrador" ? "administrador" : "usuario";
  window.CELAM_CURRENT_USER = {
    uid:user.uid,
    email:user.email || "",
    name:familyMember?.name || "",
    familyMember:familyMember || null,
    role:safeRole
  };
  window.CELAM_IS_ADMIN = safeRole === "administrador";
  updateAdminMenu(window.CELAM_IS_ADMIN);
  if(currentUserName) currentUserName.textContent = familyMember?.name || "";
}

let CELAM_PRIVATE_FAMILY_DATA = null;

async function loadPrivateFamilyData(){
  const snap=await db.collection("familyData").doc("main").get();
  if(!snap.exists) throw new Error("Aún no se han migrado los datos familiares a Firestore.");
  const familyData=snap.data()||{};
  if(!Array.isArray(familyData.people)) throw new Error("El documento familyData/main no contiene la lista de familiares.");
  CELAM_PRIVATE_FAMILY_DATA=familyData;
  if(typeof window.CELAM_LOAD_FAMILY_DATA === "function") window.CELAM_LOAD_FAMILY_DATA(familyData);
  return familyData;
}

function findFamilyMemberByName(name){
  const normalized = String(name || "").trim().toLowerCase();
  return (CELAM_PRIVATE_FAMILY_DATA?.people || []).find(person =>
    String(person.name || "").trim().toLowerCase() === normalized
  ) || null;
}

async function readAuthorization(user){
  // La identidad administradora se fija por UID, nunca por un rol editable desde el cliente.
  if(user.uid === FAMILY_ADMIN_UID){
    return {uid:user.uid,email:user.email||"",memberName:"Laura S.",role:"administrador",enabled:true};
  }
  const snap=await authorizedUsersCol.doc(user.uid).get();
  if(!snap.exists) return null;
  const authorization=snap.data()||{};
  return authorization.enabled === true
    ? {...authorization,uid:user.uid,role:"usuario"}
    : null;
}

async function readConsent(user){
  const snap=await db.collection("privacyConsents").doc(user.uid).get();
  return snap.exists ? (snap.data()||{}) : {};
}

async function finalizeAuthorizedSession(user, authorization){
  // La administradora tiene identidad propia: no necesita figurar en people ni en authorizedUsers.
  const isAdmin = user.uid === FAMILY_ADMIN_UID;
  await loadPrivateFamilyData();
  const memberName = isAdmin ? "Laura S." : String(authorization.memberName||"").trim();
  const familyMember = isAdmin ? { name: "Laura S." } : findFamilyMemberByName(memberName);
  if(!memberName || !familyMember){
    throw new Error("La autorización no contiene un miembro familiar válido. Revisa authorizedUsers.");
  }
  const role = isAdmin ? "administrador" : "usuario";
  setCurrentUserContext(user,familyMember,role);
  if(authScreen) authScreen.hidden=true;
  if(userBar) userBar.hidden=false;
  setLocked(false);
  if(window.CELAM_SET_REMINDER_USER) window.CELAM_SET_REMINDER_USER(user,memberName);
}

privacyConsentCheck?.addEventListener("change",()=>{
  if(acceptPrivacyConsent) acceptPrivacyConsent.disabled=!privacyConsentCheck.checked;
});

acceptPrivacyConsent?.addEventListener("click",async()=>{
  const user=pendingAuthUser;
  const authorization=pendingAuthorizedProfile;
  if(!user || !authorization || !privacyConsentCheck?.checked) return;
  acceptPrivacyConsent.disabled=true;
  setPrivacyMessage("Guardando tu aceptación…",false);
  try{
    const memberName=String(authorization.memberName||"").trim();
    const role=authorization.role === "administrador" ? "administrador" : "usuario";
    await db.collection("privacyConsents").doc(user.uid).set({
      uid:user.uid,
      accepted:true,
      policyVersion:PRIVACY_POLICY_VERSION,
      acceptedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    await finalizeAuthorizedSession(user,authorization);
    if(privacyConsentDialog?.open) privacyConsentDialog.close();
    setPrivacyMessage("");
  }catch(error){
    console.error("CELAM: no se pudo guardar el consentimiento:",error);
    setPrivacyMessage("No se ha podido guardar la aceptación. Comprueba la conexión y las reglas de Firebase.");
    acceptPrivacyConsent.disabled=!privacyConsentCheck.checked;
  }
});

declinePrivacyConsent?.addEventListener("click",async()=>{
  if(privacyConsentDialog?.open) privacyConsentDialog.close();
  pendingAuthUser=null;
  pendingAuthorizedProfile=null;
  setLocked(true);
  await auth.signOut();
});

requestAccessBtn?.addEventListener("click",async()=>{
  const user=pendingAuthUser || auth.currentUser;
  if(!user || !user.email) return;
  requestAccessBtn.disabled=true;
  if(accessRequestMessage){accessRequestMessage.textContent="Enviando solicitud…";accessRequestMessage.classList.remove("error");}
  try{
    const requestRef=accessRequestsCol.doc(user.uid);
    const previous=await requestRef.get();
    if(previous.exists && previous.data()?.status==="requested"){
      if(accessRequestMessage){accessRequestMessage.textContent="Tu solicitud ya está pendiente de revisión por Laura S.";accessRequestMessage.classList.add("success");}
      requestAccessBtn.textContent="Solicitud pendiente";
      return;
    }
    await requestRef.set({
      uid:user.uid,
      email:user.email,
      status:"requested",
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    if(accessRequestMessage){accessRequestMessage.textContent="Solicitud enviada. Laura S. revisará tu acceso.";accessRequestMessage.classList.add("success");}
    requestAccessBtn.textContent="Solicitud enviada";
  }catch(error){
    console.error("CELAM: no se pudo enviar la solicitud:",error);
    if(accessRequestMessage){accessRequestMessage.textContent="No se ha podido enviar la solicitud. Comprueba la conexión e inténtalo de nuevo.";accessRequestMessage.classList.add("error");}
    requestAccessBtn.disabled=false;
  }
});

deniedSignOut?.addEventListener("click",async()=>{
  if(accessDeniedDialog?.open) accessDeniedDialog.close();
  pendingAuthUser=null;
  pendingAuthorizedProfile=null;
  setLocked(true);
  await auth.signOut();
});

async function handleAuthorizedSignIn(user){
  setLocked(true);
  pendingAuthUser=user;
  pendingAuthorizedProfile=null;
  try{
    // Excepción absoluta por UID: la administradora entra sin autorización ni consentimiento familiar.
    if(user.uid === FAMILY_ADMIN_UID){
      const adminAuthorization={uid:user.uid,email:user.email||"",memberName:"Laura S.",role:"administrador",enabled:true};
      pendingAuthorizedProfile=adminAuthorization;
      await finalizeAuthorizedSession(user,adminAuthorization);
      if(privacyConsentDialog?.open) privacyConsentDialog.close();
      if(accessDeniedDialog?.open) accessDeniedDialog.close();
      return;
    }

    const authorization=await readAuthorization(user);
    if(!authorization){
      if(accessDeniedDialog && !accessDeniedDialog.open) accessDeniedDialog.showModal();
      return;
    }
    pendingAuthorizedProfile=authorization;

    const consent=await readConsent(user);

    if(consent.accepted === true && consent.policyVersion === PRIVACY_POLICY_VERSION){
      await finalizeAuthorizedSession(user,authorization);
      return;
    }

    if(privacyConsentCheck) privacyConsentCheck.checked=false;
    if(acceptPrivacyConsent) acceptPrivacyConsent.disabled=true;
    setPrivacyMessage("");
    if(privacyConsentDialog && !privacyConsentDialog.open) privacyConsentDialog.showModal();
  }catch(error){
    console.error("CELAM: no se pudo comprobar la autorización:",error);
    showAuthMessage("No se ha podido verificar tu autorización. Comprueba la conexión o contacta con Laura S.");
    if(accessDeniedDialog && !accessDeniedDialog.open) accessDeniedDialog.showModal();
  }
}

auth.onAuthStateChanged(async(user)=>{
  if(user){
    if(authScreen) authScreen.hidden=true;
    if(userBar) userBar.hidden=true;
    await handleAuthorizedSignIn(user);
  }else{
    setLocked(true);
    if(authScreen) authScreen.hidden=false;
    if(userBar) userBar.hidden=true;
    if(currentUserName) currentUserName.textContent="";
    setCurrentUserContext(null);
    if(window.CELAM_SET_REMINDER_USER) window.CELAM_SET_REMINDER_USER(null,"");
    if(privacyConsentDialog?.open) privacyConsentDialog.close();
    if(accessDeniedDialog?.open) accessDeniedDialog.close();
    pendingAuthUser=null;
    pendingAuthorizedProfile=null;
    setAuthMode(false);
  }
});


/* =========================
   GESTIÓN REAL DE ACCESOS
   ========================= */
const adminRequestsEl=document.getElementById("adminAccessRequests");
const adminUsersEl=document.getElementById("adminAuthorizedUsers");
const refreshAccessRequests=document.getElementById("refreshAccessRequests");

function adminMessage(el,message,isError=false){
  if(!el)return;
  el.innerHTML=`<p class="challenge-note ${isError?"error":""}">${escHtml(message)}</p>`;
}
function familyMemberOptions(selected=""){
  const people=CELAM_PRIVATE_FAMILY_DATA?.people||[];
  return `<option value="">Selecciona el familiar…</option>`+people.map(p=>{
    const name=String(p.name||"");
    return `<option value="${escAttr(name)}" ${name===selected?"selected":""}>${escHtml(name)}</option>`;
  }).join("");
}
async function loadAdminAccessLists(){
  if(!window.CELAM_IS_ADMIN || auth.currentUser?.uid!==FAMILY_ADMIN_UID)return;
  adminMessage(adminRequestsEl,"Cargando solicitudes…");
  adminMessage(adminUsersEl,"Cargando cuentas autorizadas…");
  try{
    const [requestsSnap,usersSnap]=await Promise.all([
      db.collection("accessRequests").get(),
      db.collection("authorizedUsers").get()
    ]);
    const requests=requestsSnap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.status==="requested"||r.status==="pending");
    const users=usersSnap.docs.map(d=>({id:d.id,...d.data()})).filter(u=>u.enabled===true);
    if(!requests.length)adminMessage(adminRequestsEl,"No hay solicitudes pendientes.");
    else adminRequestsEl.innerHTML=requests.map(r=>`<article class="admin-challenge-row"><div><strong>${escHtml(r.email||"Sin email")}</strong><small>UID: ${escHtml(r.uid||r.id)}</small><small>Estado: ${escHtml(r.status||"requested")}</small></div><div class="admin-access-actions"><select aria-label="Familiar para ${escAttr(r.email||r.id)}" id="family-${escAttr(r.id)}">${familyMemberOptions()}</select><button type="button" class="primary-button" data-approve-access="${escAttr(r.id)}">Autorizar cuenta</button></div></article>`).join("");
    if(!users.length)adminMessage(adminUsersEl,"Todavía no hay cuentas familiares autorizadas.");
    else adminUsersEl.innerHTML=users.map(u=>`<article class="admin-challenge-row"><div><strong>${escHtml(u.memberName||"Familiar sin asignar")}</strong><small>${escHtml(u.email||"Sin email")}</small><small>UID: ${escHtml(u.id)}</small></div><button type="button" class="secondary-button" data-revoke-access="${escAttr(u.id)}">Revocar acceso</button></article>`).join("");
  }catch(error){
    console.error("CELAM: error cargando administración:",error);
    adminMessage(adminRequestsEl,"No se han podido cargar las solicitudes. Comprueba las reglas de Firestore.",true);
    adminMessage(adminUsersEl,"No se han podido cargar las cuentas autorizadas.",true);
  }
}

async function approveFamilyAccess(uid){
  const requestSnap=await db.collection("accessRequests").doc(uid).get();
  if(!requestSnap.exists)throw new Error("La solicitud ya no existe.");
  const request=requestSnap.data()||{};
  const select=document.getElementById(`family-${uid}`);
  const memberName=String(select?.value||"").trim();
  if(!memberName)throw new Error("Selecciona primero el familiar al que corresponde esta cuenta.");
  const person=(CELAM_PRIVATE_FAMILY_DATA?.people||[]).find(p=>p.name===memberName);
  if(!person)throw new Error("No se encuentra ese familiar en los datos de CELAM.");
  const batch=db.batch();
  batch.set(db.collection("authorizedUsers").doc(uid),{
    uid,email:String(request.email||""),memberName,role:"usuario",enabled:true,
    authorizedAt:firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(db.collection("accessRequests").doc(uid),{
    uid,email:String(request.email||""),status:"approved",memberName,
    reviewedAt:firebase.firestore.FieldValue.serverTimestamp()
  },{merge:true});
  await batch.commit();
  await loadAdminAccessLists();
}
async function revokeFamilyAccess(uid){
  await db.collection("authorizedUsers").doc(uid).update({enabled:false,revokedAt:firebase.firestore.FieldValue.serverTimestamp()});
  await db.collection("privacyConsents").doc(uid).delete().catch(error=>{if(error.code!=="permission-denied"&&error.code!=="not-found")throw error;});
  await loadAdminAccessLists();
}
adminRequestsEl?.addEventListener("click",async event=>{
  const button=event.target.closest("[data-approve-access]");if(!button)return;
  button.disabled=true;
  try{await approveFamilyAccess(button.dataset.approveAccess);}
  catch(error){alert(error.message||"No se ha podido autorizar la cuenta.");button.disabled=false;}
});
adminUsersEl?.addEventListener("click",async event=>{
  const button=event.target.closest("[data-revoke-access]");if(!button)return;
  const uid=button.dataset.revokeAccess;
  if(!confirm("¿Seguro que quieres retirar el acceso a esta cuenta?"))return;
  button.disabled=true;
  try{await revokeFamilyAccess(uid);}
  catch(error){alert("No se ha podido revocar el acceso. Comprueba las reglas de Firestore.");button.disabled=false;}
});
refreshAccessRequests?.addEventListener("click",loadAdminAccessLists);
const originalSwitchView=window.switchView;
window.switchView=function(view){
  originalSwitchView(view);
  if(view==="admin")loadAdminAccessLists();
};

document.addEventListener("click", (event) => {
  const button = event.target.closest(".toggle-password");
  if(!button) return;

  const input = document.getElementById(button.dataset.target);
  if(!input) return;

  if(input.type === "password"){
    input.type = "text";
    button.textContent = "🙈";
    button.setAttribute("aria-label", "Ocultar contraseña");
  }else{
    input.type = "password";
    button.textContent = "👁️";
    button.setAttribute("aria-label", "Mostrar contraseña");
  }
});
