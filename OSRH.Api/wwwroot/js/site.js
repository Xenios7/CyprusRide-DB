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
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('dashboard-section').classList.remove('hidden');
            document.getElementById('user-display').innerText = user.name;
        } else {
            document.getElementById('login-msg').innerText = "Λάθος στοιχεία.";
        }
    } catch (error) {
        console.error(error);
        alert("Σφάλμα σύνδεσης με τον Server.");
    }
}

function logout() {
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
    fetchData('/api/app/driver/open-requests');
}

// Γενική συνάρτηση για κλήση API και εμφάνιση πίνακα
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
            // Δημιουργία επικεφαλίδων δυναμικά από τα κλειδιά του JSON
            const headers = Object.keys(data[0]);
            const headerRow = document.createElement("tr");
            headers.forEach(key => {
                const th = document.createElement("th");
                th.innerText = key;
                headerRow.appendChild(th);
            });
            tableHead.appendChild(headerRow);

            // Δημιουργία γραμμών
            data.forEach(row => {
                const tr = document.createElement("tr");
                headers.forEach(key => {
                    const td = document.createElement("td");
                    td.innerText = row[key] !== null ? row[key] : '-';
                    tr.appendChild(td);
                });
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