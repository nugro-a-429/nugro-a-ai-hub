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

const btnToggleAuthPrivacy = document.getElementById('btn-toggle-auth-privacy');
const authPrivacyBox = document.getElementById('auth-privacy-box');

const authAlert = document.getElementById('auth-alert');
const authSuccess = document.getElementById('auth-success');
const userDisplay = document.getElementById('user-display');
const roleBadge = document.getElementById('role-badge');

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

const staffTab = document.getElementById('staff-tab');
const staffContainer = document.getElementById('staff-container');

const ownerAdminBox = document.getElementById('owner-admin-box');
const inputAdminUsername = document.getElementById('input-admin-username');
const btnAddAdmin = document.getElementById('btn-add-admin');
const adminList = document.getElementById('admin-list');
const adminAlert = document.getElementById('admin-alert');
const adminSuccess = document.getElementById('admin-success');

const adminModBox = document.getElementById('admin-mod-box');
const inputModUsername = document.getElementById('input-mod-username');
const btnAddMod = document.getElementById('btn-add-mod');
const modList = document.getElementById('mod-list');
const modAlert = document.getElementById('mod-alert');
const modSuccess = document.getElementById('mod-success');

const reportsList = document.getElementById('reports-list');
const btnRefreshReports = document.getElementById('btn-refresh-reports');

const blockedUsersList = document.getElementById('blocked-users-list');

const privacyContainer = document.getElementById('privacy-container');
const settingsContainer = document.getElementById('settings-container');
const passwordSettingsBox = document.getElementById('password-settings-box');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const btnChangePassword = document.getElementById('btn-change-password');
const settingsAlert = document.getElementById('settings-alert');
const settingsSuccess = document.getElementById('settings-success');

const btnDeleteMyData = document.getElementById('btn-delete-my-data');
const deleteDataAlert = document.getElementById('delete-data-alert');

const speakerMonitorSelect = document.getElementById('speaker-monitor');
const speakerCableSelect = document.getElementById('speaker-cable');
const btnRequestPermission = document.getElementById('btn-request-permission');

let currentUser = null;
let currentUsername = '';
let isOwner = false;
let isAdmin = false;
let isModerator = false;
let currentView = 'personal';
let cachedClips = [];
let hiddenClipIds = new Set();
let blockedUserIds = new Set();

// Global Lookup Maps for Authors & Roles
let profilesMap = {};
let ownerIdsSet = new Set();
let adminIdsSet = new Set();
let modIdsSet = new Set();

// Toggle Privacy Policy on Auth Screen
if (btnToggleAuthPrivacy) {
  btnToggleAuthPrivacy.addEventListener('click', () => {
    authPrivacyBox.classList.toggle('hidden');
    btnToggleAuthPrivacy.textContent = authPrivacyBox.classList.contains('hidden')
      ? '🔒 Read our Privacy Policy'
      : '🔒 Hide Privacy Policy';
  });
}

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

function getUserRoleInfo(uid) {
  if (ownerIdsSet.has(uid)) return { label: 'Owner', className: 'role-owner' };
  if (adminIdsSet.has(uid)) return { label: 'Admin', className: 'role-admin' };
  if (modIdsSet.has(uid)) return { label: 'Moderator', className: 'role-mod' };
  return { label: 'Member', className: 'role-member' };
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

  const currentPassword = currentPasswordInput.value;
  const newPassword = newPasswordInput.value;

  if (!currentPassword) {
    settingsAlert.textContent = 'Please enter your current password.';
    settingsAlert.style.display = 'block';
    return;
  }

  if (!validatePassword(newPassword)) {
    settingsAlert.textContent = 'New password must be at least 8 characters long and contain uppercase, lowercase, and numbers.';
    settingsAlert.style.display = 'block';
    return;
  }

  const { error: verifyError } = await client.auth.signInWithPassword({
    email: currentUser.email,
    password: currentPassword
  });

  if (verifyError) {
    settingsAlert.textContent = 'Incorrect current password.';
    settingsAlert.style.display = 'block';
    return;
  }

  const { error: updateError } = await client.auth.updateUser({ password: newPassword });
  if (updateError) {
    settingsAlert.textContent = updateError.message;
    settingsAlert.style.display = 'block';
  } else {
    settingsSuccess.textContent = 'Password updated successfully!';
    settingsSuccess.style.display = 'block';
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
  }
});

// Delete My Data & Account Handler
btnDeleteMyData.addEventListener('click', async () => {
  deleteDataAlert.style.display = 'none';

  const confirmed = confirm(
    'Are you sure you want to permanently delete your account and ALL your data? This removes your login, username, and all uploaded audio files.'
  );
  if (!confirmed) return;

  btnDeleteMyData.disabled = true;
  btnDeleteMyData.textContent = 'Deleting account & data...';

  try {
    const { data: userClips, error: fetchError } = await client
      .from('clips')
      .select('id, file_path')
      .eq('user_id', currentUser.id);

    if (fetchError) throw fetchError;

    if (userClips && userClips.length > 0) {
      const filePaths = userClips.map(c => c.file_path).filter(Boolean);
      if (filePaths.length > 0) {
        await client.storage.from('audio_clips').remove(filePaths);
      }

      const { error: clipsDeleteError } = await client
        .from('clips')
        .delete()
        .eq('user_id', currentUser.id);
      if (clipsDeleteError) throw clipsDeleteError;
    }

    const { error: profileDeleteError } = await client
      .from('profiles')
      .delete()
      .eq('id', currentUser.id);
    if (profileDeleteError) throw profileDeleteError;

    const { error: accountDeleteError } = await client.rpc('delete_own_account');
    if (accountDeleteError) throw accountDeleteError;

    alert('Your account and all saved data have been permanently deleted.');
    await client.auth.signOut();
  } catch (err) {
    deleteDataAlert.textContent = `Could not delete account: ${err.message}`;
    deleteDataAlert.style.display = 'block';
    btnDeleteMyData.disabled = false;
    btnDeleteMyData.textContent = '🗑️ Delete My Data & Account';
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
    await refreshDirectoryAndRoles();
    configureProviderUI();
    populateAudioDevices();
    loadClips();
  }
});

// Fetch All Profiles, Owners, Admins, Moderators, and Blocked Users
async function refreshDirectoryAndRoles() {
  const [profilesRes, ownersRes, adminsRes, modsRes, blocksRes] = await Promise.all([
    client.from('profiles').select('id, username'),
    client.from('owners').select('user_id'),
    client.from('admins').select('user_id'),
    client.from('moderators').select('user_id'),
    client.from('blocked_users').select('blocked_id').eq('blocker_id', currentUser.id)
  ]);

  if (ownersRes.error) console.warn('owners query warning:', ownersRes.error.message);
  if (adminsRes.error) console.warn('admins query warning:', adminsRes.error.message);
  if (modsRes.error) console.warn('moderators query warning:', modsRes.error.message);

  profilesMap = {};
  (profilesRes.data || []).forEach(p => { profilesMap[p.id] = p.username; });

  ownerIdsSet = new Set((ownersRes.data || []).map(r => r.user_id));
  adminIdsSet = new Set((adminsRes.data || []).map(r => r.user_id));
  modIdsSet = new Set((modsRes.data || []).map(r => r.user_id));
  blockedUserIds = new Set((blocksRes.data || []).map(r => r.blocked_id));

  isOwner = ownerIdsSet.has(currentUser.id);
  isAdmin = adminIdsSet.has(currentUser.id);
  isModerator = modIdsSet.has(currentUser.id);

  // Update Header Role Badge & Staff Panel Visibility
  const myRole = getUserRoleInfo(currentUser.id);
  roleBadge.textContent = myRole.label;
  roleBadge.className = `role-pill ${myRole.className}`;

  if (isOwner) {
    staffTab.classList.remove('hidden');
    ownerAdminBox.classList.remove('hidden');
    adminModBox.classList.remove('hidden');
    renderAdminsList();
    renderModsList();
    loadReports();
  } else if (isAdmin) {
    staffTab.classList.remove('hidden');
    ownerAdminBox.classList.add('hidden');
    adminModBox.classList.remove('hidden');
    renderModsList();
    loadReports();
  } else if (isModerator) {
    staffTab.classList.remove('hidden');
    ownerAdminBox.classList.add('hidden');
    adminModBox.classList.add('hidden');
    loadReports();
  } else {
    staffTab.classList.add('hidden');
    ownerAdminBox.classList.add('hidden');
    adminModBox.classList.add('hidden');
  }
}

// Render Blocked Users List (Settings)
function renderBlockedUsersList() {
  const blockedIds = Array.from(blockedUserIds);
  if (blockedIds.length === 0) {
    blockedUsersList.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted);">You have not blocked anyone.</p>';
    return;
  }

  blockedUsersList.innerHTML = '';
  blockedIds.forEach(uid => {
    const uname = profilesMap[uid] ? `@${profilesMap[uid]}` : uid;
    const item = document.createElement('div');
    item.className = 'mod-item';
    item.innerHTML = `
      <span style="font-size:0.9rem; font-weight:600;">${uname}</span>
      <button type="button" class="btn-secondary btn-sm btn-unblock">Unblock</button>
    `;
    item.querySelector('.btn-unblock').addEventListener('click', async () => {
      const { error } = await client
        .from('blocked_users')
        .delete()
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', uid);

      if (error) {
        alert(`Unblock failed: ${error.message}`);
      } else {
        await refreshDirectoryAndRoles();
        renderBlockedUsersList();
      }
    });
    blockedUsersList.appendChild(item);
  });
}

// Render Admin List (Owner Panel)
function renderAdminsList() {
  if (!isOwner) return;
  const adminIds = Array.from(adminIdsSet);

  if (adminIds.length === 0) {
    adminList.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.4rem;">No admins assigned yet.</p>';
    return;
  }

  adminList.innerHTML = '';
  adminIds.forEach(uid => {
    const uname = profilesMap[uid] ? `@${profilesMap[uid]}` : uid;
    const item = document.createElement('div');
    item.className = 'mod-item';
    item.innerHTML = `
      <span style="font-size:0.9rem; font-weight:600;">${uname}</span>
      <button type="button" class="btn-danger btn-sm btn-remove-admin">Remove</button>
    `;
    item.querySelector('.btn-remove-admin').addEventListener('click', async () => {
      const { error } = await client.from('admins').delete().eq('user_id', uid);
      if (error) {
        alert(`Failed to remove admin: ${error.message}`);
      } else {
        await refreshDirectoryAndRoles();
        renderClips();
      }
    });
    adminList.appendChild(item);
  });
}

// Add Admin by Username (Owner Panel)
if (btnAddAdmin) {
  btnAddAdmin.addEventListener('click', async () => {
    adminAlert.style.display = 'none';
    adminSuccess.style.display = 'none';

    const targetUsername = inputAdminUsername.value.trim().toLowerCase().replace(/^@/, '');
    if (!targetUsername) {
      adminAlert.textContent = 'Please enter a username.';
      adminAlert.style.display = 'block';
      return;
    }

    const { data: targetProfile, error: findErr } = await client
      .from('profiles')
      .select('id, username')
      .eq('username', targetUsername)
      .maybeSingle();

    if (findErr || !targetProfile) {
      adminAlert.textContent = `User @${targetUsername} not found.`;
      adminAlert.style.display = 'block';
      return;
    }

    const { error: insertErr } = await client.from('admins').insert({
      user_id: targetProfile.id,
      added_by: currentUser.id
    });

    if (insertErr) {
      adminAlert.textContent = insertErr.message.includes('duplicate')
        ? `@${targetUsername} is already an admin.`
        : insertErr.message;
      adminAlert.style.display = 'block';
    } else {
      adminSuccess.textContent = `@${targetUsername} is now an admin!`;
      adminSuccess.style.display = 'block';
      inputAdminUsername.value = '';
      await refreshDirectoryAndRoles();
      renderClips();
    }
  });
}

// Render Moderator List (Owner & Admin Panel)
function renderModsList() {
  if (!isOwner && !isAdmin) return;
  const modIds = Array.from(modIdsSet);

  if (modIds.length === 0) {
    modList.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.4rem;">No moderators assigned yet.</p>';
    return;
  }

  modList.innerHTML = '';
  modIds.forEach(uid => {
    const uname = profilesMap[uid] ? `@${profilesMap[uid]}` : uid;
    const item = document.createElement('div');
    item.className = 'mod-item';
    item.innerHTML = `
      <span style="font-size:0.9rem; font-weight:600;">${uname}</span>
      <button type="button" class="btn-danger btn-sm btn-remove-mod">Remove</button>
    `;
    item.querySelector('.btn-remove-mod').addEventListener('click', async () => {
      const { error } = await client.from('moderators').delete().eq('user_id', uid);
      if (error) {
        alert(`Failed to remove moderator: ${error.message}`);
      } else {
        await refreshDirectoryAndRoles();
        renderClips();
      }
    });
    modList.appendChild(item);
  });
}

// Add Moderator by Username (Owner & Admin Panel)
if (btnAddMod) {
  btnAddMod.addEventListener('click', async () => {
    modAlert.style.display = 'none';
    modSuccess.style.display = 'none';

    const targetUsername = inputModUsername.value.trim().toLowerCase().replace(/^@/, '');
    if (!targetUsername) {
      modAlert.textContent = 'Please enter a username.';
      modAlert.style.display = 'block';
      return;
    }

    const { data: targetProfile, error: findErr } = await client
      .from('profiles')
      .select('id, username')
      .eq('username', targetUsername)
      .maybeSingle();

    if (findErr || !targetProfile) {
      modAlert.textContent = `User @${targetUsername} not found.`;
      modAlert.style.display = 'block';
      return;
    }

    const { error: insertErr } = await client.from('moderators').insert({
      user_id: targetProfile.id,
      added_by: currentUser.id
    });

    if (insertErr) {
      modAlert.textContent = insertErr.message.includes('duplicate')
        ? `@${targetUsername} is already a moderator.`
        : insertErr.message;
      modAlert.style.display = 'block';
    } else {
      modSuccess.textContent = `@${targetUsername} is now a moderator!`;
      modSuccess.style.display = 'block';
      inputModUsername.value = '';
      await refreshDirectoryAndRoles();
      renderClips();
    }
  });
}

// Staff Panel: Load & Manage Reports
if (btnRefreshReports) {
  btnRefreshReports.addEventListener('click', loadReports);
}

async function loadReports() {
  if (!isOwner && !isAdmin && !isModerator) return;
  reportsList.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted);">Loading reports...</p>';

  const { data: reports, error } = await client
    .from('reports')
    .select('id, clip_id, reported_user_id, reporter_id, reason, details, status, created_at, clips(title, file_path)')
    .order('created_at', { ascending: false });

  if (error) {
    reportsList.innerHTML = `<p style="font-size:0.85rem; color:#fca5a5;">Could not load reports: ${error.message}</p>`;
    return;
  }

  if (!reports || reports.length === 0) {
    reportsList.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted);">No reports submitted yet.</p>';
    return;
  }

  reportsList.innerHTML = '';
  reports.forEach(rep => {
    const reporterName = profilesMap[rep.reporter_id] ? `@${profilesMap[rep.reporter_id]}` : '@unknown';
    const targetName = profilesMap[rep.reported_user_id] ? `@${profilesMap[rep.reported_user_id]}` : '@unknown';
    const clipTitle = rep.clips?.title || '(Clip removed or unavailable)';
    const dateStr = new Date(rep.created_at).toLocaleString();

    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <strong style="font-size:0.95rem;">Clip: "${clipTitle}"</strong>
          <span class="status-pill status-${rep.status}" style="margin-left:0.4rem;">${rep.status}</span>
        </div>
        <span style="font-size:0.75rem; color:var(--text-muted);">${dateStr}</span>
      </div>
      <div style="font-size:0.83rem; color:#cbd5e1;">
        <strong>Reported User:</strong> ${targetName} &nbsp;•&nbsp;
        <strong>Reported By:</strong> ${reporterName}
      </div>
      <div style="font-size:0.83rem; color:#fcd34d;">
        <strong>Reason:</strong> ${rep.reason} ${rep.details ? `— <em>${rep.details}</em>` : ''}
      </div>
      <div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-top:0.25rem;">
        ${rep.clip_id ? `
          <button type="button" class="btn-warning btn-sm btn-rep-hide">🙈 Hide Clip</button>
        ` : ''}
        ${rep.clip_id && (isOwner || isAdmin) ? `
          <button type="button" class="btn-danger btn-sm btn-rep-delete">🗑️ Delete Clip</button>
        ` : ''}
        <button type="button" class="btn-secondary btn-sm btn-rep-status" data-status="reviewed">Mark Reviewed</button>
        <button type="button" class="btn-success btn-sm btn-rep-status" data-status="resolved">Mark Resolved</button>
        <button type="button" class="btn-secondary btn-sm btn-rep-status" data-status="dismissed">Dismiss</button>
      </div>
    `;

    // Hide Clip from Report
    const repHideBtn = card.querySelector('.btn-rep-hide');
    if (repHideBtn) {
      repHideBtn.addEventListener('click', async () => {
        const { error: hideErr } = await client.from('hidden_clips').upsert({
          clip_id: rep.clip_id,
          hidden_by: currentUser.id,
          reason: rep.reason
        });
        if (hideErr) {
          alert(`Hide failed: ${hideErr.message}`);
        } else {
          alert('Clip hidden from normal users.');
          loadClips();
        }
      });
    }

    // Delete Clip from Report (Owner & Admin ONLY)
    const repDelBtn = card.querySelector('.btn-rep-delete');
    if (repDelBtn) {
      repDelBtn.addEventListener('click', async () => {
        if (!confirm(`Permanently delete "${clipTitle}"?`)) return;
        const { error: delErr } = await client.from('clips').delete().eq('id', rep.clip_id);
        if (delErr) {
          alert(`Delete failed: ${delErr.message}`);
          return;
        }
        if (rep.clips?.file_path) {
          await client.storage.from('audio_clips').remove([rep.clips.file_path]);
        }
        await client.from('reports').update({ status: 'resolved' }).eq('id', rep.id);
        loadReports();
        loadClips();
      });
    }

    // Update Report Status
    card.querySelectorAll('.btn-rep-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStatus = btn.getAttribute('data-status');
        const { error: upErr } = await client.from('reports').update({ status: newStatus }).eq('id', rep.id);
        if (upErr) {
          alert(`Status update failed: ${upErr.message}`);
        } else {
          loadReports();
        }
      });
    });

    reportsList.appendChild(card);
  });
}

// Show/Hide Password Box inside Settings based on login provider
function configureProviderUI() {
  const isEmailUser = currentUser?.app_metadata?.provider === 'email';
  if (passwordSettingsBox) {
    passwordSettingsBox.style.display = isEmailUser ? 'block' : 'none';
  }
}

// Navigation Views
document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', async (e) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentView = e.target.getAttribute('data-view');

    const isClipView = ['personal', 'shared', 'public'].includes(currentView);

    uploadContainer.style.display = currentView === 'personal' ? 'block' : 'none';
    searchContainer.style.display = isClipView ? 'block' : 'none';
    clipList.style.display = isClipView ? 'flex' : 'none';
    staffContainer.classList.toggle('hidden', currentView !== 'staff');
    privacyContainer.classList.toggle('hidden', currentView !== 'privacy');
    settingsContainer.classList.toggle('hidden', currentView !== 'settings');

    if (isClipView) {
      await refreshDirectoryAndRoles();
      loadClips();
    }
    if (currentView === 'staff') {
      await refreshDirectoryAndRoles();
    }
    if (currentView === 'settings') {
      await refreshDirectoryAndRoles();
      renderBlockedUsersList();
    }
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

// Fetch Clips & Hidden Status
async function loadClips() {
  if (!currentUser) return;

  let query = client.from('clips').select('*').order('created_at', { ascending: false });

  if (currentView === 'personal') {
    query = query.eq('user_id', currentUser.id);
  } else if (currentView === 'shared') {
    query = query.eq('visibility', 'shared').contains('shared_with', [currentUsername]);
  } else if (currentView === 'public') {
    query = query.eq('visibility', 'public');
  }

  const { data, error } = await query;
  if (error) {
    console.error("DB Query Error:", error);
    return;
  }

  const { data: hiddenRows } = await client.from('hidden_clips').select('clip_id');
  hiddenClipIds = new Set((hiddenRows || []).map(r => r.clip_id));

  cachedClips = data || [];
  renderClips();
}

// Render Clips
async function renderClips() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  clipList.innerHTML = '';

  const filtered = cachedClips.filter(clip => {
    const matchesSearch = clip.title.toLowerCase().includes(searchTerm);
    const notBlocked = clip.user_id === currentUser.id || !blockedUserIds.has(clip.user_id);
    return matchesSearch && notBlocked;
  });

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

    const isClipUploader = clip.user_id === currentUser.id;
    const isStaff = isOwner || isAdmin || isModerator;
    const canDelete = isClipUploader || isOwner || isAdmin; // Moderators can ONLY hide/unhide!
    const isHidden = hiddenClipIds.has(clip.id);

    const authorUsername = profilesMap[clip.user_id] ? `@${profilesMap[clip.user_id]}` : '@unknown';
    const authorRole = getUserRoleInfo(clip.user_id);

    const clipCard = document.createElement('div');
    clipCard.className = `clip-item ${isHidden ? 'is-hidden-clip' : ''}`;
    clipCard.innerHTML = `
      <div class="clip-top-row">
        <div>
          <div>
            <span class="clip-title">${clip.title}</span>
            ${isHidden ? '<span class="hidden-badge">HIDDEN BY STAFF</span>' : ''}
          </div>
          <div class="clip-author">
            Posted by <strong>${authorUsername}</strong>
            <span class="role-pill ${authorRole.className}">${authorRole.label}</span>
          </div>
        </div>
        <div class="clip-controls-row">
          ${isClipUploader ? `
            <select class="clip-select visibility-select" data-id="${clip.id}">
              <option value="private" ${clip.visibility === 'private' ? 'selected' : ''}>🔒 Private</option>
              <option value="public" ${clip.visibility === 'public' ? 'selected' : ''}>🌐 Public</option>
              <option value="shared" ${clip.visibility === 'shared' ? 'selected' : ''}>👥 Shared</option>
            </select>
          ` : `
            <span style="font-size:0.75rem; color:var(--text-muted);">${clip.visibility.toUpperCase()}</span>
          `}

          ${!isClipUploader ? `
            <button class="btn-secondary btn-sm btn-report" title="Report clip or user">🚩 Report</button>
            <button class="btn-secondary btn-sm btn-block" title="Block user">🚫 Block</button>
          ` : ''}

          ${isStaff && clip.visibility === 'public' ? `
            <button class="btn-warning btn-sm btn-toggle-hide" data-id="${clip.id}">
              ${isHidden ? '👁️ Unhide' : '🙈 Hide'}
            </button>
          ` : ''}

          ${canDelete ? `
            <button class="btn-danger btn-sm btn-delete" data-id="${clip.id}" data-path="${clip.file_path}">🗑️ Delete</button>
          ` : ''}
        </div>
      </div>
      <audio controls src="${audioUrl}" class="audio-player" preload="metadata"></audio>
    `;

    const audioElem = clipCard.querySelector('.audio-player');
    const applyRouting = () => routeAudioElement(audioElem, speakerCableSelect.value);
    audioElem.addEventListener('play', applyRouting);
    speakerCableSelect.addEventListener('change', applyRouting);

    // Owner Visibility Controls
    if (isClipUploader) {
      const visSelect = clipCard.querySelector('.visibility-select');
      visSelect.addEventListener('change', async (e) => {
        const newVis = e.target.value;
        let sharedUsernames = clip.shared_with || [];

        if (newVis === 'shared') {
          const userInputPrompt = prompt(
            'Enter usernames to share with (separated by commas, without @):', 
            sharedUsernames.join(', ')
          );
          if (userInputPrompt !== null) {
            sharedUsernames = userInputPrompt
              .split(',')
              .map(u => u.trim().toLowerCase().replace(/^@/, ''))
              .filter(u => u.length > 0);
          } else {
            e.target.value = clip.visibility;
            return;
          }
        } else {
          sharedUsernames = [];
        }

        const { error } = await client.from('clips').update({
          visibility: newVis,
          shared_with: sharedUsernames
        }).eq('id', clip.id);

        if (error) {
          alert(`Update failed: ${error.message}`);
          e.target.value = clip.visibility;
        } else {
          loadClips();
        }
      });
    }

    // Report Clip & User
    const reportBtn = clipCard.querySelector('.btn-report');
    if (reportBtn) {
      reportBtn.addEventListener('click', async () => {
        const choice = prompt(
          `Report "${clip.title}" by ${authorUsername}\n\nType 1, 2, or 3:\n1 = Inappropriate content\n2 = Spam\n3 = Other`
        );
        if (!choice) return;

        let reason = 'Other';
        if (choice.trim() === '1') reason = 'Inappropriate content';
        else if (choice.trim() === '2') reason = 'Spam';

        const details = prompt('Optional details (or click OK to submit):') || '';

        const { error } = await client.from('reports').insert({
          clip_id: clip.id,
          reported_user_id: clip.user_id,
          reporter_id: currentUser.id,
          reason: reason,
          details: details.trim()
        });

        if (error) {
          alert(`Report failed: ${error.message}`);
        } else {
          alert('Thank you. Your report has been submitted to staff.');
        }
      });
    }

    // Block User
    const blockBtn = clipCard.querySelector('.btn-block');
    if (blockBtn) {
      blockBtn.addEventListener('click', async () => {
        if (!confirm(`Block ${authorUsername}? You will no longer see clips from them.`)) return;

        const { error } = await client.from('blocked_users').insert({
          blocker_id: currentUser.id,
          blocked_id: clip.user_id
        });

        if (error) {
          alert(`Block failed: ${error.message}`);
        } else {
          await refreshDirectoryAndRoles();
          renderClips();
        }
      });
    }

    // Staff Hide / Unhide Controls (Owners, Admins, Moderators)
    const hideBtn = clipCard.querySelector('.btn-toggle-hide');
    if (hideBtn) {
      hideBtn.addEventListener('click', async () => {
        if (isHidden) {
          const { error } = await client.from('hidden_clips').delete().eq('clip_id', clip.id);
          if (error) alert(`Unhide failed: ${error.message}`);
        } else {
          const { error } = await client.from('hidden_clips').insert({
            clip_id: clip.id,
            hidden_by: currentUser.id
          });
          if (error) alert(`Hide failed: ${error.message}`);
        }
        loadClips();
      });
    }

    // Delete Controls (Clip Uploader, Owner, or Admin — NOT Moderator)
    const delBtn = clipCard.querySelector('.btn-delete');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to permanently delete this clip?')) {
          const { error: dbDelErr } = await client.from('clips').delete().eq('id', clip.id);
          if (dbDelErr) {
            alert(`Delete failed: ${dbDelErr.message}`);
            return;
          }
          await client.storage.from('audio_clips').remove([clip.file_path]);
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
      await refreshDirectoryAndRoles();
      configureProviderUI();
      populateAudioDevices();
      loadClips();
    } else {
      appScreen.classList.add('hidden');
      usernameScreen.classList.remove('hidden');
    }
  } else {
    currentUser = null;
    currentUsername = '';
    isOwner = false;
    isAdmin = false;
    isModerator = false;
    btnDeleteMyData.disabled = false;
    btnDeleteMyData.textContent = '🗑️ Delete My Data & Account';
    appScreen.classList.add('hidden');
    usernameScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    userDisplay.textContent = '@---';
  }
});