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
  if(password){
    password.autocomplete = isRegister ? "new-password" : "current-password";
    password.value = "";
  }

  const password2 = document.getElementById("authPassword2");
  if(password2) password2.value = "";
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
  const password2 = document.getElementById("authPassword2")?.value || "";

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

function escHtml(value=""){
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));
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

function setCurrentUserContext(user, familyMember = null, role = "usuario"){
  if(!user){
    window.CELAM_CURRENT_USER = null;
    return;
  }

  const member = familyMember || findFamilyMemberByEmail(user.email) || findFamilyMemberByName(user.displayName);

  window.CELAM_CURRENT_USER = {
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || member?.name || "",
    familyMember: member || null,
    role: role === "administrador" ? "administrador" : "usuario"
  };
}

function populateIdentityPeople(){
  const select = identityPerson;
  if(!select) return;

  const people = Array.isArray(CELAM_DEFAULT_DATA.people) ? CELAM_DEFAULT_DATA.people : [];

  const eligiblePeople = people
    .map((person, index) => ({person, index}))
    .filter(({person}) => !/\bcon\s+dios\b/i.test(String(person.address || "")));

  const nameCounts = {};
  eligiblePeople.forEach(({person}) => {
    const name = String(person.name || "").trim();
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  });

  select.innerHTML = eligiblePeople.map(({person, index}) => {
    const name = String(person.name || "").trim();
    const duplicate = nameCounts[name] > 1;
    const extra = duplicate && person.address
      ? ` · ${String(person.address).split(",")[0]}`
      : "";

    return `<option value="${index}">${escHtml(name + extra)}</option>`;
  }).join("");
}

async function loadUserProfile(user, familyMember = null){
  if(!user) return null;

  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();

  if(snap.exists){
    const saved = snap.data() || {};
    const savedMember = familyMember || findFamilyMemberByName(saved.memberName) || findFamilyMemberByEmail(saved.email);
    const role = saved.role === "administrador" ? "administrador" : "usuario";

    setCurrentUserContext(user, savedMember, role);

    if(currentUserName){
      currentUserName.textContent = savedMember?.name || user.displayName || "";
    }

    return saved;
  }

  // Un perfil nuevo siempre nace como usuario.
  const memberName = familyMember?.name || user.displayName || "";
  const profile = {
    uid: user.uid,
    email: user.email || "",
    memberName,
    role: "usuario",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await ref.set(profile);

  setCurrentUserContext(user, familyMember, "usuario");

  if(currentUserName){
    currentUserName.textContent = memberName;
  }

  return profile;
}

async function ensureFamilyIdentity(user){
  if(!user) return null;

  // Primero comprobamos Firestore. Si ya existe el perfil, esa es nuestra fuente
  // persistente para saber quién es el usuario.
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();

  if(snap.exists){
    const saved = snap.data() || {};
    const member =
      findFamilyMemberByName(saved.memberName) ||
      findFamilyMemberByEmail(saved.email) ||
      findFamilyMemberByName(user.displayName);

    if(member){
      setCurrentUserContext(user, member, saved.role);
      if(currentUserName) currentUserName.textContent = member.name;
      return member;
    }
  }

  // Si Firebase Auth ya conoce el nombre, lo usamos y creamos/completamos el perfil.
  const byEmail = findFamilyMemberByEmail(user.email);
  const byName = findFamilyMemberByName(user.displayName);
  const knownMember = byEmail || byName;

  if(knownMember){
    if(user.displayName !== knownMember.name){
      try{
        await user.updateProfile({displayName: knownMember.name});
      }catch(error){}
    }

    await loadUserProfile(firebase.auth().currentUser, knownMember);
    return knownMember;
  }

  // Cuenta nueva sin identidad: obligamos a elegir de la lista.
  populateIdentityPeople();

  if(identityDialog && !identityDialog.open){
    identityDialog.showModal();
  }

  return null;
}

identityForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedIndex = Number(identityPerson?.value);
  const person = Number.isInteger(selectedIndex)
    ? CELAM_DEFAULT_DATA.people?.[selectedIndex]
    : null;

  const user = auth.currentUser;

  if(!user || !person?.name) return;

  try{
    await user.updateProfile({displayName: String(person.name).trim()});
    await loadUserProfile(firebase.auth().currentUser, person);

    if(identityDialog?.open) identityDialog.close();
  }catch(error){
    console.error("No se pudo guardar la identidad CELAM:", error);
    showAuthMessage(friendlyAuthError(error));
  }
});

auth.onAuthStateChanged(async (user) => {
  if(user){
    if(authScreen) authScreen.hidden = true;
    if(userBar) userBar.hidden = false;

    try{
      await ensureFamilyIdentity(user);
    }catch(error){
      console.error("Error al cargar el perfil CELAM:", error);
      showAuthMessage("No se ha podido cargar tu perfil. Comprueba la conexión e inténtalo de nuevo.");
    }
  }else{
    if(authScreen) authScreen.hidden = false;
    if(userBar) userBar.hidden = true;
    if(currentUserName) currentUserName.textContent = "";
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
