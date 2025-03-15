document.getElementById("signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const role = document.getElementById("signupRole").value;
    const messageElement = document.getElementById("signupResponseMessage");

    // Email validation using regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        messageElement.style.color = "red";
        messageElement.textContent = "Invalid email format. Please enter a valid email.";
        return;
    }
    
    // Password validation
    if (password.length < 8) {
        messageElement.style.color = "red";
        messageElement.textContent = "Password must be at least 8 characters long.";
        return;
    }
    
    try {
        const response = await fetch("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();
        

        if (response.ok) {
            messageElement.style.color = "green";
            messageElement.textContent = "Registration successful! Redirecting to login...";
            setTimeout(() => window.location.href = "/", 2000);  // Redirect to login page
        } else {
            messageElement.style.color = "red";
            messageElement.textContent = data.message;
        }
    } catch (error) {
        console.error("Error:", error);
    }
});
