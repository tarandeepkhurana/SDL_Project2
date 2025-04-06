const API_URL = "http://localhost:5000/auth"; 

// Load admins when page loads
document.addEventListener("DOMContentLoaded", function () {
    const adminTableBody = document.getElementById("admin-table-body");
    if (!adminTableBody) {
        console.error("Error: 'admin-table-body' element not found in the DOM.");
        return;
    }
    loadAdmins();
});

// Fetch and display all admins
function loadAdmins() {
    fetch(`${API_URL}/admins`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => displayAdmins(data))
        .catch(error => console.error("Error fetching admin data:", error));
}

function displayAdmins(admins) {
    const tableBody = document.getElementById("admin-table-body");

    if (!tableBody) {
        console.error("Error: 'admin-table-body' element not found in the DOM.");
        return;
    }

    tableBody.innerHTML = ""; // Clear existing content

    if (!admins || admins.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">No admins found</td></tr>`;
        return;
    }

    admins.forEach(admin => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${admin.block || 'N/A'}</td>
            <td>${admin.flat_no || 'N/A'}</td>
            <td>${admin.admin_name || 'N/A'}</td>
            <td>${admin.contact_no || 'N/A'}</td>
            <td>${admin.flat_status || 'N/A'}</td>
            <td>${admin.email || 'N/A'}</td>
        `;
        tableBody.appendChild(row);
    });
}

//Add admin
document.getElementById("add-admin-form")?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const block = document.getElementById("block").value.trim();
    const flat_no = document.getElementById("flat_no").value.trim();
    const contactNo = document.getElementById("contact_no").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!/^\d{10}$/.test(contactNo)) {
        showMessageAdd("Please enter a valid 10-digit contact number.", "error");
        return;
    }

    try {
        // **1️⃣ First, check if block and flat_no already exist**
        const checkResponse = await fetch(`${API_URL}/admins/check?block=${block}&flat_no=${flat_no}`);
        const checkData = await checkResponse.json();

        if (checkResponse.ok && checkData.exists) {
            showMessageAdd("This block and flat number are already registered.", "success");
            return; // ❌ Stop the form submission if block & flat exist
        }

        // **2️⃣ If block & flat are unique, proceed to add admin**
        const admin = { block, flat_no, admin_name: document.getElementById("admin_name").value, contact_no: contactNo, flat_status: document.getElementById("flat_status").value, email };

        const addResponse = await fetch(`${API_URL}/admins/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(admin)
        });

        const addData = await addResponse.json();

        if (addResponse.ok && addData.message === "Admin added successfully") {
            showMessageAdd("Admin added successfully!", "error");
            document.getElementById("add-admin-form").reset(); // ✅ Reset form after success
            loadAdmins(); // ✅ Reload admin list
        } else {
            showMessageAdd(addData.error || "Unexpected response from server.", "success");
        }
    } catch (error) {
        console.error("Error adding admin:", error);
        showMessageAdd("Failed to add admin. Please try again later.", "error");
    }
});


//Search admin for editing
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("searchEditBtn").addEventListener("click", searchAdminToEdit);
    document.getElementById("saveEditBtn").addEventListener("click", saveEdit);
});

function searchAdminToEdit() {
    const block = document.getElementById("edit_block").value.trim();
    const flatNo = document.getElementById("edit_flat_no").value.trim();
    const editFields = document.getElementById("edit-fields"); // Define it here

    // Hide the edit fields initially
    editFields.style.display = "none";
    
    if (!block || !flatNo) {
        showMessageEdit("Please enter both Block and Flat No.", "success");
        // alert("Please enter both Block and Flat No.");
        return;
    }

    fetch(`${API_URL}/admins/${block}/${flatNo}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("No data found");
            }
            return response.json();
        })
        .then(admin => {
            console.log("Fetched Admin Data:", admin);

            if (admin && admin.id) {
                document.getElementById("edit_admin_name").value = admin.admin_name || "";
                document.getElementById("edit_contact_no").value = admin.contact_no || "";
                document.getElementById("edit_flat_status").value = admin.flat_status || "";
                document.getElementById("edit_email").value = admin.email || "";
                
                editFields.style.display = admin && admin.id ? "block" : "none";
                document.getElementById("edit-fields").setAttribute("data-id", admin.id);
            } else {
                showMessageEdit("Admin not found!", "error");
                // alert("Admin not found!");
            }
        })
        .catch(error => {
            console.error("Error fetching admin:", error);
            alert("Error fetching admin details. Please try again.");
        });
}

function saveEdit() {
    const id = document.getElementById("edit-fields").getAttribute("data-id");
    if (!id) {
        alert("No admin selected for editing.");
        return;
    }

    const updatedAdmin = {
        admin_name: document.getElementById("edit_admin_name").value.trim(),
        contact_no: document.getElementById("edit_contact_no").value.trim(),
        flat_status: document.getElementById("edit_flat_status").value.trim(),
        email: document.getElementById("edit_email").value.trim()
    };

    fetch(`${API_URL}/admins/edit/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedAdmin)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Failed to update admin details");
        }
        return response.json();
    })
    .then(data => {
        showMessageEdit(data.message, "error");
        // alert(data.message);
        
        const row = document.querySelector(`tr[data-id='${id}']`);
        if (row) {
            row.style.display = "none";
        }
        
        document.getElementById("edit_admin_name").value = "";
        document.getElementById("edit_contact_no").value = "";
        document.getElementById("edit_flat_status").value = "";
        document.getElementById("edit_email").value = "";
        document.getElementById("edit_block").value = "";
        document.getElementById("edit_flat_no").value = "";

        document.getElementById("edit-fields").style.display = "none";

        setTimeout(() => location.reload(), 1000);
    })
    .catch(error => {
        console.error("Error updating admin:", error);
        showMessageEdit("Error updating admin details. Please try again.", "error");
        // alert("Error updating admin details. Please try again.");
    });
}



document.getElementById("searchDeleteBtn").addEventListener("click", searchAdminToDelete);

let selectedBlock = null;
let selectedFlatNo = null;

function searchAdminToDelete() {
    const block = document.getElementById("delete_block").value.trim().toLowerCase();
    const flatNo = document.getElementById("delete_flat_no").value.trim();

    if (!block || !flatNo) {
        showMessage("Please enter both Block and Flat No.", "error");
        return;
    }

    fetch(`http://localhost:5000/auth/admins/${block}/${flatNo}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("No data found");
            }
            return response.json();
        })
        .then(admin => {
            if (admin && admin.admin_name) {
                selectedBlock = block;
                selectedFlatNo = flatNo;

                // ✅ Fill the input fields with admin data
                document.getElementById("delete_admin_name").value = admin.admin_name || "";
                document.getElementById("delete_contact_no").value = admin.contact_no || "";
                document.getElementById("delete_flat_status").value = admin.flat_status || "";
                document.getElementById("delete_email").value = admin.email || "";

                // ✅ Show delete fields and button
                document.getElementById("delete-fields").style.display = "block";
                document.getElementById("confirmDeleteBtn").style.display = "block";

                // ✅ Set delete button event
                document.getElementById("confirmDeleteBtn").onclick = () => confirmDelete(selectedBlock, selectedFlatNo);
            } else {
                alert("Admin not found!");
            }
        })
        .catch(() => {
            alert("Admin not found. Please check Block and Flat No.");
        });
}

function confirmDelete(block, flatNo) {
    if (!block || !flatNo) {
        alert("No admin selected for deletion.");
        return;
    }

    const deleteUrl = `http://localhost:5000/auth/admins/delete/${block}/${flatNo}`;

    if (confirm("Are you sure you want to delete this admin?")) {
        fetch(deleteUrl, {
            method: "DELETE"
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to delete admin. Status: ${response.status}`);
            }
            return response.json();
        })
        .then(() => {
            alert("Admin deleted successfully!");

            // ✅ Hide the details and clear inputs
            document.getElementById("delete-fields").style.display = "none";
            document.getElementById("confirmDeleteBtn").style.display = "none";

            document.getElementById("delete_block").value = "";
            document.getElementById("delete_flat_no").value = "";

            // ✅ Reset selected values
            selectedBlock = null;
            selectedFlatNo = null;
        })
        .catch(error => {
            console.error("Error deleting admin:", error);
            alert("Error deleting admin. Please try again.");
        });
    }
}

function showMessageEdit(message, type = "success") {
    const messageDiv = document.getElementById("edit-message");
    messageDiv.innerText = message;
    messageDiv.style.display = "block";
    
    // Styling based on message type
    if (type === "error") {
        messageDiv.style.color = "green";
        messageDiv.style.backgroundColor = "#e6ffe6"; // Light red background
    } else {
        messageDiv.style.color = "red";
        messageDiv.style.backgroundColor = "#ffe6e6"; // Light green background
    }

    // Hide message after 3 seconds
    setTimeout(() => {
        messageDiv.style.display = "none";
    }, 3000);
}


function showMessageAdd(message, type = "success") {
    const messageDiv = document.getElementById("add-message");
    messageDiv.innerText = message;
    messageDiv.style.display = "block";
    
    // Styling based on message type
    if (type === "error") {
        messageDiv.style.color = "green";
        messageDiv.style.backgroundColor = "#e6ffe6"; // Light red background
    } else {
        messageDiv.style.color = "red";
        messageDiv.style.backgroundColor = "#ffe6e6"; // Light green background
    }

    // Hide message after 3 seconds
    setTimeout(() => {
        messageDiv.style.display = "none";
    }, 3000);
}







