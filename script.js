(() => {
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];

  document.addEventListener("DOMContentLoaded", () => {
    // --------------------------------------------------
    // Config
    // --------------------------------------------------
    const API_BASE =
      window.API_BASE ||
      (location.hostname === "localhost" ||
      location.hostname === "127.0.0.1"
        ? "http://localhost:5050"
        : "");

    // --------------------------------------------------
    // Helpers
    // --------------------------------------------------
    const setText = (selector, text) => {
      const el = typeof selector === "string" ? $(selector) : selector;
      if (el) el.textContent = text;
    };

    const closeAllOpenModals = () => {
      $$('.modal[aria-hidden="false"]').forEach((m) => {
        m.setAttribute("aria-hidden", "true");
      });
      document.body.style.overflow = "";
    };

    // --------------------------------------------------
    // Mobile menu
    // --------------------------------------------------
    const burger = $("#burger");
    const mobileMenu = $("#mobileMenu");

    const closeMenu = () => {
      if (!mobileMenu) return;
      mobileMenu.classList.remove("isOpen");
      mobileMenu.setAttribute("aria-hidden", "true");
      if (burger) burger.setAttribute("aria-expanded", "false");
    };

    const toggleMenu = () => {
      if (!burger || !mobileMenu) return;
      const isOpen = mobileMenu.classList.toggle("isOpen");
      mobileMenu.setAttribute("aria-hidden", String(!isOpen));
      burger.setAttribute("aria-expanded", String(isOpen));
    };

    if (burger && mobileMenu) {
      burger.addEventListener("click", toggleMenu);
      $$("#mobileMenu a").forEach((a) => a.addEventListener("click", closeMenu));
    }

    // --------------------------------------------------
    // Smooth scroll (close mobile menu too)
    // --------------------------------------------------
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (!id || id === "#") return;

        const target = $(id);
        if (!target) return;

        e.preventDefault();
        closeMenu();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    // --------------------------------------------------
    // Scroll reveal
    // --------------------------------------------------
    const animated = $$("[data-animate]");
    if ("IntersectionObserver" in window && animated.length) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add("reveal");
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.12 }
      );

      animated.forEach((el) => io.observe(el));
    } else {
      animated.forEach((el) => el.classList.add("reveal"));
    }

    // --------------------------------------------------
    // Constitution accordion
    // --------------------------------------------------
    const accBtn = $(".accBtn");
    const accBody = $(".accBody");

    if (accBtn && accBody) {
      accBtn.addEventListener("click", () => {
        const expanded = accBtn.getAttribute("aria-expanded") === "true";
        accBtn.setAttribute("aria-expanded", String(!expanded));
        accBody.hidden = expanded;
      });
    }

    // --------------------------------------------------
    // Modals
    // --------------------------------------------------
    const openModal = (id) => {
      const m = $(id);
      if (!m) return;
      m.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };

    const closeModal = (modalEl) => {
      if (!modalEl) return;
      modalEl.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    const openPrivacy = () => openModal("#privacyModal");
    ["#openPrivacy", "#openPrivacyFooter", "#openPrivacyInline"].forEach((id) => {
      const btn = $(id);
      if (btn) btn.addEventListener("click", openPrivacy);
    });

    const openContactsBtn = $("#openContacts");
    if (openContactsBtn) {
      openContactsBtn.addEventListener("click", () => openModal("#contactsModal"));
    }

    $$(".modal").forEach((m) => {
      m.addEventListener("click", (e) => {
        if (e.target.closest("[data-close]")) closeModal(m);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      closeMenu();
      closeAllOpenModals();
    });

    // --------------------------------------------------
    // Government people details modal
    // --------------------------------------------------
    const PEOPLE = {
      president: {
        title: "Gennady Fimovich Lerner",
        subtitle: "President",
        body: "Head of State. Oversees national direction and ensures constitutional principles are upheld.",
      },
      vice: {
        title: "Olga Alexandrovna Fedorova-Beloshitska",
        subtitle: "Vice President",
        body: "Supports executive leadership and coordination between institutions and public programs.",
      },
      pm: {
        title: "Elina Viktorovna Rein",
        subtitle: "Prime Minister (temporary)",
        body: "Coordinates government operations and implementation of state programs (temporary appointment).",
      },
      foreign: {
        title: "Alexander Sergeevich Volter",
        subtitle: "Minister of Foreign Affairs",
        body: "Responsible for international relations, external representation, and diplomatic coordination.",
      },
    };

    $$(".person[data-person]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-person");
        const data = PEOPLE[key];
        if (!data) return;

        setText("#personTitle", data.title);
        setText("#personSubtitle", data.subtitle);
        setText("#personBody", data.body);

        openModal("#personModal");
      });
    });

    // --------------------------------------------------
    // Citizenship form (REAL backend submit)
    // --------------------------------------------------
    const form = $("#citizen-form") || $("#citizenshipForm") || $("#applyForm");
    const statusEl = $("#formStatus");
    const prefillBtn = $("#prefillExample") || $("#prefillBtn");

    if (prefillBtn && form) {
      prefillBtn.addEventListener("click", () => {
        if (form.elements.firstName) form.elements.firstName.value = "Alex";
        if (form.elements.lastName) form.elements.lastName.value = "Novak";
        if (form.elements.phone) form.elements.phone.value = "+35700000000";
        if (form.elements.email) form.elements.email.value = "alex@example.com";

        if (statusEl) {
          statusEl.textContent =
            "Example data filled. Please attach photo and identity document before submitting.";
        }
      });
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const agree =
          form.querySelector('input[name="agree"]') ||
          form.querySelector("#agree") ||
          form.querySelector('input[type="checkbox"]');

        if (agree && !agree.checked) {
          if (statusEl) {
            statusEl.textContent = "❌ Please confirm the privacy policy before submitting.";
          }
          return;
        }

        if (statusEl) statusEl.textContent = "Submitting application...";

        try {
          const formData = new FormData(form);
          const res = await fetch(`${API_BASE}/api/citizenship/apply`, {
            method: "POST",
            body: formData,
          });

          let data = {};
          try {
            data = await res.json();
          } catch {
            throw new Error("Server returned an invalid response");
          }

          const isSuccess = data.ok === true || data.success === true;
          if (!res.ok || !isSuccess) {
            throw new Error(data.message || "Failed to submit application");
          }

          if (statusEl) {
            statusEl.textContent = `✅ Submitted successfully. Application ID: ${data.applicationId || "N/A"}`;
          }

          form.reset();
        } catch (err) {
          console.error("Application submit error:", err);
          if (statusEl) {
            statusEl.textContent = `❌ ${err.message || "Could not connect to the server."}`;
          }
        }
      });
    }

    // --------------------------------------------------
    // Back to top
    // --------------------------------------------------
    const toTop = $("#toTop");

    const onScroll = () => {
      if (!toTop) return;
      toTop.classList.toggle("show", window.scrollY > 900);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toTop) {
      toTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  });
})();
