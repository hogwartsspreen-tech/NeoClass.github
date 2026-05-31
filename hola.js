document.addEventListener('DOMContentLoaded', () => {
    // === ESTADO GLOBAL ===
    let currentUser = JSON.parse(sessionStorage.getItem('neoClassActiveUser')) || null;
    let tasks = [];
    let xp = 0;

    // ESTADO DEL CALENDARIO
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    // ⚠️ PEGA AQUÍ LA URL DE GOOGLE APPS SCRIPT
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyB034_8nq4WqCu-y5SR2Iith1t9IaYhvbvO7kDOqypMRyu356H__JvrGhzgjdh7E8e/exec';

    // === ELEMENTOS DEL DOM ===
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const sections = document.querySelectorAll('.content-section');
    const navLinks = document.querySelectorAll('.nav-links li');
    const audioAlarma = document.getElementById('pomodoro-sound');
    
    // Autenticación
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const btnShowRegister = document.getElementById('btn-show-register');
    const btnShowLogin = document.getElementById('btn-show-login');
    const authSubtitle = document.getElementById('auth-subtitle');
    const loginError = document.getElementById('login-error');
    const regError = document.getElementById('reg-error');

    // === INICIALIZACIÓN ===
    if (currentUser) {
        loadUserData();
        showApp();
    }

    // === ALTERNAR LOGIN / REGISTRO ===
    btnShowRegister.addEventListener('click', () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
        authSubtitle.innerText = 'Start your journey. Join NY.';
        loginError.style.display = 'none'; regError.style.display = 'none';
    });
    btnShowLogin.addEventListener('click', () => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'flex';
        authSubtitle.innerText = 'Focus mode: On. Welcome back.';
        loginError.style.display = 'none'; regError.style.display = 'none';
    });

    // === REGISTRO (CONEXIÓN A GOOGLE SHEETS) ===
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const password = document.getElementById('reg-password').value;
        const btnSubmit = registerForm.querySelector('button[type="submit"]');

        const originalText = btnSubmit.innerText;
        btnSubmit.innerText = "Registrando en la nube...";
        btnSubmit.disabled = true;
        regError.style.display = 'none';

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'register', username, email, password })
            });
            
            const result = await response.json();

            if (result.status === 'success') {
                startSession(result.user);
            } else {
                regError.innerText = result.message;
                regError.style.display = 'block';
            }
        } catch (error) {
            regError.innerText = "Error de conexión con la base de datos.";
            regError.style.display = 'block';
        } finally {
            btnSubmit.innerText = originalText;
            btnSubmit.disabled = false;
        }
    });

    // === LOGIN (CONEXIÓN A GOOGLE SHEETS) ===
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;
        const btnSubmit = loginForm.querySelector('button[type="submit"]');

        const originalText = btnSubmit.innerText;
        btnSubmit.innerText = "Verificando credenciales...";
        btnSubmit.disabled = true;
        loginError.style.display = 'none';

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'login', email, password })
            });
            
            const result = await response.json();

            if (result.status === 'success') {
                startSession(result.user);
            } else {
                loginError.innerText = result.message;
                loginError.style.display = 'block';
            }
        } catch (error) {
            loginError.innerText = "Error al conectar con el servidor.";
            loginError.style.display = 'block';
        } finally {
            btnSubmit.innerText = originalText;
            btnSubmit.disabled = false;
        }
    });

    // === GESTIÓN DE SESIÓN ===
    function startSession(userData) {
        currentUser = userData;
        sessionStorage.setItem('neoClassActiveUser', JSON.stringify(currentUser));
        loadUserData();
        showApp();
    }

    function loadUserData() {
        const userKey = currentUser.email;
        tasks = JSON.parse(localStorage.getItem(`neoClassTasks_${userKey}`)) || [];
        xp = parseInt(localStorage.getItem(`neoClassXP_${userKey}`)) || 0;
    }

    function showApp() {
        loginView.classList.remove('active');
        appView.classList.add('active');
        
        document.getElementById('greeting').innerText = `Buenas noches, ${currentUser.username}.`;
        
        const avatarImg = document.getElementById('user-avatar');
        avatarImg.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=7B61FF&color=fff&size=100`;

        updateDate();
        renderTasks();
        updateGamification();
        generateCalendar(); 
    }

    // === NAVEGACIÓN ===
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === targetId) sec.classList.add('active');
            });
        });
    });

    function updateDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-ES', options);
    }

    // === GESTOR DE TAREAS ===
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskDate = document.getElementById('task-date');
    const mainTaskList = document.getElementById('main-task-list');
    const quickTaskList = document.getElementById('quick-task-list');

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if(taskInput.value.trim() === '' || !taskDate.value) return;
        
        const newTask = {
            id: Date.now(),
            text: taskInput.value,
            date: taskDate.value,
            completed: false
        };
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        generateCalendar(); 
        
        taskInput.value = '';
        taskDate.value = '';
    });

    function renderTasks() {
        if (!mainTaskList || !quickTaskList) return;
        mainTaskList.innerHTML = '';
        quickTaskList.innerHTML = '';
        let pendingCount = 0;

        const sortedTasks = [...tasks].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            const dateObj = new Date(task.date + 'T00:00:00'); 
            const formattedDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

            li.innerHTML = `
                <div>
                    <span>${task.text}</span>
                    <span class="task-date-badge"><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                </div>
                <div class="task-actions">
                    <button class="btn-complete" onclick="toggleTask(${task.id})"><i class="fas ${task.completed ? 'fa-check-circle' : 'fa-circle'}"></i></button>
                    <button onclick="deleteTask(${task.id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            mainTaskList.appendChild(li);

            if (!task.completed && pendingCount < 3) {
                const liQuick = document.createElement('li');
                liQuick.className = 'task-item';
                liQuick.innerHTML = `<span><i class="fas fa-angle-right" style="color:var(--neon-blue); margin-right:8px;"></i> ${task.text}</span>`;
                quickTaskList.appendChild(liQuick);
                pendingCount++;
            }
        });

        if (pendingCount === 0 && tasks.length > 0) quickTaskList.innerHTML = '<li class="task-item" style="color:var(--text-muted)">¡Todo completado!</li>';
        else if (tasks.length === 0) quickTaskList.innerHTML = '<li class="task-item" style="color:var(--text-muted)">No hay tareas pendientes.</li>';
    }

    window.toggleTask = function(id) {
        tasks = tasks.map(t => {
            if (t.id === id) { t.completed = !t.completed; if(t.completed) addXP(50); }
            return t;
        });
        saveTasks();
        renderTasks();
        generateCalendar();
    };

    window.deleteTask = function(id) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        generateCalendar(); 
    };

    function saveTasks() { 
        if(currentUser) localStorage.setItem(`neoClassTasks_${currentUser.email}`, JSON.stringify(tasks)); 
    }

    // === GAMIFICACIÓN ===
    function addXP(amount) {
        xp += amount; 
        if(currentUser) localStorage.setItem(`neoClassXP_${currentUser.email}`, xp); 
        updateGamification();
    }
    function updateGamification() {
        const level = Math.floor(xp / 1000) + 1;
        const currentXP = xp % 1000;
        document.getElementById('user-level').innerText = level;
        document.getElementById('user-xp').innerText = currentXP;
        setTimeout(() => { document.getElementById('xp-fill').style.width = `${(currentXP / 1000) * 100}%`; }, 300);
    }

    // === POMODORO TIMER ===
    let timer, timeLeft = 25 * 60, isRunning = false;
    const display = document.getElementById('timer-display');
    const statusText = document.getElementById('timer-status');

    document.getElementById('btn-start').addEventListener('click', () => { if (!isRunning) { isRunning = true; timer = setInterval(updateTimer, 1000); }});
    document.getElementById('btn-pause').addEventListener('click', () => { isRunning = false; clearInterval(timer); });
    document.getElementById('btn-reset').addEventListener('click', () => { 
        isRunning = false; clearInterval(timer); timeLeft = 25 * 60; updateDisplay(); statusText.innerText = 'Modo: Estudio'; 
        audioAlarma.pause(); audioAlarma.currentTime = 0; 
    });

    function updateTimer() {
        if (timeLeft > 0) { 
            timeLeft--; 
            updateDisplay(); 
        } else { 
            clearInterval(timer); 
            isRunning = false; 
            statusText.innerText = '¡Tiempo! Descansa 5 minutos.'; 
            timeLeft = 5 * 60; 
            updateDisplay(); 
            addXP(100);
            audioAlarma.play(); 
        }
    }
    
    function updateDisplay() {
        if(display) display.innerText = `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`;
    }

    // === CALENDARIO INTERACTIVO (COMPLETADO) ===
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            generateCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            generateCalendar();
        });
    }

    function generateCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const monthYearText = document.getElementById('month-year');
        if (!calendarGrid || !monthYearText) return;
        
        calendarGrid.innerHTML = '';
        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        monthYearText.innerText = `${months[currentMonth]} ${currentYear}`;
        
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        daysOfWeek.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.innerText = day;
            calendarGrid.appendChild(header);
        });
        
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            calendarGrid.appendChild(emptyCell);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day glass-panel';
            dayCell.innerHTML = `<span class="calendar-day-num">${day}</span>`;
            calendarGrid.appendChild(dayCell);
        }
    }

    // === 🎵 SISTEMA DE SONIDO DE FONDO MP3 AÑADIDO ===
    const btnBgSound = document.getElementById('btn-bg-sound');
    
    // 👇 REEMPLAZA EL CONTENIDO DE LAS COMILLAS POR LA RUTA O LINK DE TU ARCHIVO MP3 👇
    const bgAudio = new Audio('https://epsilon.iotacloud.org/get.php/b/a9/l-2hOKIrIyI.mp3?n=4%20HOURS%20STUDY%20GIRL%20-%20Cozy%20lofi%20music%20and%20rain%20in%20background&uT=R&uN=Y29kZWJ1c3RlcnM%3D&h=YCgWn61vwYbOzvinYdRkIw&s=1780201425&uT=R&uN=Y29kZWJ1c3RlcnM%3D&v=l-2hOKIrIyI&f=mp3&r=v3.y2mate.nu'); 
    bgAudio.loop = true; // Hace que el sonido se repita indefinidamente de fondo
    let isBgPlaying = false;

    if (btnBgSound) {
        btnBgSound.addEventListener('click', () => {
            if (!isBgPlaying) {
                bgAudio.play()
                    .then(() => {
                        btnBgSound.innerHTML = '<i class="fas fa-pause"></i> Pausar Fondo';
                        isBgPlaying = true;
                    })
                    .catch(error => {
                        console.error("Error al reproducir el sonido: ", error);
                    });
            } else {
                bgAudio.pause();
                btnBgSound.innerHTML = '<i class="fas fa-play"></i> Sonido de Fondo';
                isBgPlaying = false;
            }
        });
    }
});