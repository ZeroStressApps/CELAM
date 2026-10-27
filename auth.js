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
const authorizedUsersCol = db.collection("authorizedUsers");
const privacyConsentDialog = document.getElementById("privacyConsentDialog");
const privacyConsentCheck = document.getElementById("privacyConsentCheck");
const acceptPrivacyConsent = document.getElementById("acceptPrivacyConsent");
const declinePrivacyConsent = document.getElementById("declinePrivacyConsent");
const privacyConsentMessage = document.getElementById("privacyConsentMessage");
const accessDeniedDialog = document.getElementById("accessDeniedDialog");
const deniedSignOut = document.getElementById("deniedSignOut");
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

function findFamilyMemberByName(name){
  const normalized = String(name || "").trim().toLowerCase();
  return (CELAM_DEFAULT_DATA.people || []).find(person =>
    String(person.name || "").trim().toLowerCase() === normalized
  ) || null;
}

async function readAuthorization(user){
  // Laura S. is the administrator already identified in the users profile.
  // Read the authenticated user's own profile first; Firestore rules should
  // permit a user to read their own users/{uid} document.
  const profileSnap=await db.collection("users").doc(user.uid).get();
  const profile=profileSnap.exists ? (profileSnap.data()||{}) : {};
  const profileRole=String(profile.role||"").trim().toLowerCase();
  const profileEmail=String(profile.email||"").trim().toLowerCase();
  const authEmail=String(user.email||"").trim().toLowerCase();

  if(profileRole === "administrador" && profile.uid === user.uid && profileEmail === authEmail){
    const memberName=String(profile.memberName||profile.name||"").trim();
    if(memberName){
      return {uid:user.uid,email:user.email,memberName,role:"administrador",enabled:true};
    }
  }

  const snap=await authorizedUsersCol.doc(user.uid).get();
  if(!snap.exists) return null;
  const authorization=snap.data()||{};
  return authorization.enabled === true ? authorization : null;
}

async function readConsent(user){
  const snap=await db.collection("privacyConsents").doc(user.uid).get();
  return snap.exists ? (snap.data()||{}) : {};
}

async function finalizeAuthorizedSession(user, authorization){
  const memberName=String(authorization.memberName||"").trim();
  const familyMember=findFamilyMemberByName(memberName);
  if(!memberName || !familyMember){
    throw new Error("La autorización no contiene un miembro familiar válido. Revisa authorizedUsers.");
  }
  const role=authorization.role === "administrador" ? "administrador" : "usuario";
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
    const authorization=await readAuthorization(user);
    if(!authorization){
      if(accessDeniedDialog && !accessDeniedDialog.open) accessDeniedDialog.showModal();
      return;
    }
    pendingAuthorizedProfile=authorization;
    const consent=await readConsent(user);
    if(consent.privacyConsentAccepted === true && consent.privacyConsentVersion === PRIVACY_POLICY_VERSION){
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
