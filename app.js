const ALL_CATEGORY = "すべて";

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
  "分院・撮影業務",
  "分院・受付業務",
];

const state = {
  videos: [],
  activeCategory: ALL_CATEGORY,
  query: "",
};

const grid = document.getElementById("video-grid");
const filtersEl = document.getElementById("category-filters");
const searchInput = document.getElementById("search-input");
const emptyMessage = document.getElementById("empty-message");
const modal = document.getElementById("video-modal");
const modalIframe = document.getElementById("modal-iframe");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");

function driveEmbedUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function driveThumbUrl(fileId) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

function renderCategoryFilters() {
  const usedCategories = [...new Set(state.videos.map((v) => v.category))];
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

function getFilteredVideos() {
  const query = state.query.trim().toLowerCase();
  return state.videos.filter((video) => {
    const matchesCategory =
      state.activeCategory === ALL_CATEGORY || video.category === state.activeCategory;
    const matchesQuery =
      !query ||
      video.title.toLowerCase().includes(query) ||
      video.description.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
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
    thumb.className = "video-thumb";
    const img = document.createElement("img");
    img.src = driveThumbUrl(video.driveFileId);
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => img.remove());
    thumb.appendChild(img);

    const info = document.createElement("div");
    info.className = "video-info";
    info.innerHTML = `
      <span class="video-category">${escapeHtml(video.category)}</span>
      ${video.recordedDate ? `<span class="video-date">撮影: ${escapeHtml(video.recordedDate)}</span>` : ""}
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

function openModal(video) {
  modalIframe.src = driveEmbedUrl(video.driveFileId);
  modalTitle.textContent = video.recordedDate
    ? `${video.title}(撮影: ${video.recordedDate})`
    : video.title;
  modalDescription.textContent = video.description;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.hidden = true;
  modalIframe.src = "";
  document.body.style.overflow = "";
}

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

async function init() {
  const res = await fetch("data/videos.json");
  state.videos = await res.json();
  renderCategoryFilters();
  renderGrid();
}

init();
