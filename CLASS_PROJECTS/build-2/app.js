// app.js - Sound Share Logic with Specific Validation & Error Messages

const client = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// Auth Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnSignIn = document.getElementById('btn-signin');
const btnSignUp = document.getElementById('btn-signup');
const btnGitHub = document.getElementById('btn-github');
const btnSignOut = document.getElementById('btn-signout');
const authAlert = document.getElementById('auth-alert');
const authSuccess = document.getElementById('auth-success');
const userEmailDisplay = document.getElementById('user-email-display');

// Sound App Elements
const clipTitleInput = document.getElementById('clip-title');
const audioFileInput = document.getElementById('audio-file');
const btnUpload = document.getElementById('btn-upload');
const clipList = document.getElementById('clip-list');
const noClipsMsg = document.getElementById('no-clips-msg');
const uploadAlert = document.getElementById('upload-alert');
const uploadSuccess = document.getElementById('upload-success');

let currentUser = null;

function clearAuthAlerts() {
  authAlert.style.display = 'none';
  authSuccess.style.display = 'none';
}

function showAuthError(msg) {
  authSuccess.style.display = 'none';
  authAlert.textContent = msg;
  authAlert.style.display = 'block';
}

function showAuthSuccess(msg) {
  authAlert.style.display = 'none';
  authSuccess.textContent = msg;
  authSuccess.style.display = 'block';
}

// Password Validator: 8+ chars, Uppercase, Lowercase, Number
function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("an uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("a lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("a number");

  if (errors.length > 0) {
    return `Password missing: ${errors.join(', ')}.`;
  }
  return null;
}

// 1. SIGN UP
btnSignUp.addEventListener('click', async () => {
  clearAuthAlerts();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showAuthError('Please enter both email and password.');
    return;
  }

  // Validate Password Criteria
  const pwdError = validatePassword(password);
  if (pwdError) {
    showAuthError(pwdError);
    return;
  }

  const { data, error } = await client.auth.signUp({ email, password });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('user already exists')) {
      showAuthError('You already have an account.');
    } else {
      showAuthError(error.message);
    }
  } else if (data.user) {
    // If identity array is empty, user exists in Supabase
    if (data.user.identities && data.user.identities.length === 0) {
      showAuthError('You already have an account.');
    } else {
      showAuthSuccess('Account created successfully!');
    }
  }
});

// 2. SIGN IN
btnSignIn.addEventListener('click', async () => {
  clearAuthAlerts();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showAuthError('Please enter both email and password.');
    return;
  }

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('user not found')) {
      showAuthError("You don't have an account or password was incorrect.");
    } else {
      showAuthError(error.message);
    }
  }
});

// 3. SIGN IN WITH GITHUB
btnGitHub.addEventListener('click', async () => {
  clearAuthAlerts();
  const { error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });

  if (error) {
    showAuthError(error.message);
  }
});

// 4. SIGN OUT
btnSignOut.addEventListener('click', async () => {
  await client.auth.signOut();
});

// Upload Audio
btnUpload.addEventListener('click', async () => {
  uploadAlert.style.display = 'none';
  uploadSuccess.style.display = 'none';

  const title = clipTitleInput.value.trim() || 'Untitled Clip';
  const file = audioFileInput.files[0];

  if (!file) {
    uploadAlert.textContent = 'Please select an audio file to upload.';
    uploadAlert.style.display = 'block';
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    uploadAlert.textContent = 'File must be under 20MB.';
    uploadAlert.style.display = 'block';
    return;
  }

  btnUpload.disabled = true;
  btnUpload.textContent = 'Uploading...';

  const filePath = `${currentUser.id}/${Date.now()}_${file.name}`;

  const { data, error } = await client.storage
    .from('audio_clips')
    .upload(filePath, file);

  btnUpload.disabled = false;
  btnUpload.textContent = 'Upload Audio';

  if (error) {
    uploadAlert.textContent = error.message;
    uploadAlert.style.display = 'block';
  } else {
    uploadSuccess.textContent = 'Audio uploaded successfully!';
    uploadSuccess.style.display = 'block';
    clipTitleInput.value = '';
    audioFileInput.value = '';
    loadUserClips();
  }
});

// Fetch Audio Clips
async function loadUserClips() {
  if (!currentUser) return;

  const { data, error } = await client.storage
    .from('audio_clips')
    .list(currentUser.id, { sortBy: { column: 'created_at', order: 'desc' } });

  clipList.innerHTML = '';

  if (error || !data || data.length === 0) {
    clipList.appendChild(noClipsMsg);
    noClipsMsg.style.display = 'block';
    return;
  }

  noClipsMsg.style.display = 'none';

  data.forEach((file) => {
    const publicUrl = `${window.SUPABASE_URL}/storage/v1/object/public/audio_clips/${currentUser.id}/${file.name}`;

    const clipCard = document.createElement('div');
    clipCard.className = 'clip-item';
    clipCard.innerHTML = `
      <h4>${file.name.split('_').slice(1).join('_') || file.name}</h4>
      <audio controls src="${publicUrl}"></audio>
    `;
    clipList.appendChild(clipCard);
  });
}

// Auth Observer
client.auth.onAuthStateChange((event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    userEmailDisplay.textContent = session.user.email;
    loadUserClips();
  } else {
    currentUser = null;
    appScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    userEmailDisplay.textContent = '';
  }
});