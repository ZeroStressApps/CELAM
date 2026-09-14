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

  authSubmit.textContent = isRegister ? "Crear cuenta" : "Entrar";
  forgotPassword.classList.toggle("hidden", isRegister);
  authTitle.textContent = isRegister ? "Crear cuenta" : "Entrar en CELAM";
  authSubtitle.textContent = isRegister
    ? "Crea tu cuenta para usar CELAM desde tus dispositivos."
    : "Inicia sesión para acceder a tu calendario familiar.";

  const password = document.getElementById("authPassword");
  password.autocomplete = isRegister ? "new-password" : "current-password";
  password.value = "";

  const password2 = document.getElementById("authPassword2");
  password2.value = "";
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
  const password2 = document.getElementById("authPassword2").value;

  if(registerMode && password !== password2){
    showAuthMessage("Las contraseñas no coinciden.");
    return;
  }

  try{
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    if(registerMode){
      await auth.createUserWithEmailAndPassword(email, password);
    }else{
      await auth.signInWithEmailAndPassword(email, password);
    }
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


identityForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedIndex = Number(identityPerson?.value);
  const person = Number.isInteger(selectedIndex) ? CELAM_DEFAULT_DATA.people?.[selectedIndex] : null;
  const name = person?.name || "";
  const user = auth.currentUser;

  if(!user || !name) return;

  try{
    await user.updateProfile({displayName:name});
    setCurrentUserContext(user, person, "usuario");

    try{
      const ref = db.collection("users").doc(user.uid);
      const snap = await ref.get();
      if(snap.exists){
        const saved = snap.data() || {};
        const role = saved.role === "administrador" ? "administrador" : "usuario";
        await ref.update({
          email:user.email || "",
          memberName:name,
          updatedAt:firebase.firestore.FieldValue.serverTimestamp()
        });
        setCurrentUserContext(user, person, role);
      }else{
        await ref.set({
          uid:user.uid,
          email:user.email || "",
          memberName:name,
          role:"usuario",
          createdAt:firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt:firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }catch(error){
      console.error("No se pudo guardar el perfil CELAM en Firestore:", error);
    }

    if(identityDialog?.open) identityDialog.close();
  }catch(error){
    showAuthMessage(friendlyAuthError(error));
  }
});




function findFamilyMemberByEmail(email){
  const normalized = String(email || "").trim().toLowerCase();
  return (CELAM_DEFAULT_DATA.people || []).find(person =>
    String(person.email || "").trim().toLowerCase() === normalized
  ) || null;
}

function findFamilyMemberByName(name){
  const normalized = String(name || "").trim().toLowerCase();
  return (CELAM_DEFAULT_DATA.people || []).find(person =>
    String(person.name || "").trim().toLowerCase() === normalized
  ) || null;
}


function updateAdminMenu(isAdmin){
  if(!menuAdmin)return;
  // The administration entry is visible ONLY for an explicit administrator role.
  // Any missing/unknown value is treated as a normal user.
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
    uid: user.uid,
    email: user.email || "",
    name: familyMember?.name || "",
    familyMember: familyMember || null,
    role: safeRole
  };

  window.CELAM_IS_ADMIN = safeRole === "administrador";
  updateAdminMenu(window.CELAM_IS_ADMIN);

  const nameEl = document.getElementById("currentUserName");
  if(nameEl) nameEl.textContent = familyMember?.name || "";
}

function findFamilyMemberByEmail(email){
  const normalized = String(email || "").trim().toLowerCase();
  return (CELAM_DEFAULT_DATA.people || []).find(person =>
    String(person.email || "").trim().toLowerCase() === normalized
  ) || null;
}

function findFamilyMemberByName(name){
  const normalized = String(name || "").trim().toLowerCase();
  return (CELAM_DEFAULT_DATA.people || []).find(person =>
    String(person.name || "").trim().toLowerCase() === normalized
  ) || null;
}

function populateIdentityPeople(){
  const select = document.getElementById("identityPerson");
  if(!select) return;

  const people = Array.isArray(CELAM_DEFAULT_DATA.people) ? CELAM_DEFAULT_DATA.people : [];
  const eligiblePeople = people
    .map((person,index)=>({person,index}))
    .filter(({person}) => !/\bcon\s+dios\b/i.test(String(person.address || "")));

  const counts = {};
  eligiblePeople.forEach(({person})=>{
    const name=String(person.name||"").trim();
    counts[name]=(counts[name]||0)+1;
  });

  select.innerHTML=eligiblePeople.map(({person,index})=>{
    const name=String(person.name||"").trim();
    const extra=counts[name]>1 && person.address ? ` · ${String(person.address).split(",")[0]}` : "";
    return `<option value="${index}">${escHtml(name+extra)}</option>`;
  }).join("");
}

async function getUserProfile(user){
  try{
    const snap = await db.collection("users").doc(user.uid).get();
    return snap.exists ? (snap.data() || null) : null;
  }catch(error){
    console.error("CELAM: no se pudo leer el perfil:", error);
    return null;
  }
}

async function createUserProfile(user, familyMember){
  const memberName=String(familyMember?.name||"").trim();
  if(!memberName) throw new Error("Miembro CELAM inválido.");

  const ref=db.collection("users").doc(user.uid);
  await ref.set({
    uid:user.uid,
    email:user.email||"",
    memberName,
    role:"usuario",
    createdAt:firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  });

  setCurrentUserContext(user,familyMember,"usuario");
}

async function ensureFamilyIdentity(user){
  if(!user) return null;

  // Firestore profile is the source of truth once it exists.
  const profile=await getUserProfile(user);

  if(profile?.memberName){
    const member=findFamilyMemberByName(profile.memberName);
    if(member){
      const role=profile.role==="administrador" ? "administrador" : "usuario";
      setCurrentUserContext(user,member,role);
      return member;
    }
    console.warn("CELAM: el miembro del perfil no existe en data.js:",profile.memberName);
    return null;
  }

  // For a new profile only, an exact email match in data.js is automatic.
  const byEmail=findFamilyMemberByEmail(user.email);
  if(byEmail){
    await createUserProfile(user,byEmail);
    try{ await user.updateProfile({displayName:byEmail.name}); }catch(error){}
    return byEmail;
  }

  // Unknown email: require explicit identity selection.
  populateIdentityPeople();
  if(identityDialog && !identityDialog.open) identityDialog.showModal();
  return null;
}

identityForm?.addEventListener("submit", async event=>{
  event.preventDefault();

  const user=auth.currentUser;
  if(!user) return;

  // Never overwrite an existing profile from the identity dialog.
  // This prevents a user from changing memberName or role.
  const existing=await getUserProfile(user);
  if(existing?.memberName){
    const member=findFamilyMemberByName(existing.memberName);
    if(member){
      setCurrentUserContext(user,member,existing.role==="administrador"?"administrador":"usuario");
      if(identityDialog?.open) identityDialog.close();
    }
    return;
  }

  const selectedIndex=Number(identityPerson?.value);
  const person=Number.isInteger(selectedIndex) ? CELAM_DEFAULT_DATA.people?.[selectedIndex] : null;
  if(!person?.name) return;

  try{
    await createUserProfile(user,person);
    try{ await user.updateProfile({displayName:person.name}); }catch(error){}
    if(window.CELAM_SET_REMINDER_USER) window.CELAM_SET_REMINDER_USER(user,person.name||"");
    if(identityDialog?.open) identityDialog.close();
  }catch(error){
    console.error("CELAM: no se pudo crear el perfil:",error);
    showAuthMessage("No se ha podido guardar tu identidad. Inténtalo de nuevo.");
  }
});


auth.onAuthStateChanged(async (user)=>{
  if(user){
    if(authScreen) authScreen.hidden=true;
    if(userBar) userBar.hidden=false;

    try{
      const member=await ensureFamilyIdentity(user);
      if(member){
        if(window.CELAM_SET_REMINDER_USER) {
          window.CELAM_SET_REMINDER_USER(user,member.name||"");
        }
      }else if(window.CELAM_CURRENT_USER?.familyMember){
        if(window.CELAM_SET_REMINDER_USER) {
          window.CELAM_SET_REMINDER_USER(user,window.CELAM_CURRENT_USER.familyMember.name||"");
        }
      }
    }catch(error){
      console.error("CELAM: error al cargar identidad/rol:",error);
      // Authentication remains valid even if Firestore is temporarily unavailable.
      // Only an account without a known profile needs the identity dialog.
      if(!window.CELAM_CURRENT_USER?.familyMember && identityDialog && !identityDialog.open){
        populateIdentityPeople();
        identityDialog.showModal();
      }
    }
  }else{
    if(authScreen) authScreen.hidden=false;
    if(userBar) userBar.hidden=true;
    if(currentUserName) currentUserName.textContent="";
    setCurrentUserContext(null);
    if(window.CELAM_SET_REMINDER_USER) window.CELAM_SET_REMINDER_USER(null,"");
    if(identityDialog?.open) identityDialog.close();
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
