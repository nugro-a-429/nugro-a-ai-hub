// app.js - Sound Share with Routing, Views, Share & Delete

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
const uploadContainer = document.getElementById('upload-container');

// Audio Device Elements
const speakerMonitorSelect = document.getElementById('speaker-monitor');
const speakerCableSelect = document.getElementById('speaker-cable');

let currentUser = null;
let currentView = 'personal';

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

// Password Validator
function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("an uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("a lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("a number");

  return errors.length > 0 ? `Password missing: ${errors.join(', ')}.` : null;
}

// 1. SIGN UP
btnSignUp.addEventListener('click', async () => {
  clearAuthAlerts();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) return showAuthError('Please enter email and password.');

  const pwdError = validatePassword(password);
  if (pwdError) return showAuthError(pwdError);

  const { data, error } = await client.auth.signUp({ email, password });

  if (error) {
    showAuthError(error.message.includes('already registered') ? 'You already have an account.' : error.message);
  } else if (data.user) {
    showAuthSuccess('Account created successfully!');
  }
});

// 2. SIGN IN
btnSignIn.addEventListener('click', async () => {
  clearAuthAlerts();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) return showAuthError('Please enter email and password.');

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) showAuthError("Invalid credentials or user not found.");
});

// 3. SIGN IN WITH GITHUB
btnGitHub.addEventListener('click', async () => {
  clearAuthAlerts();
  const { error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) showAuthError(error.message);
});

// 4. SIGN OUT
btnSignOut.addEventListener('click', async () => {
  await client.auth.signOut();
});

// Tab Switcher
document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentView = e.target.getAttribute('data-view');

    uploadContainer.style.display = currentView === 'personal' ? 'block' : 'none';
    loadClips();
  });
});

// Populate Dual Speaker Devices
async function setupAudioDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

    speakerMonitorSelect.innerHTML = '';
    speakerCableSelect.innerHTML = '';

    audioOutputs.forEach((device, idx) => {
      const opt1 = new Option(device.label || `Speaker ${idx + 1}`, device.deviceId);
      const opt2 = new Option(device.label || `Virtual Cable ${idx + 1}`, device.deviceId);
      speakerMonitorSelect.add(opt1);
      speakerCableSelect.add(opt2);
    });
  } catch (err) {
    console.warn("Audio device enumeration unavailable:", err);
  }
}

// Upload Audio
btnUpload.addEventListener('click', async () => {
  uploadAlert.style.display = 'none';
  uploadSuccess.style.display = 'none';

  const file = audioFileInput.files[0];
  if (!file) {
    uploadAlert.textContent = 'Please select an audio file.';
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
  const { error } = await client.storage.from('audio_clips').upload(filePath, file);

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
    loadClips();
  }
});

// Fetch Audio Clips
async function loadClips() {
  if (!currentUser) return;

  clipList.innerHTML = '';

  if (currentView === 'shared' || currentView === 'public') {
    noClipsMsg.textContent = `No clips in ${currentView === 'shared' ? 'Shared With You' : 'Public Feed'} yet.`;
    clipList.appendChild(noClipsMsg);
    noClipsMsg.style.display = 'block';
    return;
  }

  const { data, error } = await client.storage
    .from('audio_clips')
    .list(currentUser.id, { sortBy: { column: 'created_at', order: 'desc' } });

  if (error || !data || data.length === 0) {
    noClipsMsg.textContent = 'No audio clips uploaded yet.';
    clipList.appendChild(noClipsMsg);
    noClipsMsg.style.display = 'block';
    return;
  }

  noClipsMsg.style.display = 'none';

  data.forEach((file) => {
    const publicUrl = `${window.SUPABASE_URL}/storage/v1/object/public/audio_clips/${currentUser.id}/${file.name}`;
    const cleanName = file.name.split('_').slice(1).join('_') || file.name;

    const clipCard = document.createElement('div');
    clipCard.className = 'clip-item';
    clipCard.innerHTML = `
      <div class="clip-header">
        <span class="clip-title">${cleanName}</span>
        <div class="clip-actions">
          <button class="btn-secondary btn-sm btn-share" data-url="${publicUrl}">🔗 Share</button>
          <button class="btn-danger btn-sm btn-delete" data-filename="${file.name}">🗑️ Delete</button>
        </div>
      </div>
      <audio controls src="${publicUrl}" class="audio-player"></audio>
    `;

    // Share Handler
    clipCard.querySelector('.btn-share').addEventListener('click', (e) => {
      const url = e.target.getAttribute('data-url');
      navigator.clipboard.writeText(url);
      alert('Copied direct audio link to clipboard!');
    });

    // Delete Handler
    clipCard.querySelector('.btn-delete').addEventListener('click', async (e) => {
      const fileName = e.target.getAttribute('data-filename');
      if (confirm(`Are you sure you want to delete "${cleanName}"?`)) {
        await client.storage.from('audio_clips').remove([`${currentUser.id}/${fileName}`]);
        loadClips();
      }
    });

    // Device Sink Handler (Set Output Speaker if supported)
    const audioElem = clipCard.querySelector('.audio-player');
    speakerCableSelect.addEventListener('change', () => {
      if (typeof audioElem.setSinkId === 'function') {
        audioElem.setSinkId(speakerCableSelect.value).catch(console.error);
      }
    });

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
    setupAudioDevices();
    loadClips();
  } else {
    currentUser = null;
    appScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    userEmailDisplay.textContent = '';
  }
});