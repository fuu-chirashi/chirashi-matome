const STORAGE_KEY = "chirashi-matome-v1";
const BACKUP_VERSION = 2;
const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

const sampleState = {
  stores: [
    {
      id: crypto.randomUUID(),
      name: "ライフ",
      url: "https://www.shufoo.net/"
    },
    {
      id: crypto.randomUUID(),
      name: "阪急オアシス",
      url: ""
    }
  ],
  wishes: [
    { id: crypto.randomUUID(), name: "卵", targetPrice: 198 },
    { id: crypto.randomUUID(), name: "牛乳", targetPrice: 188 },
    { id: crypto.randomUUID(), name: "鶏むね肉", targetPrice: 79 }
  ],
  plans: []
};

sampleState.plans = [
  {
    id: crypto.randomUUID(),
    date: todayKey(),
    storeId: sampleState.stores[0].id,
    name: "卵",
    price: 188,
    memo: "13日限り"
  },
  {
    id: crypto.randomUUID(),
    date: todayKey(),
    storeId: sampleState.stores[0].id,
    name: "牛乳",
    price: 178,
    memo: ""
  },
  {
    id: crypto.randomUUID(),
    date: dateKey(addDays(new Date(), 2)),
    storeId: sampleState.stores[1].id,
    name: "ブロッコリー",
    price: 98,
    memo: "野菜チェック"
  },
  {
    id: crypto.randomUUID(),
    date: dateKey(addDays(new Date(), 5)),
    storeId: sampleState.stores[0].id,
    name: "鶏むね肉",
    price: 68,
    memo: "100g"
  }
];

let state = loadState();

const elements = {
  storeCount: document.querySelector("#storeCount"),
  wishCount: document.querySelector("#wishCount"),
  planCount: document.querySelector("#planCount"),
  storeList: document.querySelector("#storeList"),
  wishList: document.querySelector("#wishList"),
  calendarList: document.querySelector("#calendarList"),
  planStore: document.querySelector("#planStore"),
  planDate: document.querySelector("#planDate"),
  storeForm: document.querySelector("#storeForm"),
  wishForm: document.querySelector("#wishForm"),
  planForm: document.querySelector("#planForm"),
  bulkPlanForm: document.querySelector("#bulkPlanForm"),
  bulkPlanText: document.querySelector("#bulkPlanText"),
  copyPlanButton: document.querySelector("#copyPlanButton"),
  exportDataButton: document.querySelector("#exportDataButton"),
  importDataInput: document.querySelector("#importDataInput"),
  backupStatus: document.querySelector("#backupStatus"),
  resetDemoButton: document.querySelector("#resetDemoButton")
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(sampleState);

  try {
    return normalizeImportedState(JSON.parse(saved));
  } catch {
    return structuredClone(sampleState);
  }
}

function normalizeImportedState(value) {
  const imported = value?.data || value;
  if (!imported || typeof imported !== "object") {
    throw new Error("バックアップファイルの形式が違います。");
  }

  return {
    stores: Array.isArray(imported.stores) ? imported.stores : [],
    wishes: Array.isArray(imported.wishes) ? imported.wishes : [],
    plans: Array.isArray(imported.plans) ? imported.plans : []
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayKey() {
  return dateKey(new Date());
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateLabel(key) {
  const date = new Date(`${key}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}(${DAY_NAMES[date.getDay()]})`;
}

function yen(value) {
  if (!value) return "";
  return `${Number(value).toLocaleString("ja-JP")}円`;
}

function getStore(storeId) {
  return state.stores.find((store) => store.id === storeId) || { name: "未設定", url: "" };
}

function clearForm(form) {
  form.reset();
  elements.planDate.value = elements.planDate.value || todayKey();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function buildBackup() {
  return {
    app: "chirashi-matome",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: state
  };
}

function setBackupStatus(message) {
  elements.backupStatus.textContent = message;
}

function parseBulkPlans(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const normalizedLine = line.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
      const priceMatch = normalizedLine.match(/([0-9]{2,5})\s*(?:円)?/);
      const price = priceMatch ? Number(priceMatch[1]) : "";
      const name = priceMatch ? normalizedLine.slice(0, priceMatch.index).trim() : normalizedLine;
      return name ? { name, price } : null;
    })
    .filter(Boolean);
}

function render() {
  elements.storeCount.textContent = state.stores.length;
  elements.wishCount.textContent = state.wishes.length;
  elements.planCount.textContent = state.plans.length;

  renderWishes();
  renderStores();
  renderStoreOptions();
  renderCalendar();
  saveState();
}

function renderWishes() {
  if (state.wishes.length === 0) {
    elements.wishList.className = "wish-check-list empty-state";
    elements.wishList.innerHTML = "<p>今のほしい物はありません。</p>";
    return;
  }

  elements.wishList.className = "wish-check-list";
  elements.wishList.innerHTML = state.wishes
    .map(
      (wish) => `
        <label class="wish-check-card">
          <input type="checkbox" data-action="complete-wish" data-id="${wish.id}" />
          <span>
            <strong>${escapeHtml(wish.name)}</strong>
            <small>${yen(wish.targetPrice) || "希望価格なし"}</small>
          </span>
        </label>
      `
    )
    .join("");
}

function renderStores() {
  if (state.stores.length === 0) {
    elements.storeList.className = "flyer-list empty-state";
    elements.storeList.innerHTML = "<p>チラシはまだ登録されていません。</p>";
    return;
  }

  elements.storeList.className = "flyer-list";
  elements.storeList.innerHTML = state.stores
    .map(
      (store) => `
        <article class="flyer-card">
          <div>
            <p class="card-title">${escapeHtml(store.name)}</p>
          </div>
          <div class="card-actions">
            ${store.url ? `<a class="link-button" href="${escapeAttribute(store.url)}">チラシを開く</a>` : ""}
            <button class="delete-button" type="button" data-action="delete-store" data-id="${store.id}" aria-label="${escapeAttribute(store.name)}を削除">×</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderStoreOptions() {
  elements.planStore.innerHTML = state.stores.map((store) => `<option value="${store.id}">${escapeHtml(store.name)}</option>`).join("");
  elements.planStore.disabled = state.stores.length === 0;
}

function renderCalendar() {
  const start = new Date(`${todayKey()}T00:00:00`);
  const days = Array.from({ length: 14 }, (_, index) => dateKey(addDays(start, index)));

  elements.calendarList.innerHTML = days
    .map((key) => {
      const plans = state.plans.filter((plan) => plan.date === key);
      const grouped = groupPlansByStore(plans);
      return `
        <article class="day-card">
          <div class="day-heading">
            <strong>${formatDateLabel(key)}</strong>
            ${key === todayKey() ? '<span class="today-pill">今日</span>' : ""}
          </div>
          ${
            grouped.length === 0
              ? '<p class="day-empty">購入予定なし</p>'
              : grouped
                  .map(
                    ([storeId, storePlans]) => `
                      <section class="store-plan">
                        <h3>${escapeHtml(getStore(storeId).name)}</h3>
                        <ul>
                          ${storePlans
                            .map(
                              (plan) => `
                                <li>
                                  <span>${escapeHtml(plan.name)}${plan.price ? ` <b>${yen(plan.price)}</b>` : ""}${plan.memo ? ` <small>${escapeHtml(plan.memo)}</small>` : ""}</span>
                                  <button class="mini-delete" type="button" data-action="delete-plan" data-id="${plan.id}" aria-label="${escapeAttribute(plan.name)}を削除">×</button>
                                </li>
                              `
                            )
                            .join("")}
                        </ul>
                      </section>
                    `
                  )
                  .join("")
          }
        </article>
      `;
    })
    .join("");
}

function groupPlansByStore(plans) {
  const grouped = new Map();
  plans.forEach((plan) => {
    if (!grouped.has(plan.storeId)) grouped.set(plan.storeId, []);
    grouped.get(plan.storeId).push(plan);
  });
  return Array.from(grouped.entries());
}

function copyPlanText() {
  const days = Array.from({ length: 14 }, (_, index) => dateKey(addDays(new Date(`${todayKey()}T00:00:00`), index)));
  const lines = days.flatMap((key) => {
    const plans = state.plans.filter((plan) => plan.date === key);
    if (plans.length === 0) return [];
    return [
      formatDateLabel(key),
      ...plans.map((plan) => `- ${getStore(plan.storeId).name}: ${plan.name}${plan.price ? ` ${yen(plan.price)}` : ""}${plan.memo ? ` (${plan.memo})` : ""}`)
    ];
  });
  return lines.length ? lines.join("\n") : "2週間の購入予定はまだありません。";
}

elements.storeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.stores.push({
    id: crypto.randomUUID(),
    name: formData.get("storeName").trim(),
    url: formData.get("storeUrl").trim()
  });
  clearForm(event.currentTarget);
  render();
});

elements.wishForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.wishes.push({
    id: crypto.randomUUID(),
    name: formData.get("wishName").trim(),
    targetPrice: Number(formData.get("wishPrice")) || ""
  });
  clearForm(event.currentTarget);
  render();
});

elements.planForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.plans.push({
    id: crypto.randomUUID(),
    date: formData.get("planDate"),
    storeId: formData.get("planStore"),
    name: formData.get("planItem").trim(),
    price: Number(formData.get("planPrice")) || "",
    memo: formData.get("planMemo").trim()
  });
  const selectedDate = formData.get("planDate");
  const selectedStore = formData.get("planStore");
  clearForm(event.currentTarget);
  elements.planDate.value = selectedDate;
  elements.planStore.value = selectedStore;
  render();
});

elements.bulkPlanForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const items = parseBulkPlans(elements.bulkPlanText.value);
  if (items.length === 0) return;

  const date = elements.planDate.value || todayKey();
  const storeId = elements.planStore.value;
  state.plans.push(
    ...items.map((item) => ({
      id: crypto.randomUUID(),
      date,
      storeId,
      name: item.name,
      price: item.price,
      memo: ""
    }))
  );
  elements.bulkPlanText.value = "";
  render();
});

function completeWishFromEvent(event) {
  const checkbox = event.target.closest('[data-action="complete-wish"]');
  if (!checkbox || checkbox.dataset.done === "true") return;
  checkbox.dataset.done = "true";
  state.wishes = state.wishes.filter((wish) => wish.id !== checkbox.dataset.id);
  render();
}

document.addEventListener("change", completeWishFromEvent);
document.addEventListener("click", completeWishFromEvent);

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === "delete-store") {
    state.stores = state.stores.filter((store) => store.id !== id);
    state.plans = state.plans.filter((plan) => plan.storeId !== id);
  }
  if (action === "delete-plan") state.plans = state.plans.filter((plan) => plan.id !== id);
  render();
});

elements.copyPlanButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(copyPlanText());
  elements.copyPlanButton.textContent = "コピー済み";
  window.setTimeout(() => {
    elements.copyPlanButton.textContent = "予定をコピー";
  }, 1200);
});

elements.resetDemoButton.addEventListener("click", () => {
  state = structuredClone(sampleState);
  elements.planDate.value = todayKey();
  render();
});

elements.exportDataButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chirashi-matome-backup-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setBackupStatus("バックアップを書き出しました。スマホならダウンロードに保存されます。");
});

elements.importDataInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    state = normalizeImportedState(JSON.parse(await file.text()));
    saveState();
    render();
    setBackupStatus("バックアップを読み込みました。");
  } catch (error) {
    setBackupStatus(error.message || "バックアップを読み込めませんでした。");
  } finally {
    event.target.value = "";
  }
});

elements.planDate.value = todayKey();
render();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
