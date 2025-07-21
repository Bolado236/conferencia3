import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAde3nkL8HWXHLNYepp5EtX-ToAsI6Zb48",
  authDomain: "conferencia4-a2cc5.firebaseapp.com",
  projectId: "conferencia4-a2cc5",
  storageBucket: "conferencia4-a2cc5.firebasestorage.app",
  messagingSenderId: "73164235767",
  appId: "1:73164235767:web:ff3d28f1f03ce25bedc4f2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
