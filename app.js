// Plain JS for Pantry App
// All logic inside DOMContentLoaded
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
  const autocompleteList = document.getElementById('autocomplete-list');
  const ingredientsList = document.getElementById('ingredients');
  const amountModal = document.getElementById('amount-modal');
  const closeModal = document.getElementById('close-modal');
  const modalItemName = document.getElementById('modal-item-name');
  const amountInput = document.getElementById('amount-input');
  const confirmAmount = document.getElementById('confirm-amount');
  // Tabs and Recipe Swipe
  const tabsDiv = document.getElementById('tabs');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const swipeDiv = document.getElementById('swipe');
  const recipeCard = document.getElementById('recipe-card');
  const recipeImg = document.getElementById('recipe-img');
  const recipeTitle = document.getElementById('recipe-title');
  const likeBtn = document.getElementById('like-btn');
  const dislikeBtn = document.getElementById('dislike-btn');
  const noMoreRecipes = document.getElementById('no-more-recipes');
  const likedDiv = document.getElementById('liked');
  const likedList = document.getElementById('liked-list');
  const mealplanDiv = document.getElementById('mealplan');
  const mealplanTable = document.getElementById('mealplan-table');

  // Firestore-backed data
  let recipesFromDB = [];
  let itemsFromDB = [];
  let recipeIndex = 0;
  let selectedItem = null;
  let mealPlan = {};
  let likedRecipesCache = [];

  // Load all recipes from Firestore
  function loadRecipes(callback) {
    db.collection('recipes').get().then(snapshot => {
      recipesFromDB = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      recipeIndex = 0;
      if (callback) callback();
    });
  }

  // Load all items from Firestore

// Load items from Firestore in real-time for autocomplete
function loadItemsRealtime() {
  console.log('Setting up Firestore onSnapshot for items...');
  db.collection('items').onSnapshot(
    snapshot => {
      itemsFromDB = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter out items with missing or non-string name fields
      const invalidItems = itemsFromDB.filter(item => typeof item.name !== 'string');
      if (invalidItems.length > 0) {
        console.warn('Some items are missing a valid name field:', invalidItems);
      }
      itemsFromDB = itemsFromDB.filter(item => typeof item.name === 'string');
      console.log('Loaded items from Firestore:', itemsFromDB);
    },
    error => {
      console.error('onSnapshot error:', error);
    }
  );
}

// Start real-time loading of items
loadItemsRealtime();

// Autocomplete logic (uses Firestore items)
ingredientInput.addEventListener('input', function() {
  const val = this.value.trim().toLowerCase();
  autocompleteList.innerHTML = '';
  if (!val) return;
  const matches = itemsFromDB.filter(item => typeof item.name === 'string' && item.name.toLowerCase().includes(val));
  matches.forEach(item => {
    const div = document.createElement('div');
    div.textContent = item.name;
    div.onclick = () => selectAutocomplete(item.name);
    autocompleteList.appendChild(div);
  });
});

  // Auth state listener
  auth.onAuthStateChanged(user => {
    if (user) {
      authDiv.style.display = 'none';
      tabsDiv.style.display = 'block';
  showTab('liked');
      logoutBtn.style.display = 'inline-block';
      loadPantry(user.uid);
      loadLikedRecipes(user.uid);
    } else {
      authDiv.style.display = 'block';
      tabsDiv.style.display = 'none';
      pantryDiv.style.display = 'none';
      swipeDiv.style.display = 'none';
      likedDiv.style.display = 'none';
      logoutBtn.style.display = 'none';
      ingredientsList.innerHTML = '';
      likedList.innerHTML = '';
    }
  });

  // Tab switching
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      showTab(btn.id.replace('tab-', ''));
    };
  });

  function showTab(tab) {
    tabContents.forEach(div => div.style.display = 'none');
    if (tab === 'pantry') pantryDiv.style.display = 'block';
    if (tab === 'swipe') {
      swipeDiv.style.display = 'block';
      loadRecipes(showRecipe);
    }
    if (tab === 'liked') {
      likedDiv.style.display = 'block';
      loadLikedRecipes(auth.currentUser.uid);
    }
    if (tab === 'mealplan') {
      mealplanDiv.style.display = 'block';
      loadMealPlan(auth.currentUser.uid);
      likedRecipesCache = [];
    }
  }

  // --- Recipe Swipe Logic ---
  function showRecipe() {
    if (recipeIndex < recipesFromDB.length) {
      const recipe = recipesFromDB[recipeIndex];
      recipeCard.style.display = 'block';
      noMoreRecipes.style.display = 'none';
      recipeImg.src = recipe.img;
      recipeTitle.textContent = recipe.title;

      // Add extra info below the title with grey text formatting
      let infoHtml = '';
      if (recipe.course) infoHtml += `<div style="margin:0.3em 0;"><span style='font-weight:600;color:#888;'>Course:</span> ${recipe.course}</div>`;
      if (recipe.time) infoHtml += `<div style="margin:0.3em 0;"><span style='font-weight:600;color:#888;'>Time:</span> ${recipe.time}</div>`;
      if (recipe.serving) infoHtml += `<div style="margin:0.3em 0;"><span style='font-weight:600;color:#888;'>Servings:</span> ${recipe.serving}</div>`;

      // Insert infoHtml into a container below the title
      let infoContainer = recipeTitle.nextElementSibling;
      if (!infoContainer || !infoContainer.classList.contains('recipe-info')) {
        infoContainer = document.createElement('div');
        infoContainer.className = 'recipe-info';
        recipeTitle.parentNode.insertBefore(infoContainer, recipeTitle.nextSibling);
      }
      infoContainer.innerHTML = infoHtml;
    } else {
      recipeCard.style.display = 'none';
      noMoreRecipes.style.display = 'block';
    }
  }

  likeBtn.onclick = () => {
    const user = auth.currentUser;
    if (user && recipeIndex < recipesFromDB.length) {
      const recipe = recipesFromDB[recipeIndex];
      db.collection('likedRecipes').doc(user.uid).set({
        recipes: firebase.firestore.FieldValue.arrayUnion(recipe)
      }, { merge: true });
    }
    recipeIndex++;
    showRecipe();
  };

  dislikeBtn.onclick = () => {
    recipeIndex++;
    showRecipe();
  };

  function loadLikedRecipes(uid) {
    db.collection('likedRecipes').doc(uid)
      .onSnapshot(doc => {
        const data = doc.data();
        likedList.innerHTML = '';
        if (data && data.recipes && data.recipes.length) {
          // Group recipes by course
          const groups = { breakfast: [], lunch: [], dinner: [], other: [] };
          data.recipes.forEach(recipe => {
            const course = (recipe.course || '').toLowerCase();
            if (course.includes('breakfast')) groups.breakfast.push(recipe);
            else if (course.includes('lunch')) groups.lunch.push(recipe);
            else if (course.includes('dinner')) groups.dinner.push(recipe);
            else groups.other.push(recipe);
          });
          // Render each group as horizontal cards
          const renderGroup = (title, arr) => {
            if (!arr.length) return;
            const groupHeader = document.createElement('h3');
            groupHeader.textContent = title;
            groupHeader.style.margin = '1.5em 0 0.5em 0';
            likedList.appendChild(groupHeader);
            // Card container
            const cardRow = document.createElement('div');
            cardRow.style.display = 'flex';
            cardRow.style.flexWrap = 'wrap';
            cardRow.style.gap = '1.5em';
            cardRow.style.marginBottom = '1.5em';
            arr.forEach(recipe => {
              const card = document.createElement('div');
              card.style.display = 'flex';
              card.style.flexDirection = 'column';
              card.style.alignItems = 'center';
              card.style.background = '#fff';
              card.style.borderRadius = '14px';
              card.style.boxShadow = '0 2px 12px rgba(39,92,200,0.08)';
              card.style.padding = '1em 1.2em 1.2em 1.2em';
              card.style.width = '180px';
              card.style.cursor = 'pointer';
              card.style.position = 'relative';
              card.style.transition = 'box-shadow 0.18s';
              card.onmouseover = () => card.style.boxShadow = '0 4px 18px rgba(39,92,200,0.16)';
              card.onmouseout = () => card.style.boxShadow = '0 2px 12px rgba(39,92,200,0.08)';
              // Image
              const img = document.createElement('img');
              img.src = recipe.img;
              img.style.width = '150px';
              img.style.height = '110px';
              img.style.objectFit = 'cover';
              img.style.borderRadius = '10px';
              img.style.marginBottom = '0.7em';
              card.appendChild(img);
              // Title
              const titleSpan = document.createElement('span');
              titleSpan.textContent = recipe.title;
              titleSpan.style.fontSize = '1.08em';
              titleSpan.style.fontWeight = '600';
              titleSpan.style.textAlign = 'center';
              titleSpan.style.marginBottom = '0.5em';
              titleSpan.style.color = '#2563eb';
              card.appendChild(titleSpan);
              // Remove button
              const removeBtn = document.createElement('button');
              removeBtn.textContent = 'Remove';
              removeBtn.style.marginTop = '0.3em';
              removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeLikedRecipe(uid, recipe);
              };
              card.appendChild(removeBtn);
              // Modal on card click (not on remove)
              card.onclick = (e) => {
                if (e.target === removeBtn) return;
                showRecipeModal(recipe);
              };
              cardRow.appendChild(card);
            });
            likedList.appendChild(cardRow);
          };
  // Show full recipe modal
  function showRecipeModal(recipe) {
    const modal = document.getElementById('recipe-modal');
    const img = document.getElementById('recipe-modal-img');
    const details = document.getElementById('recipe-modal-details');
    // Set image
    if (recipe.img) {
      img.src = recipe.img;
      img.style.display = '';
    } else {
      img.style.display = 'none';
    }
    // Build details
    let html = '';
    // Image is above title now
    html += `<h2 style='margin-top:0;'>${recipe.title}</h2>`;
    if (recipe.course) html += `<div><span style='font-weight:600;color:#888;'>Course:</span> ${recipe.course}</div>`;
    if (recipe.time) html += `<div><span style='font-weight:600;color:#888;'>Time:</span> ${recipe.time}</div>`;
    if (recipe.serving) html += `<div><span style='font-weight:600;color:#888;'>Servings:</span> ${recipe.serving}</div>`;
    // Ingredients section
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      html += `<div class='section-header'>Ingredients</div><ul class='ingredient-list'>`;
      recipe.ingredients.forEach(ing => {
        if (typeof ing === 'string') {
          html += `<li>${ing}</li>`;
        } else if (typeof ing === 'object' && ing !== null) {
          const amount = ing.amount ? ing.amount : '';
          const unit = ing.unit ? ing.unit : '';
          const name = ing.name ? ing.name : '';
          let text = '';
          if (amount && unit && name) text = `${amount} ${unit} of ${name}`;
          else if (amount && name) text = `${amount} of ${name}`;
          else if (name) text = name;
          else text = Object.values(ing).join(' ');
          html += `<li>${text}</li>`;
        }
      });
      html += `</ul>`;
    }
    // Instructions section
    if (recipe.recipe) {
      let steps = [];
      if (Array.isArray(recipe.recipe)) {
        steps = recipe.recipe;
      } else if (typeof recipe.recipe === 'string') {
        steps = recipe.recipe.split(/\n|\r|\d+\./).map(s => s.trim()).filter(Boolean);
      }
      if (steps.length) {
        html += `<div class='section-header'>Instructions</div><ul class='stepper'>`;
        steps.forEach((step, i) => {
          html += `<li><span class='step-circle'>${i+1}</span><span class='step-text'>${step}</span></li>`;
        });
        html += `</ul>`;
      }
    }
    details.innerHTML = html;
    modal.style.display = 'flex';
  }

  // Close modal logic
  // Modal close logic (runs once)
  (function setupRecipeModalClose() {
    const modal = document.getElementById('recipe-modal');
    const closeBtn = document.getElementById('close-recipe-modal');
    if (closeBtn) {
      closeBtn.onclick = () => { modal.style.display = 'none'; };
    }
    // Close modal on background click or Escape key
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
      };
      document.addEventListener('keydown', function(e) {
        if (modal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
          modal.style.display = 'none';
        }
      });
    }
  })();
          renderGroup('Breakfast', groups.breakfast);
          renderGroup('Lunch', groups.lunch);
          renderGroup('Dinner', groups.dinner);
          renderGroup('Other', groups.other);
        } else {
          // No liked recipes: show message and button, centered under the title
          const container = document.createElement('div');
          container.style.display = 'flex';
          container.style.flexDirection = 'column';
          container.style.alignItems = 'center';
          container.style.marginTop = '25em';
          container.style.paddingRight = '1.7em';
          const msg = document.createElement('div');
          msg.textContent = 'You need more recipes!';
          msg.style.color = '#888';
          msg.style.fontSize = '1.2em';
          msg.style.marginBottom = '1em';
          const btn = document.createElement('button');
          btn.textContent = 'Go to Recipe Swipe';
          btn.onclick = () => {
            document.getElementById('tab-swipe').click();
          };
          container.appendChild(msg);
          container.appendChild(btn);
          likedList.appendChild(container);
        }
      });
  }

  // Remove liked recipe
  function removeLikedRecipe(uid, recipe) {
    db.collection('likedRecipes').doc(uid).update({
      recipes: firebase.firestore.FieldValue.arrayRemove(recipe)
    });
  }

  // --- Meal Plan Logic ---
  if (mealplanTable) {
    mealplanTable.addEventListener('click', async function(e) {
      const cell = e.target.closest('.meal-cell');
      if (!cell) return;
      const user = auth.currentUser;
      if (!user) return;
      // Load liked recipes if not cached
      if (!likedRecipesCache.length) {
        const doc = await db.collection('likedRecipes').doc(user.uid).get();
        likedRecipesCache = (doc.data() && doc.data().recipes) ? doc.data().recipes : [];
      }
      if (!likedRecipesCache.length) {
        alert('You have no liked recipes!');
        return;
      }
      // Determine meal type
      const mealType = cell.getAttribute('data-meal');
      // Filter liked recipes by course
      const filtered = likedRecipesCache.filter(r => {
        const course = (r.course || '').toLowerCase();
        if (mealType === 'breakfast') return course.includes('breakfast');
        if (mealType === 'lunch') return course.includes('lunch');
        if (mealType === 'dinner') return course.includes('dinner');
        return true;
      });
      // Show modal picker
      showMealPlanPickerModal(filtered, cell, mealType);
    });

    // Modal logic for meal plan picker
    function showMealPlanPickerModal(recipes, cell, mealType) {
      const modal = document.getElementById('mealplan-picker-modal');
      const closeBtn = document.getElementById('close-mealplan-picker-modal');
      const list = document.getElementById('mealplan-picker-list');
      const title = document.getElementById('mealplan-picker-title');
      // Set title
      title.textContent = `Select a ${capitalize(mealType)} Recipe`;
      // Clear list
      list.innerHTML = '';
      if (!recipes.length) {
        list.innerHTML = `<div style='color:#888;font-size:1.1em;'>No liked recipes for this meal.</div>`;
      } else {
        recipes.forEach((recipe, i) => {
          const div = document.createElement('div');
          div.style.cursor = 'pointer';
          div.style.width = '140px';
          div.style.display = 'flex';
          div.style.flexDirection = 'column';
          div.style.alignItems = 'center';
          div.style.padding = '0.5em 0.2em';
          div.style.borderRadius = '10px';
          div.style.transition = 'box-shadow 0.2s';
          div.onmouseover = () => div.style.boxShadow = '0 2px 12px rgba(0,0,0,0.13)';
          div.onmouseout = () => div.style.boxShadow = '';
          div.innerHTML = `<img src="${recipe.img}" style="width:100px;height:70px;object-fit:cover;border-radius:8px;margin-bottom:0.5em;">` +
            `<span style="font-size:1em;text-align:center;">${recipe.title}</span>`;
          div.onclick = () => {
            // Set cell
            cell.innerHTML = `<img src="${recipe.img}" style="width:40px;height:28px;object-fit:cover;border-radius:4px;vertical-align:middle;"> <span style="vertical-align:middle;">${recipe.title}</span>`;
            // Save to mealPlan object
            const day = cell.getAttribute('data-day');
            const meal = cell.getAttribute('data-meal');
            if (!mealPlan[day]) mealPlan[day] = {};
            mealPlan[day][meal] = recipe;
            db.collection('mealPlans').doc(auth.currentUser.uid).set(mealPlan, { merge: true });
            modal.style.display = 'none';
          };
          list.appendChild(div);
        });
      }
      modal.style.display = 'flex';
      // Close logic
      closeBtn.onclick = () => { modal.style.display = 'none'; };
      modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
      document.addEventListener('keydown', function escListener(e) {
        if (modal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
          modal.style.display = 'none';
          document.removeEventListener('keydown', escListener);
        }
      });
    }

    function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  }

  function loadMealPlan(uid) {
    db.collection('mealPlans').doc(uid).onSnapshot(doc => {
      mealPlan = doc.data() || {};
      // Fill table
      document.querySelectorAll('.meal-cell').forEach(cell => {
        const day = cell.getAttribute('data-day');
        const meal = cell.getAttribute('data-meal');
        if (mealPlan[day] && mealPlan[day][meal]) {
          const recipe = mealPlan[day][meal];
          cell.innerHTML = `
            <div class="meal-card">
              <img src="${recipe.img}" alt="${recipe.title}" class="meal-card-img">
              <div class="meal-card-title">${recipe.title}</div>
              <span class="remove-meal" title="Remove">&times;</span>
            </div>
          `;
        } else {
          cell.innerHTML = '';
        }
      });
    // Remove meal on 'x' click
    document.querySelectorAll('.meal-cell').forEach(cell => {
      cell.querySelectorAll('.remove-meal').forEach(xBtn => {
        xBtn.onclick = (e) => {
          e.stopPropagation();
          const day = cell.getAttribute('data-day');
          const meal = cell.getAttribute('data-meal');
          if (mealPlan[day]) {
            delete mealPlan[day][meal];
            db.collection('mealPlans').doc(uid).set(mealPlan, { merge: true });
          }
        };
      });
    });
  // Clear all button logic
  const clearBtn = document.getElementById('clear-mealplan');
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (confirm('Clear all meals from the meal plan?')) {
        db.collection('mealPlans').doc(auth.currentUser.uid).delete();
      }
    };
  }
      // --- Grocery List Logic ---
      const groceryList = document.getElementById('grocery-list');
      if (!groceryList) return;
      // Aggregate all ingredients from all recipes in the meal plan
      const ingredientMap = {};
      Object.values(mealPlan).forEach(dayObj => {
        Object.values(dayObj).forEach(recipe => {
          if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach(ing => {
              let key = '', amount = 1, unit = '', name = '', orig = '';
              if (typeof ing === 'string') {
                // Try to parse 'amount unit of name' or 'amount unit name'
                const match = ing.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s*(?:of)?\s*(.+)$/);
                if (match) {
                  amount = parseFloat(match[1]);
                  unit = match[2] ? match[2].trim() : '';
                  name = match[3] ? match[3].trim().toLowerCase() : '';
                  key = `${unit}||${name}`;
                  orig = `${unit ? unit + ' ' : ''}${name}`;
                } else {
                  name = ing.trim().toLowerCase();
                  key = `||${name}`;
                  orig = name;
                }
              } else if (typeof ing === 'object' && ing !== null) {
                amount = ing.amount ? parseFloat(ing.amount) : 1;
                unit = ing.unit ? ing.unit.trim() : '';
                name = ing.name ? ing.name.trim().toLowerCase() : '';
                key = `${unit}||${name}`;
                orig = `${unit ? unit + ' ' : ''}${name}`;
              }
              if (!name) return;
              if (!ingredientMap[key]) ingredientMap[key] = { amount: 0, unit, name: orig };
              ingredientMap[key].amount += isNaN(amount) ? 1 : amount;
            });
          }
        });
      });
      // Render grocery list in real time as pantry changes
      if (window._groceryPantryUnsub) window._groceryPantryUnsub();
      window._groceryPantryUnsub = db.collection('pantries').doc(uid).onSnapshot(pantryDoc => {
        let pantryIngredients = (pantryDoc.exists && pantryDoc.data().ingredients) ? pantryDoc.data().ingredients : [];
        groceryList.innerHTML = '';
        Object.values(ingredientMap).forEach(({ amount, unit, name }) => {
          let cleanName = name;
          // Remove unit from start of name if present (case-insensitive)
          if (unit && name && name.toLowerCase().startsWith(unit.toLowerCase() + ' ')) {
            cleanName = name.slice(unit.length).trim();
          }
          // Remove plural unit from start of name if present (e.g., 'slices' vs 'slice')
          if (unit && name && name.toLowerCase().startsWith(unit.toLowerCase() + 's ')) {
            cleanName = name.slice(unit.length + 1).trim();
          }
          // Remove 'of' from start if present
          if (cleanName.toLowerCase().startsWith('of ')) {
            cleanName = cleanName.slice(3).trim();
          }
          let amtStr = amount % 1 === 0 ? amount : amount.toFixed(2);
          const entryName = `${amtStr}${unit ? ' ' + unit : ''} of ${cleanName}`;
          const alreadyInPantry = pantryIngredients.some(entry => {
            const match = entry.match(/^(.*) x (\d+)$/);
            return match && match[1] === entryName;
          });
          if (!alreadyInPantry) {
            const li = document.createElement('li');
            li.textContent = `${amtStr}${unit ? ' ' + unit : ''} of ${cleanName}`;
            const haveBtn = document.createElement('button');
            haveBtn.textContent = 'I have this';
            haveBtn.style.marginLeft = '1em';
            haveBtn.style.fontSize = '0.95em';
            haveBtn.onclick = async () => {
              const user = auth.currentUser;
              if (!user) return;
              const pantryRef = db.collection('pantries').doc(user.uid);
              const pantryDoc = await pantryRef.get();
              let ingredients = (pantryDoc.exists && pantryDoc.data().ingredients) ? pantryDoc.data().ingredients : [];
              // Try to find a matching entry
              let found = false;
              ingredients = ingredients.map(entry => {
                const match = entry.match(/^(.*) x (\d+)$/);
                if (match && match[1] === entryName) {
                  found = true;
                  const newAmount = parseInt(match[2], 10) + 1;
                  return `${entryName} x ${newAmount}`;
                }
                return entry;
              });
              if (!found) {
                ingredients.push(`${entryName} x 1`);
              }
              await pantryRef.set({ ingredients }, { merge: true });
            };
            li.appendChild(haveBtn);
            groceryList.appendChild(li);
          }
        });
      });
    });
  }

  // Login
  loginBtn.onclick = () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.signInWithEmailAndPassword(email, password)
      .catch(err => alert(err.message));
  };

  // Allow login on Enter key in email or password input
  [emailInput, passwordInput].forEach(input => {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') loginBtn.onclick();
    });
  });

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

  // Autocomplete logic (uses Firestore items)
  ingredientInput.addEventListener('input', function() {
    const val = this.value.trim().toLowerCase();
    autocompleteList.innerHTML = '';
    if (!val) return;
    const matches = itemsFromDB.filter(item => item.name.toLowerCase().includes(val));
    matches.forEach(item => {
      const div = document.createElement('div');
      div.textContent = item.name;
      div.onclick = () => selectAutocomplete(item.name);
      autocompleteList.appendChild(div);
    });
  });

  // Hide autocomplete on blur (with slight delay for click)
  ingredientInput.addEventListener('blur', () => setTimeout(() => autocompleteList.innerHTML = '', 150));

  function selectAutocomplete(item) {
    selectedItem = item;
    ingredientInput.value = item;
    autocompleteList.innerHTML = '';
    showAmountModal(item);
  }

  // Show modal to ask for amount
  function showAmountModal(item) {
    modalItemName.textContent = `How many ${item.toLowerCase()}?`;
    amountInput.placeholder = 'Amount';
    amountInput.value = '';
    amountModal.style.display = 'block';
    amountInput.focus();
  }

  // Close modal
  closeModal.onclick = () => {
    amountModal.style.display = 'none';
    selectedItem = null;
  };


  // Confirm amount and add to pantry (increment if exists)
  confirmAmount.onclick = async () => {
    const user = auth.currentUser;
    const amount = parseInt(amountInput.value, 10);
    if (user && selectedItem && amount > 0) {
      const pantryRef = db.collection('pantries').doc(user.uid);
      const pantryDoc = await pantryRef.get();
      let ingredients = (pantryDoc.exists && pantryDoc.data().ingredients) ? pantryDoc.data().ingredients : [];
      // Parse existing entries into {name, amount}
      let found = false;
      ingredients = ingredients.map(entry => {
        const match = entry.match(/^(.*) x (\d+)$/);
        if (match && match[1] === selectedItem) {
          found = true;
          const newAmount = parseInt(match[2], 10) + amount;
          return `${selectedItem} x ${newAmount}`;
        }
        return entry;
      });
      if (!found) {
        ingredients.push(`${selectedItem} x ${amount}`);
      }
      await pantryRef.set({ ingredients }, { merge: true });
      ingredientInput.value = '';
      amountModal.style.display = 'none';
      selectedItem = null;
    }
  };

  // Allow Enter key in modal
  amountInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmAmount.onclick();
  });

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