const firebaseConfig = {
  apiKey: "AIzaSyC9yTHWvFh2Qu5A-E8kpxMPw5UPZG7iI",
  authDomain: "celam-5de2e.firebaseapp.com",
  projectId: "celam-5de2e",
  storageBucket: "celam-5de2e.firebasestorage.app",
  messagingSenderId: "745683231702",
  appId: "1:745683231702:web:c256869ba5df3ccee4ba77"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const authScreen = document.getElementById("authScreen");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authMessage = document.getElementById("authMessage");
const toggleAuthMode = document.getElementById("toggleAuthMode");
const logoutBtn = document.getElementById("logoutBtn");
const userBar = document.getElementById("userBar");
const userEmail = document.getElementById("userEmail");
const forgotPassword = document.getElementById("forgotPassword");

let registerMode = false;

function showAuthMessage(message, error = true){
  authMessage.textContent = message || "";
  authMessage.classList.toggle("error", !!error);
  authMessage.classList.toggle("success", !error);
}

function setAuthMode(isRegister){
  registerMode = isRegister;
  loginForm.hidden = isRegister;
  registerForm.hidden = !isRegister;
  authTitle.textContent = isRegister ? "Crear cuenta" : "Entrar en CELAM";
  authSubtitle.textContent = isRegister
    ? "Crea tu cuenta para usar CELAM desde tus dispositivos."
    : "Inicia sesión para acceder a tu calendario familiar.";
  toggleAuthMode.textContent = isRegister
    ? "¿Ya tienes cuenta? Entrar"
    : "¿No tienes cuenta? Crear una";
  showAuthMessage("");
}

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

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  showAuthMessage("");
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  try{
    await auth.signInWithEmailAndPassword(email, password);
  }catch(error){
    showAuthMessage(friendlyAuthError(error));
  }
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  showAuthMessage("");
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const password2 = document.getElementById("registerPassword2").value;

  if(password !== password2){
    showAuthMessage("Las contraseñas no coinciden.");
    return;
  }

  try{
    await auth.createUserWithEmailAndPassword(email, password);
  }catch(error){
    showAuthMessage(friendlyAuthError(error));
  }
});

forgotPassword?.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
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

toggleAuthMode?.addEventListener("click", () => setAuthMode(!registerMode));

logoutBtn?.addEventListener("click", async () => {
  try{
    await auth.signOut();
  }catch(error){
    showAuthMessage(friendlyAuthError(error));
  }
});

auth.onAuthStateChanged((user) => {
  if(user){
    authScreen.hidden = true;
    userBar.hidden = false;
    userEmail.textContent = user.email || "Sesión iniciada";
  }else{
    authScreen.hidden = false;
    userBar.hidden = true;
    userEmail.textContent = "";
    setAuthMode(false);
  }
});
