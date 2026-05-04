const DEFAULT_OWNER = "MichaelGlaubitz";
const STORAGE_KEY = "project_dashboard_token";

const ownerInput = document.querySelector("#owner-input");
const tokenInput = document.querySelector("#token-input");
const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const descriptionModeSelect = document.querySelector("#description-mode-select");
const loadButton = document.querySelector("#load-button");
const clearTokenButton = document.querySelector("#clear-token-button");
const activeOwner = document.querySelector("#active-owner");
const statusText = document.querySelector("#status-text");
const statsGrid = document.querySelector("#stats-grid");
const languageBars = document.querySelector("#language-bars");
const repoList = document.querySelector("#repo-list");
const repoCount = document.querySelector("#repo-count");
const cardTemplate = document.querySelector("#repo-card-template");

let repositories = [];
let filteredRepositories = [];

function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.classList.remove("error", "success");
  if (type === "error" || type === "success") {
    statusText.classList.add(type);
  }
}

function formatDate(isoDateString) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDateString));
}

function upsertStoredToken() {
  const token = tokenInput.value.trim();
  if (!token) {
    localStorage.removeItem(STORAGE_KEY);
    return "";
  }

  localStorage.setItem(STORAGE_KEY, token);
  return token;
}

function loadStoredToken() {
  const token = localStorage.getItem(STORAGE_KEY);
  if (token) {
    tokenInput.value = token;
  }
}

function buildHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchReposForOwner(owner, token) {
  const headers = buildHeaders(token);
  let page = 1;
  let collected = [];

  while (true) {
    const url = `https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=100&page=${page}&sort=created&direction=desc`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      let message = `Fehler ${response.status}`;
      try {
        const payload = await response.json();
        if (payload.message) {
          message = payload.message;
        }
      } catch (_error) {
        // Ignore JSON parse errors to keep original message.
      }
      throw new Error(message);
    }

    const chunk = await response.json();
    collected = collected.concat(chunk);

    if (chunk.length < 100) {
      break;
    }

    page += 1;
  }

  return collected;
}

function computeStats(items) {
  const total = items.length;
  const forks = items.filter((repo) => repo.fork).length;
  const originals = total - forks;
  const privateCount = items.filter((repo) => repo.private).length;
  const totalStars = items.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const mostRecent = items.reduce((latest, repo) => {
    if (!latest) return repo;
    return new Date(repo.created_at) > new Date(latest.created_at) ? repo : latest;
  }, null);

  return {
    total,
    forks,
    originals,
    privateCount,
    totalStars,
    newestName: mostRecent?.name || "n/a",
    newestDate: mostRecent ? formatDate(mostRecent.created_at) : "n/a",
  };
}

function renderStats(items) {
  const stats = computeStats(items);

  const cards = [
    { label: "Gesamt", value: stats.total },
    { label: "Original-Projekte", value: stats.originals },
    { label: "Forks", value: stats.forks },
    { label: "Private Repos", value: stats.privateCount },
    { label: "Sterne gesamt", value: stats.totalStars },
    { label: "Neuestes Projekt", value: `${stats.newestName} (${stats.newestDate})` },
  ];

  statsGrid.innerHTML = "";

  cards.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "panel stat-card";

    const title = document.createElement("p");
    title.className = "stat-label";
    title.textContent = entry.label;

    const value = document.createElement("p");
    value.className = "stat-value";
    value.textContent = String(entry.value);

    card.append(title, value);
    statsGrid.appendChild(card);
  });
}

function collectLanguageStats(items) {
  const map = new Map();

  items.forEach((repo) => {
    const key = repo.language || "Unbekannt";
    map.set(key, (map.get(key) || 0) + 1);
  });

  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function toSentences(text) {
  if (!text) {
    return [];
  }

  return (text.match(/[^.!?]+[.!?]*/g) || [])
    .map((sentence) => sentence.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .map((sentence) => (/[.!?]$/.test(sentence) ? sentence : `${sentence}.`));
}

function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

function buildRepoSummary(repo) {
  const sentences = [];
  const baseDescription = toSentences(repo.description || "");
  baseDescription.slice(0, 2).forEach((sentence) => {
    if (sentences.length < 3) {
      sentences.push(sentence);
    }
  });

  if (sentences.length < 3) {
    const visibility = repo.private ? "privates" : "oeffentliches";
    const origin = repo.fork ? "Fork-Projekt" : "Original-Projekt";
    const language = repo.language || "nicht angegebener Sprache";
    const starsLabel = pluralize(repo.stargazers_count, "Stern", "Sterne");
    sentences.push(
      `Dieses Repository ist ein ${visibility} ${origin} in ${language} und hat aktuell ${repo.stargazers_count} ${starsLabel}.`
    );
  }

  if (sentences.length < 3) {
    const topicCount = getTopics(repo).length;
    const topicLabel = pluralize(topicCount, "Topic", "Topics");
    const updatedAt = formatDate(repo.updated_at);
    const topicInfo =
      topicCount > 0 ? ` und verwendet ${topicCount} ${topicLabel}` : "";
    sentences.push(`Es wurde zuletzt am ${updatedAt} aktualisiert${topicInfo}.`);
  }

  return sentences.slice(0, 3).join(" ");
}

function getOriginalDescription(repo) {
  const original = (repo.description || "").trim();
  if (original) {
    return original;
  }
  return "Keine Originalbeschreibung auf GitHub hinterlegt.";
}

function renderLanguageBars(items) {
  const languageData = collectLanguageStats(items);
  languageBars.innerHTML = "";

  if (languageData.length === 0) {
    languageBars.innerHTML = `<p class="placeholder">Keine Spracheinträge vorhanden.</p>`;
    return;
  }

  const maxCount = languageData[0][1];
  languageData.forEach(([language, count]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "language-row";

    const label = document.createElement("span");
    label.className = "language-label";
    label.textContent = `${language} (${count})`;

    const barTrack = document.createElement("div");
    barTrack.className = "language-track";

    const bar = document.createElement("div");
    bar.className = "language-fill";
    bar.style.width = `${Math.max((count / maxCount) * 100, 6)}%`;

    barTrack.appendChild(bar);
    wrapper.append(label, barTrack);
    languageBars.appendChild(wrapper);
  });
}

function getTopics(repo) {
  if (Array.isArray(repo.topics)) {
    return repo.topics;
  }
  return [];
}

function matchesSearch(repo, query) {
  if (!query) return true;

  const normalized = query.toLowerCase();
  const topics = getTopics(repo).join(" ").toLowerCase();
  const description = (repo.description || "").toLowerCase();

  return (
    repo.name.toLowerCase().includes(normalized) ||
    (repo.language || "").toLowerCase().includes(normalized) ||
    description.includes(normalized) ||
    topics.includes(normalized)
  );
}

function applySorting(items, sortValue) {
  const cloned = [...items];

  switch (sortValue) {
    case "updated_desc":
      cloned.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      break;
    case "stars_desc":
      cloned.sort((a, b) => b.stargazers_count - a.stargazers_count);
      break;
    case "name_asc":
      cloned.sort((a, b) => a.name.localeCompare(b.name, "de-DE"));
      break;
    case "created_desc":
    default:
      cloned.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
  }

  return cloned;
}

function renderRepoCards(items) {
  repoList.innerHTML = "";
  repoCount.textContent = `${items.length} Einträge`;

  if (items.length === 0) {
    repoList.innerHTML = `<p class="placeholder">Keine Projekte für den aktuellen Filter gefunden.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((repo) => {
    const node = cardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".repo-name").textContent = repo.name;

    const link = node.querySelector(".repo-link");
    link.href = repo.html_url;

    const descriptionMode = descriptionModeSelect?.value || "summary";
    node.querySelector(".repo-description").textContent =
      descriptionMode === "original" ? getOriginalDescription(repo) : buildRepoSummary(repo);

    const metaEntries = [
      `Sprache: ${repo.language || "Unbekannt"}`,
      `Sterne: ${repo.stargazers_count}`,
      `Forks: ${repo.forks_count}`,
      `Erstellt: ${formatDate(repo.created_at)}`,
      `Aktualisiert: ${formatDate(repo.updated_at)}`,
      repo.private ? "Privat" : "Öffentlich",
      repo.fork ? "Fork" : "Original",
    ];
    const metaNode = node.querySelector(".repo-meta");
    metaEntries.forEach((entry) => {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = entry;
      metaNode.appendChild(badge);
    });

    const topicsNode = node.querySelector(".repo-topics");
    const topics = getTopics(repo);
    if (topics.length === 0) {
      topicsNode.textContent = "Keine Topics";
    } else {
      topics.forEach((topic) => {
        const tag = document.createElement("span");
        tag.className = "topic";
        tag.textContent = topic;
        topicsNode.appendChild(tag);
      });
    }

    fragment.appendChild(node);
  });

  repoList.appendChild(fragment);
}

function updateFilteredView() {
  const query = searchInput.value.trim();
  const sorted = applySorting(
    repositories.filter((repo) => matchesSearch(repo, query)),
    sortSelect.value
  );

  filteredRepositories = sorted;
  renderStats(filteredRepositories);
  renderLanguageBars(filteredRepositories);
  renderRepoCards(filteredRepositories);
}

async function loadDashboard() {
  const owner = ownerInput.value.trim() || DEFAULT_OWNER;
  const token = upsertStoredToken();
  activeOwner.textContent = owner;

  setStatus("Lade Repositories von GitHub ...");
  loadButton.disabled = true;

  try {
    repositories = await fetchReposForOwner(owner, token);
    updateFilteredView();
    setStatus(
      `Erfolgreich geladen: ${repositories.length} Repository-Einträge für ${owner}.`,
      "success"
    );
  } catch (error) {
    repositories = [];
    filteredRepositories = [];
    renderStats([]);
    renderLanguageBars([]);
    renderRepoCards([]);
    setStatus(`Fehler beim Laden: ${error.message}`, "error");
  } finally {
    loadButton.disabled = false;
  }
}

function bootstrap() {
  loadStoredToken();
  renderStats([]);
  renderLanguageBars([]);
  renderRepoCards([]);

  loadButton.addEventListener("click", loadDashboard);
  clearTokenButton.addEventListener("click", () => {
    tokenInput.value = "";
    localStorage.removeItem(STORAGE_KEY);
    setStatus("Token wurde aus dem Browser-Speicher entfernt.");
  });
  searchInput.addEventListener("input", updateFilteredView);
  sortSelect.addEventListener("change", updateFilteredView);
  descriptionModeSelect.addEventListener("change", updateFilteredView);

  loadDashboard();
}

bootstrap();
