// app.js - Client-Side Supabase Authentication Logic

// 1. Initialize Supabase Client with a unique variable name 'client'
const client = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
  
  // UI Elements
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app-screen');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const btnSignIn = document.getElementById('btn-signin');
  const btnSignUp = document.getElementById('btn-signup');
  const btnSignOut = document.getElementById('btn-signout');
  const authAlert = document.getElementById('auth-alert');
  const authSuccess = document.getElementById('auth-success');
  const userEmailDisplay = document.getElementById('user-email-display');
  
  // Helper functions for alerts
  function showError(message) {
    authSuccess.style.display = 'none';
    authAlert.textContent = message;
    authAlert.style.display = 'block';
  }
  
  function showSuccess(message) {
    authAlert.style.display = 'none';
    authSuccess.textContent = message;
    authSuccess.style.display = 'block';
  }
  
  function clearAlerts() {
    authAlert.style.display = 'none';
    authSuccess.style.display = 'none';
  }
  
  // 1. Email + Password Sign-Up
  btnSignUp.addEventListener('click', async () => {
    clearAlerts();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
  
    if (!email || !password) {
      showError('Please enter both email and password.');
      return;
    }
  
    const { data, error } = await client.auth.signUp({
      email: email,
      password: password
    });
  
    if (error) {
      showError(error.message);
    } else if (data.user) {
      showSuccess('Account created successfully!');
    }
  });
  
  // 2. Email + Password Sign-In
  btnSignIn.addEventListener('click', async () => {
    clearAlerts();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
  
    if (!email || !password) {
      showError('Please enter both email and password.');
      return;
    }
  
    const { data, error } = await client.auth.signInWithPassword({
      email: email,
      password: password
    });
  
    if (error) {
      showError(error.message);
    }
  });
  
  // 3. Sign-Out Action
  btnSignOut.addEventListener('click', async () => {
    clearAlerts();
    const { error } = await client.auth.signOut();
    if (error) {
      alert('Error signing out: ' + error.message);
    }
  });
  
  // 4. Session Persistence & Auth State Listener
  client.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      // Show Main App View
      authScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');
      userEmailDisplay.textContent = session.user.email;
      emailInput.value = '';
      passwordInput.value = '';
      clearAlerts();
    } else {
      // Show Auth View
      appScreen.classList.add('hidden');
      authScreen.classList.remove('hidden');
      userEmailDisplay.textContent = '';
    }
  });