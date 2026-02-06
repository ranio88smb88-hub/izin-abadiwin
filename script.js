// Aplikasi Izin Staff
document.addEventListener('DOMContentLoaded', function() {
    // State aplikasi
    const appState = {
        currentUser: null,
        isAdmin: false,
        currentPermission: null,
        permissionHistory: [],
        activePermissions: [],
        settings: {
            shortPermissionQuota: 4,
            mealPermissionQuota: 3,
            mealPermissionDuration: 7,
            shortPermissionDuration: 15,
            animationEnabled: true
        },
        staffList: [],
        shiftList: [
            { id: 'shift1', name: 'Shift 1', start: '03:05', end: '16:00' },
            { id: 'shift2', name: 'Shift 2', start: '03:05', end: '22:00' },
            { id: 'shift3', name: 'Shift 3', start: '03:05', end: '06:00' }
        ],
        jobdeskList: [
            { id: 'jobdesk1', name: 'Kasir' },
            { id: 'jobdesk2', name: 'Gudang' },
            { id: 'jobdesk3', name: 'Customer Service' },
            { id: 'jobdesk4', name: 'Admin' }
        ],
        // User admin default
        adminUser: {
            username: 'csline',
            password: 'aa1234',
            name: 'Admin CSLine',
            shift: 'shift1',
            jobdesk: 'jobdesk4',
            isAdmin: true
        }
    };

    // Inisialisasi data
    function initializeApp() {
        // Load data dari localStorage jika ada
        loadFromLocalStorage();
        
        // Pastikan admin user ada
        if (!appState.staffList.find(staff => staff.username === 'csline')) {
            appState.staffList.push({...appState.adminUser});
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup clock
        updateClock();
        setInterval(updateClock, 1000);
        
        // Setup timer untuk izin aktif
        setInterval(checkActivePermissions, 1000);
        
        // Update UI
        updateJobdeskSelect();
        updateSettingsUI();
        updateStaffListTable();
        updateShiftListTable();
        updateJobdeskListTable();
        
        // Cek jika ada izin aktif dari sebelumnya
        checkPreviousActivePermission();
    }

    // Load data dari localStorage
    function loadFromLocalStorage() {
        const savedState = localStorage.getItem('staffPermissionApp');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            
            // Gabungkan dengan state default
            appState.staffList = parsed.staffList || [];
            appState.shiftList = parsed.shiftList || appState.shiftList;
            appState.jobdeskList = parsed.jobdeskList || appState.jobdeskList;
            appState.settings = { ...appState.settings, ...parsed.settings };
            appState.permissionHistory = parsed.permissionHistory || [];
            
            // Filter hanya izin hari ini
            const today = new Date().toDateString();
            appState.permissionHistory = appState.permissionHistory.filter(perm => {
                const permDate = new Date(perm.startTime).toDateString();
                return permDate === today;
            });
        }
    }

    // Save data ke localStorage
    function saveToLocalStorage() {
        const stateToSave = {
            staffList: appState.staffList,
            shiftList: appState.shiftList,
            jobdeskList: appState.jobdeskList,
            settings: appState.settings,
            permissionHistory: appState.permissionHistory
        };
        localStorage.setItem('staffPermissionApp', JSON.stringify(stateToSave));
    }

    // Setup event listeners
    function setupEventListeners() {
        // Login
        document.getElementById('loginBtn').addEventListener('click', handleLogin);
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', openSettings);
        
        // Close modal
        document.querySelector('.close-modal').addEventListener('click', closeSettings);
        
        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
        
        // Permission buttons
        document.querySelectorAll('.btn-permission').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.closest('.permission-card').getAttribute('data-type');
                startPermission(type);
            });
        });
        
        // Settings actions
        document.getElementById('addStaffBtn').addEventListener('click', addStaff);
        document.getElementById('addShiftBtn').addEventListener('click', addShift);
        document.getElementById('addJobdeskBtn').addEventListener('click', addJobdesk);
        document.getElementById('saveQuotaBtn').addEventListener('click', saveQuotaSettings);
        document.getElementById('updateLogoBtn').addEventListener('click', updateLogo);
        document.getElementById('updateBackgroundBtn').addEventListener('click', updateBackground);
        
        // Color options
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', function() {
                const color = this.getAttribute('data-color');
                changeThemeColor(color);
            });
        });
        
        // Animation toggle
        document.getElementById('animationToggle').addEventListener('change', toggleAnimation);
        
        // Close modal dengan klik di luar
        document.getElementById('settingsModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeSettings();
            }
        });
        
        // Enter key untuk login
        document.getElementById('password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }

    // Handle login
    function handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const shiftTime = document.getElementById('shiftTime').value;
        
        if (!username || !password) {
            showNotification('Username dan password harus diisi', 'error');
            return;
        }
        
        // Cek user
        let user = null;
        
        // Cek admin
        if (username === appState.adminUser.username && password === appState.adminUser.password) {
            user = {...appState.adminUser};
        } else {
            // Cek staff
            user = appState.staffList.find(staff => 
                staff.username === username && staff.password === password
            );
        }
        
        if (!user) {
            showNotification('Username atau password salah', 'error');
            return;
        }
        
        // Cek waktu shift
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        
        // Temukan shift user
        const userShift = appState.shiftList.find(shift => shift.id === user.shift);
        if (!userShift) {
            showNotification('Shift tidak ditemukan', 'error');
            return;
        }
        
        // Parse waktu shift
        const [shiftHour, shiftMinute] = userShift.start.split(':').map(Number);
        const shiftStartTime = new Date();
        shiftStartTime.setHours(shiftHour, shiftMinute, 0, 0);
        
        // Waktu login maksimal 2 jam setelah shift
        const maxLoginTime = new Date(shiftStartTime.getTime() + 2 * 60 * 60 * 1000);
        
        if (now < shiftStartTime) {
            showNotification(`Belum waktu shift. Shift dimulai pukul ${userShift.start}`, 'error');
            return;
        }
        
        if (now > maxLoginTime) {
            showNotification(`Waktu login sudah habis. Login hanya 2 jam setelah shift dimulai (${userShift.start})`, 'error');
            return;
        }
        
        // Set current user
        appState.currentUser = {
            ...user,
            loginTime: now,
            shiftStart: userShift.start,
            shiftEnd: userShift.end
        };
        
        appState.isAdmin = user.isAdmin || false;
        
        // Update UI
        updateUIAfterLogin();
        
        // Switch screen
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('appScreen').classList.add('active');
        
        showNotification(`Login berhasil! Selamat datang ${user.name}`, 'success');
        
        // Reset form login
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    // Update UI setelah login
    function updateUIAfterLogin() {
        const user = appState.currentUser;
        
        // Update header
        document.getElementById('currentStaffName').textContent = user.name;
        document.getElementById('sidebarStaffName').textContent = user.name;
        
        // Update shift info
        const userShift = appState.shiftList.find(shift => shift.id === user.shift);
        document.getElementById('sidebarShift').textContent = userShift ? `${userShift.name} (${userShift.start} - ${userShift.end})` : '-';
        
        // Update jobdesk info
        const userJobdesk = appState.jobdeskList.find(jobdesk => jobdesk.id === user.jobdesk);
        document.getElementById('sidebarJobdesk').textContent = userJobdesk ? userJobdesk.name : '-';
        
        // Update permission quota
        updatePermissionQuota();
        
        // Update permission history
        updatePermissionHistory();
        
        // Update active permissions
        updateActivePermissions();
        
        // Show/hide settings button berdasarkan role
        document.getElementById('settingsBtn').style.display = appState.isAdmin ? 'flex' : 'none';
        
        // Disable permission buttons jika admin
        document.querySelectorAll('.btn-permission').forEach(btn => {
            btn.disabled = appState.isAdmin;
            if (appState.isAdmin) {
                btn.innerHTML = '<i class="fas fa-ban"></i> Tidak Tersedia untuk Admin';
            }
        });
    }

    // Update permission quota display
    function updatePermissionQuota() {
        const user = appState.currentUser;
        if (!user) return;
        
        // Hitung izin hari ini
        const today = new Date().toDateString();
        const userPermissions = appState.permissionHistory.filter(perm => 
            perm.staffId === user.username && 
            new Date(perm.startTime).toDateString() === today
        );
        
        const shortPermissions = userPermissions.filter(perm => perm.type === 'short').length;
        const mealPermissions = userPermissions.filter(perm => perm.type === 'meal').length;
        
        // Update counters
        document.getElementById('shortPermCount').textContent = shortPermissions;
        document.getElementById('mealPermCount').textContent = mealPermissions;
        
        // Update quota numbers
        document.getElementById('shortQuota').textContent = appState.settings.shortPermissionQuota;
        document.getElementById('mealQuota').textContent = appState.settings.mealPermissionQuota;
        
        // Update button states
        const shortBtn = document.querySelector('.btn-permission[data-type="short"]');
        const mealBtn = document.querySelector('.btn-permission[data-type="meal"]');
        
        if (shortBtn) {
            shortBtn.disabled = shortPermissions >= appState.settings.shortPermissionQuota || 
                               appState.currentPermission !== null ||
                               appState.isAdmin;
            shortBtn.innerHTML = shortPermissions >= appState.settings.shortPermissionQuota ? 
                '<i class="fas fa-ban"></i> Kuota Habis' : 
                '<i class="fas fa-play"></i> Mulai Izin';
        }
        
        if (mealBtn) {
            mealBtn.disabled = mealPermissions >= appState.settings.mealPermissionQuota || 
                              appState.currentPermission !== null ||
                              appState.isAdmin;
            mealBtn.innerHTML = mealPermissions >= appState.settings.mealPermissionQuota ? 
                '<i class="fas fa-ban"></i> Kuota Habis' : 
                '<i class="fas fa-play"></i> Mulai Izin';
        }
    }

    // Start permission
    function startPermission(type) {
        const user = appState.currentUser;
        if (!user || appState.currentPermission) return;
        
        // Cek kuota
        const today = new Date().toDateString();
        const userPermissions = appState.permissionHistory.filter(perm => 
            perm.staffId === user.username && 
            new Date(perm.startTime).toDateString() === today
        );
        
        const shortCount = userPermissions.filter(perm => perm.type === 'short').length;
        const mealCount = userPermissions.filter(perm => perm.type === 'meal').length;
        
        if (type === 'short' && shortCount >= appState.settings.shortPermissionQuota) {
            showNotification('Kuota izin 15 menit sudah habis untuk hari ini', 'warning');
            return;
        }
        
        if (type === 'meal' && mealCount >= appState.settings.mealPermissionQuota) {
            showNotification('Kuota izin ambil makan sudah habis untuk hari ini', 'warning');
            return;
        }
        
        // Cek jobdesk yang sama sedang izin
        const sameJobdeskActive = appState.activePermissions.some(perm => 
            perm.jobdesk === user.jobdesk
        );
        
        if (sameJobdeskActive) {
            showNotification(`Tidak dapat izin karena jobdesk ${getJobdeskName(user.jobdesk)} sedang izin`, 'warning');
            return;
        }
        
        // Buat permission record
        const now = new Date();
        const duration = type === 'short' ? appState.settings.shortPermissionDuration : appState.settings.mealPermissionDuration;
        const endTime = new Date(now.getTime() + duration * 60 * 1000);
        
        const permission = {
            id: 'perm_' + Date.now(),
            staffId: user.username,
            staffName: user.name,
            type: type,
            jobdesk: user.jobdesk,
            startTime: now.toISOString(),
            endTime: endTime.toISOString(),
            duration: duration,
            status: 'active'
        };
        
        appState.currentPermission = permission;
        appState.activePermissions.push(permission);
        
        // Update UI
        updateCurrentPermissionDisplay();
        updatePermissionQuota();
        updateActivePermissions();
        
        // Show animation jika enabled
        if (appState.settings.animationEnabled) {
            document.getElementById('sleepingAnimation').classList.add('active');
            setTimeout(() => {
                document.getElementById('sleepingAnimation').classList.remove('active');
            }, 3000);
        }
        
        showNotification(`Izin ${type === 'short' ? '15 menit' : 'ambil makan'} dimulai`, 'success');
        
        // Simpan ke history (akan diupdate ketika selesai)
        appState.permissionHistory.push(permission);
        saveToLocalStorage();
    }

    // Update current permission display
    function updateCurrentPermissionDisplay() {
        const container = document.getElementById('currentPermissionInfo');
        const permission = appState.currentPermission;
        
        if (!permission) {
            container.innerHTML = '<p class="no-data">Tidak ada izin aktif</p>';
            return;
        }
        
        const now = new Date();
        const endTime = new Date(permission.endTime);
        const remainingMs = endTime - now;
        
        if (remainingMs <= 0) {
            endPermission();
            return;
        }
        
        const remainingMinutes = Math.floor(remainingMs / 60000);
        const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
        
        const permissionType = permission.type === 'short' ? 'Izin 15 Menit' : 'Ambil Makan';
        
        container.innerHTML = `
            <div class="permission-active">
                <div class="permission-type">${permissionType}</div>
                <div class="timer">${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}</div>
                <div>Waktu tersisa</div>
                <button class="btn-end-permission" id="endPermissionBtn">
                    <i class="fas fa-stop"></i> Akhiri Izin
                </button>
            </div>
        `;
        
        // Add event listener untuk end button
        document.getElementById('endPermissionBtn').addEventListener('click', endPermission);
    }

    // End permission
    function endPermission() {
        if (!appState.currentPermission) return;
        
        const permission = appState.currentPermission;
        const now = new Date();
        
        // Update permission record
        permission.endTime = now.toISOString();
        permission.status = 'completed';
        
        // Hapus dari active permissions
        appState.activePermissions = appState.activePermissions.filter(perm => perm.id !== permission.id);
        appState.currentPermission = null;
        
        // Update UI
        updateCurrentPermissionDisplay();
        updatePermissionQuota();
        updateActivePermissions();
        updatePermissionHistory();
        
        showNotification('Izin telah selesai', 'success');
        saveToLocalStorage();
    }

    // Check active permissions (dipanggil setiap detik)
    function checkActivePermissions() {
        const now = new Date();
        
        // Cek permission saat ini
        if (appState.currentPermission) {
            const endTime = new Date(appState.currentPermission.endTime);
            if (now >= endTime) {
                endPermission();
            } else {
                updateCurrentPermissionDisplay();
            }
        }
        
        // Cek semua active permissions
        let updated = false;
        appState.activePermissions = appState.activePermissions.filter(perm => {
            const endTime = new Date(perm.endTime);
            if (now >= endTime) {
                perm.status = 'completed';
                updated = true;
                return false;
            }
            return true;
        });
        
        if (updated) {
            updateActivePermissions();
            saveToLocalStorage();
        }
    }

    // Update active permissions display
    function updateActivePermissions() {
        const container = document.getElementById('activePermissionsList');
        
        if (appState.activePermissions.length === 0) {
            container.innerHTML = '<p class="no-data">Tidak ada staff yang sedang izin</p>';
            return;
        }
        
        container.innerHTML = '';
        appState.activePermissions.forEach(perm => {
            const now = new Date();
            const endTime = new Date(perm.endTime);
            const remainingMs = endTime - now;
            const remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000));
            
            const permElement = document.createElement('div');
            permElement.className = 'permission-item';
            permElement.innerHTML = `
                <div class="staff-name">${perm.staffName}</div>
                <div class="permission-details">
                    <span>${perm.type === 'short' ? 'Izin 15 Menit' : 'Ambil Makan'}</span>
                    <span>${remainingMinutes} menit lagi</span>
                </div>
            `;
            container.appendChild(permElement);
        });
    }

    // Update permission history
    function updatePermissionHistory() {
        const user = appState.currentUser;
        const tbody = document.getElementById('permissionHistoryBody');
        
        if (!user) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">Tidak ada riwayat izin</td></tr>';
            return;
        }
        
        // Filter izin user
        const userPermissions = appState.permissionHistory.filter(perm => 
            perm.staffId === user.username
        ).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        if (userPermissions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">Tidak ada riwayat izin</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        userPermissions.forEach(perm => {
            const startDate = new Date(perm.startTime);
            const endDate = new Date(perm.endTime);
            const durationMs = endDate - startDate;
            const durationMinutes = Math.floor(durationMs / 60000);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(startDate)}</td>
                <td>${formatTime(startDate)}</td>
                <td>${formatTime(endDate)}</td>
                <td>${durationMinutes} menit</td>
                <td>${perm.type === 'short' ? 'Izin 15 Menit' : 'Ambil Makan'}</td>
                <td>${getJobdeskName(perm.jobdesk)}</td>
                <td><span class="status-badge ${perm.status === 'active' ? 'status-active' : 'status-completed'}">${perm.status === 'active' ? 'Aktif' : 'Selesai'}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    // Check previous active permission (saat reload)
    function checkPreviousActivePermission() {
        const user = appState.currentUser;
        if (!user) return;
        
        const today = new Date().toDateString();
        const activePermission = appState.permissionHistory.find(perm => 
            perm.staffId === user.username && 
            perm.status === 'active' &&
            new Date(perm.startTime).toDateString() === today
        );
        
        if (activePermission) {
            const now = new Date();
            const endTime = new Date(activePermission.endTime);
            
            // Jika masih dalam waktu izin
            if (now < endTime) {
                appState.currentPermission = activePermission;
                appState.activePermissions.push(activePermission);
                updateCurrentPermissionDisplay();
                updateActivePermissions();
            } else {
                // Jika sudah lewat waktu, mark as completed
                activePermission.status = 'completed';
                saveToLocalStorage();
            }
        }
    }

    // Format date
    function formatDate(date) {
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Format time
    function formatTime(date) {
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Get jobdesk name by ID
    function getJobdeskName(id) {
        const jobdesk = appState.jobdeskList.find(j => j.id === id);
        return jobdesk ? jobdesk.name : 'Unknown';
    }

    // Update clock
    function updateClock() {
        const now = new Date();
        
        // Digital clock
        const timeString = now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        document.getElementById('digitalClock').textContent = timeString;
        
        // Date display
        const dateString = now.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        document.getElementById('dateDisplay').textContent = dateString;
    }

    // Settings functions
    function openSettings() {
        if (!appState.isAdmin) {
            showNotification('Hanya admin yang dapat mengakses pengaturan', 'error');
            return;
        }
        
        document.getElementById('settingsModal').classList.add('active');
        updateSettingsUI();
    }

    function closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    function switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            }
        });
        
        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === `${tabId}-tab`) {
                pane.classList.add('active');
            }
        });
    }

    function updateSettingsUI() {
        // Update quota inputs
        document.getElementById('shortPermissionQuota').value = appState.settings.shortPermissionQuota;
        document.getElementById('mealPermissionQuota').value = appState.settings.mealPermissionQuota;
        document.getElementById('mealPermissionDuration').value = appState.settings.mealPermissionDuration;
        
        // Update animation toggle
        document.getElementById('animationToggle').checked = appState.settings.animationEnabled;
        
        // Update jobdesk select
        updateJobdeskSelect();
    }

    function updateJobdeskSelect() {
        const select = document.getElementById('newStaffJobdesk');
        select.innerHTML = '';
        
        appState.jobdeskList.forEach(jobdesk => {
            const option = document.createElement('option');
            option.value = jobdesk.id;
            option.textContent = jobdesk.name;
            select.appendChild(option);
        });
    }

    function updateStaffListTable() {
        const tbody = document.getElementById('staffListBody');
        tbody.innerHTML = '';
        
        appState.staffList.forEach(staff => {
            const shift = appState.shiftList.find(s => s.id === staff.shift);
            const jobdesk = appState.jobdeskList.find(j => j.id === staff.jobdesk);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${staff.name}</td>
                <td>${staff.username}</td>
                <td>${shift ? shift.name : '-'}</td>
                <td>${jobdesk ? jobdesk.name : '-'}</td>
                <td>
                    <button class="btn-small delete-staff" data-username="${staff.username}">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners untuk delete buttons
        document.querySelectorAll('.delete-staff').forEach(btn => {
            btn.addEventListener('click', function() {
                const username = this.getAttribute('data-username');
                deleteStaff(username);
            });
        });
    }

    function updateShiftListTable() {
        const tbody = document.getElementById('shiftListBody');
        tbody.innerHTML = '';
        
        appState.shiftList.forEach(shift => {
            const start = shift.start;
            const end = shift.end;
            
            // Hitung durasi
            const [startHour, startMinute] = start.split(':').map(Number);
            const [endHour, endMinute] = end.split(':').map(Number);
            
            let durationHours = endHour - startHour;
            if (durationHours < 0) durationHours += 24; // Untuk shift malam
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${shift.name}</td>
                <td>${start}</td>
                <td>${end}</td>
                <td>${durationHours} jam</td>
                <td>
                    <button class="btn-small delete-shift" data-id="${shift.id}">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners untuk delete buttons
        document.querySelectorAll('.delete-shift').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteShift(id);
            });
        });
    }

    function updateJobdeskListTable() {
        const tbody = document.getElementById('jobdeskListBody');
        tbody.innerHTML = '';
        
        appState.jobdeskList.forEach(jobdesk => {
            // Hitung jumlah staff dengan jobdesk ini
            const staffCount = appState.staffList.filter(staff => staff.jobdesk === jobdesk.id).length;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${jobdesk.name}</td>
                <td>${staffCount} staff</td>
                <td>
                    <button class="btn-small delete-jobdesk" data-id="${jobdesk.id}">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners untuk delete buttons
        document.querySelectorAll('.delete-jobdesk').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteJobdesk(id);
            });
        });
    }

    function addStaff() {
        const name = document.getElementById('newStaffName').value.trim();
        const username = document.getElementById('newStaffUsername').value.trim();
        const password = document.getElementById('newStaffPassword').value.trim();
        const shift = document.getElementById('newStaffShift').value;
        const jobdesk = document.getElementById('newStaffJobdesk').value;
        
        if (!name || !username || !password) {
            showNotification('Nama, username, dan password harus diisi', 'error');
            return;
        }
        
        // Cek apakah username sudah ada
        if (appState.staffList.some(staff => staff.username === username)) {
            showNotification('Username sudah digunakan', 'error');
            return;
        }
        
        // Tambah staff baru
        const newStaff = {
            name,
            username,
            password,
            shift,
            jobdesk,
            isAdmin: false
        };
        
        appState.staffList.push(newStaff);
        updateStaffListTable();
        saveToLocalStorage();
        
        // Reset form
        document.getElementById('newStaffName').value = '';
        document.getElementById('newStaffUsername').value = '';
        document.getElementById('newStaffPassword').value = '';
        
        showNotification('Staff berhasil ditambahkan', 'success');
    }

    function deleteStaff(username) {
        if (username === 'csline') {
            showNotification('Admin utama tidak dapat dihapus', 'error');
            return;
        }
        
        if (confirm('Apakah Anda yakin ingin menghapus staff ini?')) {
            appState.staffList = appState.staffList.filter(staff => staff.username !== username);
            updateStaffListTable();
            saveToLocalStorage();
            showNotification('Staff berhasil dihapus', 'success');
        }
    }

    function addShift() {
        const name = document.getElementById('newShiftName').value.trim();
        const start = document.getElementById('newShiftStart').value;
        const end = document.getElementById('newShiftEnd').value;
        
        if (!name || !start || !end) {
            showNotification('Nama shift, waktu mulai, dan waktu selesai harus diisi', 'error');
            return;
        }
        
        // Buat ID unik
        const id = 'shift_' + Date.now();
        
        // Tambah shift baru
        const newShift = {
            id,
            name,
            start,
            end
        };
        
        appState.shiftList.push(newShift);
        updateShiftListTable();
        saveToLocalStorage();
        
        // Update shift select
        const shiftSelect = document.getElementById('newStaffShift');
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${name} (${start} - ${end})`;
        shiftSelect.appendChild(option);
        
        // Reset form
        document.getElementById('newShiftName').value = '';
        
        showNotification('Shift berhasil ditambahkan', 'success');
    }

    function deleteShift(id) {
        // Cek apakah shift digunakan
        const isUsed = appState.staffList.some(staff => staff.shift === id);
        
        if (isUsed) {
            showNotification('Shift sedang digunakan dan tidak dapat dihapus', 'error');
            return;
        }
        
        if (confirm('Apakah Anda yakin ingin menghapus shift ini?')) {
            appState.shiftList = appState.shiftList.filter(shift => shift.id !== id);
            updateShiftListTable();
            saveToLocalStorage();
            showNotification('Shift berhasil dihapus', 'success');
        }
    }

    function addJobdesk() {
        const name = document.getElementById('newJobdeskName').value.trim();
        
        if (!name) {
            showNotification('Nama jobdesk harus diisi', 'error');
            return;
        }
        
        // Buat ID unik
        const id = 'jobdesk_' + Date.now();
        
        // Tambah jobdesk baru
        const newJobdesk = {
            id,
            name
        };
        
        appState.jobdeskList.push(newJobdesk);
        updateJobdeskListTable();
        updateJobdeskSelect();
        saveToLocalStorage();
        
        // Reset form
        document.getElementById('newJobdeskName').value = '';
        
        showNotification('Jobdesk berhasil ditambahkan', 'success');
    }

    function deleteJobdesk(id) {
        // Cek apakah jobdesk digunakan
        const isUsed = appState.staffList.some(staff => staff.jobdesk === id);
        
        if (isUsed) {
            showNotification('Jobdesk sedang digunakan dan tidak dapat dihapus', 'error');
            return;
        }
        
        if (confirm('Apakah Anda yakin ingin menghapus jobdesk ini?')) {
            appState.jobdeskList = appState.jobdeskList.filter(jobdesk => jobdesk.id !== id);
            updateJobdeskListTable();
            updateJobdeskSelect();
            saveToLocalStorage();
            showNotification('Jobdesk berhasil dihapus', 'success');
        }
    }

    function saveQuotaSettings() {
        const shortQuota = parseInt(document.getElementById('shortPermissionQuota').value);
        const mealQuota = parseInt(document.getElementById('mealPermissionQuota').value);
        const mealDuration = parseInt(document.getElementById('mealPermissionDuration').value);
        
        if (isNaN(shortQuota) || shortQuota < 1) {
            showNotification('Kuota izin 15 menit harus minimal 1', 'error');
            return;
        }
        
        if (isNaN(mealQuota) || mealQuota < 1) {
            showNotification('Kuota izin ambil makan harus minimal 1', 'error');
            return;
        }
        
        if (isNaN(mealDuration) || mealDuration < 1) {
            showNotification('Durasi ambil makan harus minimal 1 menit', 'error');
            return;
        }
        
        appState.settings.shortPermissionQuota = shortQuota;
        appState.settings.mealPermissionQuota = mealQuota;
        appState.settings.mealPermissionDuration = mealDuration;
        
        saveToLocalStorage();
        updatePermissionQuota();
        
        showNotification('Pengaturan kuota berhasil disimpan', 'success');
    }

    function updateLogo() {
        const logoUrl = document.getElementById('logoUrl').value.trim();
        
        if (!logoUrl) {
            showNotification('URL logo harus diisi', 'error');
            return;
        }
        
        document.getElementById('companyLogo').src = logoUrl;
        showNotification('Logo berhasil diupdate', 'success');
    }

    function updateBackground() {
        const backgroundUrl = document.getElementById('backgroundUrl').value.trim();
        
        if (!backgroundUrl) {
            showNotification('URL background harus diisi', 'error');
            return;
        }
        
        document.body.style.setProperty('--background-image', `url('${backgroundUrl}'), radial-gradient(circle at 20% 30%, rgba(30, 64, 175, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(30, 58, 138, 0.1) 0%, transparent 50%)`);
        showNotification('Background berhasil diupdate', 'success');
    }

    function changeThemeColor(color) {
        document.documentElement.style.setProperty('--primary-color', color);
        
        // Update active color
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('active');
        });
        event.target.classList.add('active');
        
        showNotification('Warna tema berhasil diubah', 'success');
    }

    function toggleAnimation() {
        appState.settings.animationEnabled = document.getElementById('animationToggle').checked;
        saveToLocalStorage();
    }

    function handleLogout() {
        appState.currentUser = null;
        appState.isAdmin = false;
        appState.currentPermission = null;
        
        // Switch screen
        document.getElementById('appScreen').classList.remove('active');
        document.getElementById('loginScreen').classList.add('active');
        
        showNotification('Logout berhasil', 'success');
    }

    function showNotification(message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        const toastMessage = toast.querySelector('.toast-message');
        
        // Set message
        toastMessage.textContent = message;
        
        // Set icon berdasarkan type
        const icon = toast.querySelector('.toast-icon');
        switch(type) {
            case 'success':
                icon.className = 'fas fa-check-circle toast-icon';
                toast.style.borderLeftColor = '#10b981';
                break;
            case 'error':
                icon.className = 'fas fa-exclamation-circle toast-icon';
                toast.style.borderLeftColor = '#ef4444';
                break;
            case 'warning':
                icon.className = 'fas fa-exclamation-triangle toast-icon';
                toast.style.borderLeftColor = '#f59e0b';
                break;
            default:
                icon.className = 'fas fa-info-circle toast-icon';
                toast.style.borderLeftColor = '#3b82f6';
        }
        
        // Show toast
        toast.classList.add('show');
        
        // Hide setelah 5 detik
        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    }

    // Inisialisasi aplikasi
    initializeApp();

});
