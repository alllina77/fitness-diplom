// Добавляем данные упражнений
      const EXERCISES_BY_MUSCLE = {
        грудь: [
          { name: "Жим штанги лежа", type: "силовое" },
          { name: "Жим гантелей лежа", type: "силовое" },
          { name: "Отжимания", type: "силовое" },
          { name: "Сведение рук в кроссовере", type: "силовое" },
          { name: "Пуловер", type: "силовое" },
        ],
        спина: [
          { name: "Тяга штанги в наклоне", type: "силовое" },
          { name: "Подтягивания", type: "силовое" },
          { name: "Тяга гантели одной рукой", type: "силовое" },
          { name: "Тяга верхнего блока", type: "силовое" },
          { name: "Гиперэкстензия", type: "силовое" },
          { name: "Тяга Т-грифа", type: "силовое" },
        ],
        ноги: [
          { name: "Приседания со штангой", type: "силовое" },
          { name: "Выпады", type: "силовое" },
          { name: "Жим ногами", type: "силовое" },
          { name: "Подъем на носки", type: "силовое" },
          { name: "Румынская тяга", type: "силовое" },
        ],
        плечи: [
          { name: "Жим штанги стоя", type: "силовое" },
          { name: "Махи гантелями в стороны", type: "силовое" },
          { name: "Подъем гантелей перед собой", type: "силовое" },
          { name: "Тяга штанги к подбородку", type: "силовое" },
        ],
        бицепс: [
          { name: "Подъем штанги на бицепс", type: "силовое" },
          { name: "Подъем гантелей на бицепс", type: "силовое" },
          { name: "Молотки", type: "силовое" },
          { name: "Концентрированный подъем", type: "силовое" },
        ],
        трицепс: [
          { name: "Жим лежа узким хватом", type: "силовое" },
          { name: "Французский жим", type: "силовое" },
          { name: "Разгибание рук на блоке", type: "силовое" },
          { name: "Отжимания на брусьях", type: "силовое" },
        ],
        пресс: [
          { name: "Скручивания", type: "силовое" },
          { name: "Подъем ног в висе", type: "силовое" },
          { name: "Планка", type: "силовое" },
          { name: "Русский твист", type: "силовое" },
        ],
        предплечье: [
          { name: "Сгибание запястий со штангой", type: "силовое" },
          { name: "Пронация/супинация", type: "силовое" },
        ],
        кардио: [
          { name: "Бег", type: "кардио" },
          { name: "Велотренажер", type: "кардио" },
          { name: "Скакалка", type: "кардио" },
          { name: "Гребной тренажер", type: "кардио" },
          { name: "Ходьба на дорожке", type: "кардио" },
          { name: "Эллипс", type: "кардио" },
        ],
        другое: [
          { name: "Планка", type: "силовое" },
          { name: "Берпи", type: "кардио" },
          { name: "Подтягивания", type: "силовое" },
        ],
      };

      function startMainTrainingApp() {
        if (window.__mainTrainingAppStarted) return;
        window.__mainTrainingAppStarted = true;
        window.AppModules?.avatar?.render?.("virtualAvatarMount");
        window.AppModules?.nutrition?.render?.("nutritionModuleMount");
        window.AppModules?.social?.render?.("socialModuleMount");
        window.AppModules?.psychology?.render?.("psychologyModuleMount");
        window.AppModules?.avatar?.renderPanel?.("avatarModuleMount");
        window.AppModules?.profile?.render?.("profileModuleMount");

        if (!window.__avatarPhotoUpdateListenerBound) {
          window.__avatarPhotoUpdateListenerBound = true;
          window.addEventListener("app:avatar-photo-updated", () => {
            try {
              window.AppModules?.avatar?.render?.("virtualAvatarMount");
              window.AppModules?.avatar?.renderPanel?.("avatarModuleMount");
              window.AppModules?.social?.render?.("socialModuleMount");
              window.AppModules?.profile?.render?.("profileModuleMount");
            } catch (_e) {
              // no-op
            }
          });
        }

        /* ===== storage keys and helpers ===== */
        const STORAGE_PLANS = "trainingPlans_v3";
        const STORAGE_WORKOUTS = "trainingWorkouts_v4";
        const STORAGE_LAST_SET = "trainingLastSetByExercise_v1";
        let currentCalendarDate = new Date();
        let plansCollapsed = localStorage.getItem("plansCollapsed") === "true";
        let currentRightPanelTab = "progress"; // Сохраняем активную вкладку правой панели
        let chartJsLoaderPromise = null;

        function uid() {
          return "id_" + Math.random().toString(36).slice(2, 10);
        }

        function ensureChartJsLoaded() {
          if (typeof window.Chart === "function") {
            return Promise.resolve(true);
          }

          if (chartJsLoaderPromise) return chartJsLoaderPromise;

          chartJsLoaderPromise = new Promise((resolve) => {
            const onLoaded = () => {
              resolve(typeof window.Chart === "function");
            };
            const onFailed = () => {
              chartJsLoaderPromise = null;
              resolve(false);
            };

            let script = document.getElementById("chartjs-fallback-loader");
            if (script) {
              script.addEventListener("load", onLoaded, { once: true });
              script.addEventListener("error", onFailed, { once: true });
              if (typeof window.Chart === "function") onLoaded();
              return;
            }

            script = document.createElement("script");
            script.id = "chartjs-fallback-loader";
            script.src = "./js/vendor/chart.umd.min.js";
            script.onload = onLoaded;
            script.onerror = () => {
              const cdnScript = document.createElement("script");
              cdnScript.src =
                "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
              cdnScript.onload = onLoaded;
              cdnScript.onerror = onFailed;
              document.head.appendChild(cdnScript);
            };
            document.head.appendChild(script);
          });

          return chartJsLoaderPromise;
        }

        function loadPlans() {
          try {
            return JSON.parse(localStorage.getItem(STORAGE_PLANS)) || [];
          } catch (e) {
            return [];
          }
        }

        function savePlans(plans) {
          localStorage.setItem(STORAGE_PLANS, JSON.stringify(plans));
        }

        function loadWorkouts() {
          try {
            const data =
              JSON.parse(localStorage.getItem(STORAGE_WORKOUTS)) || {};
            if (Array.isArray(data)) {
              const newData = {};
              data.forEach((workout) => {
                if (!newData[workout.planId]) {
                  newData[workout.planId] = [];
                }
                newData[workout.planId].push(workout);
              });
              saveWorkouts(newData);
              return newData;
            }
            return data;
          } catch (e) {
            return {};
          }
        }

        function saveWorkouts(workoutsData) {
          localStorage.setItem(STORAGE_WORKOUTS, JSON.stringify(workoutsData));
        }

        function loadLastSetByExercise() {
          try {
            return JSON.parse(localStorage.getItem(STORAGE_LAST_SET)) || {};
          } catch (_e) {
            return {};
          }
        }

        function saveLastSetByExercise(map) {
          localStorage.setItem(STORAGE_LAST_SET, JSON.stringify(map));
        }

        function normalizeExerciseKey(name) {
          return String(name || "").trim().toLowerCase();
        }

        function getLastSetForExercise(name) {
          const map = loadLastSetByExercise();
          return map[normalizeExerciseKey(name)] || null;
        }

        function rememberLastSetForExercise(name, setData) {
          const key = normalizeExerciseKey(name);
          if (!key) return;
          const map = loadLastSetByExercise();
          map[key] = {
            w: parseFloat(setData?.w) || 0,
            r: parseInt(setData?.r) || 0,
          };
          saveLastSetByExercise(map);
        }

        function getWorkoutsForCurrentPlan() {
          return workouts[currentPlanId] || [];
        }

        function saveWorkoutsForCurrentPlan(workoutsList) {
          workouts[currentPlanId] = workoutsList;
          saveWorkouts(workouts);
          shouldUpdateMuscleStats = true;
        }

        // Функция для получения начала текущей недели (понедельник)
        function getStartOfWeek(date) {
          const d = new Date(date);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          d.setDate(diff);
          d.setHours(0, 0, 0, 0);
          return d;
        }

        // Функция для проверки, находится ли дата в текущей неделе
        function isInCurrentWeek(dateStr) {
          const date = new Date(dateStr + "T00:00:00");
          const startOfWeek = getStartOfWeek(new Date());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return date >= startOfWeek && date <= endOfWeek;
        }

        /* ===== initial data structures ===== */
        let plans = loadPlans();
        let workouts = loadWorkouts();
        function getExerciseNameSuggestions() {
          const fromCatalog = Object.values(EXERCISES_BY_MUSCLE)
            .flat()
            .map((item) => item.name);
          const fromPlans = plans.flatMap((plan) =>
            (plan.days || []).flatMap((day) =>
              (day.exercises || []).map((ex) => ex.name)
            )
          );
          return Array.from(
            new Set([...fromCatalog, ...fromPlans].filter(Boolean))
          ).sort((a, b) => a.localeCompare(b, "ru"));
        }
        let currentPlanId = plans.length ? plans[0].id : null;
        let currentDayIndex = 0;
        let selectedExerciseRef = null;
        let shouldUpdateMuscleStats = true;
        const trainingUiState = {
          daySwitchLoading: false,
          lastAddedExerciseId: null,
        };

        /* charts refs */
        let chart1 = null,
          chart2 = null;
        let muscleChartInstance = null;

        /* muscle groups list (display order) */
        const MUSCLE_GROUPS = [
          "грудь",
          "спина",
          "ноги",
          "плечи",
          "бицепс",
          "трицепс",
          "пресс",
          "предплечье",
          "кардио",
          "другое",
        ];

        /* ===== DOM refs ===== */
        const planSelect = document.getElementById("planSelect");
        const newPlanBtn = document.getElementById("newPlan");
        const deletePlanBtn = document.getElementById("deletePlan");
        const planNameInput = document.getElementById("planName");
        const savePlanBtn = document.getElementById("savePlan");
        const createDaysBtn = document.getElementById("createDays");
        const daysCountInput = document.getElementById("daysCount");
        const dayList = document.getElementById("dayList");
        const planSummary = document.getElementById("planSummary");
        const showProgramsBtn = document.getElementById("showPrograms");
        const themeToggleBtn = document.getElementById("themeToggle");

        const currentDayTitle = document.getElementById("currentDayTitle");
        const dayInfo = document.getElementById("dayInfo");
        const addExerciseBtn = document.getElementById("addExercise");
        const startWorkoutBtn = document.getElementById("startWorkout");
        const exList = document.getElementById("exList");
        const emptyHint = document.getElementById("emptyHint");
        const searchEx = document.getElementById("searchEx");
        const chartsArea = document.getElementById("chartsArea");

        // Каталог упражнений
        const catalogToggle = document.getElementById("catalogToggle");
        const catalogToggleIcon = document.getElementById("catalogToggleIcon");
        const muscleGroups = document.getElementById("muscleGroups");

        const modal = document.getElementById("modal");
        const modalContent = document.getElementById("modalContent");

        // Alert elements
        const alertModal = document.getElementById("alertModal");
        const alertMessage = document.getElementById("alertMessage");
        const alertOk = document.getElementById("alertOk");

        // Элементы для сворачивания "Мои планы"
        const plansToggle = document.getElementById("plansToggle");
        const plansToggleIcon = document.getElementById("plansToggleIcon");
        const plansContent = document.getElementById("plansContent");
        const STORAGE_THEME = "uiTheme_v1";
        const TRAINING_TEMPLATES = [
          {
            id: "upper-lower-4",
            name: "Upper / Lower · 4 дня",
            description:
              "Сбалансированная программа на набор силы и массы для среднего уровня.",
            days: [
              {
                name: "Верх A",
                exercises: [
                  { name: "Жим штанги лежа", type: "силовое", muscle: "грудь" },
                  { name: "Тяга штанги в наклоне", type: "силовое", muscle: "спина" },
                  { name: "Жим штанги стоя", type: "силовое", muscle: "плечи" },
                  { name: "Французский жим", type: "силовое", muscle: "трицепс" },
                ],
              },
              {
                name: "Низ A",
                exercises: [
                  { name: "Приседания со штангой", type: "силовое", muscle: "ноги" },
                  { name: "Румынская тяга", type: "силовое", muscle: "ноги" },
                  { name: "Подъем на носки", type: "силовое", muscle: "ноги" },
                  { name: "Планка", type: "силовое", muscle: "пресс" },
                ],
              },
              {
                name: "Верх B",
                exercises: [
                  { name: "Жим гантелей лежа", type: "силовое", muscle: "грудь" },
                  { name: "Подтягивания", type: "силовое", muscle: "спина" },
                  { name: "Махи гантелями в стороны", type: "силовое", muscle: "плечи" },
                  { name: "Подъем штанги на бицепс", type: "силовое", muscle: "бицепс" },
                ],
              },
              {
                name: "Низ B",
                exercises: [
                  { name: "Жим ногами", type: "силовое", muscle: "ноги" },
                  { name: "Выпады", type: "силовое", muscle: "ноги" },
                  { name: "Гиперэкстензия", type: "силовое", muscle: "спина" },
                  { name: "Скручивания", type: "силовое", muscle: "пресс" },
                ],
              },
            ],
          },
          {
            id: "push-pull-legs-3",
            name: "Push / Pull / Legs · 3 дня",
            description:
              "Классический сплит для роста мышц с равномерным восстановлением.",
            days: [
              {
                name: "Push",
                exercises: [
                  { name: "Жим штанги лежа", type: "силовое", muscle: "грудь" },
                  { name: "Жим штанги стоя", type: "силовое", muscle: "плечи" },
                  { name: "Разгибание рук на блоке", type: "силовое", muscle: "трицепс" },
                ],
              },
              {
                name: "Pull",
                exercises: [
                  { name: "Тяга верхнего блока", type: "силовое", muscle: "спина" },
                  { name: "Тяга гантели одной рукой", type: "силовое", muscle: "спина" },
                  { name: "Молотки", type: "силовое", muscle: "бицепс" },
                ],
              },
              {
                name: "Legs",
                exercises: [
                  { name: "Приседания со штангой", type: "силовое", muscle: "ноги" },
                  { name: "Жим ногами", type: "силовое", muscle: "ноги" },
                  { name: "Подъем на носки", type: "силовое", muscle: "ноги" },
                ],
              },
            ],
          },
          {
            id: "full-body-3",
            name: "Full Body · 3 дня",
            description: "Тренировка всего тела, оптимально для базового прогресса.",
            days: [
              {
                name: "Full Body A",
                exercises: [
                  { name: "Приседания со штангой", type: "силовое", muscle: "ноги" },
                  { name: "Жим штанги лежа", type: "силовое", muscle: "грудь" },
                  { name: "Тяга верхнего блока", type: "силовое", muscle: "спина" },
                ],
              },
              {
                name: "Full Body B",
                exercises: [
                  { name: "Жим ногами", type: "силовое", muscle: "ноги" },
                  { name: "Жим штанги стоя", type: "силовое", muscle: "плечи" },
                  { name: "Тяга гантели одной рукой", type: "силовое", muscle: "спина" },
                ],
              },
              {
                name: "Full Body C",
                exercises: [
                  { name: "Румынская тяга", type: "силовое", muscle: "ноги" },
                  { name: "Жим гантелей лежа", type: "силовое", muscle: "грудь" },
                  { name: "Подъем штанги на бицепс", type: "силовое", muscle: "бицепс" },
                ],
              },
            ],
          },
          {
            id: "fat-loss-4",
            name: "Жиросжигание · 4 дня",
            description: "Сочетание силовой работы и кардио для дефицита калорий.",
            days: [
              {
                name: "Силовая Верх",
                exercises: [
                  { name: "Жим штанги лежа", type: "силовое", muscle: "грудь" },
                  { name: "Тяга верхнего блока", type: "силовое", muscle: "спина" },
                  { name: "Разгибание рук на блоке", type: "силовое", muscle: "трицепс" },
                ],
              },
              {
                name: "Кардио + Кор",
                exercises: [
                  { name: "Бег", type: "кардио", muscle: "кардио" },
                  { name: "Русский твист", type: "силовое", muscle: "пресс" },
                  { name: "Планка", type: "силовое", muscle: "пресс" },
                ],
              },
              {
                name: "Силовая Низ",
                exercises: [
                  { name: "Приседания со штангой", type: "силовое", muscle: "ноги" },
                  { name: "Выпады", type: "силовое", muscle: "ноги" },
                  { name: "Подъем на носки", type: "силовое", muscle: "ноги" },
                ],
              },
              {
                name: "Интервалы",
                exercises: [
                  { name: "Скакалка", type: "кардио", muscle: "кардио" },
                  { name: "Берпи", type: "кардио", muscle: "кардио" },
                  { name: "Эллипс", type: "кардио", muscle: "кардио" },
                ],
              },
            ],
          },
          {
            id: "strength-5x5",
            name: "Сила 5x5 · 3 дня",
            description: "Минималистичная программа силы на базовых движениях.",
            days: [
              {
                name: "5x5 A",
                exercises: [
                  { name: "Приседания со штангой", type: "силовое", muscle: "ноги" },
                  { name: "Жим штанги лежа", type: "силовое", muscle: "грудь" },
                  { name: "Тяга штанги в наклоне", type: "силовое", muscle: "спина" },
                ],
              },
              {
                name: "5x5 B",
                exercises: [
                  { name: "Приседания со штангой", type: "силовое", muscle: "ноги" },
                  { name: "Жим штанги стоя", type: "силовое", muscle: "плечи" },
                  { name: "Подтягивания", type: "силовое", muscle: "спина" },
                ],
              },
              {
                name: "5x5 C",
                exercises: [
                  { name: "Румынская тяга", type: "силовое", muscle: "ноги" },
                  { name: "Жим гантелей лежа", type: "силовое", muscle: "грудь" },
                  { name: "Тяга Т-грифа", type: "силовое", muscle: "спина" },
                ],
              },
            ],
          },
          {
            id: "home-minimal-3",
            name: "Домашняя минимальная · 3 дня",
            description: "Без сложного оборудования, чтобы не пропускать тренировки.",
            days: [
              {
                name: "Дом A",
                exercises: [
                  { name: "Отжимания", type: "силовое", muscle: "грудь" },
                  { name: "Планка", type: "силовое", muscle: "пресс" },
                  { name: "Выпады", type: "силовое", muscle: "ноги" },
                ],
              },
              {
                name: "Дом B",
                exercises: [
                  { name: "Берпи", type: "кардио", muscle: "кардио" },
                  { name: "Русский твист", type: "силовое", muscle: "пресс" },
                  { name: "Подъем на носки", type: "силовое", muscle: "ноги" },
                ],
              },
              {
                name: "Дом C",
                exercises: [
                  { name: "Подтягивания", type: "силовое", muscle: "спина" },
                  { name: "Скручивания", type: "силовое", muscle: "пресс" },
                  { name: "Ходьба на дорожке", type: "кардио", muscle: "кардио" },
                ],
              },
            ],
          },
          {
            id: "endurance-4",
            name: "Выносливость · 4 дня",
            description: "Упор на кардио, функциональную силу и общую работоспособность.",
            days: [
              {
                name: "Кардио длинное",
                exercises: [
                  { name: "Бег", type: "кардио", muscle: "кардио" },
                  { name: "Эллипс", type: "кардио", muscle: "кардио" },
                ],
              },
              {
                name: "Функциональная",
                exercises: [
                  { name: "Берпи", type: "кардио", muscle: "кардио" },
                  { name: "Выпады", type: "силовое", muscle: "ноги" },
                  { name: "Планка", type: "силовое", muscle: "пресс" },
                ],
              },
              {
                name: "Кардио интервалы",
                exercises: [
                  { name: "Скакалка", type: "кардио", muscle: "кардио" },
                  { name: "Гребной тренажер", type: "кардио", muscle: "кардио" },
                ],
              },
              {
                name: "Стабилизация",
                exercises: [
                  { name: "Гиперэкстензия", type: "силовое", muscle: "спина" },
                  { name: "Скручивания", type: "силовое", muscle: "пресс" },
                  { name: "Ходьба на дорожке", type: "кардио", muscle: "кардио" },
                ],
              },
            ],
          },
          {
            id: "women-toning-4",
            name: "Тонус и стройность · 4 дня",
            description:
              "Комбинация силовой и кардио-нагрузки для снижения процента жира и тонуса.",
            days: [
              {
                name: "Низ + ягодицы",
                exercises: [
                  { name: "Выпады", type: "силовое", muscle: "ноги" },
                  { name: "Приседания со штангой", type: "силовое", muscle: "ноги" },
                  { name: "Румынская тяга", type: "силовое", muscle: "ноги" },
                ],
              },
              {
                name: "Верх + корпус",
                exercises: [
                  { name: "Тяга верхнего блока", type: "силовое", muscle: "спина" },
                  { name: "Жим гантелей лежа", type: "силовое", muscle: "грудь" },
                  { name: "Планка", type: "силовое", muscle: "пресс" },
                ],
              },
              {
                name: "Кардио интервал",
                exercises: [
                  { name: "Эллипс", type: "кардио", muscle: "кардио" },
                  { name: "Скакалка", type: "кардио", muscle: "кардио" },
                ],
              },
              {
                name: "Стабилизация",
                exercises: [
                  { name: "Русский твист", type: "силовое", muscle: "пресс" },
                  { name: "Гиперэкстензия", type: "силовое", muscle: "спина" },
                  { name: "Ходьба на дорожке", type: "кардио", muscle: "кардио" },
                ],
              },
            ],
          },
          {
            id: "hypertrophy-5",
            name: "Гипертрофия · 5 дней",
            description:
              "Сплит для набора мышечной массы с акцентом на объем подходов.",
            days: [
              {
                name: "Грудь",
                exercises: [
                  { name: "Жим штанги лежа", type: "силовое", muscle: "грудь" },
                  { name: "Жим гантелей лежа", type: "силовое", muscle: "грудь" },
                  { name: "Сведение рук в кроссовере", type: "силовое", muscle: "грудь" },
                ],
              },
              {
                name: "Спина",
                exercises: [
                  { name: "Тяга штанги в наклоне", type: "силовое", muscle: "спина" },
                  { name: "Подтягивания", type: "силовое", muscle: "спина" },
                  { name: "Тяга Т-грифа", type: "силовое", muscle: "спина" },
                ],
              },
              {
                name: "Ноги",
                exercises: [
                  { name: "Приседания со штангой", type: "силовое", muscle: "ноги" },
                  { name: "Жим ногами", type: "силовое", muscle: "ноги" },
                  { name: "Подъем на носки", type: "силовое", muscle: "ноги" },
                ],
              },
              {
                name: "Плечи",
                exercises: [
                  { name: "Жим штанги стоя", type: "силовое", muscle: "плечи" },
                  { name: "Махи гантелями в стороны", type: "силовое", muscle: "плечи" },
                  { name: "Тяга штанги к подбородку", type: "силовое", muscle: "плечи" },
                ],
              },
              {
                name: "Руки + пресс",
                exercises: [
                  { name: "Подъем штанги на бицепс", type: "силовое", muscle: "бицепс" },
                  { name: "Французский жим", type: "силовое", muscle: "трицепс" },
                  { name: "Скручивания", type: "силовое", muscle: "пресс" },
                ],
              },
            ],
          },
        ];

        /* ===== helpers ===== */
        function escapeHtml(s) {
          return String(s || "").replace(
            /[&<>"]/g,
            (c) =>
              ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
          );
        }

        function getCurrentPlan() {
          return plans.find((p) => p.id === currentPlanId);
        }

        function getCurrentDay() {
          const pl = getCurrentPlan();
          return pl && pl.days ? pl.days[currentDayIndex] : null;
        }

        function applyTheme(theme) {
          const normalized = theme === "light" ? "light" : "dark";
          document.body.classList.toggle("light-theme", normalized === "light");
          localStorage.setItem(STORAGE_THEME, normalized);
          if (themeToggleBtn) {
            themeToggleBtn.textContent =
              normalized === "light" ? "☀️ Светлая" : "🌙 Тёмная";
          }
        }

        /* ensure at least one plan exists */
        if (!plans.length) {
          const id = uid();
          plans.push({ id, name: "Мой план", days: [] });
          currentPlanId = id;
          savePlans(plans);
        }

        /* ===== modal helpers ===== */
        function openModal(html) {
          modalContent.innerHTML = html;
          modal.classList.add("active");
          modalContent.parentElement.scrollTop = 0;
        }

        function closeModal() {
          modal.classList.remove("active");
        }

        // Нужен для inline-обработчика backdrop в HTML.
        window.closeModal = closeModal;

        function ensureToastHost() {
          let host = document.getElementById("appToastHost");
          if (host) return host;
          host = document.createElement("div");
          host.id = "appToastHost";
          document.body.appendChild(host);
          return host;
        }

        function closeAlert() {
          if (alertModal) alertModal.classList.remove("active");
        }

        function showAlert(message) {
          closeModal();
          closeAlert();
          if (alertMessage) alertMessage.textContent = "";
          const text = String(message || "").trim();
          if (!text) return;
          const host = ensureToastHost();
          const toast = document.createElement("div");
          toast.className = "app-toast";
          toast.innerHTML = `
            <span class="app-toast-icon" aria-hidden="true">✓</span>
            <span class="app-toast-text">${escapeHtml(text)}</span>
          `;
          host.appendChild(toast);
          requestAnimationFrame(() => toast.classList.add("visible"));
          setTimeout(() => {
            toast.classList.remove("visible");
            toast.classList.add("leaving");
            setTimeout(() => toast.remove(), 260);
          }, 2200);
        }

        function showConfirm(message, onYes) {
          const confirmModal = document.getElementById("confirmModal");
          const confirmMessage = document.getElementById("confirmMessage");
          const btnYes = document.getElementById("confirmYes");
          const btnNo = document.getElementById("confirmNo");

          confirmMessage.textContent = message;
          confirmModal.classList.add("active");

          btnYes.onclick = () => {
            confirmModal.classList.remove("active");
            if (onYes) onYes();
          };

          btnNo.onclick = () => {
            confirmModal.classList.remove("active");
          };
        }

        // Функция для принудительного обновления диаграммы
        function updateMuscleStats() {
          shouldUpdateMuscleStats = true;
          renderMuscleStats();
          renderProgressionRecommendations();
        }

        // Функция для переключения состояния свернутости блока "Мои планы"
        function togglePlansVisibility() {
          plansCollapsed = !plansCollapsed;
          localStorage.setItem("plansCollapsed", plansCollapsed);
          renderPlansVisibility();
        }

        // Функция для отображения состояния свернутости блока "Мои планы"
        function renderPlansVisibility() {
          if (plansContent && plansToggleIcon) {
            if (plansCollapsed) {
              plansContent.classList.add("plans-collapsed");
              plansToggleIcon.textContent = "▶";
            } else {
              plansContent.classList.remove("plans-collapsed");
              plansToggleIcon.textContent = "▼";
            }
          }
        }

        /* ===== render functions ===== */
        function renderPlanSelect() {
          if (!planSelect) return;
          planSelect.innerHTML = "";
          plans.forEach((p) => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name;
            if (p.id === currentPlanId) opt.selected = true;
            planSelect.appendChild(opt);
          });
        }

        function renderMuscleGroups() {
          if (!muscleGroups) return;
          muscleGroups.innerHTML = "";
          MUSCLE_GROUPS.forEach((muscle) => {
            const groupContainer = document.createElement("div");
            groupContainer.className = "muscle-group-container";

            const el = document.createElement("div");
            el.className = "muscle-group";
            el.innerHTML = `
          <span>${muscle}</span>
          <span class="muscle-group-icon">▼</span>
        `;

            const exercisesContainer = document.createElement("div");
            exercisesContainer.className = "exercises-list";
            exercisesContainer.id = `exercises-${muscle}`;

            el.addEventListener("click", () => {
              const isOpen = exercisesContainer.classList.contains("active");

              // Закрываем все другие открытые группы
              document.querySelectorAll(".exercises-list").forEach((item) => {
                if (item.id !== `exercises-${muscle}`) {
                  item.classList.remove("active");
                }
              });

              document.querySelectorAll(".muscle-group").forEach((item) => {
                if (item !== el) {
                  item.classList.remove("active");
                }
              });

              // Переключаем текущую группу
              exercisesContainer.classList.toggle("active");
              el.classList.toggle("active");

              // Если открываем, рендерим упражнения
              if (
                exercisesContainer.classList.contains("active") &&
                exercisesContainer.children.length === 0
              ) {
                renderExercisesForMuscleGroup(muscle, exercisesContainer);
              }
            });

            groupContainer.appendChild(el);
            groupContainer.appendChild(exercisesContainer);
            muscleGroups.appendChild(groupContainer);
          });
        }

        function renderExercisesForMuscleGroup(muscleGroup, container) {
          if (!container) return;
          container.innerHTML = "";

          if (!EXERCISES_BY_MUSCLE || !EXERCISES_BY_MUSCLE[muscleGroup]) {
            container.innerHTML =
              '<div class="empty">Нет упражнений для этой группы</div>';
            return;
          }

          EXERCISES_BY_MUSCLE[muscleGroup].forEach((exercise, index) => {
            const el = document.createElement("div");
            el.className = "exercise-item";
            el.style.transitionDelay = `${index * 0.05}s`;
            el.innerHTML = `
          <div class="exercise-info">
            <strong>${escapeHtml(exercise.name)}</strong>
            <div class="exercise-muscle">${escapeHtml(exercise.type)}</div>
          </div>
          <button class="add-exercise-btn" title="Добавить упражнение">➕</button>
        `;

            el.querySelector(".add-exercise-btn").addEventListener(
              "click",
              () => {
                const day = getCurrentDay();
                if (!day) {
                  showAlert("Выберите день");
                  return;
                }
                day.exercises.push({
                  id: uid(),
                  name: exercise.name,
                  notes: "",
                  type: exercise.type,
                  defaults: "",
                  muscle: muscleGroup,
                });
                trainingUiState.lastAddedExerciseId =
                  day.exercises[day.exercises.length - 1].id;
                savePlans(plans);
                renderCurrentDay();
                renderDays();
                renderSummary();
                showAlert(`Упражнение "${exercise.name}" добавлено в день`);
              }
            );

            container.appendChild(el);
          });
        }

        function renderDays() {
          if (!dayList) return;
          const pl = getCurrentPlan();
          dayList.innerHTML = "";
          if (!pl) return;

          pl.days.forEach((d, i) => {
            const el = document.createElement("div");
            el.className = "day" + (i === currentDayIndex ? " active" : "");
            el.innerHTML = `
          <div>
            <strong>День ${i + 1}${
              d.name ? " — " + escapeHtml(d.name) : ""
            }</strong>
            <div class="muted small">${
              (d.exercises || []).length
            } упражнений</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="edit-day" data-i="${i}" title="Переименовать">✏️</button>
            <button class="del-day" data-i="${i}" title="Удалить">🗑️</button>
          </div>
        `;

            el.addEventListener("click", (ev) => {
              if (ev.target.closest("button")) return;
              switchDayWithSkeleton(i);
            });

            el.querySelector(".edit-day").addEventListener("click", (ev) => {
              ev.stopPropagation();
              editDay(i);
            });

            el.querySelector(".del-day").addEventListener("click", (ev) => {
              ev.stopPropagation();
              showConfirm("Удалить день и все упражнения?", () => {
                pl.days.splice(i, 1);
                if (currentDayIndex >= pl.days.length)
                  currentDayIndex = Math.max(0, pl.days.length - 1);
                savePlans(plans);
                renderAll();
              });
            });

            el.addEventListener("dragover", (e) => {
              e.preventDefault();
              el.classList.add("drop-target");
            });

            el.addEventListener("dragleave", () => {
              el.classList.remove("drop-target");
            });

            el.addEventListener("drop", (e) => {
              e.preventDefault();
              el.classList.remove("drop-target");
              try {
                const payload = JSON.parse(
                  e.dataTransfer.getData("text/plain")
                );
                if (!payload || !payload.fromPlanId || !payload.exId) return;
                if (payload.fromPlanId !== pl.id) {
                  showAlert(
                    "Перемещение между планами не поддерживается. Скопируйте вручную."
                  );
                  return;
                }
                const fromDayIdx = payload.fromDayIdx;
                const fromIdx = payload.fromIdx;
                const moving = pl.days[fromDayIdx].exercises.splice(
                  fromIdx,
                  1
                )[0];
                pl.days[i].exercises.push(moving);
                savePlans(plans);
                renderAll();
              } catch (err) {
                console.warn(err);
              }
            });

            dayList.appendChild(el);
          });

          if (!pl.days || pl.days.length === 0) {
            const info = document.createElement("div");
            info.className = "muted small";
            info.textContent = "Пока нет дней — создайте через поле сверху.";
            dayList.appendChild(info);
          }
        }

        function renderCurrentDay() {
          if (!currentDayTitle || !dayInfo || !exList || !emptyHint) return;

          const day = getCurrentDay();
          if (!day) {
            currentDayTitle.textContent = "Выберите день";
            dayInfo.textContent = "";
            exList.innerHTML = "";
            emptyHint.style.display = "block";
            return;
          }

          currentDayTitle.textContent =
            `День ${currentDayIndex + 1}` + (day.name ? " — " + day.name : "");
          dayInfo.textContent = `Упражнений: ${day.exercises.length}`;
          exList.innerHTML = "";

          if (trainingUiState.daySwitchLoading) {
            emptyHint.style.display = "none";
            exList.innerHTML = `
              <div class="exercise-skeleton">
                <div class="exercise-skeleton-line title"></div>
                <div class="exercise-skeleton-line"></div>
                <div class="exercise-skeleton-line short"></div>
              </div>
              <div class="exercise-skeleton">
                <div class="exercise-skeleton-line title"></div>
                <div class="exercise-skeleton-line"></div>
                <div class="exercise-skeleton-line short"></div>
              </div>
            `;
            return;
          }

          if (!day.exercises || day.exercises.length === 0) {
            emptyHint.style.display = "block";
            return;
          } else {
            emptyHint.style.display = "none";
          }

          day.exercises.forEach((ex, idx) => {
            const el = document.createElement("div");
            el.className = "exercise";
            if (trainingUiState.lastAddedExerciseId === ex.id) {
              el.classList.add("exercise-new");
              setTimeout(() => el.classList.remove("exercise-new"), 800);
            }
            el.draggable = true;
            el.dataset.idx = idx;
            el.dataset.exid = ex.id;

            el.innerHTML = `
          <div class="exercise-content">
            <strong class="ex-name">${escapeHtml(ex.name)}</strong>
            <div class="muted small">${escapeHtml(ex.notes || "")}</div>
            <div class="muted small">Группа: ${escapeHtml(
              ex.muscle || "другое"
            )}</div>
          </div>
          <div class="exercise-actions">
            <div class="pill small">${escapeHtml(ex.type || "силовое")}</div>
            <div style="display:flex;gap:6px">
              <button class="btn-view" data-e="${idx}" title="График">График</button>
              <button class="btn-remove" data-e="${idx}" title="Удалить">Удалить</button>
            </div>
          </div>
        `;

            // Обработчик на всю карточку для просмотра графиков
            el.querySelector(".exercise-content").addEventListener(
              "click",
              (ev) => {
                // Проверяем, активна ли вкладка календаря
                const calendarTab = document.querySelector(
                  '.right .tab[data-tab="calendar"]'
                );
                if (calendarTab && calendarTab.classList.contains("active")) {
                  // Переключаем на вкладку прогресса
                  const progressTab = document.querySelector(
                    '.right .tab[data-tab="progress"]'
                  );
                  if (progressTab) {
                    progressTab.click();
                  }
                }

                selectedExerciseRef = {
                  planId: currentPlanId,
                  dayIdx: currentDayIndex,
                  exId: ex.id,
                };
                showChartsForExercise(ex);
              }
            );

            el.querySelector(".btn-view").addEventListener("click", (ev) => {
              ev.stopPropagation();
              // Проверяем, активна ли вкладка календаря
              const calendarTab = document.querySelector(
                '.right .tab[data-tab="calendar"]'
              );
              if (calendarTab && calendarTab.classList.contains("active")) {
                // Переключаем на вкладку прогресса
                const progressTab = document.querySelector(
                  '.right .tab[data-tab="progress"]'
                );
                if (progressTab) {
                  progressTab.click();
                }
              }

              selectedExerciseRef = {
                planId: currentPlanId,
                dayIdx: currentDayIndex,
                exId: ex.id,
              };
              showChartsForExercise(ex);
            });

            el.querySelector(".btn-remove").addEventListener("click", (ev) => {
              ev.stopPropagation();
              showConfirm("Удалить упражнение?", () => {
                day.exercises.splice(idx, 1);
                savePlans(plans);
                renderCurrentDay();
                renderDays();
                renderSummary();
                renderMuscleStats();
              });
            });

            el.addEventListener("dragstart", (e) => {
              const payload = {
                fromPlanId: currentPlanId,
                fromDayIdx: currentDayIndex,
                fromIdx: idx,
                exId: ex.id,
              };
              e.dataTransfer.setData("text/plain", JSON.stringify(payload));
              e.dataTransfer.effectAllowed = "move";
              el.classList.add("dragging");
            });

            el.addEventListener("dragend", () => {
              el.classList.remove("dragging");
            });

            exList.appendChild(el);
          });

          exList.ondragover = (e) => {
            e.preventDefault();
          };

          exList.ondrop = (e) => {
            e.preventDefault();
            try {
              const payload = JSON.parse(e.dataTransfer.getData("text/plain"));
              if (!payload || !payload.exId) return;
              const fromPlanId = payload.fromPlanId;
              const fromDayIdx = payload.fromDayIdx;
              const fromIdx = payload.fromIdx;
              const pl = getCurrentPlan();
              const dropTarget = e.target.closest(".exercise");
              let toIdx;
              const children = Array.from(exList.children);
              if (!dropTarget)
                toIdx = pl.days[currentDayIndex].exercises.length;
              else {
                const targetIdx = children.indexOf(dropTarget);
                const rect = dropTarget.getBoundingClientRect();
                const after = e.clientY > rect.top + rect.height / 2;
                toIdx = after ? targetIdx + 1 : targetIdx;
              }

              if (fromPlanId !== currentPlanId) {
                showAlert(
                  "Перемещение между планами не поддерживается. Скопируйте вручную."
                );
                return;
              }
              const moving = pl.days[fromDayIdx].exercises.splice(
                fromIdx,
                1
              )[0];
              let insertIdx = toIdx;
              if (fromDayIdx === currentDayIndex && fromIdx < toIdx)
                insertIdx = toIdx - 1;
              pl.days[currentDayIndex].exercises.splice(insertIdx, 0, moving);
              savePlans(plans);
              renderAll();
            } catch (err) {
              console.warn(err);
            }
          };

          if (trainingUiState.lastAddedExerciseId) {
            const addedCard = exList.querySelector(
              `[data-exid="${trainingUiState.lastAddedExerciseId}"]`
            );
            if (addedCard) {
              addedCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
            setTimeout(() => {
              trainingUiState.lastAddedExerciseId = null;
            }, 900);
          }
        }

        function switchDayWithSkeleton(nextIndex) {
          currentDayIndex = nextIndex;
          trainingUiState.daySwitchLoading = true;
          renderLeftPanel();
          setTimeout(() => {
            trainingUiState.daySwitchLoading = false;
            renderCurrentDay();
          }, 220);
        }

        function renderSummary() {
          if (!planSummary) return;
          const pl = getCurrentPlan();
          if (!pl) {
            planSummary.textContent = "Нет плана";
            return;
          }
          const total = pl.days.reduce(
            (s, d) => s + (d.exercises || []).length,
            0
          );
          planSummary.textContent = `План: ${pl.name || "—"} · Дни: ${
            pl.days.length
          } · Упражнений: ${total}`;
        }

        /* ===== UI actions ===== */
        if (newPlanBtn) {
          newPlanBtn.addEventListener("click", () => {
            const id = uid();
            plans.push({ id, name: "Новый план", days: [] });
            currentPlanId = id;
            currentDayIndex = 0;
            savePlans(plans);
            renderAll();
          });
        }

        if (deletePlanBtn) {
          deletePlanBtn.addEventListener("click", () => {
            if (!currentPlanId) return;
            showConfirm("Удалить текущий план?", () => {
              plans = plans.filter((p) => p.id !== currentPlanId);
              currentPlanId = plans.length ? plans[0].id : null;
              currentDayIndex = 0;
              savePlans(plans);
              renderAll();
            });
          });
        }

        if (planSelect) {
          planSelect.addEventListener("change", () => {
            currentPlanId = planSelect.value;
            currentDayIndex = 0;
            shouldUpdateMuscleStats = true;
            renderAll();
          });
        }

        if (savePlanBtn) {
          savePlanBtn.addEventListener("click", () => {
            const pl = getCurrentPlan();
            if (!pl) return;
            pl.name = planNameInput.value || pl.name;
            savePlans(plans);
            renderPlanSelect();
            renderSummary();
            showAlert("План сохранён");
          });
        }

        if (createDaysBtn) {
          createDaysBtn.addEventListener("click", () => {
            const n = parseInt(daysCountInput.value);
            if (isNaN(n) || n <= 0) {
              showAlert("Введите число дней >= 1");
              return;
            }
            const pl = getCurrentPlan();
            if (!pl) return;
            for (let i = 0; i < n; i++)
              pl.days.push({ name: "", exercises: [] });
            savePlans(plans);
            renderAll();
          });
        }

        // Обработчик для кнопки выбора программ
        if (showProgramsBtn) {
          showProgramsBtn.addEventListener("click", showProgramSelection);
        }

        if (addExerciseBtn) {
          addExerciseBtn.addEventListener("click", () => {
            const day = getCurrentDay();
            if (!day) {
              showAlert("Выберите день");
              return;
            }
            const html = `
          <h3>Добавить упражнение</h3>
          <datalist id="exerciseNameSuggestions">${getExerciseNameSuggestions()
            .map((name) => `<option value="${escapeHtml(name)}"></option>`)
            .join("")}</datalist>
          <div class="form-row"><input id="modal_ex_name" list="exerciseNameSuggestions" placeholder="Название (напр. Жим лёжа)" /></div>
          <div class="form-row"><input id="modal_ex_notes" placeholder="Заметки (опционально)" /></div>
          <div class="form-row">
            <select id="modal_ex_type"><option value="силовое">Силовое</option><option value="кардио">Кардио</option><option value="другое">Другое</option></select>
            <input id="modal_ex_defaults" placeholder="Пример: 3x8 (опционально)" />
          </div>
          <div class="form-row">
            <label class="muted small" style="align-self:center;margin-right:8px;">Группа мышц:</label>
            <select id="modal_ex_muscle">
              <option value="грудь">Грудь</option>
              <option value="спина">Спина</option>
              <option value="ноги">Ноги</option>
              <option value="плечи">Плечи</option>
              <option value="бицепс">Бицепс</option>
              <option value="трицепс">Трицепс</option>
              <option value="пресс">Пресс</option>
              <option value="предплечье">Предплечье</option>
              <option value="кардио">Кардио</option>
              <option value="другое">Другое</option>
            </select>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;"><button id="cancelAdd">Отмена</button><button id="confirmAdd">Добавить</button></div>
        `;
            openModal(html);

            setTimeout(() => {
              const cancelBtn = document.getElementById("cancelAdd");
              const confirmBtn = document.getElementById("confirmAdd");
              if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
              if (confirmBtn) {
                confirmBtn.addEventListener("click", () => {
                  const name = document
                    .getElementById("modal_ex_name")
                    .value.trim();
                  if (!name) {
                    showAlert("Введите название упражнения");
                    return;
                  }
                  const notes = document
                    .getElementById("modal_ex_notes")
                    .value.trim();
                  const type = document.getElementById("modal_ex_type").value;
                  const defaults = document
                    .getElementById("modal_ex_defaults")
                    .value.trim();
                  const muscle =
                    document.getElementById("modal_ex_muscle").value ||
                    "другое";
                  day.exercises.push({
                    id: uid(),
                    name,
                    notes,
                    type,
                    defaults,
                    muscle,
                  });
                  trainingUiState.lastAddedExerciseId =
                    day.exercises[day.exercises.length - 1].id;
                  savePlans(plans);
                  closeModal();
                  renderAll();
                  renderMuscleStats();
                });
              }
            }, 0);
          });
        }

        /* ===== edit day ===== */
        function editDay(i) {
          const pl = getCurrentPlan();
          if (!pl) return;
          const d = pl.days[i];
          const html = `
        <h3>Переименовать день</h3>
        <div class="form-row"><input id="modal_day_name" placeholder="Например: Грудь/Трицепс" value="${escapeHtml(
          d.name || ""
        )}" style="flex:1"/></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
          <button id="cancelDay">Отмена</button>
          <button id="saveDay">Сохранить</button>
        </div>
      `;
          openModal(html);

          setTimeout(() => {
            const cancelBtn = document.getElementById("cancelDay");
            const saveBtn = document.getElementById("saveDay");
            if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
            if (saveBtn) {
              saveBtn.addEventListener("click", () => {
                d.name = document.getElementById("modal_day_name").value.trim();
                savePlans(plans);
                closeModal();
                renderAll();
              });
            }
          }, 0);
        }

        if (startWorkoutBtn) {
          startWorkoutBtn.addEventListener("click", () => {
            openStartWorkoutModal();
          });
        }

        /* ===== workout logging ===== */
        function openLogExercise(dayIdx, exIdx) {
          const pl = getCurrentPlan();
          if (!pl) return;
          const ex = pl.days[dayIdx].exercises[exIdx];
          if (!ex) return;
          const html = `
        <h3>Запись: ${escapeHtml(ex.name)}</h3>
        <div class="muted small">Дата: <input type="date" id="modal_w_date" value="${new Date()
          .toISOString()
          .slice(0, 10)}" /></div>
        <div style="margin-top:12px"><div class="muted small">Добавьте подходы (вес и повторения). Нажмите + чтобы добавить ещё подход.</div></div>
        <div id="modal_sets_area" style="margin-top:10px;display:flex;flex-direction:column;gap:8px"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
          <button id="modal_add_set">+ Добавить подход</button>
          <div style="display:flex;gap:8px"><button id="modal_cancel_log">Отмена</button><button id="modal_save_log">Сохранить</button></div>
        </div>
      `;
          openModal(html);

          setTimeout(() => {
            const setsArea = document.getElementById("modal_sets_area");

            function addSet(pref) {
              const remembered = pref || getLastSetForExercise(ex.name) || null;
              const row = document.createElement("div");
              row.className = "form-row";
              row.innerHTML = `<input placeholder="Вес (кг)" class="w"/><input placeholder="Повторения" class="r"/><input placeholder="Комментарий" class="c"/><button class="del">✖</button>`;
              setsArea.appendChild(row);
              if (remembered) {
                row.querySelector(".w").value = remembered.w || "";
                row.querySelector(".r").value = remembered.r || "";
                row.querySelector(".c").value = remembered.c || "";
              }
              row
                .querySelector(".del")
                .addEventListener("click", () => row.remove());
            }

            const addSetBtn = document.getElementById("modal_add_set");
            const cancelBtn = document.getElementById("modal_cancel_log");
            const saveBtn = document.getElementById("modal_save_log");

            if (addSetBtn) addSetBtn.addEventListener("click", () => addSet());
            if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

            if (saveBtn) {
              saveBtn.addEventListener("click", () => {
                const date = document.getElementById("modal_w_date").value;
                if (!date) {
                  showAlert("Выберите дату");
                  return;
                }
                const sets = Array.from(setsArea.children)
                  .map((r) => ({
                    w: parseFloat(r.querySelector(".w").value) || 0,
                    r: parseInt(r.querySelector(".r").value) || 0,
                    c: r.querySelector(".c").value || "",
                  }))
                  .filter((s) => s.r > 0 || s.w > 0);
                if (sets.length === 0) {
                  showAlert(
                    "Добавьте хотя бы один подход с весом или повторениями"
                  );
                  return;
                }

                const currentWorkouts = getWorkoutsForCurrentPlan();
                currentWorkouts.push({
                  workoutId: uid(),
                  date,
                  planId: currentPlanId,
                  dayIdx,
                  exId: ex.id,
                  exName: ex.name,
                  muscle: ex.muscle || "другое",
                  sets,
                });
                saveWorkoutsForCurrentPlan(currentWorkouts);
                rememberLastSetForExercise(ex.name, sets[sets.length - 1]);

                let gained = 0;
                try {
                  gained = sets.length * 5;
                  if (gained > 0) {
                    window.AppModules?.avatar?.grantXp?.("workout", gained, {
                      unitsAdded: sets.length,
                    });
                  }
                } catch (_e) { /* no-op */ }

                closeModal();
                if (gained <= 0) showAlert("Запись сохранена");
                updateMuscleStats();
                if (selectedExerciseRef && selectedExerciseRef.exId === ex.id)
                  showChartsForExercise(ex);
              });
            }

            addSet();
          }, 0);
        }

        /* ===== start workout modal (NEW IMPROVED VERSION) ===== */
        function openStartWorkoutModal() {
          const day = getCurrentDay();
          if (!day) {
            showAlert("Выберите день");
            return;
          }

          // Массив для хранения всех упражнений тренировки (по плану и не по плану)
          const workoutExercises = [
            ...day.exercises.map((ex) => ({
              ...ex,
              isCustom: false,
              sets: [],
            })),
          ];
          const sanitizeSet = (set) => ({
            w: parseFloat(set?.w) || 0,
            r: parseInt(set?.r) || 0,
            c: String(set?.c || "").trim(),
          });

          const htmlParts = [];
          htmlParts.push(`<h3>Тренировка — День ${currentDayIndex + 1}</h3>`);
          htmlParts.push(`
        <div class="muted small">
          Дата: <input type="date" id="modal_w_date_all" value="${new Date()
            .toISOString()
            .slice(0, 10)}" />
        </div>
        <div id="workoutExercisesContainer" style="margin-top: 12px; max-height: 50vh; overflow-y: auto;">
      `);

          // Функция для рендеринга списка упражнений
          function renderWorkoutExercises() {
            const container = document.getElementById(
              "workoutExercisesContainer"
            );
            if (!container) return;

            container.innerHTML = "";

            workoutExercises.forEach((ex, idx) => {
              const exerciseDiv = document.createElement("div");
              exerciseDiv.className = "workout-exercise-item";
              exerciseDiv.style.marginBottom = "15px";
              exerciseDiv.style.padding = "12px";
              exerciseDiv.style.borderRadius = "8px";
              exerciseDiv.style.background = "rgba(255,255,255,0.02)";
              exerciseDiv.style.border = "1px solid rgba(255,255,255,0.05)";

              exerciseDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <strong>${escapeHtml(ex.name)}</strong>
                            ${
                              ex.isCustom
                                ? '<span class="custom-exercise-badge" style="margin-left: 8px;">не по плану</span>'
                                : ""
                            }
                            <div class="muted small">Группа: ${escapeHtml(
                              ex.muscle || "другое"
                            )}</div>
                        </div>
                        ${
                          ex.isCustom
                            ? `<button class="remove-custom-exercise" data-index="${idx}" style="background: rgba(217,83,79,0.1); border: 1px solid rgba(217,83,79,0.3); color: #d9534f; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Удалить</button>`
                            : ""
                        }
                    </div>
                    <div id="sets_for_${idx}" style="margin-bottom: 10px;"></div>
                    <button class="add-set-btn" data-index="${idx}" style="background: rgba(124,92,255,0.1); border: 1px solid rgba(124,92,255,0.3); color: var(--accent); padding: 6px 12px; border-radius: 6px; cursor: pointer;">+ Добавить подход</button>
                `;

              container.appendChild(exerciseDiv);

              // Рендерим существующие подходы
              const setsContainer = document.getElementById(`sets_for_${idx}`);
              ex.sets.forEach((set, setIndex) => {
                const setRow = document.createElement("div");
                setRow.className = "form-row";
                setRow.style.marginBottom = "5px";
                setRow.innerHTML = `
                        <input placeholder="Вес (кг)" class="w" value="${
                          set.w || ""
                        }" style="flex: 1;">
                        <input placeholder="Повторения" class="r" value="${
                          set.r || ""
                        }" style="flex: 1;">
                        <input placeholder="Комментарий" class="c" value="${
                          set.c || ""
                        }" style="flex: 2;">
                        <button class="del-set" style="background: rgba(217,83,79,0.1); border: 1px solid rgba(217,83,79,0.3); color: #d9534f; padding: 6px; border-radius: 4px; cursor: pointer;">✖</button>
                    `;
                setsContainer.appendChild(setRow);

                setRow
                  .querySelector(".del-set")
                  .addEventListener("click", () => {
                    ex.sets.splice(setIndex, 1);
                    renderWorkoutExercises();
                  });

                const wInput = setRow.querySelector(".w");
                const rInput = setRow.querySelector(".r");
                const cInput = setRow.querySelector(".c");
                const syncSet = () => {
                  ex.sets[setIndex] = sanitizeSet({
                    w: wInput.value,
                    r: rInput.value,
                    c: cInput.value,
                  });
                };
                wInput.addEventListener("input", syncSet);
                rInput.addEventListener("input", syncSet);
                cInput.addEventListener("input", syncSet);
              });

              // Обработчик для кнопки добавления подхода
              exerciseDiv
                .querySelector(".add-set-btn")
                .addEventListener("click", () => {
                  const remembered = getLastSetForExercise(ex.name);
                  ex.sets.push({
                    w: remembered?.w || 0,
                    r: remembered?.r || 0,
                    c: "",
                  });
                  renderWorkoutExercises();
                });

              // Обработчик для удаления кастомного упражнения
              if (ex.isCustom) {
                exerciseDiv
                  .querySelector(".remove-custom-exercise")
                  .addEventListener("click", () => {
                    workoutExercises.splice(idx, 1);
                    renderWorkoutExercises();
                  });
              }
            });
          }

          htmlParts.push(`</div>`);

          // Кнопка добавления упражнения не по плану
          htmlParts.push(`
            <div style="margin-top: 15px; display: flex; justify-content: center;">
                <button id="addCustomExerciseWorkout" style="background: rgba(63,224,197,0.1); border: 1px solid rgba(63,224,197,0.3); color: var(--accent2); padding: 10px 16px; border-radius: 8px; cursor: pointer;">
                    + Добавить упражнение не по плану
                </button>
            </div>
        `);

          htmlParts.push(
            '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button id="modal_cancel_all">Отмена</button><button id="modal_save_all">Сохранить тренировку</button></div>'
          );

          openModal(htmlParts.join(""));

          // Первоначальный рендеринг упражнений
          setTimeout(() => {
            renderWorkoutExercises();

            // Обработчик для добавления упражнения не по плану
            document
              .getElementById("addCustomExerciseWorkout")
              .addEventListener("click", () => {
                // Вместо автоматического добавления, открываем форму для ввода
                const customExerciseForm = document.createElement("div");
                customExerciseForm.className = "custom-exercise-form";
                customExerciseForm.innerHTML = `
                <h4>Добавить упражнение не по плану</h4>
                <datalist id="customExerciseNameSuggestions">${getExerciseNameSuggestions()
                  .map((name) => `<option value="${escapeHtml(name)}"></option>`)
                  .join("")}</datalist>
                <div class="form-row">
                  <input id="custom_ex_name" list="customExerciseNameSuggestions" placeholder="Название упражнения" style="flex: 2;">
                  <select id="custom_ex_muscle" style="flex: 1;">
                    <option value="грудь">Грудь</option>
                    <option value="спина">Спина</option>
                    <option value="ноги">Ноги</option>
                    <option value="плечи">Плечи</option>
                    <option value="бицепс">Бицепс</option>
                    <option value="трицепс">Трицепс</option>
                    <option value="пресс">Пресс</option>
                    <option value="предплечье">Предплечье</option>
                    <option value="кардио">Кардио</option>
                    <option value="другое">Другое</option>
                  </select>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                  <button id="confirmCustomExercise" style="background: rgba(63,224,197,0.2); border: 1px solid rgba(63,224,197,0.4); color: var(--accent2); padding: 6px 12px; border-radius: 6px; cursor: pointer;">Добавить</button>
                  <button id="cancelCustomExercise" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--muted); padding: 6px 12px; border-radius: 6px; cursor: pointer;">Отмена</button>
                </div>
              `;

                const workoutContainer = document.getElementById(
                  "workoutExercisesContainer"
                );
                workoutContainer.appendChild(customExerciseForm);

                document
                  .getElementById("confirmCustomExercise")
                  .addEventListener("click", () => {
                    const name = document
                      .getElementById("custom_ex_name")
                      .value.trim();
                    const muscle =
                      document.getElementById("custom_ex_muscle").value;

                    if (!name) {
                      showAlert("Введите название упражнения");
                      return;
                    }

                    const customExercise = {
                      id: uid(),
                      name: name,
                      notes: "",
                      type: "силовое",
                      muscle: muscle,
                      isCustom: true,
                      sets: [],
                    };

                    workoutExercises.push(customExercise);
                    customExerciseForm.remove();
                    renderWorkoutExercises();
                  });

                document
                  .getElementById("cancelCustomExercise")
                  .addEventListener("click", () => {
                    customExerciseForm.remove();
                  });
              });

            const cancelBtn = document.getElementById("modal_cancel_all");
            const saveBtn = document.getElementById("modal_save_all");

            if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

            if (saveBtn) {
              saveBtn.addEventListener("click", () => {
                const date = document.getElementById("modal_w_date_all").value;
                if (!date) {
                  showAlert("Выберите дату");
                  return;
                }

                // Фильтруем упражнения, у которых есть хотя бы один подход
                const exercisesWithSets = workoutExercises.filter(
                  (ex) =>
                    ex.sets.length > 0 &&
                    ex.sets.some((set) => {
                      const normalized = sanitizeSet(set);
                      return normalized.r > 0 || normalized.w > 0;
                    })
                );

                if (exercisesWithSets.length === 0) {
                  showAlert("Нет записанных подходов");
                  return;
                }

                const currentWorkouts = getWorkoutsForCurrentPlan();

                exercisesWithSets.forEach((ex) => {
                  const validSets = ex.sets
                    .map((set) => sanitizeSet(set))
                    .filter((set) => set.r > 0 || set.w > 0);
                  if (validSets.length > 0) {
                    currentWorkouts.push({
                      workoutId: uid(),
                      date,
                      planId: currentPlanId,
                      dayIdx: ex.isCustom ? -1 : currentDayIndex,
                      exId: ex.id,
                      exName: ex.name,
                      muscle: ex.muscle || "другое",
                      sets: validSets,
                      isCustom: ex.isCustom,
                    });
                    rememberLastSetForExercise(
                      ex.name,
                      validSets[validSets.length - 1]
                    );
                  }
                });

                saveWorkoutsForCurrentPlan(currentWorkouts);

                let gained = 0;
                try {
                  const workoutSetsCount = exercisesWithSets.reduce((sum, ex) => {
                    const valid = (ex.sets || [])
                      .map((set) => sanitizeSet(set))
                      .filter((set) => set.r > 0 || set.w > 0);
                    return sum + valid.length;
                  }, 0);
                  gained = workoutSetsCount * 5;
                  if (gained > 0) {
                    window.AppModules?.avatar?.grantXp?.("workout", gained, {
                      unitsAdded: workoutSetsCount,
                    });
                  }
                } catch (_e) { /* no-op */ }

                closeModal();
                if (gained <= 0) showAlert("Тренировка сохранена");
                updateMuscleStats();

                if (selectedExerciseRef) {
                  const pl = getCurrentPlan();
                  const ex = pl.days[selectedExerciseRef.dayIdx].exercises.find(
                    (x) => x.id === selectedExerciseRef.exId
                  );
                  if (ex) showChartsForExercise(ex);
                }
              });
            }
          }, 0);
        }

        /* ===== charts for exercise ===== */
        function showChartsForExercise(ex) {
          if (!chartsArea) return;

          if (typeof window.Chart !== "function") {
            chartsArea.innerHTML = `
              <div class="empty">
                Библиотека графиков загружается. Попробуйте открыть упражнение снова через пару секунд.
              </div>
            `;
            ensureChartJsLoaded().then((ok) => {
              if (ok) showChartsForExercise(ex);
            });
            return;
          }

          chartsArea.innerHTML = "";
          const wrapper = document.createElement("div");
          wrapper.innerHTML = `
        <h3>${escapeHtml(ex.name)}</h3>
        <div class="muted small">Графики: максимум веса по датам и общий объём (вес×повторы)</div>
        <canvas id="c1" style="margin-top:12px;max-height:240px"></canvas>
        <canvas id="c2" style="margin-top:12px;max-height:240px"></canvas>
      `;
          chartsArea.appendChild(wrapper);

          const currentWorkouts = getWorkoutsForCurrentPlan();
          const rows = currentWorkouts
            .filter((w) => w.exId === ex.id)
            .sort((a, b) => a.date.localeCompare(b.date));
          if (rows.length === 0) {
            chartsArea.appendChild(
              Object.assign(document.createElement("div"), {
                className: "empty",
                textContent: "Нет записей для этого упражнения",
              })
            );
            renderMuscleStats();
            return;
          }
          const grouped = {};
          rows.forEach((r) => {
            if (!grouped[r.date]) grouped[r.date] = [];
            grouped[r.date].push(r);
          });
          const dates = Object.keys(grouped).sort();
          const maxWeights = dates.map((d) => {
            let max = 0;
            grouped[d].forEach((rec) =>
              rec.sets.forEach((s) => {
                if (s.w > max) max = s.w;
              })
            );
            return max;
          });
          const volumes = dates.map((d) => {
            let vol = 0;
            grouped[d].forEach((rec) =>
              rec.sets.forEach((s) => {
                vol += (s.w || 0) * (s.r || 0);
              })
            );
            return Math.round(vol);
          });

          const ctx1 = document.getElementById("c1").getContext("2d");
          const ctx2 = document.getElementById("c2").getContext("2d");
          if (chart1) chart1.destroy();
          if (chart2) chart2.destroy();
          chart1 = new Chart(ctx1, {
            type: "line",
            data: {
              labels: dates,
              datasets: [
                {
                  label: "Макс. вес (кг)",
                  data: maxWeights,
                  tension: 0.25,
                  fill: false,
                },
              ],
            },
            options: {
              plugins: { legend: { display: true } },
              scales: { x: { ticks: { maxRotation: 30, minRotation: 0 } } },
            },
          });
          chart2 = new Chart(ctx2, {
            type: "bar",
            data: {
              labels: dates,
              datasets: [{ label: "Общий объём (кг)", data: volumes }],
            },
            options: {
              plugins: { legend: { display: true } },
              scales: { x: { ticks: { maxRotation: 30, minRotation: 0 } } },
            },
          });

          renderMuscleStats();
        }

        /* ===== muscle stats ===== */
        function renderMuscleStats() {
          const container = document.getElementById("muscleStatsContainer");
          if (!container) return;

          if (typeof window.Chart !== "function") {
            container.innerHTML = `
              <div class="empty">
                Диаграмма пока недоступна: загружаем библиотеку графиков.
              </div>
            `;
            ensureChartJsLoaded().then((ok) => {
              if (ok && currentRightPanelTab === "progress") {
                renderMuscleStats();
              }
            });
            return;
          }

          const stats = {};
          MUSCLE_GROUPS.forEach((m) => (stats[m] = 0));

          const currentWorkouts = getWorkoutsForCurrentPlan();

          // Подсчет подходов по группам мышц ЗА ТЕКУЩУЮ НЕДЕЛЮ
          currentWorkouts.forEach((w) => {
            if (isInCurrentWeek(w.date)) {
              const muscle = w.muscle || "другое";
              if (MUSCLE_GROUPS.includes(muscle)) {
                stats[muscle] += w.sets.length;
              } else {
                stats["другое"] += w.sets.length;
              }
            }
          });

          container.innerHTML = `
        <div class="muted small" style="margin-bottom: 10px;">Подходы за текущую неделю</div>
        <canvas id="muscleChart" style="max-height: 200px;"></canvas>
      `;

          const ctx = document.getElementById("muscleChart").getContext("2d");

          if (muscleChartInstance) {
            muscleChartInstance.destroy();
          }

          muscleChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
              labels: MUSCLE_GROUPS,
              datasets: [
                {
                  label: "Подходы за неделю",
                  data: MUSCLE_GROUPS.map((m) => stats[m]),
                  backgroundColor: MUSCLE_GROUPS.map(
                    (_, i) =>
                      `hsl(${(i * 360) / MUSCLE_GROUPS.length}, 70%, 50%)`
                  ),
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  display: false,
                },
              },
            },
          });
        }

        /* ===== search handling ===== */
        if (searchEx) {
          searchEx.addEventListener("input", () => {
            const q = searchEx.value.trim().toLowerCase();
            const day = getCurrentDay();
            if (!day) return;
            Array.from(exList.children).forEach((el, i) => {
              const name = (day.exercises[i].name || "").toLowerCase();
              el.style.display = name.includes(q) ? "flex" : "none";
            });
          });

          document.addEventListener("keydown", (event) => {
            if (
              event.key === "/" &&
              !["INPUT", "TEXTAREA", "SELECT"].includes(
                document.activeElement?.tagName
              )
            ) {
              event.preventDefault();
              searchEx.focus();
              searchEx.select();
            }
            if (
              event.key === "Escape" &&
              document.activeElement === searchEx &&
              searchEx.value
            ) {
              searchEx.value = "";
              searchEx.dispatchEvent(new Event("input"));
            }
          });
        }

        /* ===== КАЛЕНДАРЬ ===== */
        function renderCalendar() {
          const calendarEl = document.getElementById("calendar");
          if (!calendarEl) {
            console.error("Calendar element not found");
            return;
          }

          const year = currentCalendarDate.getFullYear();
          const month = currentCalendarDate.getMonth();

          const monthNames = [
            "Январь",
            "Февраль",
            "Март",
            "Апрель",
            "Май",
            "Июнь",
            "Июль",
            "Август",
            "Сентябрь",
            "Октябрь",
            "Ноябрь",
            "Декабрь",
          ];

          let calendarHTML = `
        <div class="calendar-header">
          <button id="prevMonth">‹</button>
          <h4>${monthNames[month]} ${year}</h4>
          <button id="nextMonth">›</button>
        </div>
        <div class="calendar-grid">
          <div class="calendar-day-header">Пн</div>
          <div class="calendar-day-header">Вт</div>
          <div class="calendar-day-header">Ср</div>
          <div class="calendar-day-header">Чт</div>
          <div class="calendar-day-header">Пт</div>
          <div class="calendar-day-header">Сб</div>
          <div class="calendar-day-header">Вс</div>
      `;

          // Первый день месяца
          const firstDay = new Date(year, month, 1);
          // Последний день месяца
          const lastDay = new Date(year, month + 1, 0);
          // День недели первого дня (0 - воскресенье, 1 - понедельник и т.д.)
          let firstDayOfWeek = firstDay.getDay();
          // Преобразуем к формату Пн=0, Вс=6
          firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

          // Дни предыдущего месяца
          const prevMonthLastDay = new Date(year, month, 0).getDate();
          for (let i = 0; i < firstDayOfWeek; i++) {
            const day = prevMonthLastDay - firstDayOfWeek + i + 1;
            calendarHTML += `<div class="calendar-day other-month">${day}</div>`;
          }

          // Дни текущего месяца
          const today = new Date();
          const currentWorkouts = getWorkoutsForCurrentPlan();
          const workoutDates = {};

          // Собираем даты тренировок
          currentWorkouts.forEach((workout) => {
            workoutDates[workout.date] = true;
          });

          for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${year}-${String(month + 1).padStart(
              2,
              "0"
            )}-${String(day).padStart(2, "0")}`;
            const isToday =
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === day;
            const hasWorkout = workoutDates[dateStr];

            let dayClass = "calendar-day";
            if (isToday) dayClass += " today";
            if (hasWorkout) dayClass += " has-workout";

            calendarHTML += `
          <div class="${dayClass}" data-date="${dateStr}">
            ${day}
            ${hasWorkout ? '<div class="workout-dot"></div>' : ""}
          </div>
        `;
          }

          // Дни следующего месяца
          const totalCells = 42; // 6 строк по 7 дней
          const daysInCalendar = firstDayOfWeek + lastDay.getDate();
          const nextMonthDays = totalCells - daysInCalendar;

          for (let day = 1; day <= nextMonthDays; day++) {
            calendarHTML += `<div class="calendar-day other-month">${day}</div>`;
          }

          calendarHTML += "</div>";
          calendarEl.innerHTML = calendarHTML;

          // Обработчики для кнопок навигации
          setTimeout(() => {
            const prevMonthBtn = document.getElementById("prevMonth");
            const nextMonthBtn = document.getElementById("nextMonth");

            if (prevMonthBtn) {
              prevMonthBtn.addEventListener("click", () => {
                currentCalendarDate.setMonth(
                  currentCalendarDate.getMonth() - 1
                );
                renderCalendar();
              });
            }

            if (nextMonthBtn) {
              nextMonthBtn.addEventListener("click", () => {
                currentCalendarDate.setMonth(
                  currentCalendarDate.getMonth() + 1
                );
                renderCalendar();
              });
            }

            // Обработчики для дней календаря
            document
              .querySelectorAll(".calendar-day[data-date]")
              .forEach((dayEl) => {
                dayEl.addEventListener("click", () => {
                  const date = dayEl.dataset.date;
                  showWorkoutsForDate(date);
                });
              });
          }, 0);
        }

        function showWorkoutsForDate(date) {
          const workoutsContainer = document.getElementById("calendarWorkouts");
          if (!workoutsContainer) return;

          const currentWorkouts = getWorkoutsForCurrentPlan();
          const dateWorkouts = currentWorkouts.filter(
            (workout) => workout.date === date
          );

          if (dateWorkouts.length === 0) {
            workoutsContainer.innerHTML = `
          <div class="empty">
            Нет тренировок на ${formatDate(date)}
            <div style="margin-top: 10px;">
              <button id="addWorkoutToDate" data-date="${date}">+ Добавить тренировку</button>
            </div>
          </div>
        `;

            // Добавляем обработчик после рендеринга
            setTimeout(() => {
              const addBtn = document.getElementById("addWorkoutToDate");
              if (addBtn) {
                addBtn.addEventListener("click", (e) => {
                  const selectedDate = e.target.dataset.date;
                  openAddWorkoutForDate(selectedDate);
                });
              }
            }, 0);

            return;
          }

          // Группируем тренировки по мышечным группам
          const workoutsByMuscle = {};
          dateWorkouts.forEach((workout) => {
            const muscle = workout.muscle || "другое";
            if (!workoutsByMuscle[muscle]) {
              workoutsByMuscle[muscle] = [];
            }
            workoutsByMuscle[muscle].push(workout);
          });

          let workoutsHTML = `
        <div class="workout-header">
          <h4>Тренировка на ${formatDate(date)}</h4>
          <div class="workout-actions">
            <button id="addMoreToDate" data-date="${date}">+ Добавить</button>
            <button class="edit-workout" data-date="${date}">✏️</button>
            <button class="delete-workout" data-date="${date}">🗑️</button>
          </div>
        </div>
      `;

          Object.keys(workoutsByMuscle).forEach((muscle) => {
            workoutsHTML += `<h5 style="margin: 15px 0 8px 0;">${muscle}</h5>`;

            workoutsByMuscle[muscle].forEach((workout) => {
              workoutsHTML += `
            <div class="workout-exercise">
              <div>
                <strong>${escapeHtml(workout.exName)}</strong>
                ${
                  workout.isCustom
                    ? '<span class="custom-exercise-badge">не по плану</span>'
                    : ""
                }
              </div>
              <div class="workout-sets">
                ${workout.sets
                  .map(
                    (set) =>
                      `${set.w > 0 ? set.w + "кг × " : ""}${set.r}${
                        set.c ? " (" + set.c + ")" : ""
                      }`
                  )
                  .join(", ")}
              </div>
              <button class="delete-exercise-btn" data-workout-id="${
                workout.workoutId
              }">
                Удалить
              </button>
            </div>
          `;
            });
          });

          workoutsContainer.innerHTML = workoutsHTML;

          // Добавляем обработчики после рендеринга
          setTimeout(() => {
            const addMoreBtn = document.getElementById("addMoreToDate");
            const editBtn = document.querySelector(".edit-workout");
            const deleteBtn = document.querySelector(".delete-workout");
            const deleteExerciseBtns = document.querySelectorAll(
              ".delete-exercise-btn"
            );

            if (addMoreBtn) {
              addMoreBtn.addEventListener("click", (e) => {
                const selectedDate = e.target.dataset.date;
                openAddWorkoutForDate(selectedDate);
              });
            }

            if (editBtn) {
              editBtn.addEventListener("click", (e) => {
                const selectedDate = e.target.dataset.date;
                editWorkout(selectedDate);
              });
            }

            if (deleteBtn) {
              deleteBtn.addEventListener("click", (e) => {
                const selectedDate = e.target.dataset.date;
                deleteWorkout(selectedDate);
              });
            }

            deleteExerciseBtns.forEach((btn) => {
              btn.addEventListener("click", (e) => {
                const workoutId = e.target.dataset.workoutId;
                deleteSingleExercise(workoutId);
              });
            });
          }, 0);
        }

        // ИСПРАВЛЕННАЯ ФУНКЦИЯ: открытие модального окна для добавления тренировки в календаре
        function openAddWorkoutForDate(date) {
          const day = getCurrentDay();
          if (!day) {
            showAlert("Сначала выберите день в плане тренировок");
            return;
          }

          // Создаем массив для упражнений тренировки
          const workoutExercises = [
            ...day.exercises.map((ex) => ({
              ...ex,
              isCustom: false,
              sets: [],
            })),
          ];
          const sanitizeSet = (set) => ({
            w: parseFloat(set?.w) || 0,
            r: parseInt(set?.r) || 0,
            c: String(set?.c || "").trim(),
          });

          const htmlParts = [];
          htmlParts.push(`<h3>Добавить тренировку на ${formatDate(date)}</h3>`);
          htmlParts.push(`
        <div class="muted small">
          Выберите упражнения из текущего дня или добавьте свои
        </div>
        <div id="workoutExercisesContainer" style="margin-top: 12px; max-height: 50vh; overflow-y: auto;">
      `);

          // Функция для рендеринга списка упражнений
          function renderWorkoutExercises() {
            const container = document.getElementById(
              "workoutExercisesContainer"
            );
            if (!container) return;

            container.innerHTML = "";

            workoutExercises.forEach((ex, idx) => {
              const exerciseDiv = document.createElement("div");
              exerciseDiv.className = "workout-exercise-item";
              exerciseDiv.style.marginBottom = "15px";
              exerciseDiv.style.padding = "12px";
              exerciseDiv.style.borderRadius = "8px";
              exerciseDiv.style.background = "rgba(255,255,255,0.02)";
              exerciseDiv.style.border = "1px solid rgba(255,255,255,0.05)";

              exerciseDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <strong>${escapeHtml(ex.name)}</strong>
                            ${
                              ex.isCustom
                                ? '<span class="custom-exercise-badge" style="margin-left: 8px;">не по плану</span>'
                                : ""
                            }
                            <div class="muted small">Группа: ${escapeHtml(
                              ex.muscle || "другое"
                            )}</div>
                        </div>
                        ${
                          ex.isCustom
                            ? `<button class="remove-custom-exercise" data-index="${idx}" style="background: rgba(217,83,79,0.1); border: 1px solid rgba(217,83,79,0.3); color: #d9534f; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Удалить</button>`
                            : ""
                        }
                    </div>
                    <div id="sets_for_${idx}" style="margin-bottom: 10px;"></div>
                    <button class="add-set-btn" data-index="${idx}" style="background: rgba(124,92,255,0.1); border: 1px solid rgba(124,92,255,0.3); color: var(--accent); padding: 6px 12px; border-radius: 6px; cursor: pointer;">+ Добавить подход</button>
                `;

              container.appendChild(exerciseDiv);

              // Рендерим существующие подходы
              const setsContainer = document.getElementById(`sets_for_${idx}`);
              ex.sets.forEach((set, setIndex) => {
                const setRow = document.createElement("div");
                setRow.className = "form-row";
                setRow.style.marginBottom = "5px";
                setRow.innerHTML = `
                        <input placeholder="Вес (кг)" class="w" value="${
                          set.w || ""
                        }" style="flex: 1;">
                        <input placeholder="Повторения" class="r" value="${
                          set.r || ""
                        }" style="flex: 1;">
                        <input placeholder="Комментарий" class="c" value="${
                          set.c || ""
                        }" style="flex: 2;">
                        <button class="del-set" style="background: rgba(217,83,79,0.1); border: 1px solid rgba(217,83,79,0.3); color: #d9534f; padding: 6px; border-radius: 4px; cursor: pointer;">✖</button>
                    `;
                setsContainer.appendChild(setRow);

                setRow
                  .querySelector(".del-set")
                  .addEventListener("click", () => {
                    ex.sets.splice(setIndex, 1);
                    renderWorkoutExercises();
                  });

                const wInput = setRow.querySelector(".w");
                const rInput = setRow.querySelector(".r");
                const cInput = setRow.querySelector(".c");
                const syncSet = () => {
                  ex.sets[setIndex] = sanitizeSet({
                    w: wInput.value,
                    r: rInput.value,
                    c: cInput.value,
                  });
                };
                wInput.addEventListener("input", syncSet);
                rInput.addEventListener("input", syncSet);
                cInput.addEventListener("input", syncSet);
              });

              // Обработчик для кнопки добавления подхода
              exerciseDiv
                .querySelector(".add-set-btn")
                .addEventListener("click", () => {
                  ex.sets.push({ w: 0, r: 0, c: "" });
                  renderWorkoutExercises();
                });

              // Обработчик для удаления кастомного упражнения
              if (ex.isCustom) {
                exerciseDiv
                  .querySelector(".remove-custom-exercise")
                  .addEventListener("click", () => {
                    workoutExercises.splice(idx, 1);
                    renderWorkoutExercises();
                  });
              }
            });
          }

          htmlParts.push(`</div>`);

          // Кнопка добавления упражнения не по плану
          htmlParts.push(`
            <div style="margin-top: 15px; display: flex; justify-content: center;">
                <button id="addCustomExerciseWorkout" style="background: rgba(63,224,197,0.1); border: 1px solid rgba(63,224,197,0.3); color: var(--accent2); padding: 10px 16px; border-radius: 8px; cursor: pointer;">
                    + Добавить упражнение не по плану
                </button>
            </div>
        `);

          htmlParts.push(
            '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button id="modal_cancel_all">Отмена</button><button id="modal_save_all">Сохранить тренировку</button></div>'
          );

          openModal(htmlParts.join(""));

          // Первоначальный рендеринг упражнений
          setTimeout(() => {
            renderWorkoutExercises();

            // Обработчик для добавления упражнения не по плану
            document
              .getElementById("addCustomExerciseWorkout")
              .addEventListener("click", () => {
                // Вместо автоматического добавления, открываем форму для ввода
                const customExerciseForm = document.createElement("div");
                customExerciseForm.className = "custom-exercise-form";
                customExerciseForm.innerHTML = `
                <h4>Добавить упражнение не по плану</h4>
                <div class="form-row">
                  <input id="custom_ex_name" placeholder="Название упражнения" style="flex: 2;">
                  <select id="custom_ex_muscle" style="flex: 1;">
                    <option value="грудь">Грудь</option>
                    <option value="спина">Спина</option>
                    <option value="ноги">Ноги</option>
                    <option value="плечи">Плечи</option>
                    <option value="бицепс">Бицепс</option>
                    <option value="трицепс">Трицепс</option>
                    <option value="пресс">Пресс</option>
                    <option value="предплечье">Предплечье</option>
                    <option value="кардио">Кардио</option>
                    <option value="другое">Другое</option>
                  </select>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                  <button id="confirmCustomExercise" style="background: rgba(63,224,197,0.2); border: 1px solid rgba(63,224,197,0.4); color: var(--accent2); padding: 6px 12px; border-radius: 6px; cursor: pointer;">Добавить</button>
                  <button id="cancelCustomExercise" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--muted); padding: 6px 12px; border-radius: 6px; cursor: pointer;">Отмена</button>
                </div>
              `;

                const workoutContainer = document.getElementById(
                  "workoutExercisesContainer"
                );
                workoutContainer.appendChild(customExerciseForm);

                document
                  .getElementById("confirmCustomExercise")
                  .addEventListener("click", () => {
                    const name = document
                      .getElementById("custom_ex_name")
                      .value.trim();
                    const muscle =
                      document.getElementById("custom_ex_muscle").value;

                    if (!name) {
                      showAlert("Введите название упражнения");
                      return;
                    }

                    const customExercise = {
                      id: uid(),
                      name: name,
                      notes: "",
                      type: "силовое",
                      muscle: muscle,
                      isCustom: true,
                      sets: [],
                    };

                    workoutExercises.push(customExercise);
                    customExerciseForm.remove();
                    renderWorkoutExercises();
                  });

                document
                  .getElementById("cancelCustomExercise")
                  .addEventListener("click", () => {
                    customExerciseForm.remove();
                  });
              });

            const cancelBtn = document.getElementById("modal_cancel_all");
            const saveBtn = document.getElementById("modal_save_all");

            if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

            if (saveBtn) {
              saveBtn.addEventListener("click", () => {
                // Фильтруем упражнения, у которых есть хотя бы один подход
                const exercisesWithSets = workoutExercises.filter(
                  (ex) =>
                    ex.sets.length > 0 &&
                    ex.sets.some((set) => {
                      const normalized = sanitizeSet(set);
                      return normalized.r > 0 || normalized.w > 0;
                    })
                );

                if (exercisesWithSets.length === 0) {
                  showAlert("Нет записанных подходов");
                  return;
                }

                const currentWorkouts = getWorkoutsForCurrentPlan();

                exercisesWithSets.forEach((ex) => {
                  const validSets = ex.sets
                    .map((set) => sanitizeSet(set))
                    .filter((set) => set.r > 0 || set.w > 0);
                  if (validSets.length > 0) {
                    currentWorkouts.push({
                      workoutId: uid(),
                      date,
                      planId: currentPlanId,
                      dayIdx: ex.isCustom ? -1 : currentDayIndex,
                      exId: ex.id,
                      exName: ex.name,
                      muscle: ex.muscle || "другое",
                      sets: validSets,
                      isCustom: ex.isCustom,
                    });
                  }
                });

                saveWorkoutsForCurrentPlan(currentWorkouts);

                closeModal();
                showAlert("Тренировка сохранена");
                renderCalendar();
                showWorkoutsForDate(date);
                updateMuscleStats();
              });
            }
          }, 0);
        }

        function formatDate(dateStr) {
          const date = new Date(dateStr + "T00:00:00");
          return date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        }

        function deleteSingleExercise(workoutId) {
          showConfirm("Удалить это упражнение из истории тренировки?", () => {
            const currentWorkouts = getWorkoutsForCurrentPlan();
            const updatedWorkouts = currentWorkouts.filter(
              (w) => w.workoutId !== workoutId
            );
            saveWorkoutsForCurrentPlan(updatedWorkouts);

            renderCalendar();
            updateMuscleStats();

            if (selectedExerciseRef) {
              const pl = getCurrentPlan();
              const ex = pl?.days?.[
                selectedExerciseRef.dayIdx
              ]?.exercises?.find((x) => x.id === selectedExerciseRef.exId);
              if (ex) showChartsForExercise(ex);
            }

            showAlert("Упражнение удалено из истории");
          });
        }

        function editWorkout(date) {
          const currentWorkouts = getWorkoutsForCurrentPlan();
          const dateWorkouts = currentWorkouts.filter((w) => w.date === date);

          const html = `
        <h3>Редактирование тренировки от ${date}</h3>
        <div id="editWorkoutContent" style="max-height: 60vh; overflow-y: auto;"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
          <button id="cancelEditWorkout">Отмена</button>
          <button id="saveEditWorkout">Сохранить</button>
        </div>
      `;

          openModal(html);

          setTimeout(() => {
            const editContent = document.getElementById("editWorkoutContent");

            dateWorkouts.forEach((workout, workoutIndex) => {
              const workoutDiv = document.createElement("div");
              workoutDiv.className = "workout-item";
              workoutDiv.style.marginBottom = "15px";
              workoutDiv.innerHTML = `
            <h4>${escapeHtml(workout.exName)}</h4>
            <div id="sets-${workoutIndex}" style="margin-bottom: 10px;"></div>
            <button class="add-set" data-workout="${workoutIndex}">+ Добавить подход</button>
          `;

              editContent.appendChild(workoutDiv);

              const setsArea = document.getElementById(`sets-${workoutIndex}`);

              workout.sets.forEach((set, setIndex) => {
                const setRow = document.createElement("div");
                setRow.className = "form-row";
                setRow.style.marginBottom = "5px";
                setRow.innerHTML = `
              <input placeholder="Вес" class="w" value="${set.w || ""}">
              <input placeholder="Повторения" class="r" value="${set.r || ""}">
              <input placeholder="Комментарий" class="c" value="${set.c || ""}">
              <button class="del-set">✖</button>
            `;
                setsArea.appendChild(setRow);

                setRow
                  .querySelector(".del-set")
                  .addEventListener("click", () => {
                    if (workout.sets.length > 1) {
                      setRow.remove();
                      workout.sets.splice(setIndex, 1);
                    } else {
                      showAlert("Должен остаться хотя бы один подход");
                    }
                  });
              });

              workoutDiv
                .querySelector(".add-set")
                .addEventListener("click", () => {
                  const newSet = { w: 0, r: 0, c: "" };
                  workout.sets.push(newSet);

                  const setRow = document.createElement("div");
                  setRow.className = "form-row";
                  setRow.style.marginBottom = "5px";
                  setRow.innerHTML = `
              <input placeholder="Вес" class="w">
              <input placeholder="Повторения" class="r">
              <input placeholder="Комментарий" class="c">
              <button class="del-set">✖</button>
            `;
                  setsArea.appendChild(setRow);

                  setRow
                    .querySelector(".del-set")
                    .addEventListener("click", () => {
                      if (workout.sets.length > 1) {
                        setRow.remove();
                        workout.sets.pop();
                      } else {
                        showAlert("Должен остаться хотя бы один подход");
                      }
                    });
                });
            });

            const cancelBtn = document.getElementById("cancelEditWorkout");
            const saveBtn = document.getElementById("saveEditWorkout");

            if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

            if (saveBtn) {
              saveBtn.addEventListener("click", () => {
                dateWorkouts.forEach((workout, workoutIndex) => {
                  const setsArea = document.getElementById(
                    `sets-${workoutIndex}`
                  );
                  const setRows = setsArea.querySelectorAll(".form-row");

                  setRows.forEach((row, setIndex) => {
                    workout.sets[setIndex] = {
                      w: parseFloat(row.querySelector(".w").value) || 0,
                      r: parseInt(row.querySelector(".r").value) || 0,
                      c: row.querySelector(".c").value || "",
                    };
                  });
                });

                saveWorkoutsForCurrentPlan(currentWorkouts);
                closeModal();
                renderCalendar();
                showAlert("Изменения сохранены");
              });
            }
          }, 0);
        }

        function deleteWorkout(date) {
          showConfirm(`Удалить тренировку от ${date}?`, () => {
            const currentWorkouts = getWorkoutsForCurrentPlan();
            const updatedWorkouts = currentWorkouts.filter(
              (w) => w.date !== date
            );
            saveWorkoutsForCurrentPlan(updatedWorkouts);
            renderCalendar();
            updateMuscleStats();
          });
        }

        /* ===== РЕКОМЕНДАЦИИ ПО ПРОГРЕССИИ ===== */
        function renderProgressionRecommendations() {
          const container = document.getElementById(
            "progressionRecommendations"
          );
          if (!container) return;

          const currentWorkouts = getWorkoutsForCurrentPlan();

          if (currentWorkouts.length === 0) {
            container.innerHTML =
              '<div class="empty">Нет данных для анализа. Запишите несколько тренировок.</div>';
            return;
          }

          // Простой пример рекомендаций
          container.innerHTML = `
        <div class="recommendation-card">
          <div class="recommendation-header">
            <span>💡</span>
            <strong>Совет по тренировкам</strong>
          </div>
          <p>Записывайте свои тренировки регулярно для получения персонализированных рекомендаций.</p>
        </div>
      `;
        }

        /* ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ===== */
        function setupTabs() {
          // Вкладки главного toolbar
          const toolbarTabs = document.querySelectorAll(".toolbar-tab");
          const tabContents = document.querySelectorAll(".tab-content");
          const profileShortcut = document.getElementById("toolbarProfileBtn");

          const activateMainTab = (targetTab) => {
            if (!targetTab) return;
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (!targetContent) return;
            toolbarTabs.forEach((t) =>
              t.classList.toggle("active", t.getAttribute("data-tab") === targetTab)
            );
            tabContents.forEach((c) => c.classList.remove("active"));
            targetContent.classList.add("active");
            if (targetTab === "training") {
              setTimeout(() => {
                restoreRightPanel();
              }, 100);
              return;
            }
            if (targetTab === "nutrition") {
              // Вкладка питания изначально скрыта; при первом рендере Chart
              // может получить нулевые размеры.
              const rerenderNutrition = () => {
                window.AppModules?.nutrition?.render?.("nutritionModuleMount");
                window.dispatchEvent(new Event("resize"));
              };
              requestAnimationFrame(() => {
                requestAnimationFrame(rerenderNutrition);
              });
              setTimeout(rerenderNutrition, 180);
              ensureChartJsLoaded().then((ok) => {
                if (ok) rerenderNutrition();
              });
            }
          };

          toolbarTabs.forEach((tab) => {
            tab.addEventListener("click", function () {
              const targetTab = this.getAttribute("data-tab");
              activateMainTab(targetTab);
            });
          });

          if (profileShortcut) {
            profileShortcut.addEventListener("click", () => activateMainTab("profile"));
          }

          // Вкладки правой панели
          const rightPanelTabs = document.querySelectorAll(".right .tab");
          const rightPanelContents = document.querySelectorAll(
            ".right .tab-content"
          );

          rightPanelTabs.forEach((tab) => {
            tab.addEventListener("click", function () {
              const targetTab = this.getAttribute("data-tab");
              currentRightPanelTab = targetTab; // Сохраняем активную вкладку

              rightPanelTabs.forEach((t) => t.classList.remove("active"));
              rightPanelContents.forEach((c) => c.classList.remove("active"));

              this.classList.add("active");
              document
                .getElementById(targetTab + "Panel")
                .classList.add("active");

              if (targetTab === "calendar") {
                renderCalendar();
              } else if (targetTab === "progress") {
                renderMuscleStats();
                renderProgressionRecommendations();

                // Если есть выбранное упражнение, показываем его графики
                if (selectedExerciseRef) {
                  const pl = getCurrentPlan();
                  const ex = pl?.days?.[
                    selectedExerciseRef.dayIdx
                  ]?.exercises?.find((x) => x.id === selectedExerciseRef.exId);
                  if (ex) showChartsForExercise(ex);
                }
              }
            });
          });
        }

        // Функция для восстановления правой панели
        function restoreRightPanel() {
          const rightPanelTabs = document.querySelectorAll(".right .tab");
          const rightPanelContents = document.querySelectorAll(
            ".right .tab-content"
          );

          rightPanelTabs.forEach((t) => t.classList.remove("active"));
          rightPanelContents.forEach((c) => c.classList.remove("active"));

          // Активируем сохраненную вкладку
          const activeTab = document.querySelector(
            `.right .tab[data-tab="${currentRightPanelTab}"]`
          );
          const activeContent = document.getElementById(
            currentRightPanelTab + "Panel"
          );

          if (activeTab) activeTab.classList.add("active");
          if (activeContent) activeContent.classList.add("active");

          // Обновляем контент в зависимости от вкладки
          if (currentRightPanelTab === "calendar") {
            renderCalendar();
          } else if (currentRightPanelTab === "progress") {
            renderMuscleStats();
            renderProgressionRecommendations();

            // Если есть выбранное упражнение, показываем его графики
            if (selectedExerciseRef) {
              const pl = getCurrentPlan();
              const ex = pl?.days?.[
                selectedExerciseRef.dayIdx
              ]?.exercises?.find((x) => x.id === selectedExerciseRef.exId);
              if (ex) showChartsForExercise(ex);
            } else {
              // Показываем сообщение по умолчанию
              if (chartsArea) {
                chartsArea.innerHTML = `
                  <div class="empty">
                    Выберите упражнение для просмотра графиков
                  </div>
                `;
              }
            }
          }
        }

        /* ===== ФУНКЦИИ ДЛЯ ШАБЛОНОВ ПРОГРАММ ===== */
        function showProgramSelection() {
          const cards = TRAINING_TEMPLATES.map(
            (template) => `
              <div class="program-card">
                <h4>${escapeHtml(template.name)}</h4>
                <div class="program-description">${escapeHtml(
                  template.description
                )}</div>
                <div class="program-meta">
                  <span>${template.days.length} дней</span>
                  <span>${template.days.reduce(
                    (acc, d) => acc + d.exercises.length,
                    0
                  )} упражнений</span>
                </div>
                <div class="program-days">
                  ${template.days
                    .map((day) => escapeHtml(day.name || "День"))
                    .join(" · ")}
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:12px;">
                  <button class="apply-program-btn" data-program-id="${
                    template.id
                  }">
                    Применить программу
                  </button>
                </div>
              </div>
            `
          ).join("");

          openModal(`
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;">
              <h3 style="margin:0;">Готовые программы тренировок</h3>
              <button id="closeProgramsModal" type="button" title="Закрыть" style="padding:6px 10px;line-height:1;">✕</button>
            </div>
            <div class="muted small" style="margin-bottom:12px;">
              Программа заменит дни в текущем плане и создаст структуру автоматически.
            </div>
            <div class="programs-list">${cards}</div>
          `);

          setTimeout(() => {
            const closeBtn = document.getElementById("closeProgramsModal");
            if (closeBtn) {
              closeBtn.addEventListener("click", closeModal);
            }
            document.querySelectorAll(".apply-program-btn").forEach((btn) => {
              btn.addEventListener("click", () => {
                const programId = btn.getAttribute("data-program-id");
                const selectedProgram = TRAINING_TEMPLATES.find(
                  (program) => program.id === programId
                );
                if (!selectedProgram) return;
                showConfirm(
                  "Применить выбранную программу к текущему плану? Текущие дни будут заменены.",
                  () => applyTrainingProgram(selectedProgram)
                );
              });
            });
          }, 0);
        }

        function applyTrainingProgram(program) {
          const pl = getCurrentPlan();
          if (!pl || !program) return;
          pl.days = program.days.map((day) => ({
            name: day.name || "",
            exercises: day.exercises.map((exercise) => ({
              id: uid(),
              name: exercise.name,
              notes: "",
              type: exercise.type || "силовое",
              defaults: "",
              muscle: exercise.muscle || "другое",
            })),
          }));
          currentDayIndex = 0;
          savePlans(plans);
          closeModal();
          renderAll();
          showAlert(`Программа "${program.name}" применена`);
        }

        /* ===== ОБНОВЛЕНИЕ ФУНКЦИИ RENDERALL ===== */
        function renderLeftPanel() {
          renderPlanSelect();
          renderMuscleGroups();
          renderDays();
          renderCurrentDay();
          renderSummary();
          renderPlansVisibility();
        }

        function renderAll() {
          renderLeftPanel();
          restoreRightPanel(); // Восстанавливаем правую панель вместо прямого рендера
        }

        /* ===== каталог упражнений ===== */
        function toggleCatalog() {
          if (!muscleGroups || !catalogToggleIcon || !catalogToggle) return;

          const catalogOpen = muscleGroups.classList.contains("active");

          if (catalogOpen) {
            muscleGroups.classList.remove("active");
            document.querySelectorAll(".exercises-list").forEach((item) => {
              item.classList.remove("active");
            });
            document.querySelectorAll(".muscle-group").forEach((item) => {
              item.classList.remove("active");
            });
            catalogToggleIcon.textContent = "▼";
            catalogToggle.classList.remove("active");
          } else {
            muscleGroups.classList.add("active");
            catalogToggleIcon.textContent = "▲";
            catalogToggle.classList.add("active");
          }
        }

        // Инициализация при загрузке
        setupTabs();
        applyTheme(localStorage.getItem(STORAGE_THEME) || "dark");
        renderAll();

        // Добавляем обработчики
        if (catalogToggle) {
          catalogToggle.addEventListener("click", toggleCatalog);
        }

        if (alertOk) {
          alertOk.addEventListener("click", closeAlert);
          alertOk.onclick = closeAlert;
        }
        window.closeAlert = closeAlert;

        // Обработчик для свертывания/развертывания блока "Мои планы"
        if (plansToggle) {
          plansToggle.addEventListener("click", togglePlansVisibility);
        }

        // Обработчик для кнопки очистки всей истории
        const clearAllHistoryBtn = document.getElementById("clearAllHistory");
        if (clearAllHistoryBtn) {
          clearAllHistoryBtn.addEventListener("click", () => {
            showConfirm(
              "Очистить всю историю тренировок для этого плана?",
              () => {
                saveWorkoutsForCurrentPlan([]);
                renderCalendar();
                const calendarWorkouts =
                  document.getElementById("calendarWorkouts");
                if (calendarWorkouts) {
                  calendarWorkouts.innerHTML = "";
                }
                updateMuscleStats();
                showAlert("Вся история тренировок очищена");
              }
            );
          });
        }

        // Принудительно рендерим календарь при загрузке
        setTimeout(() => {
          renderCalendar();
        }, 100);
      }

      document.addEventListener("DOMContentLoaded", function () {
        if (window.__APP_LOCKED__) {
          window.addEventListener(
            "appStorageHydrated",
            function () {
              startMainTrainingApp();
            },
            { once: true }
          );
        } else {
          startMainTrainingApp();
        }
      });

