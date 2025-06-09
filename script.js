// ======= Constants and Utility =======
const SNIPPET_KEY = 'snippets_v2';
const URL_HASH_PREFIX = '#s-';

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getNow() {
  return new Date().toISOString();
}

function ellipsis(str, len = 200) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// ======= Snippet Storage =======
function loadSnippets() {
  try {
    return JSON.parse(localStorage.getItem(SNIPPET_KEY)) || [];
  } catch (e) { return []; }
}
function saveSnippets(snips) {
  localStorage.setItem(SNIPPET_KEY, JSON.stringify(snips));
}
function addSnippet(snip) {
  let arr = loadSnippets();
  arr.unshift(snip);
  saveSnippets(arr);
  return snip;
}
function getSnippetById(id) {
  return loadSnippets().find(s => s.id === id);
}
function getPublicSnippets() {
  return loadSnippets().filter(s => !s.private);
}

// ======= UI: Tab Switching =======
const tabEditor = document.getElementById('tab-editor');
const tabBrowse = document.getElementById('tab-browse');
const editorSection = document.getElementById('editor-section');
const browseSection = document.getElementById('browse-section');

function switchTab(tab) {
  if(tab === 'editor') {
    tabEditor.classList.add('active');
    tabBrowse.classList.remove('active');
    editorSection.classList.remove('hidden');
    browseSection.classList.add('hidden');
  } else {
    tabBrowse.classList.add('active');
    tabEditor.classList.remove('active');
    browseSection.classList.remove('hidden');
    editorSection.classList.add('hidden');
    renderSnippetList();
  }
}
tabEditor.onclick = () => switchTab('editor');
tabBrowse.onclick = () => switchTab('browse');

// ======= CodeMirror Editor Setup =======
let codeMirror = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
  mode: "javascript",
  theme: "material-darker",
  lineNumbers: true,
  lineWrapping: true,
  matchBrackets: true,
  autofocus: true,
  indentUnit: 2,
  tabSize: 2,
  extraKeys: { "Ctrl-Space": "autocomplete" }
});
codeMirror.setSize("100%", "320px");

const langModeMap = {
  javascript: "javascript",
  python: "python",
  htmlmixed: "htmlmixed",
  css: "css",
  markdown: "markdown",
  cpp: "text/x-c++src",
  java: "text/x-java",
  xml: "xml"
};
document.getElementById('language-select').onchange = function() {
  let lang = this.value;
  codeMirror.setOption("mode", langModeMap[lang] || "javascript");
};

// ======= Save Snippet =======
document.getElementById('save-snippet').onclick = function() {
  let title = document.getElementById('snippet-title').value.trim();
  let lang = document.getElementById('language-select').value;
  let code = codeMirror.getValue();
  let isPrivate = document.getElementById('is-private').checked;
  if(code.length < 3) return alert("Write some code first!");
  let snip = {
    id: randomId(),
    title: title || 'Untitled',
    lang,
    code,
    private: isPrivate,
    created: getNow()
  };
  addSnippet(snip);
  // If private, show link
  if(isPrivate) {
    alert("Saved! Private link: " + location.origin + location.pathname + URL_HASH_PREFIX + snip.id);
    location.hash = URL_HASH_PREFIX + snip.id;
  } else {
    alert("Saved to public!");
    switchTab('browse');
  }
  document.getElementById('snippet-title').value = '';
  codeMirror.setValue('');
  document.getElementById('is-private').checked = false;
};

// ======= Browse: Search & Filter =======
function renderSnippetList() {
  let list = document.getElementById('snippet-list');
  let query = document.getElementById('search-bar').value.trim().toLowerCase();
  let lang = document.getElementById('filter-lang').value;
  let snippets = getPublicSnippets();
  if(query) snippets = snippets.filter(s =>
    s.title.toLowerCase().includes(query) ||
    s.code.toLowerCase().includes(query)
  );
  if(lang) snippets = snippets.filter(s => s.lang === lang);
  list.innerHTML = snippets.length
    ? snippets.map(snip => snippetCardHTML(snip)).join('')
    : `<div style="color:#aaa;margin:2em 0;">No snippets found</div>`;
  // Bind events
  document.querySelectorAll('.card-btn-view').forEach(btn => {
    btn.onclick = () => viewSnippet(btn.dataset.id);
  });
  document.querySelectorAll('.card-btn-copy').forEach(btn => {
    btn.onclick = () => copySnippetLink(btn.dataset.id);
  });
}
function snippetCardHTML(snip) {
  return `
  <div class="snippet-card">
    <div class="snippet-card-title">${escapeHTML(snip.title)}</div>
    <div class="snippet-card-meta">
      ${snip.lang.toUpperCase()} &nbsp;·&nbsp; ${new Date(snip.created).toLocaleString()}
    </div>
    <pre class="snippet-card-preview">${escapeHTML(ellipsis(snip.code, 220))}</pre>
    <div class="snippet-card-footer">
      <button class="card-btn card-btn-view" data-id="${snip.id}">View</button>
      <button class="card-btn card-btn-copy" data-id="${snip.id}">Copy Link</button>
    </div>
  </div>`;
}

function viewSnippet(id) {
  let snip = getSnippetById(id);
  if(!snip) return alert("Snippet not found");
  switchTab('editor');
  document.getElementById('snippet-title').value = snip.title;
  document.getElementById('language-select').value = snip.lang;
  codeMirror.setOption("mode", langModeMap[snip.lang] || "javascript");
  codeMirror.setValue(snip.code);
  document.getElementById('is-private').checked = snip.private;
}

function copySnippetLink(id) {
  let url = location.origin + location.pathname + URL_HASH_PREFIX + id;
  navigator.clipboard.writeText(url).then(() => {
    alert('Link copied!');
  });
}

// ======= Browse controls =======
document.getElementById('search-bar').oninput = renderSnippetList;
document.getElementById('filter-lang').onchange = renderSnippetList;

// ======= URL Hash: Private Access =======
window.addEventListener('DOMContentLoaded', function() {
  // If URL has #s-... show private snippet
  if(location.hash.startsWith(URL_HASH_PREFIX)) {
    let id = location.hash.slice(URL_HASH_PREFIX.length);
    let snip = getSnippetById(id);
    if(!snip) return alert('Snippet not found');
    switchTab('editor');
    document.getElementById('snippet-title').value = snip.title;
    document.getElementById('language-select').value = snip.lang;
    codeMirror.setOption("mode", langModeMap[snip.lang] || "javascript");
    codeMirror.setValue(snip.code);
    document.getElementById('is-private').checked = snip.private;
  }
  renderSnippetList();
});

// ======= Helper =======
function escapeHTML(str) {
  return (str+'').replace(/[&<>"]/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ));
}
