// Global map variable
let map; 

// --- 1. LOGIN & AUTH ---
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
    if (roles.includes("Admin")) {
        document.getElementById("admin-features").classList.remove("hidden");
    }
    if (roles.includes("Operator")) {
        document.getElementById("operator-features").classList.remove("hidden");
    }
    if (roles.includes("Driver")) {
        document.getElementById("driver-features").classList.remove("hidden");
    }
    if (roles.includes("Passenger")) {
        document.getElementById("passenger-features").classList.remove("hidden");
    }
}

function logout() {
    sessionStorage.clear();
    location.reload();
}

// --- 2. ADMIN REPORTS ---
async function loadReport(type) {
    const titleMap = {
        'cost': 'Ανάλυση Κόστους ανά Υπηρεσία',
        'driver-performance': 'Απόδοση Οδηγών & Βαθμολογίες'
    };
    document.getElementById('table-title').innerText = titleMap[type];
    resetView();
    fetchData(`/api/app/reports/${type}`);
}

// --- 3. OPERATOR ---
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

// --- 4. DRIVER FEATURES ---
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

function showAddShiftForm() {
    document.getElementById('table-title').innerText = 'Προσθήκη Βάρδιας';
    document.getElementById('data-table').innerHTML = "<thead></thead><tbody></tbody>";
    document.getElementById('request-form')?.classList.add('hidden');
    document.getElementById('offers-section')?.classList.add('hidden');
    document.getElementById('document-form')?.classList.add('hidden');
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
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(docData)
        });
        
        if (response.ok) {
            alert("Το έγγραφο υποβλήθηκε επιτυχώς!");
            document.getElementById('document-form').classList.add('hidden');
        } else {
            alert("Σφάλμα υποβολής.");
        }
    } catch(e) {
        console.error(e);
        alert("Σφάλμα σύνδεσης.");
    }
}

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
    alert("Το αίτημα απορρίφθηκε.");
    loadOpenRequests(); 
}

function hideRequestLocally(requestId) {
    let ignored = JSON.parse(sessionStorage.getItem('ignoredRequests') || "[]");
    ignored.push(requestId);
    sessionStorage.setItem('ignoredRequests', JSON.stringify(ignored));
}

// --- 5. PASSENGER FEATURES ---
function showRequestForm() {
    document.getElementById('table-title').innerText = 'Νέα Διαδρομή';
    resetView();
    document.getElementById('request-form').classList.remove('hidden');
}

async function submitRequest() {
    const currentUser = sessionStorage.getItem('currentUser');
    try {
        const response = await fetch('/api/app/passenger/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: currentUser, 
                serviceId: document.getElementById('service-select').value, 
                notes: document.getElementById('request-notes').value 
            })
        });
        
        if (response.ok) {
            const res = await response.json();
            alert("Αίτημα εστάλη!");
            loadOffers(res.requestId);
        }
    } catch(e) {
        console.error(e);
    }
}

async function loadPassengerHistory() {
    const currentUser = sessionStorage.getItem('currentUser');
    document.getElementById('table-title').innerText = 'Ιστορικό';
    resetView();
    fetchData(`/api/app/passenger/history/${currentUser}`);
}

async function loadOffers(requestId) {
    resetView();
    document.getElementById('offers-section').classList.remove('hidden');
    const container = document.getElementById('offers-container');
    container.innerHTML = "Αναζήτηση οδηγών...";

    const response = await fetch(`/api/app/passenger/offers/${requestId}`);
    const offers = await response.json();
    container.innerHTML = "";

    if(offers.length === 0) {
        container.innerHTML = "Δεν βρέθηκαν οδηγοί.";
        return;
    }

    if (!map) {
        map = L.map('map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    }
    
    const pickup = [offers[0].pickup_latitude, offers[0].pickup_longitude];
    const dropoff = [offers[0].dropoff_latitude, offers[0].dropoff_longitude];
    
    map.eachLayer(layer => {
        if(layer instanceof L.Marker || layer instanceof L.Polyline) layer.remove();
    });
    
    L.marker(pickup).addTo(map).bindPopup("Start").openPopup();
    L.marker(dropoff).addTo(map).bindPopup("End");
    L.polyline([pickup, dropoff], {color: 'black', dashArray: '5, 10'}).addTo(map);
    
    const colors = ['blue', 'red', 'green'];
    offers.forEach((offer, i) => {
        const color = colors[i % colors.length];
        const offset = (Math.random()-0.5)*0.02;
        const driverPos = [pickup[0]+offset, pickup[1]+offset];
        
        L.circleMarker(driverPos, {color, fillColor:color, radius:8}).addTo(map);
        L.polyline([driverPos, pickup], {color, weight:4, opacity:0.7}).addTo(map);

        const card = document.createElement('div');
        card.style = `border:1px solid #ccc; border-top:5px solid ${color}; padding:10px; border-radius:5px; width:200px;`;
        card.innerHTML = `<h4>${offer.DriverName}</h4><p>${offer.VehicleModel}</p><p>€${offer.estimated_cost}</p>`;
        
        const btn = document.createElement('button');
        btn.innerText = "Επιλογή";
        btn.style = `width:100%; background:${color}; color:white; border:none; padding:5px; cursor:pointer;`;
        btn.onclick = () => acceptOffer(offer.offer_id, requestId);
        
        card.appendChild(btn);
        container.appendChild(card);
    });

    map.fitBounds(L.polyline([pickup, dropoff]).getBounds(), {padding:[50,50]});
    setTimeout(() => map.invalidateSize(), 100);
}

async function acceptOffer(offerId, requestId) {
    if(!confirm("Αποδοχή;")) return;
    
    await fetch('/api/app/passenger/accept-offer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({offerId, requestId})
    });
    
    alert("Καλό ταξίδι!");
    document.getElementById('offers-section').classList.add('hidden');
    loadPassengerHistory();
}

function closeOffers() {
    document.getElementById('offers-section').classList.add('hidden');
}

// --- 6. CORE FUNCTIONS ---
function resetView() {
    document.getElementById('data-table').innerHTML = "<thead></thead><tbody></tbody>";
    document.getElementById('request-form')?.classList.add('hidden');
    document.getElementById('offers-section')?.classList.add('hidden');
    document.getElementById('document-form')?.classList.add('hidden');
    document.getElementById('add-shift-form')?.classList.add('hidden');
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
                    td.style.display = "flex";
                    td.style.gap = "5px";
                    
                    const btn1 = document.createElement("button");
                    btn1.innerText = "Προσφορά";
                    btn1.style.backgroundColor = "#28a745";
                    btn1.onclick = () => makeOffer(row.request_id, row.estimated_fare);
                    
                    const btn2 = document.createElement("button");
                    btn2.innerText = "Απόρριψη";
                    btn2.style.backgroundColor = "#dc3545";
                    btn2.onclick = () => rejectRequest(row.request_id);

                    td.appendChild(btn1);
                    td.appendChild(btn2);
                    tr.appendChild(td);
                }

                if (isOperatorDocView) {
                    const td = document.createElement("td");
                    td.style.display = "flex";
                    td.style.gap = "5px";
                    
                    const btn1 = document.createElement("button");
                    btn1.innerText = "OK";
                    btn1.style.backgroundColor = "#28a745";
                    btn1.onclick = () => verifyDocument(row.document_id, 'Verified');
                    
                    const btn2 = document.createElement("button");
                    btn2.innerText = "Reject";
                    btn2.style.backgroundColor = "#dc3545";
                    btn2.onclick = () => verifyDocument(row.document_id, 'Rejected');
                    
                    td.appendChild(btn1);
                    td.appendChild(btn2);
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