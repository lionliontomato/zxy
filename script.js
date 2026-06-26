const SHEET_ID = '10AYlVGPbusJJVcEvQTn8KUmENqJ1gybBncg9V3RBmTQ';
const SHEET_GID = '0';
const CACHE_BUSTER_VERSION = '20260627-final-v2';

let songs = [];
let tags = [];
let activeTag = null;
let query = '';
let sheetTimeout = null;

let visibleCount = 60;
const PAGE_SIZE = 60;

const palette = [
  ['#f6c343','#fff7d6'],['#2fa8f5','#ecf7ff'],['#ff8e55','#fff3ec'],
  ['#ffd34e','#fff9dc'],['#5bc7f2','#edfaff'],['#ef5b5b','#fff0ef'],
  ['#88d8c0','#effcf8'],['#ffb84d','#fff5e3'],['#8eb5ff','#f1f6ff'],
  ['#e7b600','#fff8d5'],['#3bb7e8','#e8f8ff'],['#ff9db7','#fff0f5']
];

function cell(row, i) {
  const c = row && row.c ? row.c[i] : null;
  return c ? String(c.f || c.v || '').trim() : '';
}

function parseTags(text) {
  return String(text || '')
    .replace(/[｜|／\/;；、，\n\r]/g, ',')
    .split(',')
    .map(function(t) {
      return t.trim();
    })
    .filter(function(t) {
      return t && t !== '-' && t !== '—' && t !== '標籤';
    });
}

function exactSetting(settings, keys, fallback) {
  for (let i = 0; i < keys.length; i++) {
    if (Object.prototype.hasOwnProperty.call(settings, keys[i])) {
      return settings[keys[i]];
    }
  }
  return fallback;
}

function normalizeCopyrightLine(value) {
  const text = String(value || '').trim();
  if (!text || text.includes('小亦') || text.includes('血©')) {
    return '© 2026 LionLionTomato. All Rights Reserved.';
  }
  return text;
}

function getSettings(rows) {
  const settingsMap = {};

  rows.forEach(function(row) {
    const key = cell(row, 7);
    const value = cell(row, 8);
    if (key) settingsMap[key] = value;
  });

  const i2 = rows[1] ? cell(rows[1], 8) : '';
  const i3 = rows[2] ? cell(rows[2], 8) : '';

  return {
    title: exactSetting(settingsMap, ['網站標題', '網頁標題', '標題名稱', '歌單名稱', '主標題'], i2 || ''),
    subtitle: exactSetting(settingsMap, ['網站小標題', '網頁小標題', '網站副標題', '網頁副標題', '副標題', '介紹文字', '說明文字'], i3 || ''),
    randomText: exactSetting(settingsMap, ['隨機抽歌按鈕', '抽歌按鈕文字', '隨機按鈕文字'], '隨機抽歌'),
    searchPlaceholder: exactSetting(settingsMap, ['搜尋提示文字', '搜尋框提示', '搜尋 placeholder'], '搜尋歌名、歌手或分類…'),
    emptyText: exactSetting(settingsMap, ['找不到歌曲提示', '空白提示', '無資料提示'], '沒有找到符合條件的歌曲'),
    modalTitle: exactSetting(settingsMap, ['抽歌視窗標題', '彈窗標題', '推薦視窗標題'], '小亦推薦'),
    closeText: exactSetting(settingsMap, ['關閉按鈕文字', '關閉按鈕', '視窗按鈕文字', '彈窗按鈕文字'], '好聽愛聽'),
    footer1: normalizeCopyrightLine(exactSetting(settingsMap, ['版權第一行', '頁尾第一行', 'footer1', 'copyright1'], '© 2026 LionLionTomato. All Rights Reserved.')),
    footer2: exactSetting(settingsMap, ['版權第二行', '頁尾第二行', 'footer2', 'copyright2'], '本網站係由作者本人原創之歌單網站架構延伸製作。'),
    footer3: exactSetting(settingsMap, ['版權第三行', '頁尾第三行', 'footer3', 'copyright3'], '本網站內容、版面設計與程式架構未經授權不得重製、改作或商業使用。')
  };
}

function applySiteSettings(rows) {
  const settings = getSettings(rows);

  const siteTitle = document.getElementById('siteTitle');
  const siteSubtitle = document.getElementById('siteSubtitle');
  const modalTitleEl = document.getElementById('modalTitle');
  const closeModal = document.getElementById('closeModal');
  const randomBtn = document.getElementById('randomBtn');
  const search = document.getElementById('search');
  const empty = document.getElementById('empty');
  const footer1 = document.getElementById('footer1');
  const footer2 = document.getElementById('footer2');
  const footer3 = document.getElementById('footer3');

  if (siteTitle) siteTitle.textContent = settings.title;
  if (siteSubtitle) siteSubtitle.textContent = settings.subtitle;
  if (modalTitleEl) modalTitleEl.textContent = settings.modalTitle;
  if (closeModal) closeModal.textContent = settings.closeText;
  if (randomBtn) randomBtn.textContent = settings.randomText;
  if (search) search.placeholder = settings.searchPlaceholder;
  if (empty) empty.textContent = settings.emptyText;
  if (footer1) footer1.textContent = settings.footer1;
  if (footer2) footer2.textContent = settings.footer2;
  if (footer3) footer3.textContent = settings.footer3;
  if (settings.title) document.title = settings.title;
}

function loadSheet() {
  const status = document.getElementById('status');
  if (status) status.textContent = '讀取中…';

  const oldScript = document.getElementById('sheetJsonp');
  if (oldScript) oldScript.remove();

  const callbackName = 'playlistSheetCallback_' + Date.now();
  const noCache = Date.now() + '-' + Math.random().toString(36).slice(2) + '-' + CACHE_BUSTER_VERSION;

  const url =
    'https://docs.google.com/spreadsheets/d/' +
    SHEET_ID +
    '/gviz/tq?gid=' +
    SHEET_GID +
    '&headers=0&tqx=out:json;responseHandler:' +
    callbackName +
    '&cachebust=' +
    encodeURIComponent(noCache);

  window[callbackName] = function(response) {
    clearTimeout(sheetTimeout);

    try {
      if (response && response.status && response.status !== 'ok') {
        showSheetError('試算表讀取失敗，請確認 Google 試算表權限是「知道連結的任何人可檢視」。');
        return;
      }

      const rows = response && response.table && response.table.rows ? response.table.rows : [];
      applySiteSettings(rows);

      const loadedSongs = [];
      const masterTags = [];

      rows.forEach(function(row) {
        const title = cell(row, 0);
        const artist = cell(row, 1);
        const category = cell(row, 2);
        const link = cell(row, 3);
        const masterTagCell = cell(row, 5);
        const looksLikeHeader = ['歌名', '歌曲', '曲名', 'title'].includes(title.toLowerCase());

        if (!looksLikeHeader) {
          parseTags(masterTagCell).forEach(function(t) {
            masterTags.push(t);
          });
        }

        if (title && !looksLikeHeader) {
          loadedSongs.push({
            title: title,
            artist: artist || '未填歌手',
            category: category || '未分類',
            link: /^https?:\/\//i.test(link) ? link : ''
          });
        }
      });

      songs = loadedSongs;

      if (masterTags.length) {
        tags = Array.from(new Set(masterTags));
      } else {
        const fromSongs = [];
        songs.forEach(function(s) {
          parseTags(s.category).forEach(function(t) {
            fromSongs.push(t);
          });
        });
        tags = Array.from(new Set(fromSongs));
      }

      visibleCount = PAGE_SIZE;

      if (status) status.textContent = '';
      renderTags();
      renderSongs();
    } catch (err) {
      console.error(err);
      showSheetError('試算表格式解析失敗，請確認 A欄歌名、B欄歌手、C欄分類、D欄連結、F欄標籤。');
    } finally {
      delete window[callbackName];
      const s = document.getElementById('sheetJsonp');
      if (s) s.remove();
    }
  };

  const script = document.createElement('script');
  script.id = 'sheetJsonp';
  script.src = url;

  script.onerror = function() {
    clearTimeout(sheetTimeout);
    showSheetError('讀取不到試算表，請確認共用權限是「知道連結的任何人可檢視」。');
    delete window[callbackName];
  };

  document.body.appendChild(script);

  sheetTimeout = setTimeout(function() {
    showSheetError('讀取試算表逾時，請重新整理頁面或確認試算表權限。');
    delete window[callbackName];
    const s = document.getElementById('sheetJsonp');
    if (s) s.remove();
  }, 12000);
}

function showSheetError(message) {
  songs = [];
  tags = [];

  const status = document.getElementById('status');
  if (status) status.textContent = message;

  renderTags();
  renderSongs();
}

function renderTags() {
  const box = document.getElementById('tags');
  if (!box) return;

  box.innerHTML = '';

  tags.forEach(function(t, i) {
    const colors = palette[i % palette.length];
    const b = document.createElement('button');

    b.className = 'tag' + (activeTag === t ? ' active' : '');
    b.textContent = t;
    b.style.setProperty('--tag', colors[0]);
    b.style.setProperty('--tagLight', colors[1]);

    b.onclick = function() {
      activeTag = activeTag === t ? null : t;
      visibleCount = PAGE_SIZE;
      renderTags();
      renderSongs();

      const grid = document.getElementById('grid');
      if (grid) {
        grid.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    };

    box.appendChild(b);
  });
}

function matchSong(s) {
  const q = String(query || '').trim().toLowerCase();
  const categories = parseTags(s.category);
  const text = (s.title + ' ' + s.artist + ' ' + s.category).toLowerCase();

  const tagOk =
    !activeTag ||
    categories.includes(activeTag) ||
    s.artist === activeTag ||
    s.category.includes(activeTag);

  return tagOk && (!q || text.includes(q));
}

function createCard(s) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.title = s.title;

  const title = document.createElement('h3');
  title.className = 'song';
  title.textContent = s.title;

  const artist = document.createElement('div');
  artist.className = 'artist';
  artist.textContent = s.artist;

  const cat = document.createElement('span');
  cat.className = 'cat';
  cat.textContent = parseTags(s.category).join(' ') || '未分類';

  const copy = document.createElement('button');
  copy.className = 'copy';
  copy.type = 'button';
  copy.textContent = '複製';

  copy.onclick = async function() {
    const text = s.title + ' - ' + s.artist;

    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }

    copy.textContent = '✓ 已複製';
    copy.classList.add('done');

    setTimeout(function() {
      copy.textContent = '複製';
      copy.classList.remove('done');
    }, 1300);
  };

  card.appendChild(title);
  card.appendChild(artist);
  card.appendChild(cat);
  card.appendChild(copy);

  if (s.link) {
    card.addEventListener('dblclick', function() {
      window.open(s.link, '_blank', 'noopener,noreferrer');
    });
    card.title = '雙擊開啟歌曲連結';
  }

  return card;
}

function renderSongs() {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  if (!grid || !empty || !count) return;

  grid.innerHTML = '';

  const list = songs.filter(matchSong);
  const visibleList = list.slice(0, visibleCount);

  count.textContent = '共 ' + list.length + ' 首 / 全部 ' + songs.length + ' 首';
  empty.style.display = list.length ? 'none' : 'block';

  const fragment = document.createDocumentFragment();

  visibleList.forEach(function(s) {
    fragment.appendChild(createCard(s));
  });

  grid.appendChild(fragment);

  if (loadMoreBtn) {
    if (list.length > visibleCount) {
      loadMoreBtn.style.display = 'block';
      loadMoreBtn.textContent = '載入更多（已顯示 ' + visibleList.length + ' / ' + list.length + ' 首）';
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }
}

const searchInput = document.getElementById('search');

if (searchInput) {
  searchInput.addEventListener('input', function(e) {
    query = e.target.value;
    visibleCount = PAGE_SIZE;
    renderSongs();
  });
}

const loadMoreBtn = document.getElementById('loadMoreBtn');

if (loadMoreBtn) {
  loadMoreBtn.onclick = function() {
    visibleCount += PAGE_SIZE;
    renderSongs();
  };
}

const randomBtn = document.getElementById('randomBtn');

if (randomBtn) {
  randomBtn.onclick = function(e) {
    e.preventDefault();

    const list = songs.filter(matchSong);
    if (!list.length) return;

    const s = list[Math.floor(Math.random() * list.length)];

    document.getElementById('pickSong').textContent = s.title;
    document.getElementById('pickArtist').textContent =
      s.artist + '｜' + (parseTags(s.category).join(' ') || '未分類');

    document.getElementById('modal').classList.add('show');
  };
}

const closeModal = document.getElementById('closeModal');

if (closeModal) {
  closeModal.onclick = function() {
    document.getElementById('modal').classList.remove('show');
  };
}

const modal = document.getElementById('modal');

if (modal) {
  modal.onclick = function(e) {
    if (e.target.id === 'modal') {
      e.currentTarget.classList.remove('show');
    }
  };
}

/* 手機效能優化：手機版減少浮動動畫 */
(function floats() {
  const layer = document.getElementById('floatLayer');
  if (!layer) return;

  const isMobile = window.matchMedia('(max-width:680px)').matches;
  const total = isMobile ? 18 : 72;

  const symbols = ['♪','♫','♬','♩','♬','★','✦','✧','♡','●'];
  const colors = [
    '#ffd000', '#ffbf00', '#ff9cc7', '#42bdf5', '#ffffff',
    '#ffe66d', '#ffc247', '#fff7bf'
  ];

  for (let i = 0; i < total; i++) {
    const el = document.createElement('span');
    el.className = 'float';
    el.textContent = symbols[i % symbols.length];

    const edgeBias = Math.random();
    let left;

    if (edgeBias < 0.38) {
      left = Math.random() * 22;
    } else if (edgeBias < 0.76) {
      left = 78 + Math.random() * 22;
    } else {
      left = 22 + Math.random() * 56;
    }

    const size = 18 + Math.random() * 24;
    const drift = (Math.random() * 90 - 45).toFixed(1) + 'px';
    const spin = (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 240);

    el.style.setProperty('--left', left.toFixed(2) + '%');
    el.style.setProperty('--size', size.toFixed(1) + 'px');
    el.style.setProperty('--dur', (9 + Math.random() * 12).toFixed(2) + 's');
    el.style.setProperty('--delay', (-Math.random() * 18).toFixed(2) + 's');
    el.style.setProperty('--drift', drift);
    el.style.setProperty('--spin', spin.toFixed(0) + 'deg');
    el.style.setProperty('--color', colors[i % colors.length]);

    layer.appendChild(el);
  }
})();

loadSheet();
