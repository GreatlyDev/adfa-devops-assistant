const totalLogsEl = document.getElementById("total-logs");
const successfulLogsEl = document.getElementById("successful-logs");
const failedLogsEl = document.getElementById("failed-logs");
const healthStatusEl = document.getElementById("health-status");
const recentLogsEl = document.getElementById("recent-logs");
const logForm = document.getElementById("log-form");
const submissionResultEl = document.getElementById("submission-result");
const refreshButton = document.getElementById("refresh-button");

async function fetchHealth() {
    try {
        const response = await fetch("/health");
        const data = await response.json();
        healthStatusEl.textContent = data.status === "ok" ? "Online" : "Unavailable";
    } catch (error) {
        healthStatusEl.textContent = "Unavailable";
    }
}

function renderLogs(logs) {
    if (!logs.length) {
        recentLogsEl.innerHTML = '<p class="empty-state">No deployment logs yet. Submit one to see it here.</p>';
        return;
    }

    recentLogsEl.innerHTML = logs
        .map(
            (log) => `
                <article class="log-item">
                    <div class="log-topline">
                        <strong>Deployment #${log.id}</strong>
                        <span class="status-badge status-${log.status}">${log.status}</span>
                    </div>
                    <p class="meta-text">${new Date(log.created_at).toLocaleString()}</p>
                    <p>${log.log_text}</p>
                    <ul class="issue-list">
                        ${log.issues.map((issue) => `<li>${issue}</li>`).join("")}
                    </ul>
                </article>
            `
        )
        .join("");
}

async function loadDashboard() {
    const response = await fetch("/api/logs/summary");
    const data = await response.json();

    totalLogsEl.textContent = data.total_logs;
    successfulLogsEl.textContent = data.successful_logs;
    failedLogsEl.textContent = data.failed_logs;

    renderLogs(data.recent_logs);
}

function showSubmissionResult(message, isError = false) {
    submissionResultEl.classList.remove("hidden");
    submissionResultEl.textContent = message;
    submissionResultEl.style.color = isError ? "#b42318" : "#166534";
}

async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(logForm);
    const logText = formData.get("log_text");

    try {
        const response = await fetch("/api/logs/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ log_text: logText }),
        });

        if (!response.ok) {
            throw new Error("Unable to save deployment log.");
        }

        const data = await response.json();
        showSubmissionResult(`Saved deployment #${data.deployment_id} with status "${data.analysis.status}".`);
        logForm.reset();
        await loadDashboard();
    } catch (error) {
        showSubmissionResult("Could not save the deployment log. Please try again.", true);
    }
}

logForm.addEventListener("submit", handleSubmit);
refreshButton.addEventListener("click", loadDashboard);

fetchHealth();
loadDashboard();
