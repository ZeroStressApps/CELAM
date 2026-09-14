const firebaseConfig = {
  apiKey: "AIzaSyC9yTHWwFh2Qua5A-E8kpxMPw5uPZG7iI",
  authDomain: "celam-5de2e.firebaseapp.com",
  projectId: "celam-5de2e",
  storageBucket: "celam-5de2e.firebasestorage.app",
  messagingSenderId: "745683231702",
  appId: "1:745683231702:web:c256869ba5df3ccee4ba77"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();

const authScreen = document.getElementById("authScreen");
const loginForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authMessage = document.getElementById("authMessage");
const logoutBtn = document.getElementById("logoutBtn");
const userBar = document.getElementById("userBar");
const userEmail = document.getElementById("userEmail");
const forgotPassword = document.getElementById("forgotPassword");

function showAuthMessage(message, error = true){
  authMessage.textContent = message || "";
  authMessage.classList.toggle("error", !!error);
  authMessage.classList.toggle("success", !error);
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  showAuthMessage("");

 const email = document.getElementById("authEmail").value.trim();
 const password = document.getElementById("authPassword").value;
  
  try{
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
    await auth.sendPasswordResetEmail(email);
    showAuthMessage(
      "Te hemos enviado un email para restablecer la contraseña.",
      false
    );
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

auth.onAuthStateChanged((user) => {
  if(user){
    authScreen.hidden = true;
    userBar.hidden = false;
    userEmail.textContent = user.email || "Sesión iniciada";
  }else{
    authScreen.hidden = false;
    userBar.hidden = true;
    userEmail.textContent = "";
    authTitle.textContent = "Entrar en CELAM";
    authSubtitle.textContent =
      "Inicia sesión para acceder a tu calendario familiar.";
    showAuthMessage("");
  }
});

function friendlyAuthError(error){
  const code = error?.code || "";

  const messages = {
    "auth/invalid-email":
      "El email no tiene un formato válido.",
    "auth/user-not-found":
      "No existe una cuenta con ese email.",
    "auth/wrong-password":
      "La contraseña no es correcta.",
    "auth/invalid-credential":
      "El email o la contraseña no son correctos.",
    "auth/too-many-requests":
      "Demasiados intentos. Espera un poco y vuelve a intentarlo.",
    "auth/network-request-failed":
      "No hay conexión con Firebase. Comprueba Internet.",
    "auth/operation-not-allowed":
      "El acceso por email y contraseña no está habilitado en Firebase."
  };

  return messages[code] ||
    "No se ha podido completar la operación. Inténtalo de nuevo.";
}

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
