// app.js - Sound Share with In-App Visibility, Search, & RLS Table Sync

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
const clipVisibilitySelect = document.getElementById('clip-visibility');
const sharedEmailsGroup = document.getElementById('shared-emails-group');
const sharedEmailsInput = document.getElementById('shared-emails');
const audioFileInput = document.getElementById('audio-file');
const btnUpload = document.getElementById('btn-upload');
const clipList = document.getElementById('clip-list');
const noClipsMsg = document.getElementById('no-clips-msg');
const uploadAlert = document.getElementById('upload-alert');
const uploadSuccess = document.getElementById('upload-success');
const uploadContainer = document.getElementById('upload-container');
const searchInput = document.getElementById('search-input');

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

// Toggle Visibility Inputs
clipVisibilitySelect.addEventListener('change', () => {
  if (clipVisibilitySelect.value === 'shared') {
    sharedEmailsGroup.classList.remove('hidden');
  } else {
    sharedEmailsGroup.classList.add('hidden');
  }
});

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

// Real-Time Title Search
searchInput.addEventListener('input', () => {
  renderClips();
});

// Upload Audio & Save Metadata to Supabase Table
btnUpload.addEventListener('click', async () => {
  uploadAlert.style.display = 'none';
  uploadSuccess.style.display = 'none';

  const title = clipTitleInput.value.trim() || 'Untitled Clip';
  const file = audioFileInput.files[0];
  const visibility = clipVisibilitySelect.value;
  const sharedEmails = sharedEmailsInput.value.split(',').map(e => e.trim().toLowerCase()).filter(e => e);

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

  // Insert Record into `clips` Table
  const { error: dbError } = await client.from('clips').insert({
    user_id: currentUser.id,
    title: title,
    file_path: storagePath,
    visibility: visibility,
    shared_with: sharedEmails
  });

  btnUpload.disabled = false;
  btnUpload.textContent = 'Upload Audio';

  if (dbError) {
    uploadAlert.textContent = dbError.message;
    uploadAlert.style.display = 'block';
  } else {
    uploadSuccess.textContent = 'Audio clip uploaded and saved!';
    uploadSuccess.style.display = 'block';
    clipTitleInput.value = '';
    audioFileInput.value = '';
    sharedEmailsInput.value = '';
    loadClips();
  }
});

// Fetch Clips from Database using RLS
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
    console.error(error);
    return;
  }

  cachedClips = data || [];
  renderClips();
}

// Render Clips Filtered by Search Title
function renderClips() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  clipList.innerHTML = '';

  const filtered = cachedClips.filter(clip => clip.title.toLowerCase().includes(searchTerm));

  if (filtered.length === 0) {
    noClipsMsg.textContent = searchTerm ? 'No clips match your search.' : 'No clips found.';
    clipList.appendChild(noClipsMsg);
    noClipsMsg.style.display = 'block';
    return;
  }

  noClipsMsg.style.display = 'none';

  filtered.forEach(clip => {
    const publicUrl = `${window.SUPABASE_URL}/storage/v1/object/public/audio_clips/${clip.file_path}`;
    const isOwner = clip.user_id === currentUser.id;

    const clipCard = document.createElement('div');
    clipCard.className = 'clip-item';
    clipCard.innerHTML = `
      <div class="clip-header">
        <div>
          <span class="clip-title">${clip.title}</span>
          <div class="clip-meta">
            <span class="badge badge-${clip.visibility}">${clip.visibility}</span>
            ${clip.shared_with && clip.shared_with.length > 0 ? `<span>Shared with ${clip.shared_with.length} user(s)</span>` : ''}
          </div>
        </div>
        ${isOwner ? `<button class="btn-danger btn-sm btn-delete" data-id="${clip.id}" data-path="${clip.file_path}">🗑️ Delete</button>` : ''}
      </div>
      <audio controls src="${publicUrl}"></audio>
    `;

    // Delete Clip Handler
    if (isOwner) {
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
  });
}

// Auth Observer
client.auth.onAuthStateChange((event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    userEmailDisplay.textContent = session.user.email;
    loadClips();
  } else {
    currentUser = null;
    appScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    userEmailDisplay.textContent = '';
  }
});