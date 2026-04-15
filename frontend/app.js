const totalLogsEl = document.getElementById("total-logs");
const successfulLogsEl = document.getElementById("successful-logs");
const failedLogsEl = document.getElementById("failed-logs");
const failureRateEl = document.getElementById("failure-rate");
const healthStatusEl = document.getElementById("health-status");
const recentLogsEl = document.getElementById("recent-logs");
const logForm = document.getElementById("log-form");
const filtersForm = document.getElementById("filters-form");
const submissionResultEl = document.getElementById("submission-result");
const refreshButton = document.getElementById("refresh-button");
const activeFiltersEl = document.getElementById("active-filters");
const clearFiltersButton = document.getElementById("clear-filters");
const topCategoriesEl = document.getElementById("top-categories");
const impactedServicesEl = document.getElementById("impacted-services");
const averageConfidenceEl = document.getElementById("average-confidence");
const deploymentDetailsEl = document.getElementById("deployment-details");
const detailsTitleEl = document.getElementById("details-title");

function buildQueryString(filters) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value) {
            params.set(key, value);
        }
    });

    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
}

function getActiveFilters() {
    const formData = new FormData(filtersForm);

    return {
        status: formData.get("status")?.trim() || "",
        environment: formData.get("environment")?.trim() || "",
        service_name: formData.get("service_name")?.trim() || "",
        search: formData.get("search")?.trim() || "",
    };
}

function updateActiveFiltersText(filters) {
    const labels = [];

    if (filters.status) {
        labels.push(`status: ${filters.status}`);
    }

    if (filters.environment) {
        labels.push(`environment: ${filters.environment}`);
    }

    if (filters.service_name) {
        labels.push(`service: ${filters.service_name}`);
    }

    if (filters.search) {
        labels.push(`search: ${filters.search}`);
    }

    activeFiltersEl.textContent = labels.length
        ? `Showing logs filtered by ${labels.join(", ")}.`
        : "Showing all deployment logs.";
}

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
                <article class="log-item clickable-log" data-deployment-id="${log.id}">
                    <div class="log-topline">
                        <strong>Deployment #${log.id}</strong>
                        <span class="status-badge status-${log.status}">${log.status}</span>
                    </div>
                    <div class="pill-row">
                        ${[
                            log.service_name ? `Service: ${log.service_name}` : "",
                            log.environment ? `Env: ${log.environment}` : "",
                            log.source ? `Source: ${log.source}` : "",
                            log.branch ? `Branch: ${log.branch}` : "",
                            log.commit_sha ? `Commit: ${log.commit_sha}` : "",
                            log.triggered_by ? `By: ${log.triggered_by}` : "",
                        ]
                            .filter(Boolean)
                            .map((item) => `<span class="meta-pill">${item}</span>`)
                            .join("")}
                    </div>
                    <p class="meta-text">${new Date(log.created_at).toLocaleString()}</p>
                    <p class="confidence-text">Analysis confidence: ${Math.round(log.confidence_score * 100)}%</p>
                    <p>${log.log_text}</p>
                    <div class="pill-row">
                        ${log.issue_categories
                            .map((category) => `<span class="category-pill">${category}</span>`)
                            .join("")}
                    </div>
                    <ul class="issue-list">
                        ${log.issues.map((issue) => `<li>${issue}</li>`).join("")}
                    </ul>
                    <details class="signals-panel">
                        <summary>Matched signals</summary>
                        <p class="meta-text">${log.matched_signals.join(", ")}</p>
                    </details>
                </article>
            `
        )
        .join("");
}

function renderInsightList(container, items, emptyMessage, valueFormatter) {
    if (!items.length) {
        container.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
        return;
    }

    container.innerHTML = items
        .map(
            (item) => `
                <div class="insight-item">
                    <strong>${item.label}</strong>
                    <span>${valueFormatter(item.value)}</span>
                </div>
            `
        )
        .join("");
}

function renderDeploymentDetails(log) {
    detailsTitleEl.textContent = `Deployment #${log.id}`;
    deploymentDetailsEl.className = "details-content";
    deploymentDetailsEl.innerHTML = `
        <div class="pill-row">
            ${[
                log.service_name ? `Service: ${log.service_name}` : "",
                log.environment ? `Env: ${log.environment}` : "",
                log.source ? `Source: ${log.source}` : "",
                log.branch ? `Branch: ${log.branch}` : "",
                log.commit_sha ? `Commit: ${log.commit_sha}` : "",
                log.triggered_by ? `By: ${log.triggered_by}` : "",
            ]
                .filter(Boolean)
                .map((item) => `<span class="meta-pill">${item}</span>`)
                .join("")}
        </div>
        <p class="meta-text">${new Date(log.created_at).toLocaleString()}</p>
        <p class="confidence-text">Analysis confidence: ${Math.round(log.confidence_score * 100)}%</p>
        <div class="pill-row">
            ${log.issue_categories.map((category) => `<span class="category-pill">${category}</span>`).join("")}
        </div>
        <section class="details-section">
            <h3>Issues</h3>
            <ul class="issue-list">
                ${log.issues.map((issue) => `<li>${issue}</li>`).join("")}
            </ul>
        </section>
        <section class="details-section">
            <h3>Recommendations</h3>
            <ul class="issue-list">
                ${log.recommendations.map((recommendation) => `<li>${recommendation}</li>`).join("")}
            </ul>
        </section>
        <section class="details-section">
            <h3>Matched Signals</h3>
            <p class="meta-text">${log.matched_signals.join(", ")}</p>
        </section>
        <section class="details-section">
            <h3>Raw Log</h3>
            <pre class="log-preview">${log.log_text}</pre>
        </section>
    `;
}

async function loadDeploymentDetails(deploymentId) {
    const response = await fetch(`/api/logs/${deploymentId}`);

    if (!response.ok) {
        detailsTitleEl.textContent = "Unable to load deployment";
        deploymentDetailsEl.className = "details-empty";
        deploymentDetailsEl.textContent = "The selected deployment could not be loaded right now.";
        return;
    }

    const log = await response.json();
    renderDeploymentDetails(log);
}

async function loadDashboard() {
    const filters = getActiveFilters();
    const response = await fetch(`/api/logs/summary${buildQueryString(filters)}`);
    const data = await response.json();

    totalLogsEl.textContent = data.total_logs;
    successfulLogsEl.textContent = data.successful_logs;
    failedLogsEl.textContent = data.failed_logs;
    failureRateEl.textContent = `${data.failure_rate}%`;
    averageConfidenceEl.textContent = `Average analyzer confidence: ${Math.round(data.average_confidence * 100)}%`;

    updateActiveFiltersText(data.active_filters);
    renderInsightList(
        topCategoriesEl,
        data.top_issue_categories.map((item) => ({ label: item.category, value: item.count })),
        "No issue categories detected yet.",
        (value) => `${value} matches`
    );
    renderInsightList(
        impactedServicesEl,
        data.most_impacted_services.map((item) => ({ label: item.service_name, value: item.failed_count })),
        "No service failures recorded yet.",
        (value) => `${value} failed deployments`
    );
    renderLogs(data.recent_logs);

    if (data.recent_logs.length) {
        await loadDeploymentDetails(data.recent_logs[0].id);
    } else {
        detailsTitleEl.textContent = "Select a deployment";
        deploymentDetailsEl.className = "details-empty";
        deploymentDetailsEl.textContent = "Choose a deployment from recent activity to inspect its metadata, analyzer output, and raw log.";
    }
}

function showSubmissionResult(message, isError = false) {
    submissionResultEl.classList.remove("hidden");
    submissionResultEl.textContent = message;
    submissionResultEl.style.color = isError ? "#b42318" : "#166534";
}

async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(logForm);

    try {
        const response = await fetch("/api/logs/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                service_name: formData.get("service_name")?.trim() || null,
                environment: formData.get("environment")?.trim() || null,
                source: formData.get("source")?.trim() || null,
                branch: formData.get("branch")?.trim() || null,
                commit_sha: formData.get("commit_sha")?.trim() || null,
                triggered_by: formData.get("triggered_by")?.trim() || null,
                log_text: formData.get("log_text")?.trim() || "",
            }),
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

async function handleFilterSubmit(event) {
    event.preventDefault();
    await loadDashboard();
}

async function clearFilters() {
    filtersForm.reset();
    await loadDashboard();
}

recentLogsEl.addEventListener("click", async (event) => {
    const logCard = event.target.closest("[data-deployment-id]");
    if (!logCard) {
        return;
    }

    await loadDeploymentDetails(logCard.dataset.deploymentId);
});

logForm.addEventListener("submit", handleSubmit);
filtersForm.addEventListener("submit", handleFilterSubmit);
refreshButton.addEventListener("click", loadDashboard);
clearFiltersButton.addEventListener("click", clearFilters);

fetchHealth();
loadDashboard();
