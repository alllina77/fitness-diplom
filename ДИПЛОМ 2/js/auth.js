(function initAuthLayer() {
  const TOKEN_KEY = "appAuthToken_v1";
  const USER_KEY = "appAuthUser_v1";
  const API_BASE = window.location.origin;
  // Эти ключи не очищаем при смене аккаунта.
  // Нужны для "общих" данных приложения (как в соцсети: лента/лайки/комменты видны всем аккаунтам на этом устройстве).
  const RESERVED_KEYS = new Set([TOKEN_KEY, USER_KEY, "socialFeedPosts_v1"]);

  // Главное приложение не должно читать localStorage до гидратации данных
  // текущего пользователя с сервера — иначе планы тренировок «перетекают» между аккаунтами.
  window.__APP_LOCKED__ = true;

  function parseBirthDateRu(value) {
    const s = String(value || "").trim();
    const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return null;
    const dd = Number(m[1]);
    const mo = Number(m[2]);
    const yy = Number(m[3]);
    const dt = new Date(yy, mo - 1, dd);
    if (
      dt.getFullYear() !== yy ||
      dt.getMonth() !== mo - 1 ||
      dt.getDate() !== dd
    ) {
      return null;
    }
    return s;
  }

  const AppAuth = {
    token: localStorage.getItem(TOKEN_KEY) || "",
    user: null,
    profile: null,
    ready: false,
    storageHydrationInProgress: false,
    storageSyncEnabled: false,
    originalStorage: {
      setItem: localStorage.setItem.bind(localStorage),
      removeItem: localStorage.removeItem.bind(localStorage),
      clear: localStorage.clear.bind(localStorage),
    },

    async request(path, options = {}) {
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Ошибка запроса");
      }
      return data;
    },

    setAuth(token, user) {
      this.token = token;
      this.user = user || null;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
    },

    normalizeProfile(profile) {
      const p = profile || {};
      return {
        firstName: p.firstName || p.first_name || "",
        lastName: p.lastName || p.last_name || "",
        middleName: p.middleName || p.middle_name || "",
        birthDate: p.birthDate || p.birth_date || "",
        gender: p.gender || "",
        heightCm: Number(p.heightCm ?? p.height_cm ?? 0) || 0,
        weightKg: Number(p.weightKg ?? p.weight_kg ?? 0) || 0,
        targetWeightKg:
          Number(p.targetWeightKg ?? p.target_weight_kg ?? 0) || 0,
        activityLevel: p.activityLevel || p.activity_level || "",
        fitnessGoal: p.fitnessGoal || p.fitness_goal || "",
        city: p.city || "",
        phone: p.phone || "",
        emergencyContact: p.emergencyContact || p.emergency_contact || "",
        medicalNotes: p.medicalNotes || p.medical_notes || "",
        avatarPhoto: p.avatarPhoto || p.avatar_photo || "",
      };
    },

    clearAuth() {
      this.token = "";
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },

    isAuthorized() {
      return Boolean(this.token && this.user?.username);
    },

    async hydrateStorageFromServer() {
      this.storageHydrationInProgress = true;
      try {
        // Важно: сначала очищаем локальные данные прошлого пользователя,
        // чтобы не было "перетекания" тренировок/питания между аккаунтами.
        const keysToClear = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key && !RESERVED_KEYS.has(key)) keysToClear.push(key);
        }
        keysToClear.forEach((key) => this.originalStorage.removeItem(key));

        const data = await this.request("/api/storage");
        const items = data.items || {};
        Object.keys(items).forEach((key) => {
          // Не затираем "зарезервированные" ключи данными из пользовательского стораджа.
          // Это нужно для глобальных данных на устройстве (например, лента соцсети).
          if (RESERVED_KEYS.has(key)) return;
          const raw = items[key]?.value;
          if (typeof raw === "string") {
            this.originalStorage.setItem(key, raw);
          }
        });
      } finally {
        this.storageHydrationInProgress = false;
      }
    },

    enableStorageSync() {
      if (this.storageSyncEnabled) return;
      this.storageSyncEnabled = true;

      localStorage.setItem = (key, value) => {
        this.originalStorage.setItem(key, value);
        if (!this.token || this.storageHydrationInProgress || RESERVED_KEYS.has(key)) {
          return;
        }
        fetch(`${API_BASE}/api/storage/${encodeURIComponent(key)}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ value: String(value) }),
        }).catch(() => {});
      };

      localStorage.removeItem = (key) => {
        this.originalStorage.removeItem(key);
        if (!this.token || RESERVED_KEYS.has(key)) {
          return;
        }
        fetch(`${API_BASE}/api/storage/${encodeURIComponent(key)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        }).catch(() => {});
      };

      localStorage.clear = () => {
        const keys = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key && !RESERVED_KEYS.has(key)) keys.push(key);
        }
        keys.forEach((key) => localStorage.removeItem(key));
      };
    },

    showAuthScreen() {
      const root = document.getElementById("authRoot");
      const app = document.getElementById("appRoot");
      if (!root || !app) return;

      app.style.display = "none";
      root.style.display = "grid";
      root.innerHTML = `
        <div class="auth-card">
          <h1 id="authTitle">Вход в систему</h1>
          <p id="authSub">Авторизуйтесь, чтобы работать с данными в базе.</p>
          <div class="auth-mode">
            <button id="authModeLogin" class="auth-mode-btn active">Вход</button>
            <button id="authModeRegister" class="auth-mode-btn">Регистрация</button>
          </div>
          <input id="authUsername" placeholder="Логин" />
          <input id="authPassword" type="password" placeholder="Пароль" />
          <div id="authRegisterFields" class="auth-register-fields" style="display:none">
            <div class="auth-grid">
              <input id="authLastName" placeholder="Фамилия" />
              <input id="authFirstName" placeholder="Имя" />
              <input id="authBirthDate" type="text" inputmode="numeric" placeholder="Дата рождения: ДД.ММ.ГГГГ" maxlength="10" autocomplete="bday" />
              <div class="auth-gender-row" role="group" aria-label="Пол">
                <input type="hidden" id="authGender" value="" />
                <button type="button" class="auth-gender-btn" data-gender="male">Мужской</button>
                <button type="button" class="auth-gender-btn" data-gender="female">Женский</button>
              </div>
            </div>
          </div>
          <div class="auth-actions">
            <button id="authSubmitBtn">Войти</button>
          </div>
          <div id="authMessage" class="auth-message"></div>
        </div>
      `;

      const usernameInput = document.getElementById("authUsername");
      const passwordInput = document.getElementById("authPassword");
      const submitBtn = document.getElementById("authSubmitBtn");
      const modeLoginBtn = document.getElementById("authModeLogin");
      const modeRegisterBtn = document.getElementById("authModeRegister");
      const registerFields = document.getElementById("authRegisterFields");
      const title = document.getElementById("authTitle");
      const subtitle = document.getElementById("authSub");
      const message = document.getElementById("authMessage");
      const genderHidden = document.getElementById("authGender");
      let mode = "login";

      const syncGenderButtons = () => {
        const val = String(genderHidden?.value || "");
        document.querySelectorAll(".auth-gender-btn").forEach((btn) => {
          btn.classList.toggle(
            "active",
            btn.getAttribute("data-gender") === val
          );
        });
      };

      document.querySelectorAll(".auth-gender-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const g = btn.getAttribute("data-gender") || "";
          if (genderHidden) genderHidden.value = g;
          syncGenderButtons();
        });
      });

      const setMessage = (text, isError) => {
        if (!message) return;
        message.textContent = text || "";
        message.style.color = isError ? "#ff9ea4" : "#9effc5";
      };

      const switchMode = (nextMode) => {
        mode = nextMode;
        const isRegister = mode === "register";
        if (title) title.textContent = isRegister ? "Регистрация" : "Вход в систему";
        if (subtitle) {
          subtitle.textContent = isRegister
            ? "Создайте аккаунт и заполните базовые данные профиля."
            : "Авторизуйтесь, чтобы работать с данными в базе.";
        }
        if (registerFields) registerFields.style.display = isRegister ? "block" : "none";
        if (submitBtn) submitBtn.textContent = isRegister ? "Создать аккаунт" : "Войти";
        if (modeLoginBtn) modeLoginBtn.classList.toggle("active", !isRegister);
        if (modeRegisterBtn) modeRegisterBtn.classList.toggle("active", isRegister);
        if (isRegister) syncGenderButtons();
      };

      const submit = async () => {
        const username = String(usernameInput?.value || "").trim();
        const password = String(passwordInput?.value || "");
        if (!username || !password) {
          setMessage("Введите логин и пароль", true);
          return;
        }
        const isRegister = mode === "register";
        const payload = { username, password };
        if (isRegister) {
          payload.lastName = String(document.getElementById("authLastName")?.value || "").trim();
          payload.firstName = String(document.getElementById("authFirstName")?.value || "").trim();
          payload.middleName = "";
          const birthRaw = String(document.getElementById("authBirthDate")?.value || "").trim();
          const birthOk = parseBirthDateRu(birthRaw);
          payload.birthDate = birthOk || birthRaw;
          payload.gender = String(document.getElementById("authGender")?.value || "").trim();
          if (!payload.firstName || !payload.lastName || !payload.gender) {
            setMessage("Для регистрации заполните: фамилию, имя и пол", true);
            return;
          }
          if (!birthOk) {
            setMessage("Дата рождения в формате ДД.ММ.ГГГГ (например 15.03.2001)", true);
            return;
          }
        }
        try {
          const endpoint = isRegister ? "register" : "login";
          const data = await this.request(`/api/auth/${endpoint}`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          this.setAuth(data.token, data.user);
          await this.finishAuthorized(true, false);
        } catch (err) {
          setMessage(err.message, true);
        }
      };

      if (submitBtn) submitBtn.addEventListener("click", submit);
      if (modeLoginBtn) modeLoginBtn.addEventListener("click", () => switchMode("login"));
      if (modeRegisterBtn) modeRegisterBtn.addEventListener("click", () => switchMode("register"));
      switchMode("login");
    },

    showApp(options = {}) {
      const animate = options.animate !== false;
      const root = document.getElementById("authRoot");
      const app = document.getElementById("appRoot");
      const userBadge = document.getElementById("authUserBadge");
      if (!root || !app) return;
      if (userBadge) userBadge.textContent = this.user?.username || "";

      if (!animate) {
        root.classList.remove("auth-leaving");
        root.style.display = "none";
        app.style.display = "block";
        app.classList.remove("app-entering", "app-entering-active");
        return;
      }

      root.classList.add("auth-leaving");
      app.style.display = "block";
      app.classList.add("app-entering");
      requestAnimationFrame(() => {
        app.classList.add("app-entering-active");
      });
      setTimeout(() => {
        root.style.display = "none";
        root.classList.remove("auth-leaving");
        app.classList.remove("app-entering", "app-entering-active");
      }, 420);
    },

    async finishAuthorized(reloadAfter = false, enterAnimation = true) {
      await this.fetchProfile();
      await this.hydrateStorageFromServer();
      this.enableStorageSync();
      window.__APP_LOCKED__ = false;
      if (!reloadAfter) {
        window.dispatchEvent(new CustomEvent("appStorageHydrated"));
      }
      this.showApp({ animate: enterAnimation });
      this.ready = true;
      if (reloadAfter) {
        window.location.reload();
      }
    },

    async init() {
      const rawUser = localStorage.getItem(USER_KEY);
      try {
        this.user = rawUser ? JSON.parse(rawUser) : null;
      } catch (_e) {
        this.user = null;
      }

      if (!this.token) {
        window.__APP_LOCKED__ = true;
        this.showAuthScreen();
        return;
      }

      window.__APP_LOCKED__ = true;

      try {
        const me = await this.request("/api/auth/me");
        this.user = me.user;
        this.profile = this.normalizeProfile(me.profile);
        localStorage.setItem(USER_KEY, JSON.stringify(this.user));
        await this.finishAuthorized(false, false);
      } catch (_err) {
        this.clearAuth();
        window.__APP_LOCKED__ = true;
        this.showAuthScreen();
      }
    },

    async fetchProfile() {
      try {
        const data = await this.request("/api/profile");
        this.profile = this.normalizeProfile(data.profile || {});
        const ap = this.profile?.avatarPhoto;
        const un = this.user?.username;
        if (ap && un && window.AppModules?.profile?.saveVisualForUser) {
          window.AppModules.profile.saveVisualForUser(un, { photo: ap });
        }
      } catch (_err) {
        this.profile = this.normalizeProfile({});
      }
    },

    async updateProfile(payload) {
      const merged = { ...(this.profile || {}), ...(payload || {}) };
      const profile = this.normalizeProfile(merged);
      await this.request("/api/profile", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      this.profile = profile;
      if (this.user) {
        if (profile.firstName) this.user.firstName = profile.firstName;
        if (profile.lastName) this.user.lastName = profile.lastName;
      }
    },
  };

  window.AppAuth = AppAuth;

  document.addEventListener("DOMContentLoaded", () => {
    AppAuth.init();
  });
})();
