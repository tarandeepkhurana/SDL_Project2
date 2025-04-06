document.addEventListener("DOMContentLoaded", () => {
    const role = document.body.getAttribute("data-role");

    if (role === "admin") {
        loadAdminDashboard();
    } else {
        loadResidentDashboard();
    }
});

// ✅ Fetch active polls
async function fetchActivePolls() {
    const response = await fetch("http://localhost:5000/auth/polls/active");
    const polls = await response.json();
    return polls;
}

// ✅ Load Active Polls Page
async function loadActivePollsPage() {
    try {
        const response = await fetch("http://localhost:5000/auth/polls/active");
        const polls = await response.json();

        const pollsContainer = document.getElementById("activePollsContainer");
        pollsContainer.innerHTML = "";
        if (polls.length === 0) {
            pollsContainer.innerHTML = "<p>No active polls available.</p>";
            return;
        }
        polls.forEach(poll => {
            let options = [];
            try {
                options = JSON.parse(poll.options);
            } catch (err) {
                console.error("Error parsing options:", err);
            }

            const pollDiv = document.createElement("div");
            pollDiv.classList.add("poll");

            let pollHtml = `<h3>${poll.question}</h3>`;

            options.forEach(option => {
                pollHtml += `
                    <label>
                        <input type="radio" name="poll_${poll.id}" value="${option}"> ${option}
                    </label><br>
                `;
            });

            pollHtml += `<button onclick="castVote(${poll.id})">Vote</button>`;
            pollDiv.innerHTML = pollHtml;
            pollsContainer.appendChild(pollDiv);
        });
    } catch (error) {
        console.error("Error loading active polls:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const role = document.body.getAttribute("data-role");

    if (role === "admin") {
        loadAdminDashboard();
    } else {
        loadResidentDashboard();
    }
});


// ✅ Resident votes on a poll
async function castVote(poll_id) {
    const email = document.getElementById("residentEmail").value.trim();

    if (!email) {
        alert("Please enter your email.");
        return;
    }

    const selectedOption = document.querySelector(`input[name="poll_${poll_id}"]:checked`);
    if (!selectedOption) {
        alert("Please select an option before voting!");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/auth/polls/vote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, poll_id, choice: selectedOption.value })
        });

        const data = await response.json();
        alert(data.message);
        loadResidentDashboard(); // Reload polls to update UI
    } catch (error) {
        console.error("Error casting vote:", error);
        alert("Failed to cast vote. Please try again.");
    }
}


async function loadAdminDashboard() {
    document.getElementById("admin-container").innerHTML = `
        <div class="admin-flex-container">
            <div class="create-poll">
                <h2>Create Poll</h2>
                <form id="createPollForm" class="form-container">
                    <input type="text" id="question" placeholder="Enter poll question" required>
                    <textarea id="options" placeholder="Enter options (comma-separated)" required></textarea>
                    <button type="submit">Create Poll</button>
                </form>
            </div>

            <div class="manage-polls">
                <h2>Manage Polls</h2>
                <button onclick="window.location.href='active_polls.html'">View Active Polls</button>
                <button onclick="window.location.href='past_polls.html'">View Past Polls</button>
                <div id="polls-container"></div>
            </div>
        </div>
    `;

    document.getElementById("createPollForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        await createPoll();
    });

    loadActivePollsPage();
}

// ✅ Admin creates a poll
async function createPoll() {
    const question = document.getElementById("question").value;
    const options = document.getElementById("options").value.split(",").map(opt => opt.trim());

    const response = await fetch("http://localhost:5000/auth/polls/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, options })
    });

    const data = await response.json();
    alert(data.message);
    loadActivePollsPage();
}

// ✅ Admin closes a poll
async function closePoll(poll_id) {
    const response = await fetch("http://localhost:5000/auth/polls/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poll_id })
    });

    const data = await response.json();
    alert(data.message);
    loadActivePollsPage(); // Refresh active polls
}

// ✅ Load Past Polls Page
async function loadPastPollsPage() {
    try {
        const response = await fetch("http://localhost:5000/auth/polls/past");
        const polls = await response.json();

        const pastPollsContainer = document.getElementById("pastPollsContainer");
        pastPollsContainer.innerHTML = "";

        polls.forEach(poll => {
            const pollDiv = document.createElement("div");
            pollDiv.classList.add("poll");

            pollDiv.innerHTML = `<h3>${poll.question}</h3>
                <button onclick="viewResults(${poll.id})">View Results</button>
                <div id="results_${poll.id}"></div>`;

            pastPollsContainer.appendChild(pollDiv);
        });
    } catch (error) {
        console.error("Error loading past polls:", error);
    }
}

// ✅ Fetch poll results
async function viewResults(poll_id) {
    const response = await fetch(`http://localhost:5000/auth/polls/results/${poll_id}`);
    const results = await response.json();

    const resultsContainer = document.getElementById(`results_${poll_id}`);
    resultsContainer.innerHTML = `<h4>Results:</h4>`;

    results.forEach(result => {
        resultsContainer.innerHTML += `<p>${result.choice}: ${result.votes} votes</p>`;
    });
}


// ✅ Load active polls for residents
async function loadResidentDashboard() {
    try {
        const response = await fetch("http://localhost:5000/auth/polls/active");
        const polls = await response.json();
        const pollsContainer = document.getElementById("pollsContainer");
        pollsContainer.innerHTML = ""; // Clear previous content

        if (polls.length === 0) {
            pollsContainer.innerHTML = "<p>No active polls available.</p>";
            return;
        }

        // ✅ Add a title for active polls
        let heading = document.createElement("h2");
        heading.textContent = "Active Polls";
        heading.style.marginBottom = "15px";
        pollsContainer.appendChild(heading);

        polls.forEach(poll => {
            const pollDiv = document.createElement("div");
            pollDiv.classList.add("poll");

            let pollHtml = `<h3>${poll.question}</h3>`;

            let options = [];
            try {
                options = Array.isArray(poll.options) ? poll.options : poll.options.split(",");
            } catch (err) {
                console.error("Error parsing options:", err);
            }

            // ✅ Display radio button options
            options.forEach(option => {
                pollHtml += `
                    <label>
                        <input type="radio" name="poll_${poll.id}" value="${option}"> ${option}
                    </label><br>
                `;
            });

            // ✅ Submit vote button
            pollHtml += `<button onclick="castVote(${poll.id})">Submit Vote</button>`;

            pollDiv.innerHTML = pollHtml;
            pollsContainer.appendChild(pollDiv);
        });

    } catch (error) {
        console.error("Error loading resident active polls:", error);
    }
}
