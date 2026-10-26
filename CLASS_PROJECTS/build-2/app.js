// app.js - Sound Share Complete Script

const client = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// UI Elements
const authScreen = document.getElementById('auth-screen');
const usernameScreen = document.getElementById('username-screen');
const appScreen = document.getElementById('app-screen');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnSignIn = document.getElementById('btn-signin');
const btnSignUp = document.getElementById('btn-signup');
const btnGitHub = document.getElementById('btn-github');
const btnSignOut = document.getElementById('btn-signout');

const authAlert = document.getElementById('auth-alert');
const authSuccess = document.getElementById('auth-success');
const userDisplay = document.getElementById('user-display');

const inputUsername = document.getElementById('input-username');
const btnSaveUsername = document.getElementById('btn-save-username');
const usernameAlert = document.getElementById('username-alert');

const clipTitleInput = document.getElementById('clip-title');
const audioFileInput = document.getElementById('audio-file');
const btnUpload = document.getElementById('btn-upload');
const clipList = document.getElementById('clip-list');
const noClipsMsg = document.getElementById('no-clips-msg');

const uploadAlert = document.getElementById('upload-alert');
const uploadSuccess = document.getElementById('upload-success');
const uploadContainer = document.getElementById('upload-container');
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');

const settingsContainer = document.getElementById('settings-container');
const newPasswordInput = document.getElementById('new-password');
const btnChangePassword = document.getElementById('btn-change-password');
const settingsAlert = document.getElementById('settings-alert');
const settingsSuccess = document.getElementById('settings-success');

const speakerMonitorSelect = document.getElementById('speaker-monitor');
const speakerCableSelect = document.getElementById('speaker-cable');
const btnRequestPermission = document.getElementById('btn-request-permission');

let currentUser = null;
let currentUsername = '';
let currentView = 'personal';
let cachedClips = [];

// Password Complexity Validator
function validatePassword(pass) {
  const minLength = pass.length >= 8;
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNum = /[0-9]/.test(pass);
  return minLength && hasUpper && hasLower && hasNum;
}

// Helpers
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

// Auth Event Handlers
btnSignUp.addEventListener('click', async () => {
  clearAuthAlerts();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) return showAuthError('Please enter email and password.');
  if (!validatePassword(password)) {
    return showAuthError('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.');
  }

  const { data, error } = await client.auth.signUp({ email, password });
  if (error) showAuthError(error.message);
  else if (data.user) showAuthSuccess('Account created! Please sign in.');
});

btnSignIn.addEventListener('click', async () => {
  clearAuthAlerts();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return showAuthError('Please enter email and password.');

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) showAuthError('Invalid credentials or user not found.');
});

btnGitHub.addEventListener('click', async () => {
  clearAuthAlerts();
  const { error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) showAuthError(error.message);
});

btnSignOut.addEventListener('click', async () => {
  await client.auth.signOut();
});

// Change Password Handler
btnChangePassword.addEventListener('click', async () => {
  settingsAlert.style.display = 'none';
  settingsSuccess.style.display = 'none';

  const newPassword = newPasswordInput.value;
  if (!validatePassword(newPassword)) {
    settingsAlert.textContent = 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.';
    settingsAlert.style.display = 'block';
    return;
  }

  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) {
    settingsAlert.textContent = error.message;
    settingsAlert.style.display = 'block';
  } else {
    settingsSuccess.textContent = 'Password updated successfully!';
    settingsSuccess.style.display = 'block';
    newPasswordInput.value = '';
  }
});

// Username Prompt Handler
btnSaveUsername.addEventListener('click', async () => {
  usernameAlert.style.display = 'none';
  const username = inputUsername.value.trim().toLowerCase();

  if (!username || username.length < 3) {
    usernameAlert.textContent = 'Username must be at least 3 characters long.';
    usernameAlert.style.display = 'block';
    return;
  }

  const { error } = await client.from('profiles').insert({
    id: currentUser.id,
    username: username
  });

  if (error) {
    usernameAlert.textContent = error.message.includes('unique') 
      ? 'That username is already taken. Please choose another.' 
      : error.message;
    usernameAlert.style.display = 'block';
  } else {
    currentUsername = username;
    usernameScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    userDisplay.textContent = `@${currentUsername}`;
    populateAudioDevices();
    loadClips();
  }
});

// Navigation Views
document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentView = e.target.getAttribute('data-view');

    uploadContainer.style.display = currentView === 'personal' ? 'block' : 'none';
    searchContainer.style.display = currentView === 'settings' ? 'none' : 'block';
    clipList.style.display = currentView === 'settings' ? 'none' : 'flex';
    settingsContainer.classList.toggle('hidden', currentView !== 'settings');

    if (currentView !== 'settings') loadClips();
  });
});

// Search Filtering
searchInput.addEventListener('input', () => {
  renderClips();
});

// Device Routing
if (btnRequestPermission) {
  btnRequestPermission.addEventListener('click', requestAudioPermissions);
}

async function requestAudioPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    await populateAudioDevices();
  } catch (err) {
    alert("Audio device access was denied.");
  }
}

async function populateAudioDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

    speakerMonitorSelect.innerHTML = '<option value="default">Default Speaker</option>';
    speakerCableSelect.innerHTML = '<option value="default">Default Speaker / Cable</option>';

    audioOutputs.forEach((device) => {
      const label = device.label || `Device (${device.deviceId.slice(0, 8)}...)`;
      speakerMonitorSelect.add(new Option(label, device.deviceId));
      speakerCableSelect.add(new Option(label, device.deviceId));
    });
  } catch (err) {
    console.warn("Unable to enumerate audio devices:", err);
  }
}

async function routeAudioElement(audioElem, deviceId) {
  if (typeof audioElem.setSinkId === 'function' && deviceId && deviceId !== 'default') {
    try {
      await audioElem.setSinkId(deviceId);
    } catch (err) {
      console.warn('setSinkId routing failed:', err);
    }
  }
}

// Upload Audio
btnUpload.addEventListener('click', async () => {
  uploadAlert.style.display = 'none';
  uploadSuccess.style.display = 'none';

  const title = clipTitleInput.value.trim() || 'Untitled Clip';
  const file = audioFileInput.files[0];

  if (!file) {
    uploadAlert.textContent = 'Please select an audio file.';
    uploadAlert.style.display = 'block';
    return;
  }

  // File size restriction check (15MB)
  if (file.size > 15 * 1024 * 1024) {
    uploadAlert.textContent = 'File size exceeds the 15MB limit.';
    uploadAlert.style.display = 'block';
    return;
  }

  btnUpload.disabled = true;
  btnUpload.textContent = 'Uploading...';

  const storagePath = `${currentUser.id}/${Date.now()}_${file.name}`;
  const { error: storageError } = await client.storage.from('audio_clips').upload(storagePath, file);

  if (storageError) {
    btnUpload.disabled = false;
    btnUpload.textContent = 'Upload Audio';
    uploadAlert.textContent = storageError.message;
    uploadAlert.style.display = 'block';
    return;
  }

  const { error: dbError } = await client.from('clips').insert({
    user_id: currentUser.id,
    title: title,
    file_path: storagePath,
    visibility: 'private',
    shared_with: []
  });

  btnUpload.disabled = false;
  btnUpload.textContent = 'Upload Audio';

  if (dbError) {
    uploadAlert.textContent = dbError.message;
    uploadAlert.style.display = 'block';
  } else {
    uploadSuccess.textContent = 'Audio clip uploaded privately!';
    uploadSuccess.style.display = 'block';
    clipTitleInput.value = '';
    audioFileInput.value = '';
    loadClips();
  }
});

// Fetch Clips
async function loadClips() {
  if (!currentUser) return;

  let query = client.from('clips').select('*').order('created_at', { ascending: false });

  if (currentView === 'personal') {
    query = query.eq('user_id', currentUser.id);
  } else if (currentView === 'shared') {
    query = query.eq('visibility', 'shared').neq('user_id', currentUser.id);
  } else if (currentView === 'public') {
    query = query.eq('visibility', 'public');
  }

  const { data, error } = await query;
  if (error) {
    console.error("DB Query Error:", error);
    return;
  }

  cachedClips = data || [];
  renderClips();
}

// Render Clips
async function renderClips() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  clipList.innerHTML = '';

  const filtered = cachedClips.filter(clip => clip.title.toLowerCase().includes(searchTerm));

  if (filtered.length === 0) {
    noClipsMsg.textContent = searchTerm ? 'No clips match your search.' : 'No clips found in this view.';
    clipList.appendChild(noClipsMsg);
    noClipsMsg.style.display = 'block';
    return;
  }

  noClipsMsg.style.display = 'none';

  for (const clip of filtered) {
    let audioUrl = '';
    const { data: signedData } = await client.storage.from('audio_clips').createSignedUrl(clip.file_path, 3600);

    if (signedData && signedData.signedUrl) {
      audioUrl = signedData.signedUrl;
    } else {
      const { data: publicData } = client.storage.from('audio_clips').getPublicUrl(clip.file_path);
      audioUrl = publicData.publicUrl;
    }

    const isOwner = clip.user_id === currentUser.id;

    const clipCard = document.createElement('div');
    clipCard.className = 'clip-item';
    clipCard.innerHTML = `
      <div class="clip-top-row">
        <span class="clip-title">${clip.title}</span>
        <div class="clip-controls-row">
          ${isOwner ? `
            <select class="clip-select visibility-select" data-id="${clip.id}">
              <option value="private" ${clip.visibility === 'private' ? 'selected' : ''}>🔒 Private</option>
              <option value="public" ${clip.visibility === 'public' ? 'selected' : ''}>🌐 Public</option>
              <option value="shared" ${clip.visibility === 'shared' ? 'selected' : ''}>👥 Shared</option>
            </select>
            <button class="btn-danger btn-sm btn-delete" data-id="${clip.id}" data-path="${clip.file_path}">🗑️ Delete</button>
          ` : `
            <span style="font-size:0.75rem; color:var(--text-muted);">${clip.visibility.toUpperCase()}</span>
          `}
        </div>
      </div>
      <audio controls src="${audioUrl}" class="audio-player" preload="metadata"></audio>
    `;

    const audioElem = clipCard.querySelector('.audio-player');
    const applyRouting = () => routeAudioElement(audioElem, speakerCableSelect.value);
    audioElem.addEventListener('play', applyRouting);
    speakerCableSelect.addEventListener('change', applyRouting);

    if (isOwner) {
      const visSelect = clipCard.querySelector('.visibility-select');
      visSelect.addEventListener('change', async (e) => {
        const newVis = e.target.value;
        let sharedEmails = clip.shared_with || [];

        if (newVis === 'shared') {
          const emailInputPrompt = prompt('Enter recipient emails separated by commas:', sharedEmails.join(', '));
          if (emailInputPrompt !== null) {
            sharedEmails = emailInputPrompt.split(',').map(em => em.trim().toLowerCase()).filter(em => em);
          } else {
            e.target.value = clip.visibility;
            return;
          }
        } else {
          sharedEmails = [];
        }

        const { error } = await client.from('clips').update({
          visibility: newVis,
          shared_with: sharedEmails
        }).eq('id', clip.id);

        if (error) {
          alert(`Update failed: ${error.message}`);
          e.target.value = clip.visibility;
        } else {
          loadClips();
        }
      });

      clipCard.querySelector('.btn-delete').addEventListener('click', async (e) => {
        const clipId = e.target.getAttribute('data-id');
        const filePath = e.target.getAttribute('data-path');

        if (confirm('Are you sure you want to delete this clip?')) {
          await client.from('clips').delete().eq('id', clipId);
          await client.storage.from('audio_clips').remove([filePath]);
          loadClips();
        }
      });
    }

    clipList.appendChild(clipCard);
  }
}

// Session State Observer
client.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    authScreen.classList.add('hidden');

    // Check profile table for assigned username
    const { data: profile } = await client
      .from('profiles')
      .select('username')
      .eq('id', currentUser.id)
      .single();

    if (profile && profile.username) {
      currentUsername = profile.username;
      usernameScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');
      userDisplay.textContent = `@${currentUsername}`;
      populateAudioDevices();
      loadClips();
    } else {
      appScreen.classList.add('hidden');
      usernameScreen.classList.remove('hidden');
    }
  } else {
    currentUser = null;
    currentUsername = '';
    appScreen.classList.add('hidden');
    usernameScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    userDisplay.textContent = '@---';
  }
});