function updateSliderValue(sliderId, displayId) {
    var slider = document.getElementById(sliderId);
    var display = document.getElementById(displayId);
    display.textContent = slider.value;
}

function toggleMonthlyInput() {
    var investmentType = document.getElementById('investmentType').value;
    var monthlyInvestmentInput = document.getElementById('monthlyInvestmentInput');

    // Check if the investment type is 'monthly' and show/hide the monthly investment input accordingly
    if (investmentType === 'monthly') {
        // Remove the 'hidden' class if it exists
        if (monthlyInvestmentInput.classList.contains('hidden')) {
            monthlyInvestmentInput.classList.remove('hidden');
        }
    } else {
        // Add the 'hidden' class if it's not already there
        if (!monthlyInvestmentInput.classList.contains('hidden')) {
            monthlyInvestmentInput.classList.add('hidden');
        }
    }
}

function getColorForPercentile(percentile) {
    // Red to yellow gradient: interpolate between red (255,0,0) and yellow (255,255,0)
    var greenValue = Math.round(255 * (percentile / 10)); // Interpolate green channel
    return `rgb(255, ${greenValue}, 0)`;
}

function gaussianRandom(mean=0, stdev=1) {
// Standard Normal variate using Box-Muller transform. Credits to Maxwell Collard's answer in https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}

function runSimulations() {
    // Retrieve input values
    var amountInvested = parseFloat(document.getElementById('amountInvested').value);
    var investmentType = document.getElementById('investmentType').value; // Get the investment type
    var monthlyInvestment = investmentType === 'monthly' ? parseFloat(document.getElementById('monthlyInvestment').value) : 0;
    var cagr = parseFloat(document.getElementById('cagr').value) / 100; // Convert percentage to decimal
    var volatility = parseFloat(document.getElementById('volatility').value) / 100; // Convert percentage to decimal
    var timeHorizon = parseInt(document.getElementById('timeHorizon').value);
    var monteCarloSimulations = parseInt(document.getElementById('monteCarloSimulations').value);

    // Derived values
    var numMonths = timeHorizon*12;
    var monthlyReturn = Math.log(1 + cagr)/12; // like cagr/12 but adjusted for compounding
    var monthlyVolatility = volatility/Math.sqrt(12); // lognormal process, volatility grows with sqrt(time)

    // Calculate the timeseries of investment contributions
    var investmentContributions = [amountInvested]; // Start with the initial amount invested
    for (let month = 1; month <= numMonths; month++) {
        // Each month, add the monthly investment to the last value
        let lastValue = investmentContributions[month - 1];
        let newValue = lastValue + monthlyInvestment;
        investmentContributions.push(newValue);
    }

    // Run all simulations and store final values with corresponding simulation data
    var simulationResults = [];
    for (let sim = 0; sim < monteCarloSimulations; sim++) {
        let data = [amountInvested];
        for (let month = 1; month <= numMonths; month++) {
            let lastValue = data[month - 1];
            // Simulate the monthly growth with volatility
            let monthlyGrowth = monthlyReturn + monthlyVolatility*gaussianRandom(mean=0, stdev=1)
            let newValue = lastValue * (1 + monthlyGrowth) + monthlyInvestment;
            data.push(newValue);
        }
        simulationResults.push({ finalValue: data[numMonths], data: data });
    }

    // Sort simulation results by final value
    simulationResults.sort((a, b) => a.finalValue - b.finalValue);

    // Select the 10-percentiles
    var percentiles = [];
    for (let i = 1; i <= 9; i++) {
        let index = Math.floor(monteCarloSimulations * i / 10) - 1;
        percentiles.push(simulationResults[index].data);
    }

    // Clear previous chart if it exists and create a new canvas
    var resultElement = document.getElementById('simulationResult');
    resultElement.innerHTML = '<canvas id="monteCarloChart"></canvas>';
    var ctx = document.getElementById('monteCarloChart').getContext('2d');

    // Prepare datasets array for Chart.js
    var datasets = percentiles.map((data, index) => ({
        label: `Percentile ${(index + 1)*10}`,
        data: data,
        borderColor: getColorForPercentile(index + 1),
        backgroundColor: getColorForPercentile(index + 1),
        borderWidth: 1,
        pointRadius: 0, // Hide points for a cleaner look
    }));

    // Add the blue dashed line dataset for the cumulative investments
    datasets.push({
        label: 'Cumulative Investment',
        data: investmentContributions,
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.1)', // Light blue fill under the line
        borderWidth: 1,
        borderDash: [5, 5], // Dashed line: 5px dash, 5px gap
        pointRadius: 0, // Hide points for a cleaner look
        fill: true // Fill the area under the line
    });

    // Create Chart.js chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: numMonths + 1}, (_, i) => (i / 12).toFixed(1)), // [0, 0.1, 0.2, ..., numMonths/12]
            datasets: datasets
        },
        options: {
            aspectRatio: 3 / 4, // Custom aspect ratio (3:4)
            animation: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Value'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true, // Display the legend
                    position: 'top', // Position the legend at the top
                    align: 'start', // Align the legend to the start (left)
                    labels: {
                        boxWidth: 10, // Width of the color box
                        padding: 10, // Padding between rows
                        usePointStyle: true, // Use point style instead of box
                    },
                },
                tooltip: {
                    enabled: true // Enable tooltips
                }
            },
            elements: {
                line: {
                    tension: 0 // Disable bezier curves
                }
            }
        }
    });

    // Scroll to the chart element
    resultElement.scrollIntoView({
        behavior: 'smooth'
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    updateSliderValue('cagr', 'cagrValue');
    updateSliderValue('volatility', 'volatilityValue');
    toggleMonthlyInput(); 
});