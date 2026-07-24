const ALL_CATEGORY = "すべて";

const VIEW_COUNT_API =
  "https://script.google.com/macros/s/AKfycbzItrSudqsEYmiTQiXcC6mqI2qEXc1PDZs3hYU9w4t4qWxHiQO_U5eO4SllX3S9isxl9w/exec";

const CATEGORY_ORDER = [
  "基本業務",
  "診療業務",
  "撮影業務",
  "受付業務",
  "訪問関連",
  "消毒室関連",
  "メンテナンス関連",
  "技工関連",
  "分院・基本業務",
  "分院・診療業務",
  "分院・受付業務",
  "その他",
];

const state = {
  videos: [],
  activeCategory: ALL_CATEGORY,
  query: "",
  viewCounts: {},
  sortOrder: "new",
  mediaType: "all",
  favorites: loadFavorites(),
};

const grid = document.getElementById("video-grid");
const mediaTabsEl = document.getElementById("media-tabs");
const filtersEl = document.getElementById("category-filters");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const emptyMessage = document.getElementById("empty-message");
const modal = document.getElementById("video-modal");
const modalVideoWrap = document.getElementById("modal-video-wrap");
const modalIframe = document.getElementById("modal-iframe");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalPhotoWrap = document.getElementById("modal-photo-wrap");
const modalPhoto = document.getElementById("modal-photo");
const modalPhotoPrev = document.getElementById("modal-photo-prev");
const modalPhotoNext = document.getElementById("modal-photo-next");
const modalPhotoCount = document.getElementById("modal-photo-count");
const modalFavoriteBtn = document.getElementById("modal-favorite-btn");

let currentPhotoIndex = 0;
let currentPhotoIds = [];
let currentVideo = null;

const FAVORITES_KEY = "tanpopo-manual-favorites";

function loadFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []);
  } catch (e) {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
}

function isFavorite(id) {
  return state.favorites.has(id);
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }
  saveFavorites();
}

function driveEmbedUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function driveThumbUrl(fileId, size = "w400") {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`;
}

function youtubeEmbedUrl(youtubeId) {
  return `https://www.youtube.com/embed/${youtubeId}`;
}

function youtubeThumbUrl(youtubeId) {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

function isPhoto(video) {
  return video.type === "photo";
}

function isYoutube(video) {
  return video.type === "youtube";
}

function thumbUrl(video) {
  if (isPhoto(video)) return driveThumbUrl(video.photoFileIds[0]);
  if (isYoutube(video)) return youtubeThumbUrl(video.youtubeId);
  return driveThumbUrl(video.driveFileId);
}

function embedUrl(video) {
  if (isYoutube(video)) return youtubeEmbedUrl(video.youtubeId);
  return driveEmbedUrl(video.driveFileId);
}

function getViewCount(id) {
  return state.viewCounts[id] || 0;
}

async function loadViewCounts() {
  try {
    const res = await fetch(VIEW_COUNT_API);
    state.viewCounts = await res.json();
  } catch (e) {
    state.viewCounts = {};
  }
}

function recordView(video) {
  state.viewCounts[video.id] = getViewCount(video.id) + 1;
  fetch(VIEW_COUNT_API, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ id: video.id }),
  }).catch(() => {});
}

function renderCategoryFilters() {
  const videosForTabs = state.videos.filter(matchesMediaType);
  const usedCategories = [...new Set(videosForTabs.map((v) => v.category))];
  usedCategories.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const categories = [ALL_CATEGORY, ...usedCategories];
  filtersEl.innerHTML = "";
  for (const category of categories) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-btn" + (category === state.activeCategory ? " active" : "");
    btn.textContent = category;
    btn.addEventListener("click", () => {
      state.activeCategory = category;
      renderCategoryFilters();
      renderGrid();
    });
    filtersEl.appendChild(btn);
  }
}

function matchesMediaType(video) {
  switch (state.mediaType) {
    case "photo":
      return isPhoto(video);
    case "video":
      return !isPhoto(video);
    case "favorite":
      return isFavorite(video.id);
    default:
      return true;
  }
}

function getFilteredVideos() {
  const query = state.query.trim().toLowerCase();
  const videos = state.videos.filter((video) => {
    const matchesCategory =
      state.activeCategory === ALL_CATEGORY || video.category === state.activeCategory;
    const matchesQuery =
      !query ||
      video.title.toLowerCase().includes(query) ||
      video.description.toLowerCase().includes(query);
    return matchesCategory && matchesMediaType(video) && matchesQuery;
  });

  // videos.jsonは投稿順(古い順)に並んでいる前提で並び替える
  switch (state.sortOrder) {
    case "views-desc":
      return [...videos].sort((a, b) => getViewCount(b.id) - getViewCount(a.id));
    case "views-asc":
      return [...videos].sort((a, b) => getViewCount(a.id) - getViewCount(b.id));
    case "old":
      return videos;
    case "new":
    default:
      return [...videos].reverse();
  }
}

function renderGrid() {
  const videos = getFilteredVideos();
  grid.innerHTML = "";
  emptyMessage.hidden = videos.length > 0;

  for (const video of videos) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "video-card";
    card.addEventListener("click", () => openModal(video));

    const thumb = document.createElement("div");
    thumb.className = "video-thumb" + (isPhoto(video) ? " is-photo" : "");
    const img = document.createElement("img");
    img.src = thumbUrl(video);
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => img.remove());
    thumb.appendChild(img);
    if (isPhoto(video) && video.photoFileIds.length > 1) {
      const badge = document.createElement("span");
      badge.className = "thumb-photo-badge";
      badge.textContent = `📷 ${video.photoFileIds.length}枚`;
      thumb.appendChild(badge);
    }

    const favoriteBtn = document.createElement("span");
    favoriteBtn.className = "favorite-btn" + (isFavorite(video.id) ? " active" : "");
    favoriteBtn.textContent = isFavorite(video.id) ? "♥" : "♡";
    favoriteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(video.id);
      renderGrid();
    });
    thumb.appendChild(favoriteBtn);

    const info = document.createElement("div");
    info.className = "video-info";
    info.innerHTML = `
      <span class="video-category">${escapeHtml(video.category)}</span>
      ${video.recordedDate ? `<span class="video-date">撮影: ${escapeHtml(video.recordedDate)}</span>` : ""}
      ${video.submittedBy ? `<span class="video-date">投稿: ${escapeHtml(video.submittedBy)}</span>` : ""}
      <span class="video-date">再生: ${getViewCount(video.id)}回</span>
      <h3 class="video-title">${escapeHtml(video.title)}</h3>
      <p class="video-description">${escapeHtml(video.description)}</p>
    `;

    card.appendChild(thumb);
    card.appendChild(info);
    grid.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderModalPhoto() {
  modalPhoto.src = driveThumbUrl(currentPhotoIds[currentPhotoIndex], "w1600");
  modalPhotoCount.textContent = `${currentPhotoIndex + 1} / ${currentPhotoIds.length}`;
  const showNav = currentPhotoIds.length > 1;
  modalPhotoPrev.hidden = !showNav;
  modalPhotoNext.hidden = !showNav;
}

function renderModalFavoriteBtn() {
  const active = currentVideo && isFavorite(currentVideo.id);
  modalFavoriteBtn.classList.toggle("active", !!active);
  modalFavoriteBtn.textContent = active ? "♥" : "♡";
}

function openModal(video) {
  recordView(video);
  currentVideo = video;
  renderModalFavoriteBtn();

  if (isPhoto(video)) {
    currentPhotoIds = video.photoFileIds;
    currentPhotoIndex = 0;
    renderModalPhoto();
    modalPhotoWrap.hidden = false;
    modalVideoWrap.hidden = true;
    modalIframe.src = "";
  } else {
    modalPhotoWrap.hidden = true;
    modalVideoWrap.hidden = false;
    modalIframe.src = embedUrl(video);
  }

  const meta = [];
  if (video.recordedDate) meta.push(`撮影: ${video.recordedDate}`);
  if (video.submittedBy) meta.push(`投稿: ${video.submittedBy}`);
  meta.push(`再生: ${getViewCount(video.id)}回`);
  modalTitle.textContent = meta.length ? `${video.title}(${meta.join(" / ")})` : video.title;
  modalDescription.textContent = video.description;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  renderGrid();
}

function closeModal() {
  modal.hidden = true;
  modalIframe.src = "";
  modalPhoto.src = "";
  document.body.style.overflow = "";
}

modalFavoriteBtn.addEventListener("click", () => {
  if (!currentVideo) return;
  toggleFavorite(currentVideo.id);
  renderModalFavoriteBtn();
  renderGrid();
});

modalPhotoPrev.addEventListener("click", () => {
  currentPhotoIndex = (currentPhotoIndex - 1 + currentPhotoIds.length) % currentPhotoIds.length;
  renderModalPhoto();
});

modalPhotoNext.addEventListener("click", () => {
  currentPhotoIndex = (currentPhotoIndex + 1) % currentPhotoIds.length;
  renderModalPhoto();
});

modal.addEventListener("click", (e) => {
  if (e.target.dataset.close !== undefined) {
    closeModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) {
    closeModal();
  }
});

searchInput.addEventListener("input", (e) => {
  state.query = e.target.value;
  renderGrid();
});

sortSelect.addEventListener("change", (e) => {
  state.sortOrder = e.target.value;
  renderGrid();
});

for (const tab of mediaTabsEl.querySelectorAll(".media-tab")) {
  tab.classList.toggle("active", tab.dataset.media === state.mediaType);
  tab.addEventListener("click", () => {
    state.mediaType = tab.dataset.media;
    for (const t of mediaTabsEl.querySelectorAll(".media-tab")) {
      t.classList.toggle("active", t === tab);
    }
    renderCategoryFilters();
    renderGrid();
  });
}

async function init() {
  const res = await fetch("data/videos.json");
  state.videos = await res.json();
  renderCategoryFilters();
  renderGrid();
  await loadViewCounts();
  renderGrid();
}

const LOCK_PASSWORD_HASH =
  "90116063acc4ab1bff21066e506c308ccb719a47247ca2b89d7cc89d0fb89880";
const LOCK_STORAGE_KEY = "tanpopo-manual-unlocked";

const lockScreen = document.getElementById("lock-screen");
const lockForm = document.getElementById("lock-form");
const lockPassword = document.getElementById("lock-password");
const lockError = document.getElementById("lock-error");
const siteContent = document.getElementById("site-content");

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function unlock() {
  lockScreen.hidden = true;
  siteContent.hidden = false;
  init();
}

if (localStorage.getItem(LOCK_STORAGE_KEY) === "1") {
  unlock();
} else {
  lockForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const hash = await sha256Hex(lockPassword.value);
    if (hash === LOCK_PASSWORD_HASH) {
      localStorage.setItem(LOCK_STORAGE_KEY, "1");
      lockError.hidden = true;
      unlock();
    } else {
      lockError.hidden = false;
      lockPassword.value = "";
      lockPassword.focus();
    }
  });
}
