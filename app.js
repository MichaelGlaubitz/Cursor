const STORAGE_KEY = "unterrichtsmanager_6c_performance_data";

const csvFileInput = document.querySelector("#csv-file-input");
const csvTextInput = document.querySelector("#csv-text-input");
const importButton = document.querySelector("#import-button");
const clearButton = document.querySelector("#clear-button");
const statusText = document.querySelector("#status-text");
const statsGrid = document.querySelector("#stats-grid");
const studentCount = document.querySelector("#student-count");
const studentsTableBody = document.querySelector("#students-table-body");

let studentRows = [];

function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.classList.remove("error", "success");
  if (type === "error" || type === "success") {
    statusText.classList.add(type);
  }
}

function formatPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }
  return `${value.toFixed(1)} %`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderStats(rows) {
  const validScores = rows.filter((row) => typeof row.percent === "number");
  const supportThreshold = 60;
  const needSupport = validScores.filter((row) => row.percent < supportThreshold).length;
  const avg =
    validScores.length === 0
      ? null
      : validScores.reduce((sum, row) => sum + row.percent, 0) / validScores.length;
  const topStudent = validScores.reduce((best, row) => {
    if (!best) return row;
    return row.percent > best.percent ? row : best;
  }, null);
  const timestamp = rows.length > 0 ? formatDate(new Date()) : "n/a";

  const cards = [
    { label: "Schüler gesamt", value: rows.length },
    { label: "Ausgewertete Scores", value: validScores.length },
    { label: "Durchschnitt", value: formatPercent(avg) },
    {
      label: "Beste Leistung",
      value: topStudent ? `${topStudent.name} (${formatPercent(topStudent.percent)})` : "n/a",
    },
    { label: "Unter 60 %", value: needSupport },
    { label: "Importzeitpunkt", value: timestamp },
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
    value.textContent = String(entry.value ?? "n/a");

    card.append(title, value);
    statsGrid.appendChild(card);
  });
}

function detectHint(percent) {
  if (typeof percent !== "number" || Number.isNaN(percent)) {
    return "Kein numerischer Score erkannt";
  }
  if (percent < 50) return "Förderbedarf";
  if (percent < 75) return "Ausbaufähig";
  if (percent < 90) return "Gut";
  return "Sehr gut";
}

function renderTable(rows) {
  studentsTableBody.innerHTML = "";
  studentCount.textContent = `${rows.length} Schüler`;

  if (rows.length === 0) {
    studentsTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="placeholder">Noch keine Leistungsdaten geladen.</td>
      </tr>
    `;
    return;
  }

  const sortedRows = [...rows].sort((a, b) => {
    const scoreA = typeof a.percent === "number" ? a.percent : -1;
    const scoreB = typeof b.percent === "number" ? b.percent : -1;
    return scoreB - scoreA;
  });

  const fragment = document.createDocumentFragment();
  sortedRows.forEach((row) => {
    const tr = document.createElement("tr");
    const scoreText = typeof row.percent === "number" ? formatPercent(row.percent) : "n/a";
    const hint = detectHint(row.percent);

    [row.name, scoreText, row.raw ?? "n/a", hint].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      tr.appendChild(cell);
    });
    fragment.appendChild(tr);
  });

  studentsTableBody.appendChild(fragment);
}

function resetDashboard() {
  renderStats([]);
  renderTable([]);
}

function safeLower(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function findHeaderIndex(headers, aliases) {
  const normalized = headers.map((header) => safeLower(header));
  return normalized.findIndex((header) => aliases.some((alias) => header.includes(alias)));
}

function parseLine(line, delimiter) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const isEscapedQuote = line[i + 1] === '"';
      if (isEscapedQuote) {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === delimiter) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function countDelimiter(sample, delimiter) {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < sample.length; i += 1) {
    const char = sample[i];
    if (char === '"') inQuotes = !inQuotes;
    if (!inQuotes && char === delimiter) count += 1;
  }
  return count;
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) || "";
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  candidates.forEach((delimiter) => {
    const count = countDelimiter(firstLine, delimiter);
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  });
  return best;
}

function parsePercent(rawValue) {
  if (!rawValue) return null;
  const normalized = rawValue.replace(/\s+/g, "").replace(",", ".");
  if (normalized.includes("/")) {
    const [left, right] = normalized.split("/");
    const numerator = Number(left);
    const denominator = Number(right);
    if (
      Number.isFinite(numerator) &&
      Number.isFinite(denominator) &&
      denominator !== 0
    ) {
      return (numerator / denominator) * 100;
    }
  }

  const numeric = Number(normalized.replace("%", ""));
  if (Number.isFinite(numeric)) return numeric;
  return null;
}

function parsePlickersCsv(csvText) {
  const cleaned = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleaned) {
    throw new Error("Die CSV ist leer.");
  }

  const delimiter = detectDelimiter(cleaned);
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const matrix = lines.map((line) => parseLine(line, delimiter));
  if (matrix.length === 0) {
    throw new Error("Keine Datenzeilen gefunden.");
  }

  const firstRow = matrix[0].map((cell) => cell.trim());
  const hasHeader = firstRow.some((cell) =>
    /(name|student|sch[üu]ler|score|prozent|leistung|percent|correct|total)/i.test(cell)
  );

  const headers = hasHeader
    ? firstRow
    : firstRow.map((_, index) => `spalte_${index + 1}`);
  const contentRows = hasHeader ? matrix.slice(1) : matrix;

  const nameIndex = Math.max(
    0,
    findHeaderIndex(headers, ["name", "student", "schüler", "schueler"])
  );
  const scoreIndex = findHeaderIndex(headers, [
    "score (%)",
    "score",
    "prozent",
    "leistung",
    "percent",
    "overall",
  ]);
  const rawIndex = findHeaderIndex(headers, ["correct/total", "raw", "rohwert", "correct"]);

  const rows = contentRows
    .map((row) => {
      const name = (row[nameIndex] || "").trim();
      const rawPrimary = scoreIndex >= 0 ? row[scoreIndex] || "" : row[1] || "";
      const rawFallback = rawIndex >= 0 ? row[rawIndex] || "" : rawPrimary;
      const percent = parsePercent(rawPrimary) ?? parsePercent(rawFallback);

      return {
        name,
        percent,
        raw: (rawPrimary || rawFallback || "").trim() || "n/a",
      };
    })
    .filter((row) => row.name.length > 0);

  if (rows.length === 0) {
    throw new Error("Es konnten keine Schülerdaten erkannt werden.");
  }

  return rows;
}

function loadStoredRows() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (_error) {
    return [];
  }
}

function persistRows(rows) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

async function readSelectedFile() {
  const file = csvFileInput.files?.[0];
  if (!file) return "";
  return file.text();
}

async function importPerformanceData() {
  importButton.disabled = true;
  setStatus("Importiere Leistungsdaten aus CSV ...");

  try {
    const pasted = csvTextInput.value.trim();
    const fileText = pasted ? "" : await readSelectedFile();
    const csv = pasted || fileText;
    if (!csv) {
      throw new Error("Bitte CSV-Datei auswählen oder Inhalt einfügen.");
    }

    studentRows = parsePlickersCsv(csv);
    persistRows(studentRows);
    renderStats(studentRows);
    renderTable(studentRows);
    setStatus(
      `Import erfolgreich: ${studentRows.length} Schüler aus der Klasse 6c erfasst.`,
      "success"
    );
  } catch (error) {
    setStatus(`Import fehlgeschlagen: ${error.message}`, "error");
  } finally {
    importButton.disabled = false;
  }
}

function bootstrap() {
  studentRows = loadStoredRows();
  if (studentRows.length > 0) {
    renderStats(studentRows);
    renderTable(studentRows);
    setStatus(
      `Vorhandene Daten geladen: ${studentRows.length} Schüler für Klasse 6c.`,
      "success"
    );
  } else {
    resetDashboard();
  }

  importButton.addEventListener("click", importPerformanceData);
  clearButton.addEventListener("click", () => {
    studentRows = [];
    csvFileInput.value = "";
    csvTextInput.value = "";
    localStorage.removeItem(STORAGE_KEY);
    resetDashboard();
    setStatus("Alle importierten Leistungsdaten wurden gelöscht.");
  });
}

bootstrap();
