// Global map variable
let map; 

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
            document.getElementById('login-msg').innerText = "Λάθος στοιχεία.";
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

// Global variable to track current report type
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
// Add these functions to site.js AFTER the Cost Report functions
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
        // Build query string from parameters
        const queryParams = new URLSearchParams();
        
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.serviceId) queryParams.append('serviceId', params.serviceId);
        if (params.city) queryParams.append('city', params.city);
        if (params.minTrips) queryParams.append('minTrips', params.minTrips);
        if (params.minRating) queryParams.append('minRating', params.minRating);
        if (params.orderBy) queryParams.append('orderBy', params.orderBy);
        
        const url = `/api/app/reports/driver-performance${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        
        console.log('Fetching:', url); // Debug
        
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
// Add these functions to site.js AFTER Driver Performance
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
        
        console.log('Fetching:', url); // Debug
        
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
// Add these functions to site.js AFTER Trip Statistics
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
        
        console.log('Fetching:', url); // Debug
        
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

// =========================================================
// Keep all your other existing functions below...
// =========================================================

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
    // Hide ALL filter panels
    const costFilters = document.getElementById("cost-filters");
    if (costFilters) costFilters.classList.add("hidden");
    
    const dpFilters = document.getElementById("driver-performance-filters");
    if (dpFilters) dpFilters.classList.add("hidden");
    
    // Hide filter summaries
    const costSummary = document.getElementById("filter-summary");
    if (costSummary) costSummary.style.display = "none";
    
    const dpSummary = document.getElementById("dp-filter-summary");
    if (dpSummary) dpSummary.style.display = "none";
    
    // Reset current report tracker
    window.currentReport = null;
    
    // Hide other forms (your existing code)
    document.getElementById("request-form").classList.add("hidden");
    document.getElementById("offers-section").classList.add("hidden");
    document.getElementById("document-form").classList.add("hidden");
    
    // Add any other elements you hide in resetView
    const addShiftForm = document.getElementById("add-shift-form");
    if (addShiftForm) addShiftForm.classList.add("hidden");
    
    const activeTrip = document.getElementById("active-trip-screen");
    if (activeTrip) activeTrip.classList.add("hidden");
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

        const ignored = JSON.parse(sessionStorage.getItem('ignoredRequests') || "[]");
        const filteredData = data.filter ? data.filter(row => !ignored.includes(row.request_id)) : data;

        if (filteredData.length > 0) {
            const headers = Object.keys(filteredData[0]);
            const headerRow = document.createElement("tr");
            headers.forEach(key => {
                const th = document.createElement("th");
                th.innerText = key;
                headerRow.appendChild(th);
            });

            const isDriverView = endpoint.includes('driver/open-requests');
            const isOperatorDocView = endpoint.includes('operator/pending-documents');
            
            if (isDriverView || isOperatorDocView) {
                const th = document.createElement("th");
                th.innerText = "Ενέργεια";
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

// Helper function for admin reports (needed by loadCostReport/loadDriverPerformance)
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
    }
});