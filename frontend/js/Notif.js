const API_URL = "http://localhost:5000";


document.addEventListener("DOMContentLoaded", () => {
    const role = document.body.getAttribute("data-role");
    
    if (role === "resident") {
        loadResidentNotifications();
        loadResidentAlerts();
    } else {
        loadNotifications();
        loadAlerts();
    }
});


async function loadNotifications() {
    console.log("📩 Fetching Notifications from API...");
    try {
        const response = await fetch("http://localhost:5000/auth/admin/notifications");
        console.log("📩 Response Status:", response.status);
        
        if (!response.ok) {
            console.error(`❌ Error: HTTP Status ${response.status}`);
            document.getElementById("notifications-list").innerHTML = `<tr><td colspan="4">❌ Failed to load notifications.</td></tr>`;
            return;
        }

        const data = await response.json();
        console.log("📩 Notifications Data:", data);

        if (data.length === 0) {
            document.getElementById("notifications-list").innerHTML = `<tr><td colspan="4">📭 No notifications found.</td></tr>`;
        } else {
            document.getElementById("notifications-list").innerHTML = data.map(n =>
                `<tr>
                    <td>${n.title}</td>
                    <td>${n.description}</td>
                    <td>${n.created_at}</td>
                    <td><button onclick="deleteNotification(${n.id})">Delete</button></td>
                </tr>`
            ).join("");
        }
    } catch (error) {
        console.error("❌ Failed to load notifications:", error);
        document.getElementById("notifications-list").innerHTML = `<tr><td colspan="4">⚠️ Error fetching notifications.</td></tr>`;
    }
}

// Fetch & Display Alerts
async function loadAlerts() {
    const response = await fetch(`${API_URL}/auth/admin/alerts`);
    const data = await response.json();
    document.getElementById("alerts-list").innerHTML = data.map(a =>
        `<tr>
            <td>${a.title}</td>
            <td>${a.description}</td>
            <td>${a.created_at}</td>
            <td><button onclick="deleteAlert(${a.id})">Delete</button></td>
        </tr>`
    ).join("");
}

// Add Notification
async function addNotification() {
    const title = document.getElementById("notification-title").value;
    const description = document.getElementById("notif-desc").value;
    
    if (!title || !description) {
        alert("⚠️ Title and description are required to generate a notification!");
        return;
    }

    await fetch(`${API_URL}/auth/add-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description })
    });

    document.getElementById("notification-title").value = "";
    document.getElementById("notif-desc").value = "";
    loadNotifications(); // Reload the table
}

// Add Alert
async function addAlert() {
    const title = document.getElementById("alert-title").value;
    const description = document.getElementById("alert-desc").value;
    
    if (!title || !description) {
        alert("⚠️ Title and description are required to generate an alert!");
        return;
    }

    await fetch(`${API_URL}/auth/add-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description })
    });

    document.getElementById("alert-title").value = "";
    document.getElementById("alert-desc").value = "";
    loadAlerts(); // Reload the table
}

// Delete Notification
async function deleteNotification(id) {
    await fetch(`${API_URL}/auth/delete-notification/${id}`, { method: "DELETE" });
    loadNotifications();
}

// Delete Alert
async function deleteAlert(id) {
    await fetch(`${API_URL}/auth/delete-alert/${id}`, { method: "DELETE" });
    loadAlerts();
}

// Fetch & Display Notifications (Resident View)
async function loadResidentNotifications() {
    const response = await fetch(`${API_URL}/auth/resi/notifications`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const data = await response.json();
    document.getElementById("notifications-list").innerHTML = data.map(n =>
        `<tr>
            <td>${n.title}</td>
            <td>${n.description}</td>
            <td>${n.created_at}</td>
        </tr>`
    ).join(""); // 🚨 Removed delete button for residents
}

// Fetch & Display Alerts (Resident View)
async function loadResidentAlerts() {
    const response = await fetch(`${API_URL}/auth/resi/alerts`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const data = await response.json();
    document.getElementById("alerts-list").innerHTML = data.map(a =>
        `<tr>
            <td>${a.title}</td>
            <td>${a.description}</td>
            <td>${a.created_at}</td>
        </tr>`
    ).join(""); // 🚨 Removed delete button for residents
}
