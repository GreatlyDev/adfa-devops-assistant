const healthStatusEl = document.getElementById("health-status");
const healthTextEl = document.getElementById("health-text");
const filtersForm = document.getElementById("filters-form");
const clearFiltersButton = document.getElementById("clear-filters");
const exportButton = document.getElementById("export-button");
const seedDemoButton = document.getElementById("seed-demo-button");
const refreshButton = document.getElementById("refresh-button");
const logForm = document.getElementById("log-form");
const submissionResultEl = document.getElementById("submission-result");
const alertInboxEl = document.getElementById("alert-inbox");

const totalLogsEl = document.getElementById("total-logs");
const stabilityScoreEl = document.getElementById("stability-score");
const openAlertsEl = document.getElementById("open-alerts");
const averageConfidenceKpiEl = document.getElementById("average-confidence-kpi");
const trendWindowEl = document.getElementById("trend-window");
const successRateEl = document.getElementById("success-rate");
const successfulLogsLegendEl = document.getElementById("successful-logs");
const failedLogsLegendEl = document.getElementById("failed-logs-legend");
const failureRateEl = document.getElementById("failure-rate");
const statusDonutEl = document.getElementById("status-donut");
const categoryChartEl = document.getElementById("category-chart");
const impactedServicesEl = document.getElementById("impacted-services");
const trendCaptionEl = document.getElementById("trend-caption");
const totalEventsCaptionEl = document.getElementById("total-events-caption");
const activityChartEl = document.getElementById("activity-chart");
const activityLegendEl = document.getElementById("activity-legend");
const activeFiltersEl = document.getElementById("active-filters");
const recentLogsEl = document.getElementById("recent-logs");
const detailsSubtitleEl = document.getElementById("details-subtitle");
const detailsStatusBadgeEl = document.getElementById("details-status-badge");
const deploymentDetailsEl = document.getElementById("deployment-details");

let selectedDeploymentId = null;

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
        status: (formData.get("status") || "").trim(),
        environment: (formData.get("environment") || "").trim(),
        service_name: (formData.get("service_name") || "").trim(),
        search: (formData.get("search") || "").trim(),
        trend_days: (formData.get("trend_days") || "7").trim(),
    };
}

function formatNumber(value) {
    return new Intl.NumberFormat().format(value);
}

function formatPercent(value) {
    return `${Number(value || 0).toFixed(1)}%`;
}

function formatRelativeTime(dateValue) {
    if (!dateValue) {
        return "Unknown";
    }

    const now = new Date();
    const target = new Date(dateValue);
    const diffSeconds = Math.max(1, Math.floor((now - target) / 1000));

    if (diffSeconds < 60) {
        return `${diffSeconds}s ago`;
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function deriveConfidenceLabel(value) {
    if (value >= 0.8) {
        return "High";
    }

    if (value >= 0.6) {
        return "Moderate";
    }

    return "Low";
}

function showSubmissionResult(message, isError = false) {
    submissionResultEl.classList.remove("hidden");
    submissionResultEl.textContent = message;
    submissionResultEl.style.color = isError ? "#fca5a5" : "#86efac";
}

function renderCategoryChart(items) {
    if (!items.length) {
        categoryChartEl.innerHTML = '<p class="pane-subtitle">No issue categories detected yet.</p>';
        return;
    }

    const maxValue = Math.max(...items.map((item) => item.count), 1);

    categoryChartEl.innerHTML = items
        .map((item) => {
            const width = Math.max((item.count / maxValue) * 100, item.count > 0 ? 12 : 0);
            return `
                <div class="chart-row">
                    <div class="chart-label-row">
                        <span class="chart-label">${item.category}</span>
                        <span class="chart-value">${item.count}</span>
                    </div>
                    <div class="chart-track">
                        <div class="chart-bar chart-bar-category" style="width: ${width}%"></div>
                    </div>
                </div>
            `;
        })
        .join("");
}

function renderImpactedServices(items) {
    if (!items.length) {
        impactedServicesEl.innerHTML = '<p class="pane-subtitle">No impacted services yet.</p>';
        return;
    }

    impactedServicesEl.innerHTML = items
        .map(
            (item) => `
                <div class="impact-item">
                    <strong>${item.service_name}</strong>
                    <span>${item.failed_count} failed</span>
                </div>
            `
        )
        .join("");
}

function renderAlertInbox(alerts) {
    if (!alerts.length) {
        alertInboxEl.innerHTML = '<div class="alert-empty">No active alerts in the current scope.</div>';
        return;
    }

    alertInboxEl.innerHTML = alerts
        .map(
            (alert) => `
                <article class="alert-item alert-${alert.severity}">
                    <div class="alert-item-header">
                        <span class="alert-service">${alert.service_name}</span>
                        <span class="badge ${alert.severity === "critical" ? "badge-error" : "badge-neutral"}">${alert.severity}</span>
                    </div>
                    <div class="alert-summary">${alert.summary}</div>
                    <div class="alert-meta">
                        <span>${alert.environment}</span>
                        <span>${Math.round(alert.confidence_score * 100)}% conf.</span>
                    </div>
                </article>
            `
        )
        .join("");
}

function renderStatusDonut(summary) {
    const total = Math.max(summary.total_logs, 1);
    const successAngle = (summary.successful_logs / total) * 360;
    statusDonutEl.style.setProperty("--success-angle", `${successAngle}deg`);
    successRateEl.textContent = `${Math.round(100 - summary.failure_rate)}%`;
    successfulLogsLegendEl.textContent = formatNumber(summary.successful_logs);
    failedLogsLegendEl.textContent = formatNumber(summary.failed_logs);
    failureRateEl.textContent = formatPercent(summary.failure_rate);
}

function renderActivityChart(dailyActivity) {
    if (!dailyActivity.length) {
        activityChartEl.innerHTML = "";
        activityLegendEl.innerHTML = '<p class="pane-subtitle">No deployment activity in this window.</p>';
        return;
    }

    const width = 760;
    const height = 240;
    const padding = 28;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxValue = Math.max(...dailyActivity.map((point) => point.total_logs), 1);

    const points = dailyActivity.map((point, index) => {
        const x = padding + (chartWidth / Math.max(dailyActivity.length - 1, 1)) * index;
        const y = height - padding - (point.total_logs / maxValue) * chartHeight;
        return { ...point, x, y };
    });

    const linePath = points.map((point) => `${point.x},${point.y}`).join(" ");
    const areaPath = [
        `M ${points[0].x} ${height - padding}`,
        ...points.map((point) => `L ${point.x} ${point.y}`),
        `L ${points[points.length - 1].x} ${height - padding}`,
        "Z",
    ].join(" ");

    const gridLines = Array.from({ length: 4 }, (_, index) => {
        const y = padding + (chartHeight / 3) * index;
        const labelValue = Math.round(maxValue - (maxValue / 3) * index);
        return `
            <line class="chart-grid-line" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"></line>
            <text class="chart-axis-label" x="${padding - 8}" y="${y + 4}" text-anchor="end">${labelValue}</text>
        `;
    }).join("");

    const pointLabels = points
        .map((point) => {
            const label = new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
            return `
                <text class="chart-axis-label" x="${point.x}" y="${height - 8}" text-anchor="middle">${label}</text>
                <circle class="chart-point" cx="${point.x}" cy="${point.y}" r="4"></circle>
            `;
        })
        .join("");

    activityChartEl.innerHTML = `
        ${gridLines}
        <path class="chart-area" d="${areaPath}"></path>
        <polyline class="chart-line" points="${linePath}"></polyline>
        ${pointLabels}
    `;

    const latestPoint = dailyActivity[dailyActivity.length - 1];
    const totalFailures = dailyActivity.reduce((sum, point) => sum + point.failed_logs, 0);
    const totalSuccesses = dailyActivity.reduce((sum, point) => sum + point.successful_logs, 0);

    activityLegendEl.innerHTML = `
        <div class="activity-stat">
            <div class="activity-stat-label">Latest day volume</div>
            <div class="activity-stat-value">${latestPoint.total_logs}</div>
        </div>
        <div class="activity-stat">
            <div class="activity-stat-label">Failures in window</div>
            <div class="activity-stat-value">${totalFailures}</div>
        </div>
        <div class="activity-stat">
            <div class="activity-stat-label">Successful deploys</div>
            <div class="activity-stat-value">${totalSuccesses}</div>
        </div>
    `;
}

function renderRecentLogs(logs) {
    if (!logs.length) {
        recentLogsEl.innerHTML = '<div class="log-item">No deployment activity found for the current scope.</div>';
        return;
    }

    recentLogsEl.innerHTML = logs
        .map((log) => `
            <article class="log-item ${log.id === selectedDeploymentId ? "active" : ""}" data-deployment-id="${log.id}">
                <div class="log-topline">
                    <span class="log-service">${log.service_name || `deployment-${log.id}`}</span>
                    <span class="badge ${log.status === "failed" ? "badge-error" : "badge-success"}">${log.status}</span>
                </div>
                <div class="log-meta">
                    <span>${log.environment || "unknown-env"}</span>
                    <span>${formatRelativeTime(log.created_at)}</span>
                </div>
            </article>
        `)
        .join("");
}

function renderTraceLines(logText) {
    const lines = logText.split("\n").filter(Boolean);

    return lines
        .map((line) => {
            let severityClass = "trace-info";
            if (/error|failed|aborted|denied/i.test(line)) {
                severityClass = "trace-error";
            } else if (/warn|timeout|timed out/i.test(line)) {
                severityClass = "trace-warn";
            }

            return `<span class="trace-line"><span class="trace-time">${line.substring(0, 21)}</span> <span class="${severityClass}">${line.substring(21).trim() || line}</span></span>`;
        })
        .join("");
}

function renderDeploymentDetails(log) {
    detailsSubtitleEl.textContent = `${log.service_name || "Unnamed service"} • ${log.environment || "unknown environment"} • ${formatRelativeTime(log.created_at)}`;
    detailsStatusBadgeEl.textContent = log.status === "failed" ? "Critical" : "Stable";
    detailsStatusBadgeEl.className = `badge ${log.status === "failed" ? "badge-error" : "badge-success"}`;

    const primaryRootCause = log.issues[0] || "No primary issue identified.";
    const recommendations = log.recommendations.length
        ? log.recommendations.map((item) => `<div class="detail-list-item">${item}</div>`).join("")
        : '<div class="detail-list-item">No recommendations available.</div>';
    const issues = log.issues.length
        ? log.issues.map((item) => `<div class="detail-list-item">${item}</div>`).join("")
        : '<div class="detail-list-item">No issues detected.</div>';
    const tokens = log.matched_signals.length
        ? log.matched_signals.map((signal) => `<span class="token">${signal}</span>`).join("")
        : '<span class="token">no-known-failure-signals</span>';

    deploymentDetailsEl.className = "detail-content";
    deploymentDetailsEl.innerHTML = `
        <div class="detail-meta-grid">
            <div class="detail-meta-block">
                <div class="detail-meta-label">Commit SHA</div>
                <div class="detail-meta-value">${log.commit_sha || "n/a"}</div>
            </div>
            <div class="detail-meta-block">
                <div class="detail-meta-label">Triggered By</div>
                <div class="detail-meta-value">${log.triggered_by || log.source || "unknown"}</div>
            </div>
            <div class="detail-meta-block">
                <div class="detail-meta-label">Branch / Environment</div>
                <div class="detail-meta-value">${log.branch || "n/a"} • ${log.environment || "n/a"}</div>
            </div>
        </div>

        <div>
            <div class="detail-section-title">Primary Root Cause (AI Predicted)</div>
            <div class="detail-root-cause">${primaryRootCause}</div>
        </div>

        <div>
            <div class="detail-section-title">Matched Signals</div>
            <div class="token-row">${tokens}</div>
        </div>

        <div>
            <div class="detail-section-title">Recommendations</div>
            <div class="detail-list">${recommendations}</div>
        </div>

        <div>
            <div class="detail-section-title">Issue Breakdown</div>
            <div class="detail-list">${issues}</div>
        </div>

        <div>
            <div class="detail-section-title">Trace Logs</div>
            <div class="trace-panel">${renderTraceLines(log.log_text)}</div>
        </div>
    `;
}

async function loadDeploymentDetails(deploymentId) {
    const response = await fetch(`/api/logs/${deploymentId}`);

    if (!response.ok) {
        detailsSubtitleEl.textContent = "Unable to load deployment telemetry.";
        detailsStatusBadgeEl.textContent = "Unavailable";
        detailsStatusBadgeEl.className = "badge badge-neutral";
        deploymentDetailsEl.className = "detail-content empty-state-panel";
        deploymentDetailsEl.textContent = "The selected deployment could not be loaded right now.";
        return;
    }

    const log = await response.json();
    selectedDeploymentId = log.id;
    renderRecentLogs(window.latestRecentLogs || []);
    renderDeploymentDetails(log);
}

function updateActiveFiltersText(filters) {
    const labels = [];

    if (filters.environment) {
        labels.push(`env: ${filters.environment}`);
    }
    if (filters.status) {
        labels.push(`status: ${filters.status}`);
    }
    if (filters.service_name) {
        labels.push(`service: ${filters.service_name}`);
    }
    if (filters.search) {
        labels.push(`search: ${filters.search}`);
    }

    activeFiltersEl.textContent = labels.length
        ? `Scoped to ${labels.join(" • ")}`
        : "Showing all deployment logs.";
}

async function fetchHealth() {
    try {
        const response = await fetch("/health");
        const data = await response.json();
        const isOnline = data.status === "ok";
        healthStatusEl.classList.toggle("offline", !isOnline);
        healthTextEl.textContent = isOnline ? "System Active • Edge Node 04" : "System Degraded";
    } catch (error) {
        healthStatusEl.classList.add("offline");
        healthTextEl.textContent = "System Degraded";
    }
}

async function loadDashboard() {
    const filters = getActiveFilters();
    const response = await fetch(`/api/logs/summary${buildQueryString(filters)}`);
    const summary = await response.json();

    totalLogsEl.textContent = formatNumber(summary.total_logs);
    stabilityScoreEl.textContent = `${Math.round(100 - summary.failure_rate)}%`;
    openAlertsEl.textContent = formatNumber(summary.open_alerts_count);
    averageConfidenceKpiEl.textContent = `${Math.round(summary.average_confidence * 100)}%`;
    trendWindowEl.textContent = `${summary.active_filters.trend_days}d`;
    trendCaptionEl.textContent = `Last ${summary.active_filters.trend_days} days`;
    totalEventsCaptionEl.textContent = `${formatNumber(summary.total_logs)} events captured`;

    renderStatusDonut(summary);
    renderCategoryChart(summary.top_issue_categories);
    renderImpactedServices(summary.most_impacted_services);
    renderAlertInbox(summary.active_alerts);
    renderActivityChart(summary.daily_activity);
    updateActiveFiltersText(summary.active_filters);

    window.latestRecentLogs = summary.recent_logs;
    if (!selectedDeploymentId && summary.recent_logs.length) {
        selectedDeploymentId = summary.recent_logs[0].id;
    }

    if (summary.recent_logs.length && !summary.recent_logs.some((log) => log.id === selectedDeploymentId)) {
        selectedDeploymentId = summary.recent_logs[0].id;
    }

    renderRecentLogs(summary.recent_logs);

    if (selectedDeploymentId) {
        await loadDeploymentDetails(selectedDeploymentId);
    } else {
        detailsSubtitleEl.textContent = "Select a deployment to inspect full telemetry.";
        detailsStatusBadgeEl.textContent = "Awaiting selection";
        detailsStatusBadgeEl.className = "badge badge-neutral";
        deploymentDetailsEl.className = "detail-content empty-state-panel";
        deploymentDetailsEl.textContent = "Choose a deployment from the intelligence feed to inspect metadata, root-cause signals, recommendations, and raw trace logs.";
    }
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
                service_name: (formData.get("service_name") || "").trim() || null,
                environment: (formData.get("environment") || "").trim() || null,
                source: (formData.get("source") || "").trim() || null,
                branch: (formData.get("branch") || "").trim() || null,
                commit_sha: (formData.get("commit_sha") || "").trim() || null,
                triggered_by: (formData.get("triggered_by") || "").trim() || null,
                log_text: (formData.get("log_text") || "").trim(),
            }),
        });

        if (!response.ok) {
            throw new Error("Unable to save deployment log.");
        }

        const data = await response.json();
        showSubmissionResult(`Stored deployment #${data.deployment_id} • confidence ${Math.round(data.analysis.confidence_score * 100)}%`);
        logForm.reset();
        await loadDashboard();
    } catch (error) {
        showSubmissionResult("Could not analyze this deployment trace right now.", true);
    }
}

async function handleFilterSubmit(event) {
    event.preventDefault();
    selectedDeploymentId = null;
    await loadDashboard();
}

async function clearFilters() {
    filtersForm.reset();
    selectedDeploymentId = null;
    await loadDashboard();
}

function exportFilteredLogs() {
    const exportUrl = `/api/logs/export${buildQueryString(getActiveFilters())}`;
    const link = document.createElement("a");
    link.href = exportUrl;
    link.download = "adfa-deployments.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
}

async function loadDemoData(force = false) {
    seedDemoButton.disabled = true;
    seedDemoButton.textContent = force ? "Replaying Simulation..." : "Live Simulation";

    try {
        const response = await fetch(`/api/logs/seed-demo${force ? "?force=true" : ""}`, {
            method: "POST",
        });

        if (!response.ok) {
            throw new Error("Unable to load demo data.");
        }

        const data = await response.json();

        if (data.inserted_logs === 0 && data.existing_logs > 0 && !force) {
            const shouldReplace = window.confirm("Live simulation data already exists. Replace it with a fresh batch?");
            if (shouldReplace) {
                await loadDemoData(true);
                return;
            }
        } else {
            showSubmissionResult(`${data.message} Inserted ${data.inserted_logs} simulated events.`);
            selectedDeploymentId = null;
            await loadDashboard();
        }
    } catch (error) {
        showSubmissionResult("Live simulation could not be started right now.", true);
    } finally {
        seedDemoButton.disabled = false;
        seedDemoButton.textContent = "Live Simulation";
    }
}

recentLogsEl.addEventListener("click", async (event) => {
    const item = event.target.closest("[data-deployment-id]");
    if (!item) {
        return;
    }

    selectedDeploymentId = Number(item.dataset.deploymentId);
    renderRecentLogs(window.latestRecentLogs || []);
    await loadDeploymentDetails(selectedDeploymentId);
});

filtersForm.addEventListener("submit", handleFilterSubmit);
clearFiltersButton.addEventListener("click", clearFilters);
refreshButton.addEventListener("click", loadDashboard);
exportButton.addEventListener("click", exportFilteredLogs);
seedDemoButton.addEventListener("click", () => loadDemoData());
logForm.addEventListener("submit", handleSubmit);

fetchHealth();
loadDashboard();
