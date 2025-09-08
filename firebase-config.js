// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCdmFRZ-YByrchTQcKMYMzz4Hi2Qmu4ZGI",
  authDomain: "cookbook-cdf05.firebaseapp.com",
  projectId: "cookbook-cdf05",
  storageBucket: "cookbook-cdf05.firebasestorage.app",
  messagingSenderId: "865167617910",
  appId: "1:865167617910:web:a5f46a5764c4c1643c5457",
  measurementId: "G-N32QBJJ65P"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
