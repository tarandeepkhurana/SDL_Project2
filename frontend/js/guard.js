// document.addEventListener("DOMContentLoaded", function () {
//     loadGuards();
// });
document.addEventListener("DOMContentLoaded", () => {
    const role = document.body.getAttribute("data-role");
    
    if (role === "resident") {
        loadResiGuards();
    } else {
        loadGuards();
    }
});

async function loadGuards() {
    let url = "http://localhost:5000/auth/admin/guards/show"; // Ensure this matches backend

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch guards");

        const guards = await response.json();

        const tableBody = document.querySelector("#guardTable tbody"); // Ensure tbody is found
        if (!tableBody) {
            console.error("Error: tbody element not found!");
            return;
        }

        tableBody.innerHTML = ""; // Clear table before loading new data

        if (guards.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='5'>No guards found</td></tr>";
            return;
        }

        guards.forEach(guard => {
            let row = document.createElement("tr");
            row.innerHTML = `
                <td>${guard.badge_number}</td>
                <td>${guard.name}</td>
                <td>${guard.contact_no}</td>
                <td>${guard.email || "N/A"}</td>
                <td>
                    
    <button onclick="showEditRow('${guard.badge_number}', this)">Edit</button>
    <button onclick="deleteGuard('${guard.badge_number}')">Delete</button>


                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error fetching guards:", error);
        alert("Error loading guards: " + error.message);
    }
}

async function loadResiGuards() {
    let url = "http://localhost:5000/auth/resi/guards/show"; // Ensure this matches backend

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch guards");

        const guards = await response.json();

        const tableBody = document.querySelector("#guardTable tbody"); // Ensure tbody is found
        if (!tableBody) {
            console.error("Error: tbody element not found!");
            return;
        }

        tableBody.innerHTML = ""; // Clear table before loading new data

        if (guards.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='5'>No guards found</td></tr>";
            return;
        }

        guards.forEach(guard => {
            let row = document.createElement("tr");
            row.innerHTML = `
                <td>${guard.badge_number}</td>
                <td>${guard.name}</td>
                <td>${guard.contact_no}</td>
                <td>${guard.email || "N/A"}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error fetching guards:", error);
        alert("Error loading guards: " + error.message);
    }
} 


// ** Add Guard (Form Submission) **
async function addGuard() {
    let badge_number = document.getElementById("badgeNumber").value.trim().toUpperCase();
    let name = document.getElementById("guardName").value.trim();
    let contact_no = document.getElementById("contactNumber").value.trim();
    let email = document.getElementById("email").value.trim();

    if (!badge_number || !name || !contact_no) {
        alert("Please fill all required fields!");
        return;
    }

    let guardData = { badge_number, name, contact_no, email };

    try {
        const response = await fetch("http://localhost:5000/auth/guards/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(guardData),
        });

        if (!response.ok) throw new Error("Failed to add guard!");

        alert("Guard added successfully!");
        loadGuards();

        // Clear input fields
        document.getElementById("badgeNumber").value = "";
        document.getElementById("guardName").value = "";
        document.getElementById("contactNumber").value = "";
        document.getElementById("email").value = "";
    } catch (error) {
        alert(error.message);
    }
}


// ** Delete Guard **
async function deleteGuard(badgeNumber) {
    if (!confirm("Are you sure you want to delete this guard?")) return;

    try {
        let response = await fetch(`http://localhost:5000/auth/delete/${badgeNumber}`, {
            method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete guard");

        loadGuards(); // Reload data after deletion
    } catch (error) {
        console.error("Error deleting guard:", error);
    }
}
// Show inline edit row
function showEditRow(badge_number, button) {
    let existingEditRow = document.getElementById("editRow");
    if (existingEditRow) existingEditRow.remove();

    let row = button.closest("tr");

    let editRow = document.createElement("tr");
    editRow.id = "editRow";
    editRow.innerHTML = `
        <td><input type="text" id="editBadge" value="${row.cells[0].innerText}"></td>
        <td><input type="text" id="editName" value="${row.cells[1].innerText}"></td>
        <td><input type="text" id="editContact" value="${row.cells[2].innerText}"></td>
        <td><input type="email" id="editEmail" value="${row.cells[3].innerText === 'N/A' ? '' : row.cells[3].innerText}"></td>
        <td>
            <button onclick="saveGuardChanges('${row.cells[0].innerText}')">Save Changes</button>
            <button onclick="cancelEdit()">Cancel</button>
        </td>
    `;

    row.parentNode.insertBefore(editRow, row.nextSibling);
}

// Cancel editing
function cancelEdit() {
    let editRow = document.getElementById("editRow");
    if (editRow) editRow.remove();
}

// Save changes with editable badge number
async function saveGuardChanges(oldBadgeNumber) {
    let badge_number = document.getElementById("editBadge").value.trim().toUpperCase();
    let name = document.getElementById("editName").value.trim();
    let contact_no = document.getElementById("editContact").value.trim();
    let email = document.getElementById("editEmail").value.trim();

    if (!badge_number || !name || !contact_no) {
        alert("Badge Number, Name, and Contact Number are required.");
        return;
    }

    let url = `http://localhost:5000/auth/${oldBadgeNumber}`;
    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ badge_number, name, contact_no, email })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update guard");
        }

        alert("Guard updated successfully!");
        cancelEdit(); // Remove edit row
        loadGuards(); // Reload table
    } catch (error) {
        console.error("Error updating guard:", error);
        alert(error.message);
    }
}