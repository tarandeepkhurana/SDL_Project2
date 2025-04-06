document.addEventListener("DOMContentLoaded", async () => {
    const email = sessionStorage.getItem("userEmail");
    const role = sessionStorage.getItem("userRole");

    if (!email || !role) {
        document.getElementById("profileInfo").innerHTML = "Error: User not logged in.";
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/auth/viewProfile?email=${email}&role=${role}`);

        if (!response.ok) {
            throw new Error("Failed to fetch profile");
        }

        const userData = await response.json();
        let nameLabel = role === "admin" ? "Admin Name" : "Resident Name";

        document.getElementById("profileInfo").innerHTML = `
            <div class="profile-field"><strong>Block:</strong> <span class="profile-value">${userData.block}</span></div>
            <div class="profile-field"><strong>Flat No:</strong> <span class="profile-value">${userData.flat_no}</span></div>
            <div class="profile-field"><strong>${nameLabel}:</strong> <span class="profile-value">${userData.admin_name}</span></div>
            <div class="profile-field"><strong>Contact No:</strong> <span class="profile-value">${userData.contact_no}</span></div>
            <div class="profile-field"><strong>Flat Status:</strong> <span class="profile-value">${userData.flat_status}</span></div>
            <div class="profile-field"><strong>Email:</strong> <span class="profile-value">${userData.email}</span></div>
        `;
    } catch (error) {
        document.getElementById("profileInfo").innerHTML = "Error loading profile.";
        console.error("Error:", error);
    }
});
