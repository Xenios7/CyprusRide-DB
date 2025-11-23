// Σύνδεση Χρήστη
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value; // Στο demo χρησιμοποιούμε απλό κείμενο

    try {
        const response = await fetch('/api/app/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const user = await response.json();
            
            // --- ΔΙΟΡΘΩΣΗ RBAC: Αποθήκευση session & ρόλων ---
            sessionStorage.setItem('currentUser', user.username);
            sessionStorage.setItem('userRoles', JSON.stringify(user.roles || [])); 
            // --- ΤΕΛΟΣ ΔΙΟΡΘΩΣΗΣ ---

            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('dashboard-section').classList.remove('hidden');
            document.getElementById('user-display').innerText = user.name;

            // --- ΔΙΟΡΘΩΣΗ RBAC: Εμφάνιση των σωστών κουμπιών ---
            setupDashboard(user.roles || []);
            // --- ΤΕΛΟΣ ΔΙΟΡΘΩΣΗΣ ---

        } else {
            document.getElementById('login-msg').innerText = "Λάθος στοιχεία.";
        }
    } catch (error) {
        console.error(error);
        alert("Σφάλμα σύνδεσης με τον Server.");
    }
}

function logout() {
    // --- ΔΙΟΡΘΩΣΗ: Καθάρισμα session ---
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('userRoles');
    // --- ΤΕΛΟΣ ΔΙΟΡΘΩΣΗΣ ---
    location.reload();
}

// Φόρτωση Αναφορών (Admin)
async function loadReport(type) {
    const titleMap = {
        'cost': 'Ανάλυση Κόστους ανά Υπηρεσία',
        'driver-performance': 'Απόδοση Οδηγών & Βαθμολογίες'
    };
    document.getElementById('table-title').innerText = titleMap[type];
    fetchData(`/api/app/reports/${type}`);
}

// Φόρτωση Αιτημάτων (Οδηγός)
async function loadOpenRequests() {
    document.getElementById('table-title').innerText = 'Διαθέσιμα Αιτήματα Διαδρομών';
    fetchData(`/api/app/driver/open-requests`);
}

// Ενημερωμένη fetchData με υποστήριξη κουμπιών ενεργειών
async function fetchData(endpoint) {
    const tableHead = document.querySelector("#data-table thead");
    const tableBody = document.querySelector("#data-table tbody");
    const loading = document.getElementById("loading");

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";
    loading.classList.remove('hidden');

    try {
        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.length > 0) {
            const headers = Object.keys(data[0]);
            
            // 1. Headers
            const headerRow = document.createElement("tr");
            headers.forEach(key => {
                const th = document.createElement("th");
                th.innerText = key;
                headerRow.appendChild(th);
            });

            // Αν είναι η οθόνη του Οδηγού, πρόσθεσε στήλη "Ενέργεια"
            const isDriverView = endpoint.includes('driver/open-requests');
            if (isDriverView) {
                const th = document.createElement("th");
                th.innerText = "Ενέργεια";
                headerRow.appendChild(th);
            }
            tableHead.appendChild(headerRow);

            // 2. Rows
            data.forEach(row => {
                const tr = document.createElement("tr");
                
                // Γέμισμα δεδομένων
                headers.forEach(key => {
                    const td = document.createElement("td");
                    td.innerText = row[key] !== null ? row[key] : '-';
                    tr.appendChild(td);
                });

                // Αν είναι οδηγός, πρόσθεσε τα κουμπιά Submit / Reject
                if (isDriverView) {
                    const td = document.createElement("td");
                    td.style.display = 'flex';
                    td.style.gap = '5px'; // Δίνει χώρο ανάμεσα στα κουμπιά

                    // 1. Κουμπί Υποβολής Προσφοράς (Πράσινο)
                    const submitBtn = document.createElement("button");
                    submitBtn.innerText = "Υποβολή Προσφοράς";
                    submitBtn.style.backgroundColor = "#28a745"; 
                    submitBtn.style.padding = "5px 10px";
                    submitBtn.style.fontSize = "12px";
                    submitBtn.onclick = () => makeOffer(row.request_id, row.estimated_fare);
                    
                    // 2. Κουμπί Απόρριψης (Κόκκινο)
                    const rejectBtn = document.createElement("button");
                    rejectBtn.innerText = "Απόρριψη";
                    rejectBtn.style.backgroundColor = "#dc3545"; 
                    rejectBtn.style.padding = "5px 10px";
                    rejectBtn.style.fontSize = "12px";
                    rejectBtn.onclick = () => rejectRequest(row.request_id); // Καλούμε τη νέα συνάρτηση

                    // Προσθέτουμε και τα δύο κουμπιά στο κελί
                    td.appendChild(submitBtn);
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
        alert("Σφάλμα κατά τη φόρτωση δεδομένων.");
    } finally {
        loading.classList.add('hidden');
    }
}

// Νέα συνάρτηση: Ο Οδηγός κάνει προσφορά
async function makeOffer(requestId, estimatedFare) {
    // Ζητάμε από τον οδηγό να επιβεβαιώσει ή να αλλάξει την τιμή
    const costInput = prompt("Εισάγετε το κόστος της προσφοράς σας (€):", estimatedFare);
    if (costInput === null) return; // Cancelled

    const finalCost = parseFloat(costInput);
    if (isNaN(finalCost)) { alert("Παρακαλώ εισάγετε έγκυρο αριθμό."); return; }

    // Hardcoded driver/vehicle ID για το demo (John Christou)
    const driverId = 1; 
    const vehicleId = 1; 

    const offerData = {
        requestId: requestId,
        driverId: driverId,
        vehicleId: vehicleId,
        estimatedCost: finalCost
    };

    try {
        const response = await fetch('/api/app/driver/submit-offer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(offerData)
        });

        const result = await response.json();
        
        if (response.ok) {
            alert("Η προσφορά στάλθηκε επιτυχώς!");
            loadOpenRequests();
        } else {
            alert("Σφάλμα: " + result.message);
        }
    } catch (error) {
        console.error(error);
        alert("Σφάλμα επικοινωνίας.");
    }
}
// --- Passenger Logic ---

function showRequestForm() {
    document.getElementById('request-form').classList.remove('hidden');
    document.getElementById('table-title').innerText = 'Δημιουργία Νέας Διαδρομής';
    document.getElementById('data-table').innerHTML = ""; // Clear table
}

// Τροποποιημένη submitRequest: Αντί να δείξει ιστορικό, τώρα ψάχνει προσφορές
async function submitRequest() {
    const currentUser = sessionStorage.getItem('currentUser'); 
    if (!currentUser) { alert("Παρακαλώ συνδεθείτε ξανά."); return; }

    const serviceId = document.getElementById('service-select').value;
    const notes = document.getElementById('request-notes').value;

    try {
        const response = await fetch('/api/app/passenger/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, serviceId, notes })
        });

        if (response.ok) {
            // ΥΠΟΘΕΣΗ: Το backend τώρα επιστρέφει το RequestId, π.χ. { requestId: 100 }
            const result = await response.json(); 
            const newRequestId = result.requestId; // Παίρνουμε το νέο ID
            
            alert("Το αίτημα στάλθηκε! Αναζήτηση οδηγών...");
            document.getElementById('request-form').classList.add('hidden');
            
            // Καλεί απευθείας τη λειτουργία εμφάνισης προσφορών
            loadOffers(newRequestId); 

        } else {
            alert("Σφάλμα κατά την αποστολή.");
        }
    } catch (error) {
        console.error(error);
    }
}

// Νέα συνάρτηση: Βρίσκει το τελευταίο αίτημα και δείχνει προσφορές
async function findMyLatestRequestAndShowOffers(username) {
    // Φέρνουμε το ιστορικό για να βρούμε το ID του τελευταίου αιτήματος
    const response = await fetch(`/api/app/passenger/history/${username}`);
    const history = await response.json();
    
    // Βρίσκουμε το πιο πρόσφατο
    if (history.length > 0) {
        // Στο v_TripHistory το request_id δεν υπάρχει πάντα αν δεν έχει γίνει trip.
        // Εδώ χρειάζεται προσοχή. Για το demo, ας υποθέσουμε ότι υπάρχει μια προσφορά ήδη
        // ή ας δείξουμε απλά τις προσφορές για το request_id = 4 (που ξέρουμε ότι είναι ανοιχτό από τα screenshots).
        
        // ΣΗΜΕΙΩΣΗ: Για να δουλέψει σωστά αυτό δυναμικά, θα έπρεπε το API 
        // 'passenger/request' να επιστρέφει το RequestId.
        
        // Γι' αυτό το demo, θα καλέσουμε τις προσφορές για το Request ID 4 (του Νίκου) 
        // ή θα φτιάξουμε ένα κουμπί "Δες Προσφορές" στο ιστορικό.
        loadOffers(4); // Hardcoded για το demo του Νίκου, αλλά δείτε παρακάτω τη σωστή λύση.
    }
}

let map; // Global μεταβλητή για τον χάρτη

async function loadOffers(requestId) {
    const container = document.getElementById('offers-container');
    container.innerHTML = "Φόρτωση...";
    document.getElementById('offers-section').classList.remove('hidden');

    const response = await fetch(`/api/app/passenger/offers/${requestId}`);
    const offers = await response.json();

    container.innerHTML = ""; 

    if (offers.length === 0) {
        container.innerHTML = "<p>Δεν βρέθηκαν οδηγοί ακόμη.</p>";
        return;
    }

    // --- ΧΑΡΤΗΣ (Advanced Visualization) ---
    const pickup = [offers[0].pickup_latitude, offers[0].pickup_longitude];
    const dropoff = [offers[0].dropoff_latitude, offers[0].dropoff_longitude];

    if (!map) {
        map = L.map('map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    // Καθαρισμός
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            layer.remove();
        }
    });

    // 1. Βασική Διαδρομή (Μαύρη διακεκομμένη γραμμή: Παραλαβή -> Προορισμός)
    const mainRoute = L.polyline([pickup, dropoff], {color: 'black', dashArray: '5, 10', weight: 3}).addTo(map);
    L.marker(pickup).addTo(map).bindPopup("<b>Σημείο Παραλαβής</b>").openPopup();
    L.marker(dropoff).addTo(map).bindPopup("<b>Προορισμός</b>");

    // Χρώματα για τους οδηγούς
    const colors = ['blue', 'red', 'green', 'purple'];

    // 2. Ζωγραφίζουμε κάθε οδηγό ξεχωριστά
    offers.forEach((offer, index) => {
        const color = colors[index % colors.length]; // Επιλογή χρώματος

        // SIMULATION: Δημιουργούμε μια τυχαία θέση για τον οδηγό κοντά στην παραλαβή
        // (Σε πραγματικό σύστημα, αυτό θα ερχόταν από το GPS του οδηγού στη βάση)
        const offsetLat = (Math.random() - 0.5) * 0.02; // +/- 1km περίπου
        const offsetLon = (Math.random() - 0.5) * 0.02;
        const driverPos = [pickup[0] + offsetLat, pickup[1] + offsetLon];

        // Marker Οδηγού (Κύκλος με το χρώμα του)
        L.circleMarker(driverPos, {
            color: color,
            fillColor: color,
            fillOpacity: 0.8,
            radius: 8
        }).addTo(map).bindPopup(`<b>${offer.DriverName}</b><br>${offer.VehicleModel}`);

        // Γραμμή Προσέγγισης (Οδηγός -> Παραλαβή)
        L.polyline([driverPos, pickup], {color: color, weight: 4, opacity: 0.7}).addTo(map);

        // --- ΚΑΡΤΑ UI ---
        // Προσθέτουμε μια λωρίδα χρώματος στην κάρτα για να ταιριάζει με τον χάρτη
        const card = document.createElement('div');
        card.style = `border: 1px solid #ddd; border-top: 5px solid ${color}; padding: 15px; border-radius: 8px; width: 200px; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1);`;
        card.innerHTML = `
            <h4 style="margin-top:0; color:${color};">${offer.DriverName}</h4>
            <p>🚗 ${offer.VehicleModel} (${offer.VehicleColor})</p>
            <p>💰 <strong>€${offer.estimated_cost.toFixed(2)}</strong></p>
            <p style="font-size:0.8em; color:gray;">"${offer.DriverNotes}"</p>
            <button onclick="acceptOffer(${offer.offer_id}, ${requestId})" style="width:100%; background-color: ${color}; color: white; border:none; padding:8px; border-radius:4px; cursor:pointer; margin-top:10px;">Επιλογή</button>
        `;
        container.appendChild(card);
    });
    
    // Ζουμ για να φαίνονται όλα
    const group = new L.featureGroup([L.marker(pickup), L.marker(dropoff)]);
    map.fitBounds(group.getBounds(), {padding: [50, 50]});
    setTimeout(() => { map.invalidateSize(); }, 100);
}

function closeOffers() {
    document.getElementById('offers-section').classList.add('hidden');
}

async function acceptOffer(offerId, requestId) {
    if(!confirm("Είστε σίγουροι ότι θέλετε αυτόν τον οδηγό;")) return;

    const response = await fetch('/api/app/passenger/accept-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, requestId })
    });

    if (response.ok) {
        alert("Η διαδρομή ξεκίνησε!");
        document.getElementById('offers-section').classList.add('hidden');
        loadPassengerHistory(); // Πίσω στο ιστορικό
    }
}

async function loadPassengerHistory() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) { alert("Παρακαλώ συνδεθείτε ξανά."); return; }

    document.getElementById('table-title').innerText = `Ιστορικό Διαδρομών (${currentUser})`;
    document.getElementById('request-form').classList.add('hidden');
    fetchData(`/api/app/passenger/history/${currentUser}`);
}


// --- Νέα Λογική RBAC (Ελέγχου Πρόσβασης βάσει Ρόλου) ---

/**
 * Εμφανίζει μόνο τα κουμπιά που αντιστοιχούν στους ρόλους του χρήστη.
 * Καθώς το project σας επιτρέπει πολλαπλούς ρόλους (π.χ. Admin & Passenger), 
 * ένας χρήστης μπορεί να βλέπει πολλαπλά σετ λειτουργιών.
 * @param {string[]} roles - Array με τα ονόματα των ρόλων (π.χ. ['Admin', 'Driver']).
 */
function setupDashboard(roles) {
    // 1. Κρύβουμε όλα τα feature-divs 
    // Χρησιμοποιούμε optional chaining (?.) για ασφάλεια
    document.getElementById('admin-features')?.classList.add('hidden');
    document.getElementById('driver-features')?.classList.add('hidden');
    document.getElementById('passenger-features')?.classList.add('hidden');
    
    // 2. Εμφανίζουμε μόνο τα σχετικά με τον ρόλο του χρήστη
    if (roles.includes('Admin')) {
        document.getElementById('admin-features')?.classList.remove('hidden');
    }
    
    if (roles.includes('Driver')) {
        document.getElementById('driver-features')?.classList.remove('hidden');
    }

    if (roles.includes('Passenger')) {
        document.getElementById('passenger-features')?.classList.remove('hidden');
    }
}