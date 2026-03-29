// ===============================
// Form handling for reservations page (CRUD)
// ===============================

// -------------- Helpers --------------
function $(id) {
  return document.getElementById(id);
}

function getFormMessageEl() {
  return document.getElementById("formMessage");
}

function showFormMessage(type, message) {
  const el = getFormMessageEl();
  if (!el) return;

  el.className = "mt-6 rounded-2xl border px-4 py-3 text-sm whitespace-pre-line";
  el.classList.remove("hidden");

  if (type === "success") {
    el.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-900");
  } else if (type === "info") {
    el.classList.add("border-amber-200", "bg-amber-50", "text-amber-900");
  } else {
    el.classList.add("border-rose-200", "bg-rose-50", "text-rose-900");
  }

  el.textContent = message;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

window.clearFormMessage = function() {
  const el = getFormMessageEl();
  if (!el) return;
  el.textContent = "";
  el.classList.add("hidden");
};

async function readResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return { ok: false, error: "Invalid JSON response" };
    }
  }
  const text = await response.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "Non-JSON response", raw: text };
  }
}

function getPayloadFromForm() {
  const noteVal = $("note")?.value ?? "";
  
  // Create an ISO string for API request
  let startTime = $("startTime")?.value;
  if(startTime && startTime.length === 16) {
    startTime = startTime + ":00Z";
  }
  
  let endTime = $("endTime")?.value;
  if(endTime && endTime.length === 16) {
    endTime = endTime + ":00Z";
  }
  
  return {
    reservationId: $("reservationId")?.value ?? "",
    resourceId: parseInt($("resourceId")?.value || 0),
    userId: parseInt($("userId")?.value || 0),
    startTime: startTime,
    endTime: endTime,
    note: noteVal,
    status: $("status")?.value ?? "active",
  };
}

// -------------- Form wiring --------------
document.addEventListener("DOMContentLoaded", () => {
  const form = $("reservationForm");
  if (!form) return;
  form.addEventListener("submit", onSubmit);
});

async function onSubmit(event) {
  event.preventDefault();
  const submitter = event.submitter;
  const actionValue = submitter?.value || "create"; // "create" | "update" | "delete"

  const payload = getPayloadFromForm();

  try {
    window.clearFormMessage();

    let method = "POST";
    let url = "/api/reservations";
    let body = null;

    if (actionValue === "create") {
      method = "POST";
      url = "/api/reservations";
      body = JSON.stringify({
        resourceId: payload.resourceId,
        userId: payload.userId,
        startTime: payload.startTime,
        endTime: payload.endTime,
        note: payload.note,
        status: payload.status
      });
    } else if (actionValue === "update") {
      if (!payload.reservationId) {
        showFormMessage("error", "Update failed: missing reservation ID. Select a reservation first.");
        return;
      }
      method = "PUT";
      url = `/api/reservations/${payload.reservationId}`;
      body = JSON.stringify({
        resourceId: payload.resourceId,
        userId: payload.userId,
        startTime: payload.startTime,
        endTime: payload.endTime,
        note: payload.note,
        status: payload.status
      });
    } else if (actionValue === "delete") {
      if (!payload.reservationId) {
        showFormMessage("error", "Delete failed: missing reservation ID. Select a reservation first.");
        return;
      }
      method = "DELETE";
      url = `/api/reservations/${payload.reservationId}`;
      body = null;
    } else {
      showFormMessage("error", `Unknown action: ${actionValue}`);
      return;
    }

    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    });

    const responseBody = response.status === 204 ? null : await readResponseBody(response);

    if (!response.ok) {
      if (response.status === 400 || response.status === 500) {
        const errStr = responseBody?.error || "Invalid details";
        showFormMessage("error", `Server error: ${errStr}`);
        return;
      }
      if (response.status === 404) {
        showFormMessage("error", "Not found (404):\n\nThe reservation no longer exists. Refresh the list and try again.");
        return;
      }

      showFormMessage("error", `Server returned an error (${response.status}).`);
      return;
    }

    if (actionValue === "delete") {
      showFormMessage("success", `👍 Reservation successfully deleted! 🥳`);
    } else if (actionValue === "create") {
      showFormMessage("success", `👍 Reservation successfully created! 🥳`);
    } else if (actionValue === "update") {
      showFormMessage("success", `👍 Reservation successfully updated! 🥳`);
    }

    if (typeof window.onReservationActionSuccess === "function") {
      window.onReservationActionSuccess({
        action: actionValue,
        data: responseBody?.data ?? null,
        id: responseBody?.data?.id ?? null,
      });
    }
  } catch (err) {
    console.error("Fetch error:", err);
    showFormMessage(
      "error",
      "Network error: Could not reach the server. Check your environment and try again."
    );
  }
}
