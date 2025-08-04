// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDO9LCj86WXeS4bOiTM9Qn6aHucE7neKks",
  authDomain: "curation-ai-10f7c.firebaseapp.com",
  projectId: "curation-ai-10f7c",
  storageBucket: "curation-ai-10f7c.firebasestorage.app",
  messagingSenderId: "280024733736",
  appId: "1:280024733736:web:faa911ce3336556ff0bd1d",
  measurementId: "G-T68PVBB5BV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);