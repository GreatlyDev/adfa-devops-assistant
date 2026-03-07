def analyze_log(log_text: str) -> dict:
    """
    Analyze deployment logs and return a simple rules-based result.
    This is the first version of ADFA's analysis engine.
    """

    log_lower = log_text.lower()

    issues = []
    recommendations = []
    status = "success"

    if "error" in log_lower:
        status = "failed"
        issues.append("Deployment log contains an error.")
        recommendations.append("Inspect the stack trace or error line in the deployment output.")

    if "failed" in log_lower:
        status = "failed"
        issues.append("Deployment log indicates a failure.")
        recommendations.append("Review the failed deployment step and validate configuration values.")

    if "timeout" in log_lower:
        status = "failed"
        issues.append("Deployment process may have timed out.")
        recommendations.append("Check service startup time, network connectivity, or CI/CD timeout settings.")

    if "permission denied" in log_lower:
        status = "failed"
        issues.append("Permission issue detected in deployment log.")
        recommendations.append("Verify IAM roles, file permissions, secrets access, and deployment credentials.")

    if not issues:
        issues.append("No obvious errors detected in log.")
        recommendations.append("Deployment log looks clean based on current analysis rules.")

    return {
        "status": status,
        "issues": issues,
        "recommendations": recommendations,
    }