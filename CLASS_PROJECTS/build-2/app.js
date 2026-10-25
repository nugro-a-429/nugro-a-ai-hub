// app.js - Fixed Audio Playback & explicit Device Permission Prompt

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

// App Elements
const clipTitleInput = document.getElementById('clip-title');
const audioFileInput = document.getElementById('audio-file');
const btnUpload = document.getElementById('btn-upload');
const clipList = document.getElementById('clip-list');
const noClipsMsg = document.getElementById('no-clips-msg');
const uploadAlert = document.getElementById('upload-alert');
const uploadSuccess = document.getElementById('upload-success');
const uploadContainer = document.getElementById('upload-container');
const searchInput = document.getElementById('search-input');

// Speaker Dropdowns
const speakerMonitorSelect = document.getElementById('speaker-monitor');
const speakerCableSelect = document.getElementById('speaker-cable');

let currentUser = null;
let currentView = 'personal';
let cachedClips = [];

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

// Auth Handlers
btnSignUp.addEventListener('click', async () => {
  clearAuthAlerts();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return showAuthError('Please enter email and password.');
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) showAuthError(error.message);
  else if (data.user) showAuthSuccess('Account created successfully!');
});

btnSignIn.addEventListener('click', async () => {
  clearAuthAlerts();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return showAuthError('Please enter email and password.');
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) showAuthError("Invalid credentials or user not found.");
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

// Navigation Views
document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentView = e.target.getAttribute('data-view');
    uploadContainer.style.display = currentView === 'personal' ? 'block' : 'none';
    loadClips();
  });
});

// Search
searchInput.addEventListener('input', () => {
  renderClips();
});

// Explicit Permission Request for Audio Devices
async function requestAudioPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    await populateAudioDevices();
  } catch (err) {
    alert("Audio device access was denied. Please allow microphone/audio permissions in your browser bar.");
  }
}

// Enumerate Audio Output Devices
async function populateAudioDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

    speakerMonitorSelect.innerHTML = '<option value="default">Default Monitor Speaker</option>';
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

// Upload Audio -> Defaults to Private
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

// Fetch Clips based on View
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

// Render Clips with Output Device Routing & Signed Fallback URLs
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
    // Generate URL: try signed URL (60 mins expiry) to work even if bucket is private
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

    // Attach sink routing
    async function applyRouting() {
      const selectedDeviceId = speakerCableSelect.value;
      if (typeof audioElem.setSinkId === 'function' && selectedDeviceId !== 'default') {
        try {
          await audioElem.setSinkId(selectedDeviceId);
        } catch (err) {
          console.warn('Routing failed:', err);
        }
      }
    }

    audioElem.addEventListener('play', applyRouting);
    speakerCableSelect.addEventListener('change', applyRouting);

    // Dynamic Visibility Selector
    if (isOwner) {
      const visSelect = clipCard.querySelector('.visibility-select');
      visSelect.addEventListener('change', async (e) => {
        const newVis = e.target.value;
        let sharedEmails = clip.shared_with || [];

        if (newVis === 'shared') {
          const emailInput = prompt('Enter recipient emails separated by commas:', sharedEmails.join(', '));
          if (emailInput !== null) {
            sharedEmails = emailInput.split(',').map(em => em.trim().toLowerCase()).filter(em => em);
          }
        }

        await client.from('clips').update({
          visibility: newVis,
          shared_with: sharedEmails
        }).eq('id', clip.id);

        loadClips();
      });

      // Delete Listener
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

// Auth Observer
client.auth.onAuthStateChange((event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    userEmailDisplay.textContent = session.user.email;
    populateAudioDevices();
    loadClips();
  } else {
    currentUser = null;
    appScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    userEmailDisplay.textContent = '';
  }
});