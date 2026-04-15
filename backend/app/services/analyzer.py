ANALYSIS_RULES = [
    {
        "keywords": ["permission denied", "access denied", "forbidden", "unauthorized"],
        "category": "permissions",
        "issue": "Permission or access control issue detected in deployment log.",
        "recommendation": "Verify IAM roles, secrets access, service accounts, and file permissions used during deployment.",
        "confidence": 0.93,
    },
    {
        "keywords": ["timeout", "timed out", "deadline exceeded"],
        "category": "timeout",
        "issue": "Deployment process may have timed out before completing.",
        "recommendation": "Review startup latency, dependency availability, network connectivity, and CI/CD timeout thresholds.",
        "confidence": 0.88,
    },
    {
        "keywords": ["connection refused", "could not connect", "connection reset", "dns", "name or service not known"],
        "category": "network",
        "issue": "Network connectivity problem detected during deployment.",
        "recommendation": "Check service discovery, DNS resolution, firewall rules, and whether upstream dependencies are reachable.",
        "confidence": 0.84,
    },
    {
        "keywords": ["module not found", "importerror", "dependency", "package not found", "no module named"],
        "category": "dependency",
        "issue": "Dependency or import problem detected in deployment log.",
        "recommendation": "Validate build artifacts, dependency installation steps, lockfiles, and image contents.",
        "confidence": 0.89,
    },
    {
        "keywords": ["invalid config", "missing env", "environment variable", "misconfigured", "configuration error"],
        "category": "configuration",
        "issue": "Configuration issue detected in deployment log.",
        "recommendation": "Review environment variables, secret values, config files, and deployment manifests for missing or invalid settings.",
        "confidence": 0.85,
    },
    {
        "keywords": ["out of memory", "oomkilled", "insufficient memory", "no space left"],
        "category": "capacity",
        "issue": "Capacity or resource exhaustion issue detected in deployment log.",
        "recommendation": "Check memory and disk limits, pod/container sizing, and cleanup of temporary artifacts.",
        "confidence": 0.91,
    },
    {
        "keywords": ["error", "exception", "traceback"],
        "category": "application",
        "issue": "Application error detected in deployment output.",
        "recommendation": "Inspect the error stack trace and identify which deployment step or application component failed.",
        "confidence": 0.7,
    },
    {
        "keywords": ["failed", "failure", "deployment aborted"],
        "category": "deployment",
        "issue": "Deployment log indicates that the release failed.",
        "recommendation": "Review the failed deployment stage, recent code changes, and release configuration for the affected service.",
        "confidence": 0.66,
    },
]


def analyze_log(log_text: str) -> dict:
    log_lower = log_text.lower()

    issues = []
    recommendations = []
    matched_signals = []
    issue_categories = []
    confidence_scores = []

    for rule in ANALYSIS_RULES:
        matched_keywords = [keyword for keyword in rule["keywords"] if keyword in log_lower]

        if not matched_keywords:
            continue

        issues.append(rule["issue"])
        recommendations.append(rule["recommendation"])
        matched_signals.extend(matched_keywords)
        issue_categories.append(rule["category"])
        confidence_scores.append(rule["confidence"])

    if issues:
        status = "failed"
        confidence = round(sum(confidence_scores) / len(confidence_scores), 2)
    else:
        status = "success"
        issues.append("No obvious deployment issues detected in log.")
        recommendations.append("Deployment log looks healthy based on current analysis rules.")
        issue_categories.append("healthy")
        matched_signals.append("no-known-failure-signals")
        confidence = 0.32

    unique_categories = list(dict.fromkeys(issue_categories))
    unique_signals = list(dict.fromkeys(matched_signals))

    return {
        "status": status,
        "issues": issues,
        "recommendations": recommendations,
        "issue_categories": unique_categories,
        "matched_signals": unique_signals,
        "confidence_score": confidence,
    }
