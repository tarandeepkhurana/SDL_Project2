document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;
    const message = document.getElementById("responseMessage");
    
    // Store email and role in sessionStorage (temporary storage)
    sessionStorage.setItem("userEmail", email);
    sessionStorage.setItem("userRole", role);

    // Email validation using regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        message.style.color = "red";
        message.innerText = "Invalid email format. Please enter a valid email.";
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role }),
        });

        const data = await response.json();

        if (response.ok) {
            message.style.color = "green";
            message.innerText = "Login successful! Redirecting...";

            // Store token in local storage
            localStorage.setItem("authToken", data.token);

            // Redirect to the respective dashboard
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 1000);
        } else {
            message.style.color = "red";
            message.innerText = data.message || "Login failed!";
        }
    } catch (error) {
        console.error("Error:", error);
        message.style.color = "red";
        message.innerText = "Server error. Please try again later.";
    }
});