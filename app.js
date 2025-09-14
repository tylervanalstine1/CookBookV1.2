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
  let selectedIngredientId = null;
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
  console.log('Setting up Firestore onSnapshot for ingredients...');
  
  // Quick check to see if collection exists and log structure
  db.collection('ingredients').limit(3).get()
    .then(snapshot => {
      console.log('=== FIRESTORE INGREDIENTS INFO ===');
      console.log('Found', snapshot.size, 'ingredient documents');
      
      // Log structure of first few documents
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Ingredient ${index + 1}:`, {
          id: doc.id, // This is the ingredient name
          baseUnit: data.baseUnit,
          conversions: Object.keys(data.conversions || {}),
          packageSizes: data.packageSizes?.length || 0
        });
      });
      console.log('=== END INGREDIENTS INFO ===');
    })
    .catch(error => {
      console.error('Error checking ingredients collection:', error);
    });
  
  db.collection('ingredients').onSnapshot(
    snapshot => {
      console.log('onSnapshot triggered with', snapshot.size, 'documents');
      
      itemsFromDB = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Processing document:', doc.id, data);
        
        return { 
          id: doc.id, 
          ingredientId: doc.id, // Document ID is the ingredient name
          name: doc.id, // Document ID is the ingredient name (like "Bread")
          baseUnit: data.baseUnit,
          conversions: data.conversions || {},
          packageSizes: data.packageSizes || [],
          ...data 
        };
      });
      
      // All documents should have valid names since we use the document ID
      console.log('Final processed ingredients:', itemsFromDB);
      console.log('Total valid ingredients loaded:', itemsFromDB.length);
    },
    error => {
      console.error('onSnapshot error:', error);
    }
  );
}

// Start real-time loading of items
loadItemsRealtime();

// Autocomplete logic (uses Firestore ingredients)
console.log('Checking autocomplete elements...');
console.log('ingredientInput:', ingredientInput);
console.log('autocompleteList:', autocompleteList);

if (ingredientInput && autocompleteList) {
  console.log('✅ Setting up autocomplete...');
  
  ingredientInput.addEventListener('input', function() {
    console.log('🎯 Input event triggered, value:', this.value);
    
    const val = this.value.trim().toLowerCase();
    
    // Clear previous results
    if (autocompleteList) {
      autocompleteList.innerHTML = '';
      autocompleteList.className = 'autocomplete-items';
    }
    
    if (!val) {
      if (autocompleteList) autocompleteList.style.display = 'none';
      return;
    }
    
    // Test data for demonstration
    const testItems = [
      { name: 'Tomato', ingredientId: 'Tomato' },
      { name: 'Onion', ingredientId: 'Onion' },
      { name: 'Garlic', ingredientId: 'Garlic' },
      { name: 'Basil', ingredientId: 'Basil' },
      { name: 'Cheese', ingredientId: 'Cheese' },
      { name: 'Bread', ingredientId: 'Bread' }
    ];
    
    // Use test data if no database items, otherwise use database
    const items = itemsFromDB.length > 0 ? itemsFromDB : testItems;
    const matches = items.filter(item => typeof item.name === 'string' && item.name.toLowerCase().includes(val));
    
    console.log('📋 Items to search:', items.length);
    console.log('🔍 Matches found:', matches.length, matches);
    
    if (matches.length > 0 && autocompleteList) {
      console.log('✅ Showing autocomplete with', matches.length, 'items');
      
      autocompleteList.style.display = 'block';
      autocompleteList.style.position = 'absolute';
      autocompleteList.style.backgroundColor = 'white';
      autocompleteList.style.border = '1px solid #ccc';
      autocompleteList.style.borderRadius = '4px';
      autocompleteList.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      autocompleteList.style.maxHeight = '200px';
      autocompleteList.style.overflowY = 'auto';
      autocompleteList.style.zIndex = '1000';
      autocompleteList.style.width = ingredientInput.offsetWidth + 'px';
      autocompleteList.style.top = (ingredientInput.offsetTop + ingredientInput.offsetHeight) + 'px';
      autocompleteList.style.left = ingredientInput.offsetLeft + 'px';
      
      matches.forEach(item => {
        const div = document.createElement('div');
        div.textContent = item.name;
        div.style.padding = '8px 12px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid #eee';
        
        div.onmouseover = () => {
          div.style.backgroundColor = '#f0f0f0';
        };
        div.onmouseout = () => {
          div.style.backgroundColor = 'white';
        };
        
        div.onclick = () => selectAutocomplete(item.name, item.ingredientId);
        autocompleteList.appendChild(div);
      });
      
      console.log('📦 Autocomplete populated with', autocompleteList.children.length, 'items');
    } else if (autocompleteList) {
      console.log('❌ No matches or no autocompleteList');
      autocompleteList.style.display = 'none';
    }
  });
} else {
  console.error('❌ Autocomplete elements not found!');
  console.error('ingredientInput exists:', !!ingredientInput);
  console.error('autocompleteList exists:', !!autocompleteList);
  console.warn('Make sure your HTML has:');
  console.warn('<input id="ingredient" type="text">');
  console.warn('<div id="autocomplete-list"></div>');
}

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
      if (ingredientsList) ingredientsList.innerHTML = '';
      if (likedList) likedList.innerHTML = '';
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
        if (likedList) {
          likedList.innerHTML = '';
        } else {
          console.warn('likedList element not found');
          return;
        }
        
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
      const cell = e.target.closest('.meal-cell') || e.target.closest('.meal-cell-mobile');
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
  }

  // Add separate listener for mobile meal plan table if it exists
  const mealplanTableMobile = document.getElementById('mealplan-table-mobile');
  if (mealplanTableMobile) {
    mealplanTableMobile.addEventListener('click', async function(e) {
      const cell = e.target.closest('.meal-cell-mobile');
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
  }

  // Add global click listener as fallback for mobile meal cells
  document.addEventListener('click', async function(e) {
    const cell = e.target.closest('.meal-cell-mobile');
    if (!cell) return;
    
    // Only handle if not already handled by table listeners
    if (mealplanTable && mealplanTable.contains(cell)) return;
    if (mealplanTableMobile && mealplanTableMobile.contains(cell)) return;
    
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

  function loadMealPlan(uid) {
    db.collection('mealPlans').doc(uid).onSnapshot(doc => {
      mealPlan = doc.data() || {};
      // Desktop table
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
      // Mobile table
      document.querySelectorAll('.meal-cell-mobile').forEach(cell => {
        const day = cell.getAttribute('data-day');
        const meal = cell.getAttribute('data-meal');
        if (mealPlan[day] && mealPlan[day][meal]) {
          const recipe = mealPlan[day][meal];
          cell.innerHTML = `
            <div class="meal-card">
              <img src="${recipe.img}" alt="${recipe.title}" class="meal-card-img">
              <div class="meal-card-title">${recipe.title}</div>
              <span class="remove-meal-mobile" title="Remove">&times;</span>
            </div>
          `;
        } else {
          cell.innerHTML = '';
        }
      });
      // Remove meal on 'x' click for desktop
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
      // Remove meal on 'x' click for mobile
      document.querySelectorAll('.meal-cell-mobile').forEach(cell => {
        cell.querySelectorAll('.remove-meal-mobile').forEach(xBtn => {
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
            
            // Create text span
            const textSpan = document.createElement('span');
            textSpan.textContent = `${amtStr}${unit ? ' ' + unit : ''} of ${cleanName}`;
            li.appendChild(textSpan);
            
            const haveBtn = document.createElement('button');
            haveBtn.textContent = 'I have this';
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

  // Hide autocomplete on blur (with slight delay for click)
  if (ingredientInput && autocompleteList) {
    ingredientInput.addEventListener('blur', () => setTimeout(() => {
      if (autocompleteList) {
        autocompleteList.innerHTML = '';
        autocompleteList.style.display = 'none';
      }
    }, 150));
  }

  async function selectAutocomplete(itemName, ingredientId) {
    selectedItem = itemName;
    selectedIngredientId = ingredientId;
    
    // Clear input and hide autocomplete immediately
    if (ingredientInput) {
      ingredientInput.value = '';
    }
    if (autocompleteList) {
      autocompleteList.innerHTML = '';
      autocompleteList.style.display = 'none';
    }
    
    // Show unit/amount selection modal
    showIngredientModal(itemName, ingredientId);
    
    selectedItem = null;
    selectedIngredientId = null;
  }

  // Show ingredient selection modal
  function showIngredientModal(itemName, ingredientId) {
    // Find ingredient data
    const ingredientData = itemsFromDB.find(ing => ing.name === itemName || ing.ingredientId === ingredientId);
    
    // Check if there's only one conversion unit
    const hasConversions = ingredientData && ingredientData.conversions;
    const conversionUnits = hasConversions ? Object.keys(ingredientData.conversions) : [];
    const singleUnit = conversionUnits.length === 1;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      z-index: 2000;
      left: 0;
      top: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: #fff;
      padding: 2em;
      border-radius: 16px;
      max-width: 400px;
      width: 90vw;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      position: relative;
    `;
    
    // Close button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      position: absolute;
      top: 1em;
      right: 1.2em;
      font-size: 2em;
      cursor: pointer;
      color: #888;
    `;
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    // Title
    const title = document.createElement('h2');
    title.textContent = `Add ${itemName}`;
    title.style.cssText = `
      margin-top: 0;
      margin-bottom: 1em;
      color: #2563eb;
      text-align: center;
    `;
    
    let unitSelect;
    
    // Only show unit selection if there are multiple units
    if (!singleUnit) {
      // Unit selection
      const unitLabel = document.createElement('label');
      unitLabel.textContent = 'Unit:';
      unitLabel.style.cssText = `
        display: block;
        margin-bottom: 0.5em;
        font-weight: 600;
      `;
      
      unitSelect = document.createElement('select');
      unitSelect.style.cssText = `
        width: 100%;
        padding: 0.8em;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 1em;
        font-size: 1em;
      `;
      
      // Add unit options
      if (hasConversions) {
        conversionUnits.forEach(unit => {
          const option = document.createElement('option');
          option.value = unit;
          option.textContent = unit;
          unitSelect.appendChild(option);
        });
      } else {
        // Fallback if no conversions data
        const option = document.createElement('option');
        option.value = 'unit';
        option.textContent = 'unit';
        unitSelect.appendChild(option);
      }
      
      modalContent.appendChild(unitLabel);
      modalContent.appendChild(unitSelect);
    }
    
    // Amount input
    const amountLabel = document.createElement('label');
    amountLabel.textContent = 'Amount:';
    amountLabel.style.cssText = `
      display: block;
      margin-bottom: 0.5em;
      font-weight: 600;
    `;
    
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.value = '1';
    amountInput.min = '0.1';
    amountInput.step = '0.1';
    amountInput.style.cssText = `
      width: 100%;
      padding: 0.8em;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 1.5em;
      font-size: 1em;
      box-sizing: border-box;
    `;
    
    // Add button
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add to Pantry';
    addBtn.style.cssText = `
      width: 100%;
      padding: 1em;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1em;
      cursor: pointer;
      font-weight: 600;
    `;
    
    addBtn.onclick = async () => {
      let selectedUnit;
      
      if (singleUnit) {
        // Use the single conversion unit
        selectedUnit = conversionUnits[0];
      } else if (unitSelect) {
        // Use selected unit from dropdown
        selectedUnit = unitSelect.value;
      } else {
        // Fallback
        selectedUnit = 'unit';
      }
      
      const amount = parseFloat(amountInput.value) || 1;
      
      await addIngredientToPantry(itemName, ingredientId, selectedUnit, amount);
      document.body.removeChild(modal);
    };
    
    // Assemble modal
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    
    // Add unit selection if there are multiple units
    if (!singleUnit && unitSelect) {
      modalContent.appendChild(unitSelect.previousElementSibling); // Unit label
      modalContent.appendChild(unitSelect);
    }
    
    modalContent.appendChild(amountLabel);
    modalContent.appendChild(amountInput);
    modalContent.appendChild(addBtn);
    modal.appendChild(modalContent);
    
    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) document.body.removeChild(modal);
    };
    
    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.body.appendChild(modal);
    amountInput.focus();
  }

  // Add ingredient to pantry with selected unit and amount
  async function addIngredientToPantry(itemName, ingredientId, unit, quantity) {
    const user = auth.currentUser;
    if (!user) return;
    
    // Find ingredient data for conversions
    const ingredientData = itemsFromDB.find(ing => ing.name === itemName || ing.ingredientId === ingredientId);
    const baseUnit = ingredientData ? ingredientData.baseUnit : 'unit';
    
    // Calculate normalized value (convert to base unit)
    let normalized = quantity;
    if (ingredientData && ingredientData.conversions && ingredientData.conversions[unit]) {
      normalized = quantity * ingredientData.conversions[unit];
    }
    
    const pantryRef = db.collection('pantries').doc(user.uid);
    const pantryDoc = await pantryRef.get();
    let ingredients = (pantryDoc.exists && pantryDoc.data().ingredients) ? pantryDoc.data().ingredients : [];
    
    // Create new ingredient entry
    const ingredientEntry = {
      ingredientId: ingredientId,
      quantity: quantity,
      unit: unit,
      normalized: normalized
    };
    
    // Check if ingredient already exists (by ingredientId and unit)
    let found = false;
    ingredients = ingredients.map(entry => {
      if (typeof entry === 'object' && entry.ingredientId === ingredientId && entry.unit === unit) {
        found = true;
        return {
          ...entry,
          quantity: (entry.quantity || 0) + quantity,
          normalized: (entry.normalized || 0) + normalized
        };
      }
      return entry;
    });
    
    if (!found) {
      ingredients.push(ingredientEntry);
    }
    
    await pantryRef.set({ ingredients }, { merge: true });
  }

  // Load pantry ingredients
  function loadPantry(uid) {
    db.collection('pantries').doc(uid)
      .onSnapshot(doc => {
        const data = doc.data();
        if (ingredientsList) {
          ingredientsList.innerHTML = '';
        } else {
          console.warn('ingredientsList element not found');
          return;
        }
        
        if (data && data.ingredients) {
          // Group ingredients by ingredientId
          const groupedIngredients = {};
          
          data.ingredients.forEach(ingredient => {
            if (typeof ingredient === 'object' && ingredient.ingredientId) {
              // New format with units and normalization
              const id = ingredient.ingredientId;
              if (!groupedIngredients[id]) {
                groupedIngredients[id] = [];
              }
              groupedIngredients[id].push(ingredient);
            } else {
              // Legacy formats - display as-is
              const li = document.createElement('li');
              let displayText = typeof ingredient === 'object' ? 
                `${ingredient.name} x ${ingredient.amount || 1}` : ingredient;
              
              const textSpan = document.createElement('span');
              textSpan.textContent = displayText;
              li.appendChild(textSpan);
              
              const removeBtn = document.createElement('button');
              removeBtn.textContent = 'Remove';
              removeBtn.onclick = () => removeIngredient(uid, ingredient);
              li.appendChild(removeBtn);
              ingredientsList.appendChild(li);
            }
          });
          
          // Display grouped ingredients
          Object.keys(groupedIngredients).forEach(ingredientId => {
            const ingredientEntries = groupedIngredients[ingredientId];
            const li = document.createElement('li');
            
            // Create smart display text
            let displayText = createSmartDisplayText(ingredientId, ingredientEntries);
            
            const textSpan = document.createElement('span');
            textSpan.textContent = displayText;
            li.appendChild(textSpan);
            
            // Remove button (removes all entries for this ingredient)
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => {
              // Remove all entries for this ingredient
              ingredientEntries.forEach(entry => removeIngredient(uid, entry));
            };
            li.appendChild(removeBtn);
            ingredientsList.appendChild(li);
          });
        }
      });
  }
  
  // Helper function to create smart display text
  function createSmartDisplayText(ingredientId, entries) {
    // Sort entries by unit priority (loaf > half_loaf > slice)
    const unitPriority = { 'loaf': 3, 'half_loaf': 2, 'slice': 1 };
    entries.sort((a, b) => (unitPriority[b.unit] || 0) - (unitPriority[a.unit] || 0));
    
    // Calculate total normalized amount
    const totalNormalized = entries.reduce((sum, entry) => sum + (entry.normalized || 0), 0);
    
    // Find ingredient data for conversions
    const ingredientData = itemsFromDB.find(ing => ing.ingredientId === ingredientId);
    
    if (!ingredientData || !ingredientData.conversions) {
      // Fallback to simple display if no conversion data
      const parts = [];
      entries.forEach(entry => {
        const quantity = entry.quantity;
        const unit = entry.unit;
        
        if (quantity > 0) {
          let unitText = unit;
          if (quantity > 1) {
            if (unit === 'slice') unitText = 'slices';
            else if (unit === 'loaf') unitText = 'loaves';
            else if (unit === 'half_loaf') unitText = 'half loaves';
          } else if (unit === 'half_loaf') {
            unitText = 'half loaf';
          }
          
          // Format quantity (remove .0 for whole numbers)
          const formattedQuantity = quantity % 1 === 0 ? quantity.toString() : quantity.toString();
          parts.push(`${formattedQuantity} ${unitText}`);
        }
      });
      
      return parts.length > 0 ? `${parts.join(' and ')} of ${ingredientId}` : ingredientId;
    }
    
    // Check if there's only one conversion unit
    const conversionUnits = Object.keys(ingredientData.conversions);
    if (conversionUnits.length === 1) {
      // For single unit ingredients, just show "# ingredient"
      const unit = conversionUnits[0];
      const unitValue = ingredientData.conversions[unit];
      const quantity = totalNormalized / unitValue;
      
      if (quantity > 0) {
        // Format quantity (remove .0 for whole numbers)
        const formattedQuantity = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
        return `${formattedQuantity} ${ingredientId}`;
      } else {
        return ingredientId;
      }
    }
    
    // Convert to most efficient units (for multi-unit ingredients)
    let remainingNormalized = totalNormalized;
    const convertedAmounts = {};
    
    // Convert to largest units first
    const sortedUnits = conversionUnits.sort((a, b) => {
      return (ingredientData.conversions[b] || 0) - (ingredientData.conversions[a] || 0);
    });
    
    sortedUnits.forEach(unit => {
      if (ingredientData.conversions[unit] && remainingNormalized >= ingredientData.conversions[unit]) {
        const unitValue = ingredientData.conversions[unit];
        const quantity = Math.floor(remainingNormalized / unitValue);
        if (quantity > 0) {
          convertedAmounts[unit] = quantity;
          remainingNormalized -= quantity * unitValue;
        }
      }
    });
    
    // Handle any remaining fractional amounts
    if (remainingNormalized > 0) {
      // Find the smallest unit to represent remainder
      const smallestUnit = sortedUnits[sortedUnits.length - 1];
      if (ingredientData.conversions[smallestUnit]) {
        const fractionalQuantity = remainingNormalized / ingredientData.conversions[smallestUnit];
        if (fractionalQuantity > 0) {
          // Round to reasonable precision
          const roundedQuantity = Math.round(fractionalQuantity * 10) / 10;
          if (roundedQuantity > 0) {
            convertedAmounts[smallestUnit] = (convertedAmounts[smallestUnit] || 0) + roundedQuantity;
          }
        }
      }
    }
    
    // Create display text
    const parts = [];
    sortedUnits.forEach(unit => {
      if (convertedAmounts[unit] && convertedAmounts[unit] > 0) {
        const quantity = convertedAmounts[unit];
        let unitText = unit;
        
        // Handle pluralization
        if (quantity > 1) {
          if (unit === 'slice') unitText = 'slices';
          else if (unit === 'loaf') unitText = 'loaves';
          else if (unit === 'half_loaf') unitText = 'half loaves';
        } else if (unit === 'half_loaf') {
          unitText = 'half loaf';
        }
        
        // Format quantity (remove .0 for whole numbers)
        const formattedQuantity = quantity % 1 === 0 ? quantity.toString() : quantity.toString();
        parts.push(`${formattedQuantity} ${unitText}`);
      }
    });
    
    let result;
    if (parts.length === 0) {
      result = ingredientId;
    } else if (parts.length === 1) {
      result = `${parts[0]} of ${ingredientId}`;
    } else {
      // Join with "and" for multiple units
      const allButLast = parts.slice(0, -1).join(', ');
      const last = parts[parts.length - 1];
      result = `${allButLast} and ${last} of ${ingredientId}`;
    }
    
    return result;
  }

  // Remove ingredient
  function removeIngredient(uid, ingredient) {
    db.collection('pantries').doc(uid).set({
      ingredients: firebase.firestore.FieldValue.arrayRemove(ingredient)
    }, { merge: true });
  }
});