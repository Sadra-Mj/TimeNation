const API_BASE = "";

async function requestJson(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function formatDate(dateValue) {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

async function handleGovernmentLoginPage() {
  const form = document.getElementById("governmentLoginForm");
  const statusEl = document.getElementById("governmentLoginStatus");
  if (!form) return;

  try {
    const session = await requestJson("/api/government/session");
    if (session.authenticated) {
      window.location.href = "/government-dashboard";
      return;
    }
  } catch (error) {
    console.error(error);
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(form);
    const governmentId = (formData.get("governmentId") || "").toString().trim();
    const password = (formData.get("password") || "").toString();

    statusEl.textContent = "Checking credentials...";

    try {
      await requestJson("/api/government/login", {
        method: "POST",
        body: JSON.stringify({ governmentId, password })
      });

      statusEl.textContent = "Login successful. Redirecting...";
      window.location.href = "/government-dashboard";
    } catch (error) {
      statusEl.textContent = `❌ ${error.message}`;
    }
  });
}

function citizenCardTemplate(citizen) {
  return `
    <article class="glass citizenCard">
      <div class="citizenCardTop">
        <div>
          <h2>${citizen.firstName || ""} ${citizen.lastName || ""}</h2>
          <p>Submitted: ${formatDate(citizen.createdAt)}</p>
        </div>
      </div>

      <div class="citizenInfoGrid">
        <div class="citizenInfoItem">
          <span>First Name</span>
          <strong>${citizen.firstName || "—"}</strong>
        </div>
        <div class="citizenInfoItem">
          <span>Last Name</span>
          <strong>${citizen.lastName || "—"}</strong>
        </div>
        <div class="citizenInfoItem">
          <span>Phone</span>
          <strong>${citizen.phone || "—"}</strong>
        </div>
        <div class="citizenInfoItem">
          <span>Email</span>
          <strong>${citizen.email || "—"}</strong>
        </div>
      </div>

      <div class="citizenFiles">
        <div class="citizenFileBlock">
          <span>Photo</span>
          ${citizen.photoUrl ? `<a class="inlineLink" href="${citizen.photoUrl}" target="_blank" rel="noreferrer">Open Photo</a>` : `<strong>—</strong>`}
        </div>
        <div class="citizenFileBlock">
          <span>Identity Document</span>
          ${citizen.identityDocumentUrl ? `<a class="inlineLink" href="${citizen.identityDocumentUrl}" target="_blank" rel="noreferrer">Open Document</a>` : `<strong>—</strong>`}
        </div>
      </div>
    </article>
  `;
}

async function handleGovernmentDashboardPage() {
  const listEl = document.getElementById("citizensList");
  const statusEl = document.getElementById("governmentDashboardStatus");
  const logoutBtn = document.getElementById("governmentLogoutBtn");
  if (!listEl || !statusEl) return;

  try {
    const data = await requestJson("/api/government/citizens");
    const citizens = Array.isArray(data.citizens) ? data.citizens : [];

    if (!citizens.length) {
      statusEl.textContent = "No citizen applications found yet.";
      listEl.innerHTML = "";
    } else {
      statusEl.textContent = `Loaded ${citizens.length} citizen application${citizens.length > 1 ? "s" : ""}.`;
      listEl.innerHTML = citizens.map(citizenCardTemplate).join("");
    }
  } catch (error) {
    if (error.message === "Unauthorized") {
      window.location.href = "/government";
      return;
    }

    statusEl.textContent = `❌ ${error.message}`;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await requestJson("/api/government/logout", {
          method: "POST",
          body: JSON.stringify({})
        });
      } catch (error) {
        console.error(error);
      }

      window.location.href = "/government";
    });
  }
}

handleGovernmentLoginPage();
handleGovernmentDashboardPage();
