// app.js

// --- State Management ---
const AppState = {
  memos: [],
  folders: [],
  settings: {
    theme: 'light',
    codeTheme: 'obsidian',
    defaultView: 'viewer',
    showWordCount: true
  },
  activeMemoId: null,
  isMarkdownMode: false,
  currentFilter: { type: 'all', value: null },
  currentSort: 'updatedDesc',
  searchQuery: '',

  init() {
    const savedMemos = localStorage.getItem('zenith_memos');
    const savedFolders = localStorage.getItem('zenith_folders');
    const savedSettings = localStorage.getItem('zenith_settings');
    
    if (savedMemos) this.memos = JSON.parse(savedMemos);
    if (savedFolders) this.folders = JSON.parse(savedFolders);
    if (savedSettings) this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    
    this.applySettings();
  },

  save() {
    localStorage.setItem('zenith_memos', JSON.stringify(this.memos));
    localStorage.setItem('zenith_folders', JSON.stringify(this.folders));
    localStorage.setItem('zenith_settings', JSON.stringify(this.settings));
  },

  applySettings() {
    // Theme
    if (this.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Code Theme
    document.body.className = `bg-base text-text-main font-ui antialiased h-screen overflow-hidden flex selection:bg-primary selection:text-white theme-${this.settings.codeTheme}`;
    
    // Word Count
    const wc = document.getElementById('word-count');
    if (wc) wc.style.display = this.settings.showWordCount ? 'block' : 'none';
    
    // Sync UI Inputs
    const tgTheme = document.getElementById('toggle-theme');
    const selCode = document.getElementById('select-code-theme');
    const selView = document.getElementById('select-default-view');
    const tgWord = document.getElementById('toggle-wordcount');
    
    if (tgTheme) tgTheme.checked = (this.settings.theme === 'light');
    if (selCode) selCode.value = this.settings.codeTheme;
    if (selView) selView.value = this.settings.defaultView;
    if (tgWord) tgWord.checked = this.settings.showWordCount;
  },

  getMemos() {
    let filtered = this.memos;

    // Apply Filter
    if (this.currentFilter.type === 'favorites') {
      filtered = filtered.filter(m => m.isFavorite && !m.isTrashed);
    } else if (this.currentFilter.type === 'trash') {
      filtered = filtered.filter(m => m.isTrashed);
    } else if (this.currentFilter.type === 'folder') {
      filtered = filtered.filter(m => m.folderId === this.currentFilter.value && !m.isTrashed);
    } else {
      filtered = filtered.filter(m => !m.isTrashed);
    }

    // Apply Search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        (m.title && m.title.toLowerCase().includes(q)) || 
        (m.content && m.content.toLowerCase().includes(q))
      );
    }

    // Apply Sort
    filtered.sort((a, b) => {
      // Pinned items always come first
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      // Then apply current sort
      if (this.currentSort === 'updatedDesc') {
        return b.updatedAt - a.updatedAt;
      } else if (this.currentSort === 'createdDesc') {
        return b.createdAt - a.createdAt;
      } else if (this.currentSort === 'titleAsc') {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      }
      return 0;
    });

    return filtered;
  },

  createMemo() {
    const newMemo = {
      id: 'memo_' + Date.now(),
      title: '',
      content: '',
      folderId: this.currentFilter.type === 'folder' ? this.currentFilter.value : null,
      isPinned: false,
      isFavorite: false,
      isTrashed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.memos.push(newMemo);
    this.save();
    return newMemo.id;
  },

  updateMemo(id, updates) {
    const memo = this.memos.find(m => m.id === id);
    if (memo) {
      Object.assign(memo, updates);
      memo.updatedAt = Date.now();
      this.save();
    }
  },

  deleteMemo(id) {
    const memo = this.memos.find(m => m.id === id);
    if (memo) {
      if (memo.isTrashed) {
        // Permanent delete
        this.memos = this.memos.filter(m => m.id !== id);
      } else {
        // Soft delete
        memo.isTrashed = true;
      }
      this.save();
    }
  },

  createFolder(name) {
    const newFolder = { id: 'folder_' + Date.now(), name };
    this.folders.push(newFolder);
    this.save();
  },

  updateFolder(id, newName) {
    const folder = this.folders.find(f => f.id === id);
    if (folder) {
      folder.name = newName;
      this.save();
    }
  },

  deleteFolder(id) {
    this.folders = this.folders.filter(f => f.id !== id);
    this.memos.forEach(m => {
      if (m.folderId === id) m.folderId = null;
    });
    this.save();
  }
};

// --- DOM Elements ---
const DOM = {
  btnNewMemo: document.getElementById('btn-new-memo'),
  searchInput: document.getElementById('search-input'),
  navFolders: document.getElementById('nav-folders'),
  customFoldersList: document.getElementById('custom-folders-list'),
  btnAddFolder: document.getElementById('btn-add-folder'),
  listTitle: document.getElementById('list-title'),
  listCount: document.getElementById('list-count'),
  memoList: document.getElementById('memo-list'),
  editorContainer: document.getElementById('editor-container'),
  emptyState: document.getElementById('empty-state'),
  memoTitle: document.getElementById('memo-title'),
  memoContent: document.getElementById('memo-content'),
  markdownEditor: document.getElementById('markdown-editor'),
  btnToggleMarkdown: document.getElementById('toggle-markdown-mode'),
  btnTogglePin: document.getElementById('btn-toggle-pin'),
  tabViewer: document.getElementById('tab-viewer'),
  tabEditor: document.getElementById('tab-editor'),
  editorView: document.getElementById('editor-view'),
  readerView: document.getElementById('reader-view'),
  readerTitle: document.getElementById('reader-title'),
  readerContent: document.getElementById('reader-content'),
  toolbarContainer: document.getElementById('toolbar-container'),
  btnSort: document.getElementById('btn-sort'),
  sortDropdown: document.getElementById('sort-dropdown'),
  btnToggleFavorite: document.getElementById('btn-toggle-favorite'),
  btnDeleteMemo: document.getElementById('btn-delete-memo'),
  btnRestoreMemo: document.getElementById('btn-restore-memo'),
  saveStatus: document.getElementById('save-status'),
  wordCount: document.getElementById('word-count'),
  btnFolderSelector: document.getElementById('btn-folder-selector'),
  currentFolderName: document.getElementById('current-folder-name'),
  folderDropdown: document.getElementById('folder-dropdown'),
};

// --- Mobile UI State & Elements ---
const DOMMobile = {
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
  memoListSection: document.getElementById('memo-list-section'),
  editorSection: document.getElementById('editor-section'),
  btnOpenSidebar: document.getElementById('btn-open-sidebar'),
  btnBackToList: document.getElementById('btn-back-to-list'),
};

function toggleSidebar(show) {
  if (!DOMMobile.sidebar || !DOMMobile.sidebarOverlay) return;
  if (show) {
    DOMMobile.sidebar.classList.remove('-translate-x-full');
    DOMMobile.sidebarOverlay.classList.remove('hidden');
    setTimeout(() => DOMMobile.sidebarOverlay.classList.remove('opacity-0'), 10);
  } else {
    DOMMobile.sidebar.classList.add('-translate-x-full');
    DOMMobile.sidebarOverlay.classList.add('opacity-0');
    setTimeout(() => DOMMobile.sidebarOverlay.classList.add('hidden'), 300);
  }
}

function showMobileEditor() {
  if (window.innerWidth < 1024 && DOMMobile.editorSection) {
    DOMMobile.editorSection.classList.remove('translate-x-full');
    DOMMobile.editorSection.classList.add('!translate-x-0');
  }
}

function hideMobileEditor() {
  if (DOMMobile.editorSection) {
    DOMMobile.editorSection.classList.add('translate-x-full');
    DOMMobile.editorSection.classList.remove('!translate-x-0');
    AppState.activeMemoId = null;
    loadActiveMemo();
    renderMemoList(); // Remove active styling
  }
}

// --- Utilities ---
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function stripHtml(html) {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showConfirm(title, message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const dialog = document.getElementById('confirm-dialog');
  const btnCancel = document.getElementById('btn-confirm-cancel');
  const btnOk = document.getElementById('btn-confirm-ok');
  
  if(!modal) {
    if(confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  
  modal.classList.remove('opacity-0', 'pointer-events-none');
  dialog.classList.remove('scale-95');
  dialog.classList.add('scale-100');

  const cleanup = () => {
    modal.classList.add('opacity-0', 'pointer-events-none');
    dialog.classList.add('scale-95');
    dialog.classList.remove('scale-100');
    btnCancel.removeEventListener('click', handleCancel);
    btnOk.removeEventListener('click', handleOk);
  };

  const handleCancel = () => cleanup();
  const handleOk = () => { cleanup(); onConfirm(); };

  btnCancel.addEventListener('click', handleCancel);
  btnOk.addEventListener('click', handleOk);
}

// --- Render Functions ---

function renderFolders() {
  DOM.customFoldersList.innerHTML = '';
  AppState.folders.forEach(folder => {
    const btn = document.createElement('div');
    btn.className = `nav-btn w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-text-muted hover:bg-white/5 hover:text-text-main group transition-all cursor-pointer ${AppState.currentFilter.type === 'folder' && AppState.currentFilter.value === folder.id ? 'bg-white/10 text-text-main' : ''}`;
    btn.dataset.filter = 'folder';
    btn.dataset.value = folder.id;
    btn.innerHTML = `
      <div class="flex items-center gap-3 flex-1 overflow-hidden pointer-events-none folder-name-wrapper">
        <i data-feather="folder" class="w-4 h-4 group-hover:text-primary transition-colors shrink-0"></i>
        <span class="folder-name-display truncate text-left w-full">${folder.name}</span>
      </div>
      <div class="folder-actions flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button class="btn-edit-folder p-1 text-text-muted hover:text-primary transition-colors rounded hover:bg-white/10" data-id="${folder.id}" title="이름 변경">
          <i data-feather="edit-2" class="w-3 h-3 pointer-events-none"></i>
        </button>
        <button class="btn-delete-folder p-1 text-text-muted hover:text-accent-rose transition-colors rounded hover:bg-white/10" data-id="${folder.id}" title="삭제">
          <i data-feather="trash-2" class="w-3 h-3 pointer-events-none"></i>
        </button>
      </div>
    `;
    DOM.customFoldersList.appendChild(btn);
  });
  if (typeof feather !== 'undefined') feather.replace();
}

// Navigation Active State Update
function updateNavigationActiveState() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('bg-glass-bg', 'text-text-main');
    btn.classList.add('text-text-muted');
    
    if (AppState.currentFilter.type === btn.dataset.filter && 
        (btn.dataset.filter !== 'folder' || AppState.currentFilter.value === btn.dataset.value)) {
      btn.classList.add('bg-glass-bg', 'text-text-main');
      btn.classList.remove('text-text-muted');
    }
  });

  // Update List Title
  if (AppState.currentFilter.type === 'all') DOM.listTitle.textContent = '모든 메모';
  if (AppState.currentFilter.type === 'favorites') DOM.listTitle.textContent = '즐겨찾기';
  if (AppState.currentFilter.type === 'trash') DOM.listTitle.textContent = '휴지통';
  if (AppState.currentFilter.type === 'folder') {
    const f = AppState.folders.find(f => f.id === AppState.currentFilter.value);
    DOM.listTitle.textContent = f ? f.name : '폴더';
  }
}

function renderMemoList() {
  const memos = AppState.getMemos();
  DOM.listCount.textContent = `${memos.length}개의 메모`;
  DOM.memoList.innerHTML = '';

  memos.forEach(memo => {
    const plainContent = stripHtml(memo.content || '').replace(/\n/g, ' ').trim();
    const previewText = plainContent ? plainContent.substring(0, 100) : '내용 없음...';
    const displayTitle = memo.title || '제목 없는 메모';

    const card = document.createElement('div');
    const isActive = memo.id === AppState.activeMemoId;
    
    card.className = `p-4 rounded-2xl cursor-pointer transition-all duration-300 border memo-card-enter ${isActive ? 'bg-surface-high border-primary/30 shadow-[0_4px_20px_rgba(139,92,246,0.15)]' : 'bg-glass-bg border-glass-border hover:bg-glass-hover hover:border-primary/20'}`;
    card.dataset.id = memo.id;
    card.innerHTML = `
      <div class="flex justify-between items-start mb-1">
        <h3 class="font-semibold text-text-main truncate pr-2 flex-1 ${isActive ? 'text-primary' : ''}">${displayTitle}</h3>
        <div class="flex gap-1 shrink-0">
          ${memo.isPinned && !memo.isTrashed ? '<i data-feather="map-pin" class="w-3 h-3 text-accent-mint mt-1 fill-accent-mint"></i>' : ''}
          ${memo.isFavorite && !memo.isTrashed ? '<i data-feather="star" class="w-3 h-3 text-accent-amber mt-1 fill-accent-amber"></i>' : ''}
        </div>
      </div>
      <p class="text-xs text-text-muted/70 line-clamp-2 mb-3 h-8">${previewText}</p>
      <div class="text-[10px] text-text-muted/50 font-medium uppercase tracking-wider">${formatDate(memo.updatedAt)}</div>
    `;
    
    card.addEventListener('click', () => {
      AppState.activeMemoId = memo.id;
      renderMemoList(); // Re-render to update active state
      loadActiveMemo();
      showMobileEditor();
    });

    DOM.memoList.appendChild(card);
  });
  if (typeof feather !== 'undefined') feather.replace();
}

function loadActiveMemo() {
  if (!AppState.activeMemoId) {
    DOM.editorContainer.classList.add('opacity-0', 'pointer-events-none');
    DOM.emptyState.classList.remove('opacity-0', 'pointer-events-none');
    return;
  }

  const memo = AppState.memos.find(m => m.id === AppState.activeMemoId);
  if (!memo) return;

  DOM.emptyState.classList.add('opacity-0', 'pointer-events-none');
  DOM.editorContainer.classList.remove('opacity-0', 'pointer-events-none');

  isSystemLoading = true;
  DOM.memoTitle.value = memo.title;
  quill.root.innerHTML = memo.content || '';
  
  if (AppState.isMarkdownMode && DOM.markdownEditor) {
    let md = window.TurndownService ? new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }).turndown(memo.content || '') : (memo.content || '');
    DOM.markdownEditor.value = md;
  }
  
  setTimeout(() => { if (typeof ensureTrailingParagraph === 'function') ensureTrailingParagraph(); }, 0);
  isSystemLoading = false;
  
  updateWordCount();

  // Toolbar state
  if (memo.isTrashed) {
    setMode('viewer');
    if(DOM.tabEditor) DOM.tabEditor.classList.add('opacity-50', 'pointer-events-none');
    DOM.btnToggleFavorite.classList.add('hidden');
    DOM.btnTogglePin.classList.add('hidden');
    DOM.btnDeleteMemo.title = '영구 삭제';
    DOM.btnRestoreMemo.classList.remove('hidden');
  } else {
    // Determine view mode on load
    if (!isEditMode && AppState.settings.defaultView === 'editor') {
      setMode('editor');
    } else {
      setMode(isEditMode ? 'editor' : 'viewer');
    }
    
    if(DOM.tabEditor) DOM.tabEditor.classList.remove('opacity-50', 'pointer-events-none');
    DOM.btnToggleFavorite.classList.remove('hidden');
    DOM.btnTogglePin.classList.remove('hidden');
    DOM.btnDeleteMemo.title = '휴지통으로 이동';
    DOM.btnRestoreMemo.classList.add('hidden');
    
    if (memo.isPinned) {
      DOM.btnTogglePin.classList.add('text-accent-mint');
      DOM.btnTogglePin.innerHTML = '<i data-feather="map-pin" class="w-5 h-5 fill-accent-mint" color="#4edea3"></i>';
    } else {
      DOM.btnTogglePin.classList.remove('text-accent-mint');
      DOM.btnTogglePin.innerHTML = '<i data-feather="map-pin" class="w-5 h-5"></i>';
    }
    
    if (memo.isFavorite) {
      DOM.btnToggleFavorite.classList.add('text-accent-amber');
      DOM.btnToggleFavorite.innerHTML = '<i data-feather="star" class="w-5 h-5 fill-accent-amber" color="#ffb95f"></i>';
    } else {
      DOM.btnToggleFavorite.classList.remove('text-accent-amber');
      DOM.btnToggleFavorite.innerHTML = '<i data-feather="star" class="w-5 h-5"></i>';
    }
  }

  // Folder selector
  const folder = AppState.folders.find(f => f.id === memo.folderId);
  DOM.currentFolderName.textContent = folder ? folder.name : '폴더 없음';

  if (typeof feather !== 'undefined') feather.replace();
}

function updateWordCount() {
  let text = '';
  if (AppState.isMarkdownMode && DOM.markdownEditor) {
    text = DOM.markdownEditor.value.trim();
  } else if (quill) {
    text = quill.getText().trim();
  }
  
  const wordCount = text ? text.split(/\s+/).length : 0;
  if(DOM.wordCount && AppState.settings.showWordCount) {
    DOM.wordCount.textContent = `${wordCount} 단어`;
    DOM.wordCount.style.display = 'block';
  } else if (DOM.wordCount) {
    DOM.wordCount.style.display = 'none';
  }
}

const showSaveStatus = debounce(() => {
  DOM.saveStatus.textContent = '저장됨';
  DOM.saveStatus.classList.remove('text-primary');
}, 1000);

// --- Markdown Mode Toggle ---
function toggleMarkdownMode() {
  if (!AppState.activeMemoId || !DOM.markdownEditor || !DOM.memoContent) return;

  AppState.isMarkdownMode = !AppState.isMarkdownMode;
  const isMD = AppState.isMarkdownMode;

  if (isMD) {
    // Switch to Markdown Mode
    let html = quill.root.innerHTML;
    let md = window.TurndownService ? new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }).turndown(html) : html;
    
    DOM.markdownEditor.value = md;
    DOM.memoContent.classList.add('hidden');
    DOM.markdownEditor.classList.remove('hidden');
    DOM.btnToggleMarkdown.classList.add('bg-glass-hover', 'text-primary');
    DOM.btnToggleMarkdown.classList.remove('text-text-muted');
    DOM.markdownEditor.focus();
  } else {
    // Switch to WYSIWYG
    let md = DOM.markdownEditor.value;
    let html = window.marked ? marked.parse(md) : md;
    
    quill.root.innerHTML = html;
    DOM.markdownEditor.classList.add('hidden');
    DOM.memoContent.classList.remove('hidden');
    DOM.btnToggleMarkdown.classList.remove('bg-glass-hover', 'text-primary');
    DOM.btnToggleMarkdown.classList.add('text-text-muted');
    quill.focus();
  }
}

if (DOM.btnToggleMarkdown) {
  DOM.btnToggleMarkdown.addEventListener('click', toggleMarkdownMode);
}

if (DOM.markdownEditor) {
  DOM.markdownEditor.addEventListener('input', () => {
    if (!isSystemLoading) handleInput();
  });
}

function handleInput() {
  if (!AppState.activeMemoId || isSystemLoading) return;
  DOM.saveStatus.textContent = '저장 중...';
  DOM.saveStatus.classList.add('text-primary');
  
  let currentHTML = '';
  if (AppState.isMarkdownMode) {
    currentHTML = window.marked ? marked.parse(DOM.markdownEditor.value) : DOM.markdownEditor.value;
  } else {
    currentHTML = quill.root.innerHTML;
  }
  
  AppState.updateMemo(AppState.activeMemoId, {
    title: DOM.memoTitle.value,
    content: currentHTML
  });
  
  updateWordCount();
  showSaveStatus();
  
  // Re-render list to reflect title/content changes
  debounceRenderMemoList();
}

const debounceRenderMemoList = debounce(renderMemoList, 500);

// --- Event Listeners ---
let quill;
let isSystemLoading = false;
let isEditMode = false;

function setMode(mode) {
  isEditMode = (mode === 'editor');
  
  if (isEditMode) {
    DOM.editorView.classList.remove('hidden');
    DOM.editorView.classList.add('flex');
    DOM.readerView.classList.add('hidden');
    
    if(DOM.tabEditor) {
      DOM.tabEditor.classList.add('bg-white/10', 'text-text-main', 'shadow-sm');
      DOM.tabEditor.classList.remove('text-text-muted', 'hover:bg-white/5');
    }
    if(DOM.tabViewer) {
      DOM.tabViewer.classList.remove('bg-white/10', 'text-text-main', 'shadow-sm');
      DOM.tabViewer.classList.add('text-text-muted', 'hover:bg-white/5');
    }
  } else {
    DOM.editorView.classList.add('hidden');
    DOM.editorView.classList.remove('flex');
    DOM.readerView.classList.remove('hidden');
    
    if(DOM.tabViewer) {
      DOM.tabViewer.classList.add('bg-white/10', 'text-text-main', 'shadow-sm');
      DOM.tabViewer.classList.remove('text-text-muted', 'hover:bg-white/5');
    }
    if(DOM.tabEditor) {
      DOM.tabEditor.classList.remove('bg-white/10', 'text-text-main', 'shadow-sm');
      DOM.tabEditor.classList.add('text-text-muted', 'hover:bg-white/5');
    }

    // Sync content to reader
    if(DOM.readerTitle) DOM.readerTitle.textContent = DOM.memoTitle.value || '제목 없는 메모';
    if(DOM.readerContent) {
      if (AppState.isMarkdownMode && DOM.markdownEditor) {
        DOM.readerContent.innerHTML = window.marked ? marked.parse(DOM.markdownEditor.value) : DOM.markdownEditor.value;
      } else if (quill) {
        DOM.readerContent.innerHTML = quill.root.innerHTML;
      }
      // Apply syntax highlighting to code blocks in reader view
      DOM.readerContent.querySelectorAll('pre.ql-syntax, pre code').forEach(block => {
        hljs.highlightElement(block);
      });
    }
  }
}

function initQuill() {
  quill = new Quill('#memo-content', {
    modules: {
      formula: true,
      syntax: true,
      toolbar: '#toolbar-container'
    },
    theme: 'snow',
    bounds: '#editor-container',
    placeholder: '내용을 입력하세요...'
  });
  // Helper to ensure editor always ends with a normal paragraph if it ends with a block element
  function ensureTrailingParagraph() {
    const length = quill.getLength();
    if (length > 0) {
      const format = quill.getFormat(length - 1);
      if (format['code-block'] || format['blockquote']) {
        quill.insertText(length, '\n', Quill.sources.SILENT);
        quill.removeFormat(length, 1, Quill.sources.SILENT);
      }
    }
  }

  // Prevent browser native hit-testing from snapping the cursor into the code block
  // when clicking the empty space below the last element.
  DOM.editorContainer.addEventListener('mousedown', (e) => {
    if (e.target === DOM.editorContainer || e.target.id === 'editor' || e.target === quill.root) {
      if (e.target === quill.root && e.offsetX >= quill.root.clientWidth) return; // Ignore scrollbar

      const lastEl = quill.root.lastElementChild;
      if (lastEl) {
        const rect = lastEl.getBoundingClientRect();
        // If the user clicked below the bottom edge of the last element
        if (e.clientY > rect.bottom) {
          e.preventDefault(); // Stop native caret positioning
          ensureTrailingParagraph();
          // Place cursor at the very end of the document (inside the safe trailing paragraph)
          quill.setSelection(quill.getLength() - 1, 0, Quill.sources.USER);
        }
      }
    }
  });
  
  // Custom Enter binding for blockquote and code-block
  quill.keyboard.addBinding({ key: 'Enter' }, {
    collapsed: true,
    format: ['blockquote', 'code-block'],
    handler: function(range, context) {
      // 1. If at the very beginning of the editor, insert an empty line above
      if (range.index === 0) {
        this.quill.insertText(0, '\n', Quill.sources.USER);
        this.quill.removeFormat(0, 1, Quill.sources.USER);
        this.quill.setSelection(0, 0, Quill.sources.USER);
        return false;
      }
      
      // 2. Escape empty blockquote
      if (context.format.blockquote && context.empty) {
        this.quill.format('blockquote', false, Quill.sources.USER);
        return false;
      }
      
      return true; 
    }
  });

  // Editor content change
  quill.on('text-change', () => {
    ensureTrailingParagraph();
    if (!isSystemLoading) {
      handleInput();
    }
  });
}

// Navigation Filters
DOM.navFolders.addEventListener('click', (e) => {
  const btnEdit = e.target.closest('.btn-edit-folder');
  const btnDelete = e.target.closest('.btn-delete-folder');
  
  if (btnEdit) {
    e.stopPropagation();
    const id = btnEdit.dataset.id;
    const folder = AppState.folders.find(f => f.id === id);
    if (!folder) return;
    
    const navBtn = btnEdit.closest('.nav-btn');
    const nameSpan = navBtn.querySelector('.folder-name-display');
    const wrapper = navBtn.querySelector('.folder-name-wrapper');
    const actions = navBtn.querySelector('.folder-actions');
    
    nameSpan.classList.add('hidden');
    actions.classList.add('hidden');
    wrapper.classList.remove('pointer-events-none');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = folder.name;
    input.className = 'w-full bg-transparent border-b border-primary/50 text-text-main focus:outline-none focus:border-primary text-sm px-1 py-0 pointer-events-auto';
    
    wrapper.appendChild(input);
    input.focus();
    input.select();
    
    let isSaved = false;
    const save = () => {
      if (isSaved) return;
      isSaved = true;
      const newName = input.value.trim();
      if (newName && newName !== folder.name) {
        AppState.updateFolder(id, newName);
        renderFolders();
        updateNavigationActiveState();
        if (AppState.activeMemoId) loadActiveMemo();
      } else {
        input.remove();
        nameSpan.classList.remove('hidden');
        actions.classList.remove('hidden');
        wrapper.classList.add('pointer-events-none');
      }
    };
    
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') save();
      if (ev.key === 'Escape') {
        input.value = folder.name;
        save();
      }
    });
    return;
  }
  
  if (btnDelete) {
    e.stopPropagation();
    const id = btnDelete.dataset.id;
    const folder = AppState.folders.find(f => f.id === id);
    if (folder) {
      showConfirm('폴더 삭제', `'${folder.name}' 폴더를 삭제하시겠습니까? 안의 메모는 '모든 메모'에 보존됩니다.`, () => {
        AppState.deleteFolder(id);
        if (AppState.currentFilter.type === 'folder' && AppState.currentFilter.value === id) {
          AppState.currentFilter = { type: 'all', value: null };
        }
        renderFolders();
        updateNavigationActiveState();
        renderMemoList();
        loadActiveMemo();
      });
    }
    return;
  }

  const btn = e.target.closest('.nav-btn');
  if (btn) {
    AppState.currentFilter = { type: btn.dataset.filter, value: btn.dataset.value || null };
    updateNavigationActiveState();
    renderMemoList();
    AppState.activeMemoId = null; 
    loadActiveMemo();
    if (window.innerWidth < 1024) toggleSidebar(false);
  }
});

// New Memo
DOM.btnNewMemo.addEventListener('click', () => {
  const id = AppState.createMemo();
  AppState.activeMemoId = id;
  if(AppState.currentFilter.type === 'trash') {
    AppState.currentFilter = { type: 'all', value: null };
    updateNavigationActiveState();
  }
  renderMemoList();
  loadActiveMemo();
  showMobileEditor();
  if (window.innerWidth < 1024) toggleSidebar(false);
  DOM.memoTitle.focus();
});

// Search
DOM.searchInput.addEventListener('input', debounce((e) => {
  AppState.searchQuery = e.target.value;
  renderMemoList();
}, 300));

// Editor Input
DOM.memoTitle.addEventListener('input', handleInput);

// Toggle View Mode
if(DOM.tabViewer) {
  DOM.tabViewer.addEventListener('click', () => {
    if (AppState.activeMemoId) setMode('viewer');
  });
}
if(DOM.tabEditor) {
  DOM.tabEditor.addEventListener('click', () => {
    const memo = AppState.memos.find(m => m.id === AppState.activeMemoId);
    if (memo && !memo.isTrashed) {
      setMode('editor');
    }
  });
}

// Favorite
DOM.btnToggleFavorite.addEventListener('click', () => {
  if (!AppState.activeMemoId) return;
  const memo = AppState.memos.find(m => m.id === AppState.activeMemoId);
  if (memo) {
    AppState.updateMemo(memo.id, { isFavorite: !memo.isFavorite });
    renderMemoList();
    loadActiveMemo();
  }
});

// Trash
DOM.btnDeleteMemo.addEventListener('click', () => {
  if (!AppState.activeMemoId) return;
  AppState.deleteMemo(AppState.activeMemoId);
  AppState.activeMemoId = null;
  renderMemoList();
  loadActiveMemo();
});

// Restore
DOM.btnRestoreMemo.addEventListener('click', () => {
  if (!AppState.activeMemoId) return;
  AppState.updateMemo(AppState.activeMemoId, { isTrashed: false });
  AppState.activeMemoId = null;
  renderMemoList();
  loadActiveMemo();
});

// Pin
DOM.btnTogglePin.addEventListener('click', () => {
  if (!AppState.activeMemoId) return;
  const memo = AppState.memos.find(m => m.id === AppState.activeMemoId);
  if (memo) {
    AppState.updateMemo(memo.id, { isPinned: !memo.isPinned });
    renderMemoList();
    loadActiveMemo();
  }
});

// Sort Dropdown
DOM.btnSort.addEventListener('click', (e) => {
  e.stopPropagation();
  DOM.sortDropdown.classList.toggle('hidden');
});

DOM.sortDropdown.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-sort]');
  if (btn) {
    AppState.currentSort = btn.dataset.sort;
    DOM.sortDropdown.classList.add('hidden');
    updateSortUI();
    renderMemoList();
  }
});

function updateSortUI() {
  if (!DOM.sortDropdown) return;
  DOM.sortDropdown.querySelectorAll('button[data-sort]').forEach(btn => {
    if (btn.dataset.sort === AppState.currentSort) {
      btn.classList.add('active', 'text-text-main');
      btn.classList.remove('text-text-muted');
    } else {
      btn.classList.remove('active', 'text-text-main');
      btn.classList.add('text-text-muted');
    }
  });
}

// Add Folder
DOM.btnAddFolder.addEventListener('click', () => {
  const name = prompt('폴더 이름을 입력하세요:');
  if (name && name.trim()) {
    AppState.createFolder(name.trim());
    renderFolders();
  }
});

// Folder Selector in Editor
DOM.btnFolderSelector.addEventListener('click', (e) => {
  e.stopPropagation();
  DOM.folderDropdown.classList.toggle('hidden');
  
  // Render dropdown items
  DOM.folderDropdown.innerHTML = `
    <button class="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-white/5 hover:text-text-main transition-colors" data-id="">폴더 없음</button>
    ${AppState.folders.map(f => `<button class="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-white/5 hover:text-text-main transition-colors" data-id="${f.id}">${f.name}</button>`).join('')}
  `;
});

DOM.folderDropdown.addEventListener('click', (e) => {
  if (!AppState.activeMemoId) return;
  const btn = e.target.closest('button');
  if (btn) {
    const folderId = btn.dataset.id || null;
    AppState.updateMemo(AppState.activeMemoId, { folderId });
    DOM.folderDropdown.classList.add('hidden');
    loadActiveMemo();
    renderMemoList();
  }
});

document.addEventListener('click', () => {
  DOM.folderDropdown.classList.add('hidden');
  if (DOM.sortDropdown) DOM.sortDropdown.classList.add('hidden');
});

// Mobile Event Listeners
if (DOMMobile.btnOpenSidebar) DOMMobile.btnOpenSidebar.addEventListener('click', () => toggleSidebar(true));
if (DOMMobile.sidebarOverlay) DOMMobile.sidebarOverlay.addEventListener('click', () => toggleSidebar(false));
if (DOMMobile.btnBackToList) DOMMobile.btnBackToList.addEventListener('click', hideMobileEditor);

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  if (typeof feather !== 'undefined') feather.replace();
  AppState.init();
  initQuill();
  renderFolders();
  updateNavigationActiveState();
  updateSortUI();
  renderMemoList();
  loadActiveMemo();
});

// --- Settings & Help Modal Events ---
const DOMSettings = {
  btnOpenSettings: document.getElementById('btn-open-settings'),
  btnOpenHelp: document.getElementById('btn-open-help'),
  btnClose: document.getElementById('btn-close-settings'),
  modal: document.getElementById('settings-modal'),
  dialog: document.getElementById('settings-dialog'),
  tabSettings: document.getElementById('tab-settings'),
  tabHelp: document.getElementById('tab-help'),
  contentSettings: document.getElementById('settings-content'),
  contentHelp: document.getElementById('help-content'),
  
  // Inputs
  tgTheme: document.getElementById('toggle-theme'),
  selCode: document.getElementById('select-code-theme'),
  selView: document.getElementById('select-default-view'),
  tgWord: document.getElementById('toggle-wordcount'),
  
  // Data actions
  btnExport: document.getElementById('btn-export-data'),
  btnImport: document.getElementById('btn-import-data'),
  fileImport: document.getElementById('file-import-data'),
  btnReset: document.getElementById('btn-reset-data')
};

function openSettingsModal(tab = 'settings') {
  DOMSettings.modal.classList.remove('opacity-0', 'pointer-events-none');
  DOMSettings.dialog.classList.remove('scale-95');
  DOMSettings.dialog.classList.add('scale-100');
  switchTab(tab);
}

function closeSettingsModal() {
  DOMSettings.modal.classList.add('opacity-0', 'pointer-events-none');
  DOMSettings.dialog.classList.add('scale-95');
  DOMSettings.dialog.classList.remove('scale-100');
}

function switchTab(tab) {
  if (tab === 'settings') {
    DOMSettings.tabSettings.classList.replace('text-text-muted', 'text-text-main');
    DOMSettings.tabSettings.classList.replace('border-transparent', 'border-primary');
    DOMSettings.tabHelp.classList.replace('text-text-main', 'text-text-muted');
    DOMSettings.tabHelp.classList.replace('border-primary', 'border-transparent');
    DOMSettings.contentSettings.classList.remove('hidden');
    DOMSettings.contentHelp.classList.add('hidden');
  } else {
    DOMSettings.tabHelp.classList.replace('text-text-muted', 'text-text-main');
    DOMSettings.tabHelp.classList.replace('border-transparent', 'border-primary');
    DOMSettings.tabSettings.classList.replace('text-text-main', 'text-text-muted');
    DOMSettings.tabSettings.classList.replace('border-primary', 'border-transparent');
    DOMSettings.contentHelp.classList.remove('hidden');
    DOMSettings.contentSettings.classList.add('hidden');
  }
}

if (DOMSettings.btnOpenSettings) DOMSettings.btnOpenSettings.addEventListener('click', () => openSettingsModal('settings'));
if (DOMSettings.btnOpenHelp) DOMSettings.btnOpenHelp.addEventListener('click', () => openSettingsModal('help'));
if (DOMSettings.btnClose) DOMSettings.btnClose.addEventListener('click', closeSettingsModal);
if (DOMSettings.tabSettings) DOMSettings.tabSettings.addEventListener('click', () => switchTab('settings'));
if (DOMSettings.tabHelp) DOMSettings.tabHelp.addEventListener('click', () => switchTab('help'));

// Settings Updates
if (DOMSettings.tgTheme) DOMSettings.tgTheme.addEventListener('change', (e) => {
  AppState.settings.theme = e.target.checked ? 'light' : 'dark';
  AppState.save();
  AppState.applySettings();
});
if (DOMSettings.selCode) DOMSettings.selCode.addEventListener('change', (e) => {
  AppState.settings.codeTheme = e.target.value;
  AppState.save();
  AppState.applySettings();
});
if (DOMSettings.selView) DOMSettings.selView.addEventListener('change', (e) => {
  AppState.settings.defaultView = e.target.value;
  AppState.save();
  AppState.applySettings();
});
if (DOMSettings.tgWord) DOMSettings.tgWord.addEventListener('change', (e) => {
  AppState.settings.showWordCount = e.target.checked;
  AppState.save();
  AppState.applySettings();
  updateWordCount();
});

// Data Management
if (DOMSettings.btnExport) DOMSettings.btnExport.addEventListener('click', () => {
  const data = JSON.stringify({ memos: AppState.memos, folders: AppState.folders, settings: AppState.settings }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zenith_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

if (DOMSettings.btnImport) DOMSettings.btnImport.addEventListener('click', () => {
  DOMSettings.fileImport.click();
});

if (DOMSettings.fileImport) DOMSettings.fileImport.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.memos && data.folders) {
        showConfirm('데이터 가져오기', '기존 데이터가 모두 덮어씌워집니다. 진행하시겠습니까?', () => {
          AppState.memos = data.memos;
          AppState.folders = data.folders;
          if(data.settings) AppState.settings = data.settings;
          AppState.save();
          location.reload();
        });
      } else {
        alert('올바르지 않은 백업 파일 형식입니다.');
      }
    } catch (err) {
      alert('파일을 읽는 중 오류가 발생했습니다.');
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // Reset
});

if (DOMSettings.btnReset) DOMSettings.btnReset.addEventListener('click', () => {
  showConfirm('공장 초기화', '모든 메모, 폴더, 설정 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?', () => {
    localStorage.removeItem('zenith_memos');
    localStorage.removeItem('zenith_folders');
    localStorage.removeItem('zenith_settings');
    location.reload();
  });
});
