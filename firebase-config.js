// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyAoy0fqrDdbjTkF1cnFSXH0UnPgVRugfJs",
  authDomain: "authenticator-ac9b1.firebaseapp.com",
  databaseURL: "https://authenticator-ac9b1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "authenticator-ac9b1",
  storageBucket: "authenticator-ac9b1.firebasestorage.app",
  messagingSenderId: "219790206178",
  appId: "1:219790206178:web:cd208e5642de61ec216abb"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Export for use in other files
window.db = database;