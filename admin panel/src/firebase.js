import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration keys
const firebaseConfig = {
    apiKey: "AIzaSyDw3ADwzS0XIZ7i0eqoax5HgT0EWeGpOpw",
    authDomain: "mailtracker-demo.firebaseapp.com",
    projectId: "mailtracker-demo",
    storageBucket: "mailtracker-demo.firebasestorage.app",
    messagingSenderId: "1003974305237",
    appId: "1:1003974305237:web:fe2db842e1bd29c9b9495c",
    measurementId: "G-NC7VXXW93P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
