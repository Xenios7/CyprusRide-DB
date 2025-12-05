let map; 

async function signUp() {
    const payload = {
        username: document.getElementById("su-username").value,
        email: document.getElementById("su-email").value,
        password: document.getElementById("su-password").value, 
        first_name: document.getElementById("su-firstname").value,
        last_name: document.getElementById("su-lastname").value,
        dob: document.getElementById("su-dob").value,
        sex: document.getElementById("su-sex").value,
        ssn: document.getElementById("su-ssn").value,
        street: document.getElementById("su-street").value,
        postal_code: document.getElementById("su-postal").value,
        role: document.getElementById("su-role").value
    };

    const res = await fetch("/api/app/account/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
        alert("❌ " + data.message);
    } else {
        alert("✔ " + data.message);
        hideSignupForm();
    }
}

function showSignupForm() {
    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("signup-section").classList.remove("hidden");
}

function hideSignupForm() {
    document.getElementById("signup-section").classList.add("hidden");
    document.getElementById("login-section").classList.remove("hidden");
}

// =========================================================
// 1. LOGIN & AUTHENTICATION
// =========================================================
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value; 

    try {
        const response = await fetch('/api/app/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const user = await response.json();
            
            sessionStorage.setItem('currentUser', user.username);
            sessionStorage.setItem('userRoles', JSON.stringify(user.roles || [])); 
            sessionStorage.removeItem('ignoredRequests');

            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('dashboard-section').classList.remove('hidden');
            document.getElementById('user-display').innerText = user.name;

            setupDashboard(user.roles || []);
        } else {
            if (!response.ok) {
                const data = await response.json();
                document.getElementById('login-msg').innerText = data.message || "Λάθος στοιχεία.";
                return;
            }

        }
    } catch (error) {
        console.error(error);
        alert("Σφάλμα σύνδεσης με τον Server.");
    }
}

function setupDashboard(roles) {
    if (roles.includes("Admin")) document.getElementById("admin-features").classList.remove("hidden");
    if (roles.includes("Operator")) document.getElementById("operator-features").classList.remove("hidden");
    if (roles.includes("Driver")) document.getElementById("driver-features").classList.remove("hidden");
    if (roles.includes("Passenger")) document.getElementById("passenger-features").classList.remove("hidden");
}

function logout() {
    sessionStorage.clear();
    location.reload();
}

// =========================================================
// 2. ADMIN & REPORTS - ENHANCED VERSION WITH FILTERING
// =========================================================

window.currentReport = null;

// ========== COST ANALYSIS REPORT (WITH FILTERING) ==========
async function loadCostReport() {
    document.getElementById("table-title").innerText = "Ανάλυση Κόστους ανά Υπηρεσία";
    resetView();
    window.currentReport = 'cost';

    
    // Show the filter panel
    document.getElementById("cost-filters").classList.remove("hidden");
    
    // Load default data (no filters)
    await fetchCostReport();
}

async function fetchCostReport(params = {}) {
    try {
        // Build query string from parameters
        const queryParams = new URLSearchParams();
        
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.serviceId) queryParams.append('serviceId', params.serviceId);
        if (params.city) queryParams.append('city', params.city);
        if (params.groupBy) queryParams.append('groupBy', params.groupBy);
        if (params.timePeriod) queryParams.append('timePeriod', params.timePeriod);
        
        const url = `/api/app/reports/cost${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        
        console.log('Fetching:', url); 
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Σφάλμα από τον server");
        
        const data = await response.json();
        populateTable(data);
        
        // Update filter summary
        updateFilterSummary(params);
        
    } catch (error) {
        console.error(error);
        document.querySelector("#data-table tbody").innerHTML =
            "<tr><td colspan='100%'>Σφάλμα φόρτωσης δεδομένων.</td></tr>";
    }
}

function applyFilters() {
    if (window.currentReport !== 'cost') {
        alert('Παρακαλώ επιλέξτε πρώτα την Αναφορά Κόστους');
        return;
    }
    
    // Collect filter values
    const params = {};
    
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    const serviceId = document.getElementById('filter-service-id').value;
    const city = document.getElementById('filter-city').value;
    const groupBy = document.getElementById('filter-groupby').value;
    const timePeriod = document.getElementById('filter-timeperiod').value;
    
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (serviceId) params.serviceId = serviceId;
    if (city) params.city = city.trim();
    if (groupBy) params.groupBy = groupBy;
    
    // Only send timePeriod if groupBy is TimePeriod
    if (groupBy === 'TimePeriod' && timePeriod) {
        params.timePeriod = timePeriod;
    }
    
    // Fetch with filters
    fetchCostReport(params);
}

function clearFilters() {
    // Reset all filter inputs
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    document.getElementById('filter-service-id').value = '';
    document.getElementById('filter-city').value = '';
    document.getElementById('filter-groupby').value = 'Service';
    document.getElementById('filter-timeperiod').value = 'Daily';
    
    // Hide time period options
    document.getElementById('timeperiod-options').classList.add('hidden');
    
    // Hide summary
    document.getElementById('filter-summary').style.display = 'none';
    
    // Reload default data
    fetchCostReport();
}

function toggleTimePeriodOptions() {
    const groupBy = document.getElementById('filter-groupby').value;
    const timePeriodDiv = document.getElementById('timeperiod-options');
    
    if (groupBy === 'TimePeriod') {
        timePeriodDiv.classList.remove('hidden');
    } else {
        timePeriodDiv.classList.add('hidden');
    }
}

function updateFilterSummary(params) {
    const summary = document.getElementById('filter-summary');
    const content = document.getElementById('filter-summary-content');
    
    const items = [];
    
    if (params.startDate) items.push(`📅 Από: ${params.startDate}`);
    if (params.endDate) items.push(`📅 Έως: ${params.endDate}`);
    if (params.serviceId) {
        const serviceSelect = document.getElementById('filter-service-id');
        const serviceName = serviceSelect.options[serviceSelect.selectedIndex].text;
        items.push(`🚗 Υπηρεσία: ${serviceName}`);
    }
    if (params.city) items.push(`📍 Πόλη: ${params.city}`);
    if (params.groupBy) {
        const groupBySelect = document.getElementById('filter-groupby');
        const groupByName = groupBySelect.options[groupBySelect.selectedIndex].text;
        items.push(`📊 Ομαδοποίηση: ${groupByName}`);
    }
    if (params.timePeriod) {
        const timePeriodSelect = document.getElementById('filter-timeperiod');
        const timePeriodName = timePeriodSelect.options[timePeriodSelect.selectedIndex].text;
        items.push(`⏰ Περίοδος: ${timePeriodName}`);
    }
    
    if (items.length > 0) {
        content.innerHTML = items.join(' • ');
        summary.style.display = 'block';
    } else {
        summary.style.display = 'none';
    }
}

// ========== OTHER REPORTS (Keep your existing functions) ==========
// =========================================================
// DRIVER PERFORMANCE REPORT (WITH FILTERING)
// =========================================================

// ========== DRIVER PERFORMANCE REPORT (WITH FILTERING) ==========
async function loadDriverPerformance() {
    document.getElementById("table-title").innerText = "Απόδοση Οδηγών & Βαθμολογίες";
    resetView();  
    window.currentReport = 'driver-performance';
    
    // Show the filter panel
    document.getElementById("driver-performance-filters").classList.remove("hidden");
    
    // Load default data (no filters)
    await fetchDriverPerformance();
}

async function fetchDriverPerformance(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.serviceId) queryParams.append('serviceId', params.serviceId);
        if (params.city) queryParams.append('city', params.city);
        if (params.minTrips) queryParams.append('minTrips', params.minTrips);
        if (params.minRating) queryParams.append('minRating', params.minRating);
        if (params.orderBy) queryParams.append('orderBy', params.orderBy);
        
        const url = `/api/app/reports/driver-performance${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        
        console.log('Fetching:', url); 
        
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error("Σφάλμα από τον server");
        }
        
        const data = await response.json();
        populateTable(data);
        
        // Update filter summary
        updateDriverPerformanceSummary(params);
        
    } catch (error) {
        console.error(error);
        document.querySelector("#data-table tbody").innerHTML =
            `<tr><td colspan='100%'>Σφάλμα φόρτωσης δεδομένων. ${error.message}</td></tr>`;
    }
}

function applyDriverPerformanceFilters() {
    if (window.currentReport !== 'driver-performance') {
        alert('Παρακαλώ επιλέξτε πρώτα την Αναφορά Απόδοσης Οδηγών');
        return;
    }
    
    // Collect filter values
    const params = {};
    
    const startDate = document.getElementById('dp-filter-start-date').value;
    const endDate = document.getElementById('dp-filter-end-date').value;
    const serviceId = document.getElementById('dp-filter-service-id').value;
    const city = document.getElementById('dp-filter-city').value;
    const minTrips = document.getElementById('dp-filter-min-trips').value;
    const minRating = document.getElementById('dp-filter-min-rating').value;
    const orderBy = document.getElementById('dp-filter-orderby').value;
    
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (serviceId) params.serviceId = serviceId;
    if (city) params.city = city.trim();
    if (minTrips) params.minTrips = minTrips;
    if (minRating) params.minRating = minRating;
    if (orderBy) params.orderBy = orderBy;
    
    // Fetch with filters
    fetchDriverPerformance(params);
}

function clearDriverPerformanceFilters() {
    // Reset all filter inputs
    document.getElementById('dp-filter-start-date').value = '';
    document.getElementById('dp-filter-end-date').value = '';
    document.getElementById('dp-filter-service-id').value = '';
    document.getElementById('dp-filter-city').value = '';
    document.getElementById('dp-filter-min-trips').value = '';
    document.getElementById('dp-filter-min-rating').value = '';
    document.getElementById('dp-filter-orderby').value = 'TotalTrips';
    
    // Hide summary
    document.getElementById('dp-filter-summary').style.display = 'none';
    
    // Reload default data
    fetchDriverPerformance();
}

function updateDriverPerformanceSummary(params) {
    const summary = document.getElementById('dp-filter-summary');
    const content = document.getElementById('dp-filter-summary-content');
    
    const items = [];
    
    if (params.startDate) items.push(`📅 Από: ${params.startDate}`);
    if (params.endDate) items.push(`📅 Έως: ${params.endDate}`);
    if (params.serviceId) {
        const serviceSelect = document.getElementById('dp-filter-service-id');
        const serviceName = serviceSelect.options[serviceSelect.selectedIndex].text;
        items.push(`🚗 Υπηρεσία: ${serviceName}`);
    }
    if (params.city) items.push(`📍 Πόλη: ${params.city}`);
    if (params.minTrips) items.push(`🔢 Ελάχιστες Διαδρομές: ${params.minTrips}`);
    if (params.minRating) items.push(`⭐ Ελάχιστη Βαθμολογία: ${params.minRating}`);
    if (params.orderBy) {
        const orderBySelect = document.getElementById('dp-filter-orderby');
        const orderByName = orderBySelect.options[orderBySelect.selectedIndex].text;
        items.push(`📊 Ταξινόμηση: ${orderByName}`);
    }
    
    if (items.length > 0) {
        content.innerHTML = items.join(' • ');
        summary.style.display = 'block';
    } else {
        summary.style.display = 'none';
    }
}


// =========================================================
// TRIP STATISTICS REPORT (WITH FILTERING)
// =========================================================

// ========== TRIP STATISTICS REPORT (WITH FILTERING) ==========
async function loadRouteStatistics() {
    document.getElementById("table-title").innerText = "Στατιστικά Διαδρομών";
    resetView();
    window.currentReport = 'trip-statistics';
    
    // Show the filter panel
    document.getElementById("trip-statistics-filters").classList.remove("hidden");
    
    // Load default data (no filters)
    await fetchTripStatistics();
}

async function fetchTripStatistics(params = {}) {
    try {
        // Build query string from parameters
        const queryParams = new URLSearchParams();
        
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.city) queryParams.append('city', params.city);
        if (params.country) queryParams.append('country', params.country);
        if (params.groupBy) queryParams.append('groupBy', params.groupBy);
        
        const url = `/api/app/reports/trip-statistics${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        
        console.log('Fetching:', url); 
        
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error("Σφάλμα από τον server");
        }
        
        const data = await response.json();
        populateTable(data);
        
        // Update filter summary
        updateTripStatisticsSummary(params);
        
    } catch (error) {
        console.error(error);
        document.querySelector("#data-table tbody").innerHTML =
            `<tr><td colspan='100%'>Σφάλμα φόρτωσης δεδομένων. ${error.message}</td></tr>`;
    }
}

function applyTripStatisticsFilters() {
    if (window.currentReport !== 'trip-statistics') {
        alert('Παρακαλώ επιλέξτε πρώτα την Αναφορά Στατιστικών Διαδρομών');
        return;
    }
    
    // Collect filter values
    const params = {};
    
    const startDate = document.getElementById('ts-filter-start-date').value;
    const endDate = document.getElementById('ts-filter-end-date').value;
    const city = document.getElementById('ts-filter-city').value;
    const country = document.getElementById('ts-filter-country').value;
    const groupBy = document.getElementById('ts-filter-groupby').value;
    
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (city) params.city = city.trim();
    if (country) params.country = country.trim();
    if (groupBy) params.groupBy = groupBy;
    
    // Fetch with filters
    fetchTripStatistics(params);
}

function clearTripStatisticsFilters() {
    // Reset all filter inputs
    document.getElementById('ts-filter-start-date').value = '';
    document.getElementById('ts-filter-end-date').value = '';
    document.getElementById('ts-filter-city').value = '';
    document.getElementById('ts-filter-country').value = '';
    document.getElementById('ts-filter-groupby').value = '';
    
    // Hide summary
    document.getElementById('ts-filter-summary').style.display = 'none';
    
    // Reload default data
    fetchTripStatistics();
}

function updateTripStatisticsSummary(params) {
    const summary = document.getElementById('ts-filter-summary');
    const content = document.getElementById('ts-filter-summary-content');
    
    const items = [];
    
    if (params.startDate) items.push(`📅 Από: ${params.startDate}`);
    if (params.endDate) items.push(`📅 Έως: ${params.endDate}`);
    if (params.city) items.push(`📍 Πόλη: ${params.city}`);
    if (params.country) items.push(`🌍 Χώρα: ${params.country}`);
    if (params.groupBy) {
        const groupBySelect = document.getElementById('ts-filter-groupby');
        const groupByName = groupBySelect.options[groupBySelect.selectedIndex].text;
        items.push(`📊 Ομαδοποίηση: ${groupByName}`);
    } else {
        items.push(`📊 Ομαδοποίηση: Χωρίς (Overall)`);
    }
    
    if (items.length > 0) {
        content.innerHTML = items.join(' • ');
        summary.style.display = 'block';
    } else {
        summary.style.display = 'none';
    }
}




// =========================================================
// PEAK ACTIVITY PERIODS REPORT (WITH FILTERING)
// =========================================================

// ========== PEAK ACTIVITY PERIODS REPORT (WITH FILTERING) ==========
async function loadPeakActivity() {
    document.getElementById("table-title").innerText = "Περίοδοι Υψηλής Δραστηριότητας";
    resetView();
    window.currentReport = 'peak-activity';
    
    // Show the filter panel
    document.getElementById("peak-activity-filters").classList.remove("hidden");
    
    // Load default data (hourly grouping)
    await fetchPeakActivity();
}

async function fetchPeakActivity(params = {}) {
    try {
        // Build query string from parameters
        const queryParams = new URLSearchParams();
        
        if (params.serviceId) queryParams.append('serviceId', params.serviceId);
        if (params.city) queryParams.append('city', params.city);
        if (params.country) queryParams.append('country', params.country);
        if (params.periodType) queryParams.append('groupingLevel', params.periodType);
        
        const url = `/api/app/reports/peak-activity${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        
        console.log('Fetching:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error("Σφάλμα από τον server");
        }
        
        const data = await response.json();
        populateTable(data);
        
        // Update filter summary
        updatePeakActivitySummary(params);
        
    } catch (error) {
        console.error(error);
        document.querySelector("#data-table tbody").innerHTML =
            `<tr><td colspan='100%'>Σφάλμα φόρτωσης δεδομένων. ${error.message}</td></tr>`;
    }
}

function applyPeakActivityFilters() {
    if (window.currentReport !== 'peak-activity') {
        alert('Παρακαλώ επιλέξτε πρώτα την Αναφορά Περιόδων Αιχμής');
        return;
    }
    
    // Collect filter values
    const params = {};
    
    const serviceId = document.getElementById('pa-filter-service-id').value;
    const city = document.getElementById('pa-filter-city').value;
    const country = document.getElementById('pa-filter-country').value;
    const periodType = document.getElementById('pa-filter-period-type').value;
    
    if (serviceId) params.serviceId = serviceId;
    if (city) params.city = city.trim();
    if (country) params.country = country.trim();
    if (periodType) params.periodType = periodType; // Always has a value (default: Hourly)
    
    // Fetch with filters
    fetchPeakActivity(params);
}

function clearPeakActivityFilters() {
    // Reset all filter inputs
    document.getElementById('pa-filter-service-id').value = '';
    document.getElementById('pa-filter-city').value = '';
    document.getElementById('pa-filter-country').value = '';
    document.getElementById('pa-filter-period-type').value = 'Hourly';
    
    // Hide summary
    document.getElementById('pa-filter-summary').style.display = 'none';
    
    // Reload default data (Hourly)
    fetchPeakActivity({ periodType: 'Hourly' });
}

function updatePeakActivitySummary(params) {
    const summary = document.getElementById('pa-filter-summary');
    const content = document.getElementById('pa-filter-summary-content');
    
    const items = [];
    
    if (params.serviceId) {
        const serviceSelect = document.getElementById('pa-filter-service-id');
        const serviceName = serviceSelect.options[serviceSelect.selectedIndex].text;
        items.push(`🚗 Υπηρεσία: ${serviceName}`);
    }
    if (params.city) items.push(`📍 Πόλη: ${params.city}`);
    if (params.country) items.push(`🌍 Χώρα: ${params.country}`);
    
    // Period type is always present (default: Hourly)
    const periodType = params.periodType || 'Hourly';
    const periodSelect = document.getElementById('pa-filter-period-type');
    const periodName = Array.from(periodSelect.options)
        .find(opt => opt.value === periodType)?.text || 'Ωριαία (Hourly)';
    items.push(`⏰ Περίοδος: ${periodName}`);
    
    if (items.length > 0) {
        content.innerHTML = items.join(' • ');
        summary.style.display = 'block';
    } else {
        summary.style.display = 'none';
    }
}




async function loadDriverIncome() {
    document.getElementById("table-title").innerText = "Έσοδα Οδηγών";
    resetView();

    try {
        const currentUser = sessionStorage.getItem('currentUser');
        const response = await fetch(`/api/app/reports/driver-earnings?driverUsername=${currentUser}`);
        if (!response.ok) throw new Error("Σφάλμα από τον server");
        const data = await response.json();
        populateTable(data);
    } catch (error) {
        console.error(error);
        document.querySelector("#data-table tbody").innerHTML =
            "<tr><td colspan='100%'>Σφάλμα φόρτωσης δεδομένων.</td></tr>";
    }
}

// --- NEW ADMIN FEATURES---
function loadAllUsers() {
    document.getElementById('table-title').innerText = "Όλοι οι Χρήστες";
    resetView();
    fetchData('/api/admin/users');
}

let allRolesCache = []; 

async function loadUserRoleManagement() {
    document.getElementById('table-title').innerText = "Διαχείριση Χρηστών & Ρόλων";
    resetView();

    const tableHead = document.querySelector("#data-table thead");
    const tableBody = document.querySelector("#data-table tbody");
    const loading = document.getElementById("loading");
    loading.classList.remove('hidden');

    try {
        const rolesResponse = await fetch('/api/app/admin/roles');
        if (!rolesResponse.ok) throw new Error("Σφάλμα φόρτωσης ρόλων");
        allRolesCache = await rolesResponse.json();

        const usersResponse = await fetch('/api/app/admin/users-with-roles');
        if (!usersResponse.ok) throw new Error("Σφάλμα φόρτωσης χρηστών");
        const users = await usersResponse.json();

        tableHead.innerHTML = "";
        tableBody.innerHTML = "";

        const headerRow = document.createElement("tr");
        ["user_id", "username", "email", "is_active", "roles", "Ενέργειες"].forEach(col => {
            const th = document.createElement("th");
            th.innerText = col;
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        users.forEach(u => {
            const tr = document.createElement("tr");

            const cols = ["user_id", "username", "email", "is_active", "roles"];
            cols.forEach(key => {
                const td = document.createElement("td");
                td.innerText = u[key] !== null ? u[key] : "-";
                tr.appendChild(td);
            });

            const actionTd = document.createElement("td");

            const select = document.createElement("select");
            allRolesCache.forEach(r => {
                const opt = document.createElement("option");
                opt.value = r.role_id;
                opt.text = r.role_name;
                select.appendChild(opt);
            });

            const btn = document.createElement("button");
            btn.innerText = "Ανάθεση Ρόλου";
            btn.style.marginLeft = "8px";
            btn.onclick = () => {
                const roleId = parseInt(select.value);
                assignRoleToUser(u.user_id, roleId);
            };

            actionTd.appendChild(select);
            actionTd.appendChild(btn);
            tr.appendChild(actionTd);

            tableBody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = "<tr><td colspan='100%'>Σφάλμα φόρτωσης δεδομένων.</td></tr>";
    } finally {
        loading.classList.add('hidden');
    }
}


async function assignRoleToUser(userId, roleId) {
    if (!confirm(`Ανάθεση ρόλου (ID=${roleId}) στον χρήστη ${userId};`)) return;

    try {
        const resp = await fetch('/api/app/admin/assign-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, roleId })
        });

        if (resp.ok) {
            alert("Ο ρόλος ανατέθηκε επιτυχώς.");
            loadUserRoleManagement();
        } else {
            alert("Σφάλμα κατά την ανάθεση ρόλου.");
        }
    } catch (err) {
        console.error(err);
        alert("Σφάλμα επικοινωνίας με τον server.");
    }
}

function loadPendingDriverRegistrations() {
    document.getElementById('table-title').innerText = "Εγκρίσεις Οδηγών";
    resetView();
    fetchData('/api/admin/pending-drivers');
}

function loadPendingOperatorRegistrations() {
    document.getElementById('table-title').innerText = "Εγκρίσεις Λειτουργών";
    resetView();
    fetchData('/api/admin/pending-operators');
}

function loadAllDriverDocuments() {
    document.getElementById('table-title').innerText = "Έγγραφα Οδηγών";
    resetView();
    fetchData('/api/admin/driver-documents');
}

function loadServiceTypes() {
    document.getElementById('table-title').innerText = "Τύποι Υπηρεσιών";
    resetView();
    fetchData('/api/admin/service-types');
}

function loadVehicleStandards() {
    document.getElementById('table-title').innerText = "Προδιαγραφές Οχημάτων";
    resetView();
    fetchData('/api/admin/vehicle-standards');
}

function loadPayments() {
    document.getElementById('table-title').innerText = "Πληρωμές & Προμήθειες";
    resetView();
    fetchData('/api/admin/payments');
}

function loadSystemLogs() {
    document.getElementById('table-title').innerText = "Ιστορικό Ενεργειών";
    resetView();
    fetchData('/api/admin/logs');
}

function loadGDPRRequests() {
    document.getElementById('table-title').innerText = "GDPR Αιτήματα Διαγραφής";
    resetView();
    fetchData('/api/app/admin/gdpr-requests'); 
}

function loadRouteStatistics() {
    document.getElementById('table-title').innerText = "Στατιστικά Διαδρομών";
    resetView();
    fetchData('/api/admin/reports/route-statistics');
}

function loadDriverIncome() {
    document.getElementById('table-title').innerText = "Έσοδα Οδηγών";
    resetView();
    fetchData('/api/admin/reports/driver-income');
}

// =========================================================
// 3. OPERATOR FEATURES
// =========================================================
async function loadPendingDocuments() {
    document.getElementById('table-title').innerText = 'Έγγραφα προς Έλεγχο (Pending)';
    resetView();
    fetchData('/api/app/operator/pending-documents');
}

async function verifyDocument(docId, status) {
    const comments = prompt(`Εισάγετε σχόλια για την ${status}:`, "OK");
    if (comments === null) return; 

    try {
        const response = await fetch('/api/app/operator/verify-document', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ docId, status, comments })
        });

        if (response.ok) {
            alert(`Το έγγραφο ${docId} καταχωρήθηκε ως ${status}.`);
            loadPendingDocuments();
        } else {
            alert("Σφάλμα κατά την ενημέρωση.");
        }
    } catch (error) { 
        console.error(error); 
        alert("Σφάλμα επικοινωνίας με τον server.");
    }
}

async function loadOperatorServiceTypes() {
    document.getElementById("table-title").innerText = "Τύποι Υπηρεσιών (Operator)";
    resetView();

    const tableHead = document.querySelector("#data-table thead");
    const tableBody = document.querySelector("#data-table tbody");

    const loading = document.getElementById("loading");
    loading.classList.remove("hidden");

    try {
        const response = await fetch("/api/app/operator/service-types");
        const data = await response.json();

        tableHead.innerHTML = "";
        tableBody.innerHTML = "";

        const headerRow = document.createElement("tr");
        ["service_id", "type", "description", "base_fare", "cost_per_minute", "cost_per_km", "minimum_fare", "Actions"]
            .forEach(col => {
                const th = document.createElement("th");
                th.innerText = col;
                headerRow.appendChild(th);
            });
        tableHead.appendChild(headerRow);

        data.forEach(row => {
            const tr = document.createElement("tr");

            ["service_id", "type", "description", "base_fare", "cost_per_minute", "cost_per_km", "minimum_fare"]
                .forEach(key => {
                    const td = document.createElement("td");
                    td.innerText = row[key];
                    tr.appendChild(td);
                });

            const actionTd = document.createElement("td");
            actionTd.style.display = "flex";
            actionTd.style.gap = "8px";

            const editBtn = document.createElement("button");
            editBtn.innerText = "✏ Επεξεργασία";
            editBtn.style.backgroundColor = "#ffc107";
            editBtn.onclick = () => showEditServiceTypeForm(row);

            const deleteBtn = document.createElement("button");
            deleteBtn.innerText = "🗑 Διαγραφή";
            deleteBtn.style.backgroundColor = "#dc3545";
            deleteBtn.onclick = () => deleteServiceType(row.service_id);

            actionTd.appendChild(editBtn);
            actionTd.appendChild(deleteBtn);

            tr.appendChild(actionTd);
            tableBody.appendChild(tr);
        });

        const addBtn = document.createElement("button");
        addBtn.innerText = "➕ Νέος Τύπος Υπηρεσίας";
        addBtn.style.marginTop = "15px";
        addBtn.onclick = showAddServiceTypeForm;

        tableBody.appendChild(document.createElement("tr")).appendChild(addBtn);

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = "<tr><td colspan='100%'>Σφάλμα φόρτωσης</td></tr>";
    } finally {
        loading.classList.add("hidden");
    }
}

function showAddServiceTypeForm() {
    document.getElementById("service-type-form-title").innerText = "Νέος Τύπος Υπηρεσίας";
    resetView();

    document.getElementById("st-type").value = "";
    document.getElementById("st-description").value = "";
    document.getElementById("st-base-fare").value = "";
    document.getElementById("st-cpm").value = "";
    document.getElementById("st-cpk").value = "";
    document.getElementById("st-minfare").value = "";

    document.getElementById("service-type-form").classList.remove("hidden");
    window.currentServiceTypeId = null;
}

function showEditServiceTypeForm(row) {
    document.getElementById("service-type-form-title").innerText = "Επεξεργασία Τύπου Υπηρεσίας";
    resetView();

    document.getElementById("st-type").value = row.type;
    document.getElementById("st-description").value = row.description;
    document.getElementById("st-base-fare").value = row.base_fare;
    document.getElementById("st-cpm").value = row.cost_per_minute;
    document.getElementById("st-cpk").value = row.cost_per_km;
    document.getElementById("st-minfare").value = row.minimum_fare;

    window.currentServiceTypeId = row.service_id;

    document.getElementById("service-type-form").classList.remove("hidden");
}

async function submitServiceType() {
    const payload = {
        type: document.getElementById("st-type").value,
        description: document.getElementById("st-description").value,
        base_fare: parseFloat(document.getElementById("st-base-fare").value),
        cost_per_minute: parseFloat(document.getElementById("st-cpm").value),
        cost_per_km: parseFloat(document.getElementById("st-cpk").value),
        minimum_fare: parseFloat(document.getElementById("st-minfare").value)
    };

    let endpoint;
    let method;

    if (window.currentServiceTypeId) {
        endpoint = `/api/app/operator/service-types/${window.currentServiceTypeId}`;
        method = "PUT";
    }

    else {
        endpoint = "/api/app/operator/service-types";
        method = "POST";
    }

    const response = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        alert("Αποθηκεύτηκε!");
        hideServiceTypeForm();
        loadOperatorServiceTypes();
    } else {
        alert("Σφάλμα.");
    }
}

function hideServiceTypeForm() {
    document.getElementById("service-type-form").classList.add("hidden");
}

async function deleteServiceType(id) {
    if (!confirm("Διαγραφή τύπου υπηρεσίας;")) return;

    const response = await fetch(`/api/app/operator/service-types/${id}`, {
        method: "DELETE"
    });


    if (response.ok) {
        alert("Διαγράφηκε!");
        loadOperatorServiceTypes();
    } else {
        alert("Σφάλμα διαγραφής.");
    }
}

async function loadVehiclePrerequisites(vehicleId) {
    resetView();

    document.getElementById("table-title").innerText =
        "Προαπαιτούμενα Οχήματος #" + vehicleId;

    const tableHead = document.querySelector("#data-table thead");
    const tableBody = document.querySelector("#data-table tbody");
    const loading = document.getElementById("loading");

    loading.classList.remove("hidden");

    try {
        const response = await fetch(`/api/app/operator/vehicle-prerequisites/${vehicleId}`);
        const data = await response.json();

        tableHead.innerHTML = "";
        tableBody.innerHTML = "";

        // HEADER ROW
        const headerRow = document.createElement("tr");
        ["prerequisites_id", "description", "value", "age_limit", "type", "Actions"]
            .forEach(col => {
                const th = document.createElement("th");
                th.innerText = col;
                headerRow.appendChild(th);
            });
        tableHead.appendChild(headerRow);

        // DATA ROWS
        data.forEach(p => {
            const tr = document.createElement("tr");

            ["prerequisites_id", "description", "value", "age_limit", "type"]
                .forEach(key => {
                    const td = document.createElement("td");
                    td.innerText = p[key] ?? "-";
                    tr.appendChild(td);
                });

            // ACTION BUTTONS
            const actionTd = document.createElement("td");
            actionTd.style.display = "flex";
            actionTd.style.gap = "8px";

            const editBtn = document.createElement("button");
            editBtn.innerText = "✏ Επεξεργασία";
            editBtn.style.background = "#ffc107";
            editBtn.onclick = () => showEditPrerequisiteForm(vehicleId, p);

            const deleteBtn = document.createElement("button");
            deleteBtn.innerText = "🗑 Διαγραφή";
            deleteBtn.style.background = "#dc3545";
            deleteBtn.onclick = () =>
                deleteVehiclePrerequisite(p.prerequisites_id, vehicleId);

            actionTd.appendChild(editBtn);
            actionTd.appendChild(deleteBtn);

            tr.appendChild(actionTd);
            tableBody.appendChild(tr);
        });

        // ADD NEW BUTTON
        const addBtn = document.createElement("button");
        addBtn.innerText = "➕ Νέο Προαπαιτούμενο";
        addBtn.style.marginTop = "15px";
        addBtn.onclick = () => showAddPrerequisiteForm(vehicleId);

        tableBody.appendChild(document.createElement("tr")).appendChild(addBtn);

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = "<tr><td colspan='100%'>Σφάλμα φόρτωσης.</td></tr>";
    } finally {
        loading.classList.add("hidden");
    }
}

function showAddPrerequisiteForm(vehicleId) {
    window.currentPrerequisiteId = null;
    window.currentVehicleId = vehicleId;

    document.getElementById("prerequisite-form-title").innerText =
        "Νέο Προαπαιτούμενο";

    document.getElementById("pre-description").value = "";
    document.getElementById("pre-value").value = "";
    document.getElementById("pre-age").value = "";
    document.getElementById("pre-type").value = "";

    document.getElementById("prerequisite-form").classList.remove("hidden");
}


function showEditPrerequisiteForm(vehicleId, p) {
    window.currentPrerequisiteId = p.prerequisites_id;
    window.currentVehicleId = vehicleId;

    document.getElementById("prerequisite-form-title").innerText =
        "Επεξεργασία Προαπαιτούμενου";

    document.getElementById("pre-description").value = p.description;
    document.getElementById("pre-value").value = p.value;
    document.getElementById("pre-age").value = p.age_limit ?? "";
    document.getElementById("pre-type").value = p.type;

    document.getElementById("prerequisite-form").classList.remove("hidden");
}


async function submitPrerequisite() {
    const payload = {
        vehicle_id: window.currentVehicleId,
        description: document.getElementById("pre-description").value,
        value: document.getElementById("pre-value").value,
        age_limit: document.getElementById("pre-age").value || null,
        type: document.getElementById("pre-type").value
    };

    let endpoint, method;

    if (window.currentPrerequisiteId) {
        endpoint = `/api/app/operator/vehicle-prerequisites/${window.currentPrerequisiteId}`;
        method = "PUT";
    } else {
        endpoint = "/api/app/operator/vehicle-prerequisites";
        method = "POST";
    }

    const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("Αποθηκεύτηκε!");
        hidePrerequisiteForm();
        loadVehiclePrerequisites(window.currentVehicleId);
    } else {
        alert("Σφάλμα.");
    }
}

async function deleteVehiclePrerequisite(id, vehicleId) {
    if (!confirm("Σίγουρα θέλετε να το διαγράψετε;")) return;

    await fetch(`/api/app/operator/vehicle-prerequisites/${id}`, {
        method: "DELETE"
    });

    loadVehiclePrerequisites(vehicleId);
}

async function loadOperatorVehicles() {
    document.getElementById('table-title').innerText = "Οχήματα";
    resetView();

    const tableHead = document.querySelector("#data-table thead");
    const tableBody = document.querySelector("#data-table tbody");
    const loading = document.getElementById("loading");
    loading.classList.remove("hidden");

    try {
        const response = await fetch("/api/app/operator/vehicles");
        const data = await response.json();

        tableHead.innerHTML = "";
        tableBody.innerHTML = "";

        const headerRow = document.createElement("tr");
        ["vehicle_id", "make", "model", "year", "license_plate", "Actions"]
            .forEach(col => {
                const th = document.createElement("th");
                th.innerText = col;
                headerRow.appendChild(th);
            });
        tableHead.appendChild(headerRow);

        data.forEach(v => {
            const tr = document.createElement("tr");

            ["vehicle_id", "make", "model", "year", "license_plate"]
                .forEach(key => {
                    const td = document.createElement("td");
                    td.innerText = v[key];
                    tr.appendChild(td);
                });

            const actionTd = document.createElement("td");
            const btn = document.createElement("button");
            btn.innerText = "⚙ Προαπαιτούμενα";
            btn.style.backgroundColor = "#007bff";
            btn.onclick = () => loadVehiclePrerequisites(v.vehicle_id);

            actionTd.appendChild(btn);
            tr.appendChild(actionTd);

            tableBody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = "<tr><td colspan='100%'>Σφάλμα φόρτωσης οχημάτων.</td></tr>";
    } finally {
        loading.classList.add("hidden");
    }
}

function hidePrerequisiteForm() {
    document.getElementById("prerequisite-form").classList.add("hidden");
}

document.getElementById("prerequisite-submit").onclick = submitPrerequisite;

// =========================================================
// 4. DRIVER FEATURES
// =========================================================
async function loadOpenRequests() {
    document.getElementById('table-title').innerText = 'Διαθέσιμα Αιτήματα Διαδρομών';
    resetView();
    fetchData('/api/app/driver/open-requests');
}

async function loadAvailability() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) return;
    document.getElementById('table-title').innerText = 'Πρόγραμμα Διαθεσιμότητας';
    resetView();
    fetchData(`/api/app/driver/availability/${currentUser}`);
}

// --- ADD SHIFT ---
function showAddShiftForm() {
    document.getElementById('table-title').innerText = 'Προσθήκη Βάρδιας';
    resetView();
    document.getElementById('add-shift-form').classList.remove('hidden');
}

async function submitShift() {
    const currentUser = sessionStorage.getItem('currentUser');
    const shiftData = {
        username: currentUser,
        weekday: document.getElementById('shift-day').value,
        start: document.getElementById('shift-start').value,
        end: document.getElementById('shift-end').value
    };
    
    try {
        const response = await fetch('/api/app/driver/add-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shiftData)
        });
        
        if (response.ok) {
            alert("Η βάρδια προστέθηκε επιτυχώς!");
            loadAvailability();
        } else {
            alert("Σφάλμα κατά την προσθήκη.");
        }
    } catch (error) {
        console.error(error);
        alert("Σφάλμα σύνδεσης.");
    }
}

// --- DOCUMENTS ---
function showUploadForm() {
    document.getElementById('table-title').innerText = 'Υποβολή Εγγράφου';
    resetView();
    document.getElementById('document-form').classList.remove('hidden');
}

async function submitDocument() {
    const currentUser = sessionStorage.getItem('currentUser');
    const docData = {
        username: currentUser,
        docType: document.getElementById('doc-type').value,
        docNumber: document.getElementById('doc-number').value,
        fileUrl: document.getElementById('doc-url').value,
        issueDate: document.getElementById('doc-issue').value,
        expiryDate: document.getElementById('doc-expiry').value
    };
    try {
        const response = await fetch('/api/app/driver/upload-document', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(docData)
        });
        if (response.ok) {
            alert("Το έγγραφο υποβλήθηκε επιτυχώς!");
            document.getElementById('document-form').classList.add('hidden');
        } else { alert("Σφάλμα υποβολής."); }
    } catch(e) { console.error(e); alert("Σφάλμα σύνδεσης."); }
}

// --- OFFERS ---
async function makeOffer(requestId, estimatedFare) {
    const costInput = prompt("Εισάγετε το κόστος της προσφοράς σας (€):", estimatedFare);
    if (costInput === null) return;

    const driverId = 1; 
    const vehicleId = 1; 

    try {
        const response = await fetch('/api/app/driver/submit-offer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requestId, driverId, vehicleId, estimatedCost: parseFloat(costInput)
            })
        });

        if (response.ok) {
            alert("Η προσφορά στάλθηκε επιτυχώς!");
            hideRequestLocally(requestId);
            loadOpenRequests(); 
        } else {
            alert("Σφάλμα υποβολής.");
        }
    } catch (error) {
        console.error(error);
        alert("Σφάλμα επικοινωνίας.");
    }
}

function rejectRequest(requestId) {
    if(!confirm("Είστε σίγουροι ότι θέλετε να απορρίψετε αυτό το αίτημα;")) return;
    hideRequestLocally(requestId);
    loadOpenRequests(); 
}

function hideRequestLocally(requestId) {
    let ignored = JSON.parse(sessionStorage.getItem('ignoredRequests') || "[]");
    ignored.push(requestId);
    sessionStorage.setItem('ignoredRequests', JSON.stringify(ignored));
}

// --- ACTIVE TRIP MANAGEMENT ---
async function showActiveTripScreen() {
    document.getElementById('table-title').innerText = 'Τρέχουσα Διαδρομή';
    resetView();
    document.getElementById('active-trip-screen').classList.remove('hidden');
    
    const currentUser = sessionStorage.getItem('currentUser');
    const container = document.getElementById('active-trip-content');
    const btnStart = document.getElementById('btn-start-trip');
    const btnEnd = document.getElementById('btn-end-trip');

    btnStart.classList.add('hidden');
    btnEnd.classList.add('hidden');
    container.innerHTML = "Αναζήτηση...";

    try {
        const response = await fetch(`/api/app/driver/active-trip/${currentUser}`);
        const data = await response.json();

        if (data.length > 0) {
            const trip = data[0];
            container.innerHTML = `
                <h2 style="color:#2c3e50;">${trip.PassengerName}</h2>
                <p>📍 <strong>Παραλαβή:</strong> ${trip.pickup_latitude}, ${trip.pickup_longitude}</p>
                <p>📍 <strong>Προορισμός:</strong> ${trip.dropoff_latitude}, ${trip.dropoff_longitude}</p>
                <p>💰 <strong>Κόστος:</strong> €${trip.Fare}</p>
                <p>Status: <strong>${trip.TripStatus}</strong></p>
            `;

            if (trip.TripStatus === 'Scheduled') {
                btnStart.classList.remove('hidden');
                btnStart.onclick = () => updateTripStatus(trip.trip_id, 'In Progress');
            } else if (trip.TripStatus === 'In Progress') {
                btnEnd.classList.remove('hidden');
                btnEnd.onclick = () => updateTripStatus(trip.trip_id, 'Completed');
            }
        } else {
            container.innerHTML = "<p>Δεν υπάρχει ενεργή διαδρομή αυτή τη στιγμή.</p>";
        }
    } catch (e) { console.error(e); }
}

async function updateTripStatus(tripId, status) {
    if(!confirm(`Επιβεβαίωση αλλαγής κατάστασης σε: ${status}?`)) return;
    
    try {
        await fetch('/api/app/driver/update-trip', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ tripId, status })
        });

        // IF TRIP IS COMPLETED -> SHOW RATING POPUP
        if (status === 'Completed') {
            document.getElementById('active-trip-screen').classList.add('hidden');
            showRatingModal(tripId);
        } else {
            showActiveTripScreen();
        }
    } catch (e) { console.error(e); }
}

//  Driver earnings screen.
async function loadDriverEarnings() {
    const currentUser = sessionStorage.getItem('currentUser');
    document.getElementById('table-title').innerText = 'Τα Έσοδά Μου';
    resetView();

    try {
        const response = await fetch(`/api/app/driver/earnings/${currentUser}`);
        const data = await response.json();

        console.log("RAW EARNINGS RESPONSE:", data);

        let amount = 0;

        if (Array.isArray(data) && data.length > 0) {
            const raw = data[0].TotalEarnings;

            console.log("RAW TotalEarnings:", raw);

            if (raw === null || raw === undefined || raw === "") {
                amount = 0;
            } else {
                amount = Number(raw);
            }

            console.log("PARSED amount:", amount);
        }

        const tableHead = document.querySelector("#data-table thead");
        const tableBody = document.querySelector("#data-table tbody");

        tableHead.innerHTML = "<tr><th>Σύνολο Εσόδων</th></tr>";
        tableBody.innerHTML = `<tr><td>€${amount.toFixed(2)}</td></tr>`;
    }
    catch (error) {
        console.error("ERROR:", error);
        alert("Σφάλμα φόρτωσης εσόδων.");
    }
}

//  GDPR delete account.
async function createGdprRequest() {
    const currentUser = sessionStorage.getItem('currentUser');

    if (!confirm("Θέλετε σίγουρα να στείλετε αίτημα GDPR διαγραφής;")) {
        return;
    }

    try {
        const response = await fetch('/api/app/driver/gdpr-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser })
        });

        if (response.ok) {
            alert("Το αίτημα GDPR στάλθηκε. Περιμένετε έγκριση από διαχειριστή.");
        } else {
            alert("Σφάλμα αποστολής αιτήματος.");
        }
    } catch (e) {
        console.error(e);
        alert("Σφάλμα σύνδεσης.");
    }
}

// =========================================================
// 5. PASSENGER FUNCTIONS
// =========================================================

function showRequestForm() {
    document.getElementById('table-title').innerText = 'Νέα Διαδρομή';
    resetView();
    document.getElementById('request-form').classList.remove('hidden');
}

async function submitRequest() {
    const currentUser = sessionStorage.getItem('currentUser');
    const serviceId = document.getElementById('service-select').value;
    const notes = document.getElementById('request-notes').value;
    const pickupLat = 35.1700;
    const pickupLon = 33.3600;
    const dropoffLat = 34.9200;
    const dropoffLon = 33.6300;
    
    try {
        const response = await fetch('/api/app/passenger/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: currentUser, 
                serviceId: serviceId,
                pickupLat: pickupLat, pickupLon: pickupLon,
                dropoffLat: dropoffLat, dropoffLon: dropoffLon,
                notes: notes
            })
        });
        
        if (response.ok) {
            const res = await response.json();
            alert("✅ Αίτημα εστάλη! Αναζήτηση οδηγών...");
            sessionStorage.setItem('currentRequestId', res.requestId);
            loadOffers(res.requestId);
        } else {
            alert('❌ Αποτυχία αποστολής');
        }
    } catch(e) { console.error(e); }
}

async function loadPassengerHistory() {
    const currentUser = sessionStorage.getItem('currentUser');
    document.getElementById('table-title').innerText = 'Ιστορικό';
    resetView();
    
    try {
        const response = await fetch(`/api/app/passenger/history/${currentUser}`);
        const history = await response.json();
        
        if (history.length === 0) {
            // Empty history
        }
        fetchData(`/api/app/passenger/history/${currentUser}`);
    } catch (error) { console.error(error); }
}

// Global variable for offer polling
let offerPollingInterval; 

// --- ENHANCED OFFERS & MAP (With Auto-Refresh) ---
async function loadOffers(requestId) {
    resetView();
    const section = document.getElementById('offers-section');
    section.classList.remove('hidden');
    
    const container = document.getElementById('offers-container');
    
    if (offerPollingInterval) clearInterval(offerPollingInterval);

    const fetchAndRender = async () => {
        try {
            if (section.classList.contains('hidden')) {
                clearInterval(offerPollingInterval);
                return;
            }

            const response = await fetch(`/api/app/passenger/offers/${requestId}`);
            const offers = await response.json();
            
            if(offers.length === 0) { 
                if(!container.innerHTML.includes("Αναζήτηση")) {
                    container.innerHTML = "<p>🔍 Αναζήτηση οδηγών... (Ανανέωση κάθε 5δ)</p>"; 
                }
                return; 
            }

            container.innerHTML = ""; 

            if (map) { 
                map.remove(); 
                map = null; 
            }

            map = L.map('map');
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);

            const pickup = [parseFloat(offers[0].pickup_latitude), parseFloat(offers[0].pickup_longitude)];
            const dropoff = [parseFloat(offers[0].dropoff_latitude), parseFloat(offers[0].dropoff_longitude)];
            
            const startIcon = L.divIcon({html: '🟢', className: 'map-icon', iconSize: [24, 24]});
            const endIcon = L.divIcon({html: '🏁', className: 'map-icon', iconSize: [24, 24]});

            L.marker(pickup, {icon: startIcon}).addTo(map).bindPopup("<b>Παραλαβή</b>").openPopup();
            L.marker(dropoff, {icon: endIcon}).addTo(map).bindPopup("<b>Προορισμός</b>");
            
            L.polyline([pickup, dropoff], {color: '#3388ff', dashArray: '5, 10', weight: 4}).addTo(map);
            
            offers.forEach((offer) => {
                const offset = (Math.random() - 0.5) * 0.005; 
                const driverPos = [pickup[0] + offset, pickup[1] + offset];
                
                const carIcon = L.divIcon({
                    html: '<div style="font-size:24px;">🚖</div>',
                    className: 'dummy-class',
                    iconSize: [30, 30]
                });
                
                L.marker(driverPos, {icon: carIcon}).addTo(map)
                    .bindPopup(`<b>${offer.DriverName}</b><br>${offer.VehicleModel}<br>€${offer.estimated_cost}`);

                const card = document.createElement('div');
                card.style.cssText = `
                    border: 1px solid #ddd; border-left: 5px solid #28a745; 
                    background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; 
                    display: flex; justify-content: space-between; align-items: center;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                `;

                card.innerHTML = `
                    <div>
                        <h3 style="margin:0; color:#333;">🚘 ${offer.DriverName}</h3>
                        <div style="color:#666; font-size:0.9em;">
                            ${offer.VehicleModel}<br>⭐ 5.0 Rating
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1.5em; font-weight:bold; color:#28a745;">€${parseFloat(offer.estimated_cost).toFixed(2)}</div>
                        <button class="btn-primary" style="margin-top:5px; padding: 5px 15px; cursor:pointer;">Επιλογή ✔️</button>
                    </div>
                `;
                
                const btn = card.querySelector('button');
                btn.onclick = () => acceptOffer(offer.offer_id, requestId);
                
                container.appendChild(card);
            });

            const bounds = L.latLngBounds([pickup, dropoff]);
            map.fitBounds(bounds, {padding: [50, 50]});
            setTimeout(() => map.invalidateSize(), 200);

        } catch (error) {
            console.error("Error loading offers:", error);
        }
    };

    fetchAndRender();
    offerPollingInterval = setInterval(fetchAndRender, 5000);
}

async function acceptOffer(offerId, requestId) {
    if(!confirm("Αποδοχή και έναρξη διαδρομής;")) return;
    try {
        await fetch('/api/app/passenger/accept-offer', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({offerId, requestId})
        });
        alert("Καλό ταξίδι! Η διαδρομή ξεκίνησε.");
        document.getElementById('offers-section').classList.add('hidden');
        loadPassengerHistory();
    } catch(e) { console.error(e); }
}

function closeOffers() {
    document.getElementById('offers-section').classList.add('hidden');
}

let fullCreditData = [];  // For filters.
let filteredCreditData = [];

async function loadPassengerCredits() {
    const currentUser = sessionStorage.getItem('currentUser');
    document.getElementById('table-title').innerText = '💳 Πληρωμές & Credits';
    resetView();

    // Show summary block.
    document.getElementById("credit-summary").classList.remove("hidden");

    try {
        const response = await fetch(`/api/app/passenger/credits/${currentUser}`);
        if (!response.ok) throw new Error("Server error");

        const data = await response.json();
        fullCreditData = data;
        filteredCreditData = [...data];

        if (data.length === 0) {
            alert("Δεν υπάρχουν συναλλαγές.");
            return;
        }

        const totalCredits = data[0].total_credits ?? 0;

        // Monthly spending
        const now = new Date();
        const monthly = data
            .filter(x => new Date(x.date).getMonth() === now.getMonth())
            .reduce((sum, x) => sum + Number(x.amount || 0), 0);

        // Average spend per trip
        const avg = data.length > 1 
            ? (data.slice(1).reduce((s,x)=>s+Number(x.amount||0),0) / (data.length-1))
            : 0;

        document.getElementById("credit-monthly").innerHTML =
            `📅 Έξοδα τρέχοντος μήνα: <b>€${monthly.toFixed(2)}</b>`;

        document.getElementById("credit-average").innerHTML =
            `📈 Μέσο ποσό ανά διαδρομή: <b>€${avg.toFixed(2)}</b>`;

        const ctx = document.getElementById("creditChart");
        if (window.creditChartInstance) window.creditChartInstance.destroy();

        const categories = {};
        data.slice(1).forEach(x => {
            let key = x.description || "Άλλο";
            categories[key] = (categories[key] || 0) + Number(x.amount || 0);
        });

        window.creditChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: [
                        '#007bff','#28a745','#ffc107','#dc3545','#6f42c1'
                    ]
                }]
            }
        });

        renderCreditTable(filteredCreditData, totalCredits);

    } catch (error) {
        console.error(error);
        alert("Σφάλμα φόρτωσης credits.");
    }
}

// =========================================================
// RENDER TABLE
// =========================================================
function renderCreditTable(data, totalCredits) {
    const tableHead = document.querySelector("#data-table thead");
    const tableBody = document.querySelector("#data-table tbody");

    tableHead.innerHTML = `
        <tr><th>Υπόλοιπο</th></tr>
        <tr><td style="font-size:20px;font-weight:bold;">€${totalCredits}</td></tr>
        <tr>
            <th>Trip</th>
            <th>Ημερομηνία</th>
            <th>Ποσό</th>
            <th>Περιγραφή</th>
        </tr>
    `;

    tableBody.innerHTML = "";

    data.slice(1).forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <a href="#" onclick="openCreditDetails(${row.trip_id}, '${row.description}', '${row.date}', ${row.amount})">
                    ${row.trip_id}
                </a>
            </td>
            <td>${row.date}</td>
            <td>€${row.amount}</td>
            <td>${row.description}</td>
        `;
        tableBody.appendChild(tr);
    });
}


// =========================================================
// FILTERS
// =========================================================
function applyCreditFilter() {
    const value = document.getElementById("credit-filter").value;
    filteredCreditData = [...fullCreditData];

    if (value === "large") {
        filteredCreditData = filteredCreditData.filter(x => x.amount > 10);
    }
    else if (value === "month") {
        const now = new Date();
        filteredCreditData = filteredCreditData.filter(x =>
            new Date(x.date).getMonth() === now.getMonth()
        );
    }
    else if (value === "sortDesc") {
        filteredCreditData.sort((a,b)=>b.amount - a.amount);
    }
    else if (value === "sortAsc") {
        filteredCreditData.sort((a,b)=>a.amount - b.amount);
    }

    const totalCredits = fullCreditData[0].total_credits;
    renderCreditTable(filteredCreditData, totalCredits);
}

// =========================================================
// MODAL: Credit Details
// =========================================================
function openCreditDetails(id, desc, date, amount) {
    alert(
        `Λεπτομέρειες Συναλλαγής\n\n` +
        `Trip ID: ${id}\n` +
        `Ποσό: €${amount}\n` +
        `Ημ/νία: ${date}\n` +
        `Περιγραφή: ${desc}`
    );
}


// =========================================================
// 6. RATING SYSTEM (From Doc 5)
// =========================================================
let currentRatingTripId = null;

function showRatingModal(tripId) {
    currentRatingTripId = tripId;
    document.getElementById('rating-modal').classList.remove('hidden');
}

function closeRatingModal() {
    document.getElementById('rating-modal').classList.add('hidden');
    resetView();
}

async function submitRating() {
    const currentUser = sessionStorage.getItem('currentUser');
    const rating = document.getElementById('rating-stars').value;
    const comment = document.getElementById('rating-comment').value;

    try {
        const response = await fetch('/api/app/feedback/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                tripId: currentRatingTripId, 
                username: currentUser, 
                rating: rating, 
                comment: comment 
            })
        });

        if (response.ok) {
            alert("Thank you for your feedback!");
            closeRatingModal();
        } else {
            alert("Error submitting rating.");
        }
    } catch (e) { console.error(e); }
}







function resetView() {
    // ========== HIDE ALL FILTER PANELS ==========
    const costFilters = document.getElementById("cost-filters");
    if (costFilters) costFilters.classList.add("hidden");
    
    const dpFilters = document.getElementById("driver-performance-filters");
    if (dpFilters) dpFilters.classList.add("hidden");
    
    const tsFilters = document.getElementById("trip-statistics-filters");
    if (tsFilters) tsFilters.classList.add("hidden");
    
    const paFilters = document.getElementById("peak-activity-filters");
    if (paFilters) paFilters.classList.add("hidden");
    
    // ========== HIDE ALL FILTER SUMMARIES ==========
    const costSummary = document.getElementById("filter-summary");
    if (costSummary) costSummary.style.display = "none";
    
    const dpSummary = document.getElementById("dp-filter-summary");
    if (dpSummary) dpSummary.style.display = "none";
    
    const tsSummary = document.getElementById("ts-filter-summary");
    if (tsSummary) tsSummary.style.display = "none";
    
    const paSummary = document.getElementById("pa-filter-summary");
    if (paSummary) paSummary.style.display = "none";
    
    // ========== RESET CURRENT REPORT TRACKER ==========
    window.currentReport = null;
    
    // ========== HIDE ALL OTHER FORMS ==========
    document.getElementById('request-form')?.classList.add('hidden');
    document.getElementById('offers-section')?.classList.add('hidden');
    document.getElementById('document-form')?.classList.add('hidden');
    document.getElementById('add-shift-form')?.classList.add('hidden');
    document.getElementById('active-trip-screen')?.classList.add('hidden');
    document.getElementById("credit-summary")?.classList.add("hidden");
    document.getElementById("service-type-form")?.classList.add("hidden");
    document.getElementById("prerequisite-form")?.classList.add("hidden");
}

async function fetchData(endpoint) {
    const tableHead = document.querySelector("#data-table thead");
    const tableBody = document.querySelector("#data-table tbody");
    const loading = document.getElementById("loading");

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";
    loading.classList.remove('hidden');

    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();

        const isDriverView = endpoint.includes('driver/open-requests');
        const isOperatorDocView = endpoint.includes('operator/pending-documents');
        const isGdprAdminView = endpoint.includes('admin/gdpr-requests');
            

        const ignored = JSON.parse(sessionStorage.getItem('ignoredRequests') || "[]");
        let filteredData = data;

       if (isGdprAdminView && Array.isArray(filteredData)) {
            filteredData = filteredData.filter(row => row.action_type === "REQUEST");
        }

        if (filteredData.length > 0) {
            const headers = Object.keys(filteredData[0]);
            const headerRow = document.createElement("tr");
            headers.forEach(key => {
                const th = document.createElement("th");
                th.innerText = key;
                headerRow.appendChild(th);
            });

            if (isDriverView || isOperatorDocView) {
                const th = document.createElement("th");
                th.innerText = "Ενέργεια";
                headerRow.appendChild(th);
            }

            if (isGdprAdminView) {
                const th = document.createElement("th");
                th.innerText = "Ενέργειες";
                headerRow.appendChild(th);
            }

            tableHead.appendChild(headerRow);

            filteredData.forEach(row => {
                const tr = document.createElement("tr");
                headers.forEach(key => {
                    const td = document.createElement("td");
                    td.innerText = row[key] !== null ? row[key] : '-';
                    tr.appendChild(td);
                });

                if (isDriverView) {
                    const td = document.createElement("td");
                    td.style.display = "flex"; td.style.gap = "5px";
                    
                    const btn1 = document.createElement("button");
                    btn1.innerText = "Προσφορά";
                    btn1.style.backgroundColor = "#28a745";
                    btn1.onclick = () => makeOffer(row.request_id, row.estimated_fare);
                    
                    const btn2 = document.createElement("button");
                    btn2.innerText = "Απόρριψη";
                    btn2.style.backgroundColor = "#dc3545";
                    btn2.onclick = () => rejectRequest(row.request_id);

                    td.appendChild(btn1); td.appendChild(btn2);
                    tr.appendChild(td);
                }

                if (isOperatorDocView) {
                    const td = document.createElement("td");
                    td.style.display = "flex"; td.style.gap = "5px";
                    
                    const btn1 = document.createElement("button");
                    btn1.innerText = "OK";
                    btn1.style.backgroundColor = "#28a745";
                    btn1.onclick = () => verifyDocument(row.document_id, 'Verified');
                    
                    const btn2 = document.createElement("button");
                    btn2.innerText = "Reject";
                    btn2.style.backgroundColor = "#dc3545";
                    btn2.onclick = () => verifyDocument(row.document_id, 'Rejected');
                    
                    td.appendChild(btn1); td.appendChild(btn2);
                    tr.appendChild(td);
                }

                if (isGdprAdminView) {
                const td = document.createElement("td");
                td.style.display = "flex";
                td.style.gap = "8px";

                const approveBtn = document.createElement("button");
                approveBtn.innerText = "✔ Αποδοχή";
                approveBtn.style.backgroundColor = "#28a745";
                approveBtn.onclick = () => approveGdprRequest(row.gdpr_log_id);

                const rejectBtn = document.createElement("button");
                rejectBtn.innerText = "✖ Απόρριψη";
                rejectBtn.style.backgroundColor = "#dc3545";
                rejectBtn.onclick = () => rejectGdprRequest(row.gdpr_log_id);

                td.appendChild(approveBtn);
                td.appendChild(rejectBtn);
                tr.appendChild(td);
            }

                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = "<tr><td colspan='100%'>Δεν βρέθηκαν δεδομένα.</td></tr>";
        }
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = "<tr><td colspan='100%'>Σφάλμα φόρτωσης δεδομένων.</td></tr>";
    } finally {
        loading.classList.add('hidden');
    }
}

function populateTable(data) {
    const tableHead = document.querySelector("#data-table thead");
    const tableBody = document.querySelector("#data-table tbody");

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    if (data.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='100%'>Δεν βρέθηκαν δεδομένα.</td></tr>";
        return;
    }

    // Headers
    const headers = Object.keys(data[0]);
    const headerRow = document.createElement("tr");
    headers.forEach(key => {
        const th = document.createElement("th");
        th.innerText = key;
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);

    // Rows
    data.forEach(row => {
        const tr = document.createElement("tr");
        headers.forEach(key => {
            const td = document.createElement("td");
            td.innerText = row[key] !== null ? row[key] : '-';
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

async function approveGdprRequest(logId) {
    if (!confirm("Επιβεβαίωση αποδοχής GDPR αιτήματος;")) return;

    await fetch('/api/app/admin/gdpr-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId })
    });

    alert("Το αίτημα εγκρίθηκε.");
    loadGDPRRequests();
}

async function rejectGdprRequest(logId) {
    if (!confirm("Επιβεβαίωση απόρριψης GDPR αιτήματος;")) return;

    await fetch('/api/app/admin/gdpr-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId })
    });

    alert("Το αίτημα απορρίφθηκε.");
    loadGDPRRequests();
}

// =========================================================
// 8. SESSION RESTORE ON PAGE LOAD (From Doc 5 - CRITICAL)
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = sessionStorage.getItem('currentUser');
    const userRoles = sessionStorage.getItem('userRoles');

    if (currentUser) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        document.getElementById('user-display').innerText = currentUser;
        
        if (userRoles) {
            setupDashboard(JSON.parse(userRoles));
        }

        // Restore active request if exists
        const activeRequestId = sessionStorage.getItem('currentRequestId');
        if (activeRequestId) {
            console.log("Restoring active request:", activeRequestId);
            loadOffers(activeRequestId);
        }

            fetch(`/api/app/check-user/${currentUser}`)
        .then(r => r.json())
        .then(u => {
            if (u.gdpr_deleted === 1 || u.is_active === 0) {
                alert("Ο λογαριασμός σας έχει διαγραφεί λόγω GDPR.");
                logout();
            }
        });

    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
        
    }
});