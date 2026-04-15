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
const seedDemoButton = document.getElementById("seed-demo-button");
const activeFiltersEl = document.getElementById("active-filters");
const clearFiltersButton = document.getElementById("clear-filters");
const exportButton = document.getElementById("export-button");
const statusChartEl = document.getElementById("status-chart");
const categoryChartEl = document.getElementById("category-chart");
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

function renderBarChart(container, items, emptyMessage, colorClassPrefix = "chart-bar") {
    if (!items.length || items.every((item) => item.value === 0)) {
        container.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
        return;
    }

    const maxValue = Math.max(...items.map((item) => item.value), 1);

    container.innerHTML = items
        .map((item) => {
            const percentage = Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 0);
            return `
                <div class="chart-row">
                    <div class="chart-label-row">
                        <span class="chart-label">${item.label}</span>
                        <span class="chart-value">${item.value}</span>
                    </div>
                    <div class="chart-track">
                        <div class="${colorClassPrefix} ${colorClassPrefix}-${item.tone || item.label}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        })
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
    renderBarChart(
        statusChartEl,
        data.status_breakdown.map((item) => ({
            label: item.label,
            value: item.count,
            tone: item.label,
        })),
        "No deployment status data yet.",
        "chart-bar"
    );
    renderBarChart(
        categoryChartEl,
        data.top_issue_categories.map((item) => ({
            label: item.category,
            value: item.count,
            tone: "category",
        })),
        "No issue-category trends yet.",
        "chart-bar"
    );
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

function exportFilteredLogs() {
    const filters = getActiveFilters();
    const exportUrl = `/api/logs/export${buildQueryString(filters)}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = exportUrl;
    downloadLink.download = "adfa-deployments.csv";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
}

async function loadDemoData(force = false) {
    seedDemoButton.disabled = true;
    seedDemoButton.textContent = force ? "Reloading Demo Data..." : "Loading Demo Data...";

    try {
        const response = await fetch(`/api/logs/seed-demo${force ? "?force=true" : ""}`, {
            method: "POST",
        });

        if (!response.ok) {
            throw new Error("Unable to load demo data.");
        }

        const data = await response.json();

        if (data.inserted_logs === 0 && data.existing_logs > 0 && !force) {
            const shouldReplace = window.confirm(
                "Demo data already exists. Do you want to replace it with a fresh batch?"
            );

            if (shouldReplace) {
                await loadDemoData(true);
                return;
            }
        } else {
            showSubmissionResult(`${data.message} Inserted ${data.inserted_logs} demo logs.`);
            await loadDashboard();
        }
    } catch (error) {
        showSubmissionResult("Could not load demo data right now. Please try again.", true);
    } finally {
        seedDemoButton.disabled = false;
        seedDemoButton.textContent = "Load Demo Data";
    }
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
exportButton.addEventListener("click", exportFilteredLogs);
seedDemoButton.addEventListener("click", () => loadDemoData());

fetchHealth();
loadDashboard();
