/* ========== FIREBASE CONFIG: PASTE YOUR FIREBASE WEB APP CONFIG BELOW ========== */
const firebaseConfig = {
  apiKey: "AIzaSyAtFL1HSIRy0I4Fh-sqPBENEhJhUmoaTGI",
  authDomain: "amwithleanna.firebaseapp.com",
  projectId: "amwithleanna",
  storageBucket: "amwithleanna.firebasestorage.app",
  messagingSenderId: "334460134718",
  appId: "1:334460134718:web:f552c5077f6d0675e8386f"
};
};
/* ================================================================================== */

// initialize
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();
const auth = firebase.auth();

// Sign in anonymously (so presence, notes and game actions are tied to a user ID)
let clientId = localStorage.getItem('5am_client_id'); // temporary fallback
function signInAnonymously() {
  auth.signInAnonymously()
    .then(cred => {
      clientId = cred.user.uid;
      localStorage.setItem('5am_client_id', clientId);
      console.log('Signed in anonymously as', clientId);
      // set presence after auth
      setPresence(noteName.value || 'baba');
    })
    .catch(err => {
      console.error('Firebase auth error', err);
      // fallback to local client id
      if (!clientId) {
        clientId = 'c_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('5am_client_id', clientId);
        setPresence(noteName.value || 'baba');
      }
    });
}
signInAnonymously();
