/**
 * Calculate rolling average for a data series
 *
 * @param {Array} data - Array of numerical values to calculate rolling average
 * @param {number} window - Window size (default: 7)
 * @returns {Array} - Array with rolling averages
 */
export const calculateRollingAverage = (data, window = 7) => {
    if (!data || data.length < window) {
        return data.map(() => null);
    }

    const result = [];

    // Fill initial positions with null
    for (let i = 0; i < window - 1; i++) {
        result.push(null);
    }

    // Calculate rolling averages
    for (let i = window - 1; i < data.length; i++) {
        let sum = 0;
        let count = 0;

        for (let j = 0; j < window; j++) {
            if (data[i - j] !== null && data[i - j] !== undefined) {
                sum += data[i - j];
                count++;
            }
        }

        result.push(count > 0 ? sum / count : null);
    }

    return result;
};

/**
 * Format a metric value for display
 *
 * @param {string} metric - Metric name
 * @param {number} value - Metric value
 * @returns {string} - Formatted value with units
 */
export const formatMetricValue = (metric, value) => {
    if (!value && value !== 0) return 'N/A';

    if (['avg_total_sleep', 'avg_deep_sleep', 'avg_rem_sleep', 'avg_light_sleep'].includes(metric)) {
        return `${(value / 60).toFixed(1)} hrs`;
    }

    if (metric === 'avg_efficiency' || metric.includes('efficiency')) {
        return `${value.toFixed(1)}%`;
    }

    if (metric === 'avg_hrv' || metric.includes('hrv')) {
        return `${Math.round(value)} ms`;
    }

    if (metric === 'avg_resting_hr' || metric.includes('heart_rate')) {
        return `${Math.round(value)} bpm`;
    }

    return value.toFixed(1);
};

/**
 * Get a user-friendly label for a metric
 *
 * @param {string} metric - Metric name
 * @returns {string} - User-friendly label
 */
export const getMetricLabel = (metric) => {
    const labels = {
        'avg_total_sleep': 'Sleep Duration (hours)',
        'avg_deep_sleep': 'Deep Sleep (hours)',
        'avg_rem_sleep': 'REM Sleep (hours)',
        'avg_light_sleep': 'Light Sleep (hours)',
        'avg_efficiency': 'Sleep Efficiency (%)',
        'avg_hrv': 'Heart Rate Variability (ms)',
        'avg_resting_hr': 'Resting Heart Rate (bpm)',
        'total_sleep_duration': 'Sleep Duration (hours)',
        'deep_sleep_duration': 'Deep Sleep (hours)',
        'rem_sleep_duration': 'REM Sleep (hours)',
        'light_sleep_duration': 'Light Sleep (hours)',
        'efficiency': 'Sleep Efficiency (%)',
        'average_hrv': 'Heart Rate Variability (ms)',
        'resting_heart_rate': 'Resting Heart Rate (bpm)'
    };

    return labels[metric] || metric;
};