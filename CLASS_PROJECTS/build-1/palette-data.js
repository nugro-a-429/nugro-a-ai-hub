// Supabase Client Initialization
const SUPABASE_URL = 'https://tgnspcklytxyfshngvqs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JZU_OWy9SQ_tYAS6wgUWIA_hnff9f6S';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Management
let currentPalettes = [];
let activeCategory = 'All';
let searchQuery = '';
let sortBy = 'newest';
let formColors = ['#6366f1', '#ec4899', '#8b5cf6', '#3b82f6'];
let editingPaletteId = null;
let activeCommentPaletteId = null;
let currentUser = null; // Holds authenticated user object

// Local Storage Helpers
function getStoredList(key) { return JSON.parse(localStorage.getItem(key) || '[]'); }
function setStoredList(key, list) { localStorage.setItem(key, JSON.stringify(list)); }

// Initialize App & Auto Sign-in
document.addEventListener('DOMContentLoaded', async () => {
  renderColorPickers();
  await ensureAnonymousUser();
  fetchPalettes();
});

// Auto-authenticate user anonymously if not logged in
async function ensureAnonymousUser() {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
  } else {
    const { data, error } = await db.auth.signInAnonymously();
    if (error) {
      console.error('Anonymous auth failed:', error);
    } else {
      currentUser = data.user;
    }
  }
}

// Navigation
function switchView(viewName) {
  document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`view-${viewName}`).classList.add('active');
  document.getElementById(`tab-${viewName}`).classList.add('active');
  if (viewName === 'explore' && editingPaletteId) resetForm();
}

// Fetch Palettes
async function fetchPalettes() {
  const grid = document.getElementById('palette-grid');
  grid.innerHTML = `<div class="empty-state"><h3>Loading palettes...</h3></div>`;

  let query = db.from('palettes').select('*');
  if (sortBy === 'likes') query = query.order('likes', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) { showToast('Failed to load palettes'); return; }

  currentPalettes = data || [];
  renderPalettes();
}

// Render Palettes Grid
function renderPalettes() {
  const grid = document.getElementById('palette-grid');
  grid.innerHTML = '';

  const likedPalettes = getStoredList('pv_liked_palettes');

  let filtered = currentPalettes.filter(palette => {
    const matchesCategory = activeCategory === 'All' || palette.category === activeCategory;
    const matchesSearch = palette.title.toLowerCase().includes(searchQuery.toLowerCase()) || palette.tags.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><h3>No palettes found</h3><p>Try resetting filters.</p></div>`;
    return;
  }

  filtered.forEach(palette => {
    const dateFormatted = new Date(palette.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const tagsArray = palette.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const isLiked = likedPalettes.includes(palette.id);
    
    // SECURE OWNER CHECK: Compares current user UUID against palette user_id
    const isOwner = currentUser && palette.user_id === currentUser.id;

    const cardHtml = `
      <div class="palette-card">
        <div class="swatch-container">
          ${palette.colors.map(color => `
            <div class="swatch-bar" style="background-color: ${color};" onclick="copyToClipboard('${color}')">
              <span class="color-code">${color}</span>
            </div>
          `).join('')}
        </div>
        <div class="card-body">
          <div class="card-header">
            <h3 class="card-title">${escapeHtml(palette.title)}</h3>
            <span class="card-category">${escapeHtml(palette.category)}</span>
          </div>
          <div class="card-meta">
            <span>by ${escapeHtml(palette.creator_name)}</span>
            <span class="card-date">${dateFormatted}</span>
          </div>
          <div class="card-tags">
            ${tagsArray.map(tag => `<span class="tag-item">#${escapeHtml(tag)}</span>`).join('')}
          </div>
          <div class="card-footer">
            <div class="action-group">
              <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${palette.id}', ${palette.likes})">
                <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span>${palette.likes}</span>
              </button>
              <button class="pill-btn" onclick="openCommentsModal('${palette.id}')">💬 Thread</button>
            </div>
            ${isOwner ? `
              <div class="action-group">
                <button class="pill-btn" onclick="startEditPalette('${palette.id}')">Edit</button>
                <button class="pill-btn" style="color: var(--danger); border-color: var(--danger);" onclick="deletePalette('${palette.id}')">Delete</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    grid.insertAdjacentHTML('beforeend', cardHtml);
  });
}

function handleSearchChange() { searchQuery = document.getElementById('search-input').value; renderPalettes(); }
function handleSortChange() { sortBy = document.getElementById('sort-select').value; fetchPalettes(); }
function handleCategorySelect(cat) {
  activeCategory = cat;
  document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.toggle('active', btn.textContent.includes(cat)));
  renderPalettes();
}

async function toggleLike(paletteId, currentLikes) {
  let likedPalettes = getStoredList('pv_liked_palettes');
  const isLiked = likedPalettes.includes(paletteId);
  const newLikes = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

  if (isLiked) likedPalettes = likedPalettes.filter(id => id !== paletteId);
  else likedPalettes.push(paletteId);
  setStoredList('pv_liked_palettes', likedPalettes);

  const target = currentPalettes.find(p => p.id === paletteId);
  if (target) target.likes = newLikes;
  renderPalettes();

  await db.from('palettes').update({ likes: newLikes }).eq('id', paletteId);
}

// --- UNIVERSAL CONFIRMATION MODAL ---

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.remove('active');
}

function deletePalette(paletteId) {
  const target = currentPalettes.find(p => p.id === paletteId);
  if (!currentUser || target?.user_id !== currentUser.id) { 
    showToast('You can only delete your own palettes!'); 
    return; 
  }

  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-modal-title').textContent = 'Delete Palette?';
  document.getElementById('confirm-modal-desc').textContent = 'Are you sure you want to delete this palette? This action cannot be undone.';
  modal.classList.add('active');

  document.getElementById('confirm-delete-btn').onclick = async () => {
    // Database enforces RLS automatically
    const { error } = await db.from('palettes').delete().eq('id', paletteId);
    closeConfirmModal();

    if (error) { 
      showToast('Failed to delete palette (Unauthorized)'); 
      return; 
    }

    showToast('Palette deleted!');
    fetchPalettes();
  };
}

function promptDeleteComment(commentId) {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-modal-title').textContent = 'Delete Comment?';
  document.getElementById('confirm-modal-desc').textContent = 'Are you sure you want to delete this comment and its replies? This action cannot be undone.';
  modal.classList.add('active');

  document.getElementById('confirm-delete-btn').onclick = async () => {
    const { error } = await db.from('comments').delete().eq('id', commentId);
    closeConfirmModal();

    if (error) {
      showToast('Failed to delete comment (Unauthorized)');
      return;
    }

    showToast('Comment deleted!');
    loadComments(activeCommentPaletteId);
  };
}

// --- THREADED COMMENT SYSTEM ---

async function openCommentsModal(paletteId) {
  activeCommentPaletteId = paletteId;
  const palette = currentPalettes.find(p => p.id === paletteId);
  document.getElementById('modal-palette-title').textContent = palette ? `Comments on "${palette.title}"` : 'Comments';
  document.getElementById('comments-modal').classList.add('active');
  await loadComments(paletteId);
}

function closeCommentsModal() {
  document.getElementById('comments-modal').classList.remove('active');
  activeCommentPaletteId = null;
}

async function loadComments(paletteId) {
  const container = document.getElementById('comments-list');
  container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Loading discussion...</p>';

  const { data, error } = await db
    .from('comments')
    .select('*')
    .eq('palette_id', paletteId)
    .order('created_at', { ascending: true });

  if (error) {
    container.innerHTML = '<p style="color: var(--danger); font-size: 0.85rem;">Failed to load comments.</p>';
    return;
  }

  if (data.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No comments yet. Be the first to start a thread!</p>';
    return;
  }

  const commentMap = {};
  data.forEach(c => commentMap[c.id] = { ...c, children: [] });

  const rootComments = [];
  data.forEach(c => {
    if (c.parent_id && commentMap[c.parent_id]) {
      commentMap[c.parent_id].children.push(commentMap[c.id]);
    } else {
      rootComments.push(commentMap[c.id]);
    }
  });

  container.innerHTML = rootComments.map(c => renderCommentThread(c)).join('');
}

function renderCommentThread(comment) {
  // Check ownership via real user UUID
  const isAuthor = currentUser && comment.user_id === currentUser.id;

  return `
    <div class="comment-item" id="comment-${comment.id}">
      <div class="comment-header">
        <span class="comment-author">${escapeHtml(comment.author_name)}</span>
        <div class="comment-actions">
          <button class="action-pill" onclick="toggleReplyForm('${comment.id}')">💬 Reply</button>
          ${isAuthor ? `
            <button class="action-pill" onclick="toggleEditForm('${comment.id}')">✏️ Edit</button>
            <button class="action-pill danger" onclick="promptDeleteComment('${comment.id}')">🗑️ Delete</button>
          ` : ''}
        </div>
      </div>
      <div id="comment-text-${comment.id}">${escapeHtml(comment.content)}</div>
      <div id="form-container-${comment.id}"></div>
      ${comment.children.length > 0 ? `
        <div class="comment-thread">
          ${comment.children.map(child => renderCommentThread(child)).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function toggleReplyForm(commentId) {
  const container = document.getElementById(`form-container-${commentId}`);
  if (container.dataset.type === 'reply') {
    container.innerHTML = '';
    container.dataset.type = '';
    return;
  }

  container.dataset.type = 'reply';
  container.innerHTML = `
    <form class="reply-form-container" onsubmit="handleCommentSubmit(event, '${commentId}')">
      <input type="text" id="reply-author-${commentId}" placeholder="Your name" maxlength="25" required style="padding: 0.4rem 0.6rem;">
      <textarea id="reply-content-${commentId}" placeholder="Write a reply... (max 280 chars)" maxlength="280" rows="2" required style="padding: 0.4rem 0.6rem; resize: none;"></textarea>
      <div style="display: flex; gap: 0.4rem;">
        <button type="submit" class="submit-btn" style="padding: 0.35rem; font-size: 0.8rem;">Post Reply</button>
        <button type="button" class="pill-btn" onclick="toggleReplyForm('${commentId}')">Cancel</button>
      </div>
    </form>
  `;
}

function toggleEditForm(commentId) {
  const container = document.getElementById(`form-container-${commentId}`);
  if (container.dataset.type === 'edit') {
    container.innerHTML = '';
    container.dataset.type = '';
    return;
  }

  const textElement = document.getElementById(`comment-text-${commentId}`);
  const currentText = textElement.textContent;

  container.dataset.type = 'edit';
  container.innerHTML = `
    <form class="edit-form-container" onsubmit="handleCommentUpdate(event, '${commentId}')">
      <textarea id="edit-content-${commentId}" maxlength="280" rows="2" required style="padding: 0.4rem 0.6rem; resize: none;">${escapeHtml(currentText)}</textarea>
      <div style="display: flex; gap: 0.4rem;">
        <button type="submit" class="submit-btn" style="padding: 0.35rem; font-size: 0.8rem;">Save Edit</button>
        <button type="button" class="pill-btn" onclick="toggleEditForm('${commentId}')">Cancel</button>
      </div>
    </form>
  `;
}

async function handleCommentSubmit(event, parentId = null) {
  event.preventDefault();
  if (!activeCommentPaletteId || !currentUser) return;

  let author, content;
  if (parentId) {
    author = document.getElementById(`reply-author-${parentId}`).value.trim();
    content = document.getElementById(`reply-content-${parentId}`).value.trim();
  } else {
    author = document.getElementById('comment-author').value.trim();
    content = document.getElementById('comment-content').value.trim();
  }

  if (content.length > 280) { showToast('Exceeds 280 characters!'); return; }

  // Pass user_id explicitly
  const { error } = await db.from('comments').insert([{
    palette_id: activeCommentPaletteId,
    parent_id: parentId,
    author_name: author,
    content: content,
    user_id: currentUser.id
  }]);

  if (error) { showToast('Error posting comment'); return; }

  if (!parentId) document.getElementById('comment-content').value = '';
  loadComments(activeCommentPaletteId);
  showToast('Comment added!');
}

async function handleCommentUpdate(event, commentId) {
  event.preventDefault();
  const newContent = document.getElementById(`edit-content-${commentId}`).value.trim();

  if (!newContent || newContent.length > 280) {
    showToast('Invalid content length!');
    return;
  }

  const { error } = await db.from('comments').update({ content: newContent }).eq('id', commentId);

  if (error) {
    showToast('Failed to update comment');
    return;
  }

  showToast('Comment updated!');
  loadComments(activeCommentPaletteId);
}

// Palette Creator Forms & Controls
function startEditPalette(paletteId) {
  const palette = currentPalettes.find(p => p.id === paletteId);
  if (!palette || !currentUser || palette.user_id !== currentUser.id) return;

  editingPaletteId = paletteId;
  document.getElementById('title').value = palette.title;
  document.getElementById('creator_name').value = palette.creator_name;
  document.getElementById('category').value = palette.category;
  document.getElementById('tags').value = palette.tags;
  formColors = [...palette.colors];

  renderColorPickers();
  document.querySelector('.form-header h2').textContent = 'Edit Palette';
  document.getElementById('submit-btn').textContent = 'Save Changes';
  switchView('create');
}

function renderColorPickers() {
  const container = document.getElementById('colors-picker-grid');
  const addBtn = document.getElementById('add-color-btn');
  container.innerHTML = '';

  formColors.forEach((color, index) => {
    const item = document.createElement('div');
    item.className = 'color-picker-item';
    item.innerHTML = `
      <div class="color-picker-wrapper">
        <input type="color" value="${color}" onchange="updateColor(${index}, this.value)">
      </div>
      <span class="color-hex-text">${color}</span>
      ${formColors.length > 3 ? `<button type="button" class="remove-color-btn" onclick="removeColorPicker(${index})">✕</button>` : ''}
    `;
    container.appendChild(item);
  });

  addBtn.style.display = formColors.length >= 10 ? 'none' : 'inline-block';
}

function addColorPicker() {
  if (formColors.length < 10) {
    const randomHex = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    formColors.push(randomHex);
    renderColorPickers();
  }
}

function removeColorPicker(index) {
  if (formColors.length > 3) {
    formColors.splice(index, 1);
    renderColorPickers();
  }
}

function updateColor(index, val) { formColors[index] = val; renderColorPickers(); }

function resetForm() {
  editingPaletteId = null;
  document.getElementById('palette-form').reset();
  formColors = ['#6366f1', '#ec4899', '#8b5cf6', '#3b82f6'];
  document.querySelector('.form-header h2').textContent = 'Create New Palette';
  document.getElementById('submit-btn').textContent = 'Publish Palette';
  renderColorPickers();
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;

  if (!currentUser) {
    showToast('Authenticating session...');
    await ensureAnonymousUser();
  }

  const paletteData = {
    title: document.getElementById('title').value.trim(),
    creator_name: document.getElementById('creator_name').value.trim(),
    category: document.getElementById('category').value,
    tags: document.getElementById('tags').value.trim(),
    colors: formColors,
    user_id: currentUser.id // Authenticated user ID attached
  };

  if (editingPaletteId) {
    delete paletteData.user_id; // Don't overwrite existing owner
    const { error } = await db.from('palettes').update(paletteData).eq('id', editingPaletteId);
    submitBtn.disabled = false;
    if (error) { showToast('Error updating palette!'); return; }
    showToast('Palette updated!');
  } else {
    const { error } = await db.from('palettes').insert([paletteData]);
    submitBtn.disabled = false;
    if (error) { showToast('Error saving palette!'); return; }
    showToast('Palette published!');
  }

  resetForm();
  switchView('explore');
  fetchPalettes();
}

function copyToClipboard(hex) {
  navigator.clipboard.writeText(hex);
  showToast(`Copied ${hex} to clipboard!`);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}