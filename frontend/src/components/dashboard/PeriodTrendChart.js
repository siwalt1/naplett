import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { calculateRollingAverage } from '../../utils/ChartUtils';

function PeriodTrendChart({ title, data, options, description, showRollingAverage = true }) {
    const [period, setPeriod] = useState('weekly');

    // Filter data based on selected period
    const filterData = () => {
        if (!data || !data.labels || data.labels.length === 0) {
            return {
                labels: [],
                datasets: []
            };
        }

        const cutoff = period === 'weekly' ? 7 : 30;
        const dataLength = data.labels.length;

        // If we don't have enough data for the selected period, use all available data
        if (dataLength <= cutoff) {
            return addRollingAverage(data);
        }

        // Otherwise, slice the data
        const filteredData = {
            ...data,
            labels: data.labels.slice(dataLength - cutoff),
            datasets: data.datasets.map(dataset => ({
                ...dataset,
                data: dataset.data.slice(dataLength - cutoff)
            }))
        };

        return addRollingAverage(filteredData);
    };

    // Add rolling average to the datasets
    const addRollingAverage = (chartData) => {
        if (!showRollingAverage || !chartData.datasets || chartData.datasets.length === 0) {
            return chartData;
        }

        const dataWithAverage = {
            ...chartData,
            datasets: [...chartData.datasets]
        };

        // Only add rolling average to the first dataset
        const primaryDataset = chartData.datasets[0];

        if (primaryDataset && primaryDataset.data && primaryDataset.data.length >= 4) {
            const rollingAvgData = calculateRollingAverage(primaryDataset.data);

            dataWithAverage.datasets.push({
                label: '7-Day Average',
                data: rollingAvgData,
                borderColor: 'rgba(75, 75, 75, 0.8)',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
                tension: 0.4
            });
        }

        return dataWithAverage;
    };

    const filteredData = filterData();

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">{title}</h5>
                    <div className="btn-group">
                        <button
                            type="button"
                            className={`btn btn-sm ${period === 'weekly' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setPeriod('weekly')}
                        >
                            Weekly
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${period === 'monthly' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setPeriod('monthly')}
                        >
                            Monthly
                        </button>
                    </div>
                </div>

                {filteredData.labels && filteredData.labels.length > 0 ? (
                    <Line data={filteredData} options={options} />
                ) : (
                    <div className="text-center py-5 text-muted">
                        <p>No data available.</p>
                    </div>
                )}

                {description && (
                    <div className="mt-3 small text-muted">
                        {description}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PeriodTrendChart;