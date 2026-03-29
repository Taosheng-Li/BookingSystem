// ===============================
// 0) Authorization
// ===============================

import { initAuthUI, getUserRole, requireAuthOrBlockPage, logout } from "./auth-ui.js";

initAuthUI();
if (!requireAuthOrBlockPage()) {
  throw new Error("Authentication required");
}

window.logout = logout;

// ===============================
// 1) DOM references
// ===============================
const actions = document.getElementById("reservationActions");
const reservationIdInput = document.getElementById("reservationId");
const resourceIdInput = document.getElementById("resourceId");
const userIdInput = document.getElementById("userId");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const noteInput = document.getElementById("note");
const statusInput = document.getElementById("status");

const reservationListEl = document.getElementById("reservationList");

const role = getUserRole();
let createButton = null;
let updateButton = null;
let deleteButton = null;
let clearButton = null;
let primaryActionButton = null;

let formMode = "create"; // "create" | "edit"
let reservationsCache = [];
let selectedReservationId = null;

// ===============================
// 2) Button creation helpers
// ===============================

const BUTTON_BASE_CLASSES =
  "w-full rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out";

const BUTTON_ENABLED_CLASSES =
  "bg-brand-primary text-white hover:bg-brand-dark/80 shadow-soft";

const BUTTON_DISABLED_CLASSES =
  "cursor-not-allowed opacity-50";

function addButton({ label, type = "button", value, classes = "" }) {
  const btn = document.createElement("button");
  btn.type = type;
  btn.textContent = label;
  btn.name = "action";
  if (value) btn.value = value;

  btn.className = `${BUTTON_BASE_CLASSES} ${classes}`.trim();

  actions.appendChild(btn);
  return btn;
}

function setButtonEnabled(btn, enabled) {
  if (!btn) return;

  btn.disabled = !enabled;

  btn.classList.toggle("cursor-not-allowed", !enabled);
  btn.classList.toggle("opacity-50", !enabled);

  if (!enabled) {
    btn.classList.remove("hover:bg-brand-dark/80");
  } else {
    if (btn.value === "create" || btn.textContent === "Create") {
      btn.classList.add("hover:bg-brand-dark/80");
    }
  }
}

function renderActionButtons() {
  actions.innerHTML = "";
  if (formMode === "create") {
    createButton = addButton({
      label: "Create",
      type: "submit",
      value: "create",
      classes: BUTTON_ENABLED_CLASSES,
    });

    clearButton = addButton({
      label: "Clear",
      type: "button",
      classes: BUTTON_ENABLED_CLASSES,
    });

    setButtonEnabled(createButton, false);
    primaryActionButton = createButton;
    setButtonEnabled(clearButton, true);
    clearButton.addEventListener("click", () => {
      clearReservationForm();
      if(window.clearFormMessage) window.clearFormMessage();
    });
  }

  if (formMode === "edit") {
    updateButton = addButton({
      label: "Update",
      type: "submit",
      value: "update",
      classes: BUTTON_ENABLED_CLASSES,
    });

    deleteButton = addButton({
      label: "Delete",
      type: "submit",
      value: "delete",
      classes: BUTTON_ENABLED_CLASSES,
    });
    setButtonEnabled(updateButton, false);
    primaryActionButton = updateButton;
    setButtonEnabled(deleteButton, true);
  }
  
  refreshPrimaryButtonState();
}

// ==========================================
// 3) Input handling + state management
// ==========================================

function isValid() {
  if(!resourceIdInput || !userIdInput || !startTimeInput || !endTimeInput || !statusInput) return false;
  return resourceIdInput.value.trim() !== "" && 
         userIdInput.value.trim() !== "" && 
         startTimeInput.value.trim() !== "" && 
         endTimeInput.value.trim() !== "" && 
         statusInput.value.trim() !== "";
}

function refreshPrimaryButtonState() {
  if (!primaryActionButton) return;
  setButtonEnabled(primaryActionButton, isValid());
}

if(resourceIdInput) resourceIdInput.addEventListener("input", refreshPrimaryButtonState);
if(userIdInput) userIdInput.addEventListener("input", refreshPrimaryButtonState);
if(startTimeInput) startTimeInput.addEventListener("input", refreshPrimaryButtonState);
if(endTimeInput) endTimeInput.addEventListener("input", refreshPrimaryButtonState);
if(noteInput) noteInput.addEventListener("input", refreshPrimaryButtonState);
if(statusInput) statusInput.addEventListener("change", refreshPrimaryButtonState);


function setCurrentReservationId(id) {
  if (!reservationIdInput) return;
  reservationIdInput.value = id ? String(id) : "";
}

function clearReservationForm() {
  if(resourceIdInput) resourceIdInput.value = "";
  if(userIdInput) userIdInput.value = "";
  if(startTimeInput) startTimeInput.value = "";
  if(endTimeInput) endTimeInput.value = "";
  if(noteInput) noteInput.value = "";
  if(statusInput) statusInput.value = "active";
  
  formMode = "create";
  selectedReservationId = null;
  setCurrentReservationId(null);
  
  renderActionButtons();
  highlightSelectedReservation(null);
}

function renderReservationList(reservations) {
  if (!reservationListEl) return;
  reservationListEl.innerHTML = reservations
    .map((r) => {
      const displayStart = new Date(r.start_time).toLocaleString();
      return `
        <button
          type="button"
          data-reservation-id="${r.id}"
          class="w-full text-left flex flex-col rounded-2xl border border-black/10 bg-white px-4 py-3 transition hover:bg-black/5"
          title="Select reservation"
        >
          <div class="font-semibold truncate">Resource: ${r.resource_name || r.resource_id}</div>
          <div class="text-xs opacity-70">User: ${r.user_email || r.user_id}</div>
          <div class="text-xs opacity-70">Starts: ${displayStart}</div>
          <div class="text-xs font-bold mt-1 uppercase opacity-80">${r.status}</div>
        </button>
      `;
    })
    .join("");

  reservationListEl.querySelectorAll("[data-reservation-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if(window.clearFormMessage) window.clearFormMessage();
      const id = Number(btn.dataset.reservationId);
      const reservation = reservationsCache.find((x) => Number(x.id) === id);
      if (!reservation) return;
      selectReservation(reservation);
    });
  });
}

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  // Strip the 'Z' and any seconds to match datetime-local format 'YYYY-MM-DDTHH:MM'
  const iso = d.toISOString();
  return iso.substring(0, 16);
}

function selectReservation(r) {
  selectedReservationId = Number(r.id);
  setCurrentReservationId(r.id);

  if(resourceIdInput) resourceIdInput.value = r.resource_id ?? "";
  if(userIdInput) userIdInput.value = r.user_id ?? "";
  if(startTimeInput) startTimeInput.value = formatDateForInput(r.start_time);
  if(endTimeInput) endTimeInput.value = formatDateForInput(r.end_time);
  if(noteInput) noteInput.value = r.note ?? "";
  if(statusInput) statusInput.value = r.status ?? "active";

  formMode = "edit";
  renderActionButtons();
  highlightSelectedReservation(r.id);
}

function highlightSelectedReservation(id) {
  if (!reservationListEl) return;
  const items = reservationListEl.querySelectorAll("[data-reservation-id]");
  items.forEach((el) => {
    const thisId = Number(el.dataset.reservationId);
    const isSelected = id && thisId === Number(id);
    el.classList.toggle("ring-2", isSelected);
    el.classList.toggle("ring-brand-blue/40", isSelected);
    el.classList.toggle("bg-brand-blue/5", isSelected);
  });
}

async function loadReservations() {
  try {
    const res = await fetch("/api/reservations");
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Failed to load reservations:", res.status, body);
      renderReservationList([]);
      return;
    }

    reservationsCache = Array.isArray(body.data) ? body.data : [];
    renderReservationList(reservationsCache);

    const idNow = reservationIdInput?.value ? Number(reservationIdInput.value) : null;
    if (idNow) {
      const found = reservationsCache.find((x) => Number(x.id) === idNow);
      if (found) {
        highlightSelectedReservation(found.id);
      }
    }
  } catch (err) {
    console.error("Failed to load reservations:", err);
    renderReservationList([]);
  }
}


// ===============================
// 4) Bootstrapping
// ===============================

renderActionButtons();

window.onReservationActionSuccess = async ({ action }) => {
  if (action === "delete" || action === "create" || action === "update") {
    clearReservationForm();
  }
  await loadReservations();
};

loadReservations();
