// Plain JS for Pantry App
// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  // Firebase references
  const auth = firebase.auth();
  const db = firebase.firestore();

  // UI elements
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login');
  const signupBtn = document.getElementById('signup');
  const logoutBtn = document.getElementById('logout');
  const pantryDiv = document.getElementById('pantry');
  const authDiv = document.getElementById('auth');
  const ingredientInput = document.getElementById('ingredient');
  const addBtn = document.getElementById('add');
  const ingredientsList = document.getElementById('ingredients');

  // Auth state listener
  auth.onAuthStateChanged(user => {
    if (user) {
      authDiv.style.display = 'none';
      pantryDiv.style.display = 'block';
      logoutBtn.style.display = 'inline-block';
      loadPantry(user.uid);
    } else {
      authDiv.style.display = 'block';
      pantryDiv.style.display = 'none';
      logoutBtn.style.display = 'none';
      ingredientsList.innerHTML = '';
    }
  });

  // Login
  loginBtn.onclick = () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.signInWithEmailAndPassword(email, password)
      .catch(err => alert(err.message));
  };

  // Signup
  signupBtn.onclick = () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.createUserWithEmailAndPassword(email, password)
      .catch(err => alert(err.message));
  };

  // Logout
  logoutBtn.onclick = () => {
    auth.signOut();
  };

  // Add ingredient
  addBtn.onclick = () => {
    const user = auth.currentUser;
    const ingredient = ingredientInput.value.trim();
    if (user && ingredient) {
      db.collection('pantries').doc(user.uid).set({
        ingredients: firebase.firestore.FieldValue.arrayUnion(ingredient)
      }, { merge: true });
      ingredientInput.value = '';
    }
  };

  // Load pantry ingredients
  function loadPantry(uid) {
    db.collection('pantries').doc(uid)
      .onSnapshot(doc => {
        const data = doc.data();
        ingredientsList.innerHTML = '';
        if (data && data.ingredients) {
          data.ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient;
            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => removeIngredient(uid, ingredient);
            li.appendChild(removeBtn);
            ingredientsList.appendChild(li);
          });
        }
      });
  }

  // Remove ingredient
  function removeIngredient(uid, ingredient) {
    db.collection('pantries').doc(uid).set({
      ingredients: firebase.firestore.FieldValue.arrayRemove(ingredient)
    }, { merge: true });
  }
});