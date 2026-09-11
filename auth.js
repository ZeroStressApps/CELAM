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

logoutBtn?.addEventListener("click", async () => {
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




async function loadUserProfile(user, familyMember = null){
  const fallbackName = user.displayName || familyMember?.name || "";
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();
  let role = "usuario";

  if(snap.exists){
    const saved = snap.data() || {};
    role = saved.role === "administrador" ? "administrador" : "usuario";
  }else{
    await ref.set({
      uid: user.uid,
      email: user.email || "",
      memberName: fallbackName,
      role: "usuario",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  setCurrentUserContext(user, familyMember, role);
}

profileBtn?.addEventListener("click", () => {
  if(profileDialog && !profileDialog.open) profileDialog.showModal();
});
closeProfileBtn?.addEventListener("click", () => {
  if(profileDialog?.open) profileDialog.close();
});


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
    if(currentUserName) currentUserName.textContent = name;
    await loadUserProfile(firebase.auth().currentUser, person);
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

function setCurrentUserContext(user, familyMember = null){
  if(!user){
    window.CELAM_CURRENT_USER = null;
    return;
  }
  const member = familyMember || findFamilyMemberByEmail(user.email) || findFamilyMemberByName(user.displayName);
  window.CELAM_CURRENT_USER = {
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || member?.name || "",
    familyMember: member || null
  };
}

function populateIdentityPeople(){
  const select = document.getElementById("identityPerson");
  if(!select) return;
  const people = Array.isArray(CELAM_DEFAULT_DATA.people) ? CELAM_DEFAULT_DATA.people : [];
  const eligiblePeople = people
    .map((person, index) => ({person, index}))
    .filter(({person}) => !/\bcon\s+dios\b/i.test(String(person.address || "")));

  const counts = {};
  eligiblePeople.forEach(({person}) => {
    const name = String(person.name || "").trim();
    counts[name] = (counts[name] || 0) + 1;
  });

  select.innerHTML = eligiblePeople.map(({person, index}) => {
    const name = String(person.name || "").trim();
    const duplicate = counts[name] > 1;
    const extra = duplicate && person.address ? ` · ${String(person.address).split(",")[0]}` : "";
    return `<option value="${index}">${escHtml(name + extra)}</option>`;
  }).join("");
}

async function ensureFamilyIdentity(user){
  if(!user) return null;

  const current = window.CELAM_CURRENT_USER;
  if(current?.uid === user.uid && current.familyMember) return current.familyMember;

  const byEmail = findFamilyMemberByEmail(user.email);
  if(byEmail){
    if(user.displayName !== byEmail.name){
      try { await user.updateProfile({displayName: byEmail.name}); } catch(e) {}
    }
    setCurrentUserContext(firebase.auth().currentUser, byEmail);
    const nameEl = document.getElementById("currentUserName");
    if(nameEl) nameEl.textContent = byEmail.name;
    return byEmail;
  }

  populateIdentityPeople();
  const dialog = document.getElementById("identityDialog");
  if(dialog && !dialog.open) dialog.showModal();
  return null;
}

document.addEventListener("DOMContentLoaded", ()=>{
  const form = document.getElementById("identityForm");
  const select = document.getElementById("identityPerson");
  if(!form || !select) return;

  form.addEventListener("submit", async (event)=>{
    event.preventDefault();
    const selectedIndex = Number(select.value);
    const person = Number.isInteger(selectedIndex) ? CELAM_DEFAULT_DATA.people?.[selectedIndex] : null;
    if(!person) return;

    const user = firebase.auth().currentUser;
    if(!user) return;

    try{
      await user.updateProfile({displayName: String(person.name || "").trim()});
      setCurrentUserContext(firebase.auth().currentUser, person);
      const nameEl = document.getElementById("currentUserName");
      if(nameEl) nameEl.textContent = person.name || "";
      const dialog = document.getElementById("identityDialog");
      if(dialog?.open) dialog.close();
    }catch(error){
      console.error("No se pudo guardar la identidad CELAM:", error);
    }
  });
});

auth.onAuthStateChanged(async (user) => {
  if(user){
    if(authScreen) authScreen.hidden = true;
    if(userBar) userBar.hidden = false;

    try{
      await ensureFamilyIdentity(user);
    }catch(error){
      showAuthMessage(friendlyAuthError(error));
    }
  }else{
    if(authScreen) authScreen.hidden = false;
    if(userBar) userBar.hidden = true;
    if(currentUserName) currentUserName.textContent = "";
    if(profileDialog?.open) profileDialog.close();
    setCurrentUserContext(null);
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
