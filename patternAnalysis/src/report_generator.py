import pandas as pd

def generate_health_report(merged_df, recent_df, recommendations, alerts, insights):
    """Generate a comprehensive health report"""
    if recent_df is None or recent_df.empty:
        return "No data available to generate health report."

    latest = recent_df.iloc[-1]
    report = [
        "=" * 80,
        "PERSONALIZED HEALTH INSIGHTS & RECOMMENDATIONS",
        "=" * 80,
        f"Report Date: {latest['day'].strftime('%Y-%m-%d')}",
        ""
    ]

    # Current Status
    report.extend(["-" * 80, "CURRENT STATUS", "-" * 80])
    metrics = {
        'score': 'Readiness Score',
        'score_sleep': 'Sleep Score',
        'score_activity': 'Activity Score',
        'steps': 'Steps',
        'total_calories': 'Total Calories',
        'spo2_percentage': 'Blood Oxygen'
    }
    for key, label in metrics.items():
        if key in latest and not pd.isna(latest[key]):
            value = int(latest[key]) if key in ['steps', 'total_calories'] else latest[key]
            unit = '%' if key == 'spo2_percentage' else '/100'
            report.append(f"{label}: {value}{unit}")

    report.append("")

    # Insights
    if insights:
        report.extend(["-" * 80, "INSIGHTS", "-" * 80])
        for insight in insights:
            report.append(f"• {insight}")
        report.append("")

    # Alerts
    if alerts:
        report.extend(["-" * 80, "ALERTS", "-" * 80])
        for alert in alerts:
            report.append(alert)
        report.append("")

    # Recommendations
    if any(recommendations.values()):
        report.extend(["-" * 80, "RECOMMENDATIONS", "-" * 80])
        for section, title in [
            ('sleep', 'SLEEP OPTIMIZATION'),
            ('activity', 'ACTIVITY GUIDANCE'),
            ('recovery', 'RECOVERY STRATEGIES'),
            ('general', 'GENERAL HEALTH')
        ]:
            if recommendations[section]:
                report.append(f"\n{title}:")
                for i, rec in enumerate(recommendations[section], 1):
                    report.append(f"{i}. {rec}")

        report.append("")

    # Weekly Trends
    report.extend(["-" * 80, "WEEKLY TRENDS", "-" * 80])
    trends = {
        'readiness_trend': 'Readiness',
        'sleep_trend': 'Sleep',
        'activity_trend': 'Activity',
        'hrv_trend': 'HRV Balance'
    }
    for key, label in trends.items():
        if key in latest and not pd.isna(latest[key]):
            trend = "↑" if latest[key] > 0 else "↓"
            report.append(f"{label}: {trend} {abs(round(latest[key]))}% compared to your baseline")

    report.extend([
        "",
        "=" * 80,
        "This report is based on your personal health data and is intended for informational purposes only.",
        "Always consult with healthcare professionals before making significant changes to your health routine.",
        "=" * 80
    ])

    return "\n".join(report)