window.addEventListener("DOMContentLoaded", () => {
  // Hapus shadow tasklist dan tampilkan pesan kosong saat pertama kali buka atau refresh
  const taskListUl = document.getElementById("taskList");
  const emptyMsg = document.getElementById("emptyTaskMsg");
  taskListUl.classList.add("no-task");
  emptyMsg.style.display = "block";

  function adjustBodyMinWidth() {
    if (window.innerWidth >= 768) {
      document.body.style.minHeight = "100vh";
    } else {
      document.body.style.minHeight = "unset";
    }
  }

  window.addEventListener("load", adjustBodyMinWidth);
  window.addEventListener("resize", adjustBodyMinWidth);

  const taskName = document.getElementById("taskName");
  const hours = document.getElementById("hours");
  const minutes = document.getElementById("minutes");
  const seconds = document.getElementById("seconds");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const taskList = document.getElementById("taskList");
  const startAllBtn = document.getElementById("startAllBtn");
  const stopAllBtn = document.getElementById("stopAllBtn");
  const statusText = document.getElementById("status");
  const audioPlayer = document.getElementById("audioPlayer");
  const progressContainer = document.getElementById("progressContainer");
  const progressBar = document.getElementById("progressBar");

  window.tasks = [];
  let tasks = window.tasks;
  let currentTaskIndex = 0;
  let taskTimer = null;
  let progressTimer = null;
  let isRunning = false;

  const repeatType = document.getElementById("repeatType");
  const repeatCountInput = document.getElementById("repeatCount");
  const repeatCountContainer = document.getElementById("repeatCountContainer");

  repeatType.addEventListener("change", () => {
    repeatCountContainer.style.display =
      repeatType.value === "limited" ? "block" : "none";
  });

  addTaskBtn.addEventListener("click", () => {
    const name = taskName.value.trim() || `Task ${tasks.length + 1}`;
    const h = parseInt(hours.value) || 0;
    const m = parseInt(minutes.value) || 0;
    const s = parseInt(seconds.value) || 0;
    // Perbaikan: fallback ke default jika input radio tidak ada
    let selectedType = "default";
    const audioRadio = document.querySelector(
      'input[name="audioType"]:checked'
    );
    if (audioRadio && audioRadio.value) {
      selectedType = audioRadio.value;
    }

    const totalSeconds = h * 3600 + m * 60 + s;
    if (totalSeconds <= 1) {
      alert("Masukkan waktu yang valid.");
      return;
    }

    // Ambil opsi repeat dan jumlah ulang jika ada
    const repeat = repeatType.value;
    let repeatLimit = null;
    if (repeat === "limited") {
      // Pastikan repeatCountInput ada sebelum akses value
      if (repeatCountInput) {
        repeatLimit = parseInt(repeatCountInput.value) || 1;
      } else {
        repeatLimit = 1;
      }
    }

    const task = {
      name,
      duration: totalSeconds,
      audio: selectedType,
      repeat, // 'none' | 'limited' | 'unlimited'
      repeatLimit, // jumlah ulang untuk 'limited'
      repeatCount: 0, // penghitung ulang
    };

    tasks.push(task);
    renderTaskList();

    // Reset form
    taskName.value = "";
    hours.value = "0";
    minutes.value = "0";
    seconds.value = "5";
    repeatType.value = "none";
    if (repeatCountInput) repeatCountInput.value = "1";
    if (repeatCountContainer) repeatCountContainer.style.display = "none";
  });

  window.moveTaskUp = function (index) {
    if (index > 0) {
      const temp = tasks[index];
      tasks[index] = tasks[index - 1];
      tasks[index - 1] = temp;
      renderTaskList();
      setTimeout(() => {
        const el = document.getElementById(`task-li-${index - 1}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    }
  };
  window.moveTaskDown = function (index) {
    if (index < tasks.length - 1) {
      const temp = tasks[index];
      tasks[index] = tasks[index + 1];
      tasks[index + 1] = temp;
      renderTaskList();
      setTimeout(() => {
        const el = document.getElementById(`task-li-${index + 1}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    }
  };

  window.renderTaskList = function () {
    taskList.innerHTML = "";
    const taskListUl = document.getElementById("taskList");
    const emptyMsg = document.getElementById("emptyTaskMsg");
    if (tasks.length === 0) {
      emptyMsg.style.display = "block";
      taskListUl.classList.add("no-task");
    } else {
      emptyMsg.style.display = "none";
      taskListUl.classList.remove("no-task");
      tasks.forEach((task, index) => {
        let repeatInfo = "";
        if (task.repeat === "limited") {
          repeatInfo =
            langSelect.value === "en"
              ? ` | Repeat: ${task.repeatLimit}x`
              : ` | Ulang: ${task.repeatLimit}x`;
        } else if (task.repeat === "unlimited") {
          repeatInfo =
            langSelect.value === "en" ? " | Repeat: ∞" : " | Ulang: ∞";
        }
        const li = document.createElement("li");
        li.setAttribute("id", `task-li-${index}`);
        li.innerHTML = `
          <div class="task-item">
            <span><strong>${task.name}</strong> (${formatTime(
          task.duration
        )}) [${task.audio}]${repeatInfo}</span>
            <div class="container3">
              <button onclick="moveTaskUp(${index})" title="Naikkan/Move Up">⬆️</button>
              <button onclick="moveTaskDown(${index})" title="Turunkan/Move Down">⬇️</button>
              <button onclick="editTask(${index})">${
          langStrings[langSelect.value].edit
        }</button>
              <button onclick="deleteTask(${index})">${
          langStrings[langSelect.value].hapus
        }</button>
            </div>
          </div>
        `;
        taskList.appendChild(li);
      });
    }
  };

  window.editTask = function (index) {
    const task = tasks[index];
    taskName.value = task.name;
    hours.value = Math.floor(task.duration / 3600);
    minutes.value = Math.floor((task.duration % 3600) / 60);
    seconds.value = task.duration % 60;
    document.querySelector(
      `input[name="audioType"][value="${task.audio}"]`
    ).checked = true;
    tasks.splice(index, 1);
    renderTaskList();
  };

  window.deleteTask = function (index) {
    tasks.splice(index, 1);
    renderTaskList();
  };

  function formatTime(sec) {
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function runTasks() {
    if (tasks.length === 0 || isRunning) return;
    isRunning = true;
    currentTaskIndex = 0;
    runTask();
  }

  function runTask() {
    if (currentTaskIndex >= tasks.length) {
      statusText.textContent = "Semua task selesai.";
      progressContainer.style.display = "none";
      isRunning = false;
      return;
    }

    const task = tasks[currentTaskIndex];
    let remaining = task.duration;
    // Cek apakah file audio custom ada, jika tidak fallback ke default
    let audioSrc = `audio/${task.audio}.ogg`;
    fetch(audioSrc, { method: "HEAD" })
      .then((res) => {
        if (!res.ok && task.audio === "custom") {
          audioSrc = "audio/default.ogg";
        }
      })
      .catch(() => {
        if (task.audio === "custom") {
          audioSrc = "audio/default.ogg";
        }
      })
      .finally(() => {
        audioPlayer.src = audioSrc;
        audioPlayer.play();
        statusText.textContent = `Task: ${task.name} (${
          task.repeat === "limited"
            ? `Ulang ke-${task.repeatCount + 1}/${task.repeatLimit}`
            : task.repeat === "unlimited"
            ? `Tanpa Batas`
            : "Sekali"
        })`;

        progressContainer.style.display = "block";
        updateProgressBar(remaining, task.duration);

        clearInterval(progressTimer);
        progressTimer = setInterval(() => {
          remaining--;
          updateProgressBar(remaining, task.duration);
        }, 1000);

        taskTimer = setTimeout(() => {
          audioPlayer.play();

          if (task.repeat === "limited") {
            task.repeatCount++;
            if (task.repeatCount < task.repeatLimit) {
              runTask(); // ulang task ini
              return;
            }
          } else if (task.repeat === "unlimited") {
            runTask(); // ulang task ini tanpa batas
            return;
          }

          currentTaskIndex++;
          runTask(); // lanjut ke task berikutnya
        }, task.duration * 1000);
      });
  }

  function updateProgressBar(current, total) {
    const percent = (current / total) * 100;
    progressBar.style.width = percent + "%";
  }

  startAllBtn.addEventListener("click", runTasks);

  stopAllBtn.addEventListener("click", () => {
    clearTimeout(taskTimer);
    clearInterval(progressTimer);
    isRunning = false;
    progressContainer.style.display = "none";
    statusText.textContent = "Dihentikan.";
  });

  // ====== DARK MODE TOGGLE ======
  const darkModeToggle = document.getElementById("darkModeToggle");
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "darkMode",
      document.body.classList.contains("dark-mode") ? "1" : "0"
    );
    darkModeToggle.textContent = document.body.classList.contains("dark-mode")
      ? "☀️"
      : "🌙";
  });
  // Set initial dark mode from localStorage
  if (localStorage.getItem("darkMode") === "1") {
    document.body.classList.add("dark-mode");
    darkModeToggle.textContent = "☀️";
  }

  // ====== LANGUAGE SWITCHER ======
  const langSelect = document.getElementById("langSelect");
  const langStrings = {
    id: {
      taskName: "Nama Task:",
      jam: "Jam:",
      menit: "Menit:",
      detik: "Detik:",
      pilihAudio: "Pilih Audio:",
      pengulangan: "Pengulangan:",
      jumlahUlang: "Jumlah Ulang:",
      tambahTask: "Tambah Task",
      daftarTask: "Daftar Task :",
      mulaiSemua: "Mulai Semua Task",
      stop: "Stop",
      status: "Status: Menunggu...",
      edit: "Edit",
      hapus: "Hapus",
      tidak: "Tidak",
      terbatas: "Pengulangan Terbatas",
      tanpaBatas: "Pengulangan Tak Terbatas",
      audioDefault: "Default",
      audioCustom: "Kustom",
    },
    en: {
      taskName: "Task Name:",
      jam: "Hour:",
      menit: "Minute:",
      detik: "Second:",
      pilihAudio: "Select Audio:",
      pengulangan: "Repeat Type:",
      jumlahUlang: "Repeat Count:",
      tambahTask: "Add Task",
      daftarTask: "Task List:",
      mulaiSemua: "Start All Tasks",
      stop: "Stop",
      status: "Status: Waiting...",
      edit: "Edit",
      hapus: "Delete",
      tidak: "No",
      terbatas: "Limited Repeat",
      tanpaBatas: "Unlimited Repeat",
      audioDefault: "Default",
      audioCustom: "Custom",
    },
  };
  function setLang(lang) {
    // Label urutan sesuai index.html
    document.querySelectorAll("#taskForm label")[0].textContent =
      langStrings[lang].taskName;
    document.querySelectorAll(".set_time label")[0].textContent =
      langStrings[lang].jam;
    document.querySelectorAll(".set_time label")[1].textContent =
      langStrings[lang].menit;
    document.querySelectorAll(".set_time label")[2].textContent =
      langStrings[lang].detik;
    document.querySelectorAll("#taskForm label")[4].textContent =
      langStrings[lang].pilihAudio;
    document.getElementById("repeatLabel").textContent =
      langStrings[lang].pengulangan;
    document.querySelectorAll("#repeatCountContainer label")[0].textContent =
      langStrings[lang].jumlahUlang;
    document.getElementById("addTaskBtn").textContent =
      langStrings[lang].tambahTask;
    document.querySelector(".taskList1 label").textContent =
      langStrings[lang].daftarTask;
    document.getElementById("startAllBtn").textContent =
      langStrings[lang].mulaiSemua;
    document.getElementById("stopAllBtn").textContent = langStrings[lang].stop;
    document.getElementById("status").textContent = langStrings[lang].status;
    document.getElementById("taskName").placeholder =
      lang === "en" ? "Task Name" : "Nama Task";
    // Update select options
    const opts = document.querySelectorAll("#repeatType option");
    opts[0].textContent = langStrings[lang].tidak;
    opts[1].textContent = langStrings[lang].terbatas;
    opts[2].textContent = langStrings[lang].tanpaBatas;
    // Update task list button text
    document.querySelectorAll(".container3 button").forEach((btn, i) => {
      btn.textContent =
        i % 2 === 0 ? langStrings[lang].edit : langStrings[lang].hapus;
    });
    // Update repeat info in task list
    document.querySelectorAll(".task-item span").forEach((span, idx) => {
      const task = tasks[idx];
      let repeatInfo = "";
      if (task) {
        if (task.repeat === "limited") {
          repeatInfo =
            lang === "en"
              ? ` | Repeat: ${task.repeatLimit}x`
              : ` | Ulang: ${task.repeatLimit}x`;
        } else if (task.repeat === "unlimited") {
          repeatInfo = lang === "en" ? " | Repeat: ∞" : " | Ulang: ∞";
        }
        // Update text with repeat info
        let base = `<strong>${task.name}</strong> (${formatTime(
          task.duration
        )}) [${task.audio}]`;
        span.innerHTML = base + repeatInfo;
      }
    });
    // Perbaiki label radio group audio
    const audioLabels = document.querySelectorAll(".radio-group label");
    if (audioLabels.length >= 2) {
      audioLabels[0].childNodes[
        audioLabels[0].childNodes.length - 1
      ].textContent = " " + langStrings[lang].audioDefault;
      audioLabels[1].childNodes[
        audioLabels[1].childNodes.length - 1
      ].textContent = " " + langStrings[lang].audioCustom;
    }
    // Update empty task message
    document.getElementById("emptyTaskMsg").textContent =
      lang === "en"
        ? "No tasks have been added yet."
        : "Belum ada task yang dimasukkan.";
  }
  langSelect.addEventListener("change", (e) => {
    setLang(e.target.value);
    localStorage.setItem("lang", e.target.value);
  });
  // Set initial language
  const initialLang = localStorage.getItem("lang") || "id";
  langSelect.value = initialLang;
  setLang(initialLang);
});
