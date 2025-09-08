import { db, auth } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Save/update pantry
export async function savePantry(ingredients) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");
  const docRef = doc(db, "pantry", user.uid);
  await setDoc(docRef, {
    ingredients,
    lastUpdated: new Date().toISOString(),
  });
}

// Load pantry
export async function loadPantry() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");
  const docRef = doc(db, "pantry", user.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().ingredients || [];
  }
  return [];
}