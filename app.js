// DOM要素の取得
const noteList = document.getElementById('note-list');
const noteEditor = document.getElementById('note-editor');
const noteTitle = document.getElementById('note-title');
const noteContent = document.getElementById('note-content');
const noteCategory = document.getElementById('note-category');
const addNoteBtn = document.getElementById('add-note-btn');
const saveNoteBtn = document.getElementById('save-note-btn');
const cancelBtn = document.getElementById('cancel-btn');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const pinNoteBtn = document.getElementById('pin-note-btn');

// アプリの状態
let notes = [];
let currentNoteId = null;
let darkMode = false;

// 初期化
function initApp() {
    loadNotes();
    loadThemePreference();
    renderNoteList();
    setupEventListeners();
    
    // 初期表示時にエディタが表示されていないことを確認
    if (notes.length === 0) {
        noteEditor.classList.add('hidden');
    }
}

// ローカルストレージからノートを読み込む
function loadNotes() {
    const savedNotes = localStorage.getItem('notes');
    notes = savedNotes ? JSON.parse(savedNotes) : [];
}

// テーマ設定を読み込む
function loadThemePreference() {
    darkMode = localStorage.getItem('darkMode') === 'true';
    updateTheme();
}

// ノートリストのレンダリング
function renderNoteList(filteredNotes = null) {
    // 表示するノートのリスト（フィルタリングされたものかすべて）
    const notesToRender = filteredNotes || notes;
    
    // ピン留めされたノートを先に表示
    const pinnedNotes = notesToRender.filter(note => note.pinned);
    const unpinnedNotes = notesToRender.filter(note => !note.pinned);
    const sortedNotes = [...pinnedNotes, ...unpinnedNotes];
    
    noteList.innerHTML = '';
    
    if (sortedNotes.length === 0) {
        noteList.innerHTML = '<p class="empty-note">メモがありません</p>';
        return;
    }
    
    sortedNotes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.classList.add('note-item');
        if (note.pinned) {
            noteItem.classList.add('pinned');
        }
        
        // 表示用の日付フォーマット
        const formattedDate = formatDate(note.updatedAt);
        
        // マークダウンのプレビュー（最初の100文字まで）
        const previewText = note.content.length > 100 
            ? note.content.substring(0, 100) + '...' 
            : note.content;
        
        noteItem.innerHTML = `
            <h3>${escapeHTML(note.title) || '無題のメモ'}</h3>
            <p>${escapeHTML(previewText)}</p>
            <div class="date">${formattedDate}</div>
            <div class="note-category">${getCategoryLabel(note.category)}</div>
        `;
        
        noteItem.addEventListener('click', () => {
            openNoteEditor(note.id);
        });
        
        noteList.appendChild(noteItem);
    });
}

// 日付フォーマット
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    // 今日の日付の場合
    if (date.toDateString() === now.toDateString()) {
        return `今日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    // 昨日の日付の場合
    else if (date.toDateString() === yesterday.toDateString()) {
        return `昨日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    // それ以外
    else {
        return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    }
}

// HTML特殊文字をエスケープ
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// カテゴリーラベルの取得
function getCategoryLabel(category) {
    const categories = {
        'work': '仕事',
        'personal': '個人',
        'ideas': 'アイデア',
        'other': 'その他'
    };
    return categories[category] || 'その他';
}

// 新規メモの作成
function createNewNote() {
    currentNoteId = null;
    noteTitle.value = '';
    noteContent.value = '';
    noteCategory.value = 'personal';
    noteEditor.classList.remove('hidden');
    updatePinButton(false);
    
    // フォーカスをタイトルに当てる
    setTimeout(() => noteTitle.focus(), 100);
    
    // スマホの場合はスクロール
    if (window.innerWidth <= 768) {
        noteEditor.scrollIntoView({ behavior: 'smooth' });
    }
}

// 既存メモの編集
function openNoteEditor(noteId) {
    const note = notes.find(note => note.id === noteId);
    if (note) {
        currentNoteId = noteId;
        noteTitle.value = note.title || '';
        noteContent.value = note.content || '';
        noteCategory.value = note.category || 'other';
        noteEditor.classList.remove('hidden');
        updatePinButton(note.pinned || false);
        
        // フォーカスをタイトルに当てる
        setTimeout(() => noteTitle.focus(), 100);
        
        // スマホの場合はスクロール
        if (window.innerWidth <= 768) {
            noteEditor.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// メモの保存
function saveNote() {
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();
    const category = noteCategory.value;
    
    if (content === '') {
        showNotification('メモの内容を入力してください', 'error');
        noteContent.focus();
        return;
    }
    
    if (currentNoteId === null) {
        // 新規メモの場合
        const newNote = {
            id: Date.now().toString(),
            title: title || '無題のメモ',
            content,
            category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pinned: false
        };
        notes.unshift(newNote);
        showNotification('新しいメモを作成しました');
    } else {
        // 既存メモの更新
        const noteIndex = notes.findIndex(note => note.id === currentNoteId);
        if (noteIndex !== -1) {
            // 現在のピン状態を保持
            const isPinned = notes[noteIndex].pinned;
            
            const updatedNote = {
                ...notes[noteIndex],
                title: title || '無題のメモ',
                content,
                category,
                updatedAt: new Date().toISOString(),
                pinned: isPinned
            };
            notes[noteIndex] = updatedNote;
            showNotification('メモを更新しました');
        }
    }
    
    saveNotes();
    renderNoteList();
    noteEditor.classList.add('hidden');
}

// 通知の表示
function showNotification(message, type = 'success') {
    // 既存の通知を削除
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 新しい通知を作成
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    
    // CSSスタイルを追加
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
    notification.style.color = 'white';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.zIndex = '1000';
    notification.style.transition = 'opacity 0.5s';
    
    // ドキュメントに追加
    document.body.appendChild(notification);
    
    // 3秒後に消える
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// ピン状態の更新
function updatePinButton(isPinned) {
    if (isPinned) {
        pinNoteBtn.textContent = '📌';
        pinNoteBtn.classList.add('active');
        pinNoteBtn.title = 'ピン留めを解除';
    } else {
        pinNoteBtn.textContent = '📌';
        pinNoteBtn.classList.remove('active');
        pinNoteBtn.title = 'メモをピン留め';
    }
}

// ピン留め切り替え
function togglePinNote() {
    if (currentNoteId) {
        const noteIndex = notes.findIndex(note => note.id === currentNoteId);
        if (noteIndex !== -1) {
            notes[noteIndex].pinned = !notes[noteIndex].pinned;
            updatePinButton(notes[noteIndex].pinned);
            
            // ピン状態に応じたメッセージ
            const message = notes[noteIndex].pinned ? 'メモをピン留めしました' : 'ピン留めを解除しました';
            showNotification(message);
            
            saveNotes();
        }
    }
}

// ノートの検索
function searchNotes() {
    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilter = categorySelect.value;
    
    if (searchTerm === '' && categoryFilter === 'all') {
        renderNoteList();
        return;
    }
    
    const filteredNotes = notes.filter(note => {
        const matchesSearch = 
            note.title.toLowerCase().includes(searchTerm) || 
            note.content.toLowerCase().includes(searchTerm);
        
        const matchesCategory = 
            categoryFilter === 'all' || 
            note.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });
    
    renderNoteList(filteredNotes);
    
    // 検索結果に関するメッセージ
    if (filteredNotes.length === 0) {
        noteList.innerHTML = '<p class="empty-note">検索条件に一致するメモがありません</p>';
    }
}

// テーマの切り替え
function toggleTheme() {
    darkMode = !darkMode;
    updateTheme();
    localStorage.setItem('darkMode', darkMode);
    
    // テーマ変更通知
    const message = darkMode ? 'ダークモードに切り替えました' : 'ライトモードに切り替えました';
    showNotification(message);
}

// テーマの更新
function updateTheme() {
    if (darkMode) {
        document.body.classList.add('dark-theme');
        themeToggleBtn.textContent = '☀️';
        themeToggleBtn.title = 'ライトモードに切り替え';
    } else {
        document.body.classList.remove('dark-theme');
        themeToggleBtn.textContent = '🌙';
        themeToggleBtn.title = 'ダークモードに切り替え';
    }
}

// メモのエクスポート
function exportNotes() {
    if (notes.length === 0) {
        showNotification('エクスポートするメモがありません', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(notes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileName = `notes_export_${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    showNotification(`${notes.length}件のメモをエクスポートしました`);
}

// メモのインポート
function importNotes() {
    importFile.click();
}

// ファイル選択後の処理
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedNotes = JSON.parse(e.target.result);
            
            if (Array.isArray(importedNotes)) {
                // 既存のメモと重複しないようにIDを再生成
                const importedWithNewIds = importedNotes.map(note => ({
                    ...note,
                    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9)
                }));
                
                // 既存のメモと結合
                notes = [...importedWithNewIds, ...notes];
                saveNotes();
                renderNoteList();
                showNotification(`${importedNotes.length}件のメモをインポートしました`);
            } else {
                showNotification('無効なファイル形式です', 'error');
            }
        } catch (error) {
            showNotification('ファイルの読み込みに失敗しました: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // ファイル選択をリセット
}

// ローカルストレージへの保存
function saveNotes() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

// キーボードショートカット
function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + S で保存
    if ((event.ctrlKey || event.metaKey) && event.key === 's' && !noteEditor.classList.contains('hidden')) {
        event.preventDefault();
        saveNote();
    }
    
    // Esc でキャンセル
    if (event.key === 'Escape' && !noteEditor.classList.contains('hidden')) {
        event.preventDefault();
        noteEditor.classList.add('hidden');
    }
    
    // Ctrl/Cmd + N で新規メモ
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        createNewNote();
    }
}

// ウィンドウのリサイズ処理
function handleResize() {
    // レスポンシブ対応
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // モバイル表示時はエディタを全画面表示
        if (!noteEditor.classList.contains('hidden')) {
            noteList.style.display = 'none';
        } else {
            noteList.style.display = 'block';
        }
    } else {
        // デスクトップ表示時は並べて表示
        noteList.style.display = 'block';
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    addNoteBtn.addEventListener('click', createNewNote);
    saveNoteBtn.addEventListener('click', saveNote);
    cancelBtn.addEventListener('click', () => {
        noteEditor.classList.add('hidden');
        // モバイル表示時はリストを表示
        if (window.innerWidth <= 768) {
            noteList.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    searchInput.addEventListener('input', searchNotes);
    categorySelect.addEventListener('change', searchNotes);
    
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    exportBtn.addEventListener('click', exportNotes);
    importBtn.addEventListener('click', importNotes);
    importFile.addEventListener('change', handleFileSelect);
    
    pinNoteBtn.addEventListener('click', togglePinNote);
    
    // キーボードショートカット
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // ウィンドウのリサイズ
    window.addEventListener('resize', handleResize);
    
    // TextAreaの自動リサイズ
    noteContent.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', initApp);