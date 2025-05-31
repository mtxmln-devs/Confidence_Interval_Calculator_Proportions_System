// Variables store DOM elements and results.
let elements = {}; // Object caches DOM elements.
let calculationResults = null; // Variable stores calculation results.
let activeInput = null; // Variable tracks focused input.

// Z-scores define common confidence levels.
const Z_SCORES = {
    90: 1.645,
    95: 1.96,
    99: 2.576
};

/** Function that initializes calculator on DOM load. */
function initializeCalculator() {
    cacheElements(); // Function caches DOM elements.
    setupEventListeners(); // Function sets up event listeners.
    showPlaceholder(); // Function shows placeholder card.
}

/** Function that stores DOM elements for performance. */
function cacheElements() {
    elements = {
        // Inputs
        successes: document.getElementById('successes'),
        sampleSize: document.getElementById('sampleSize'),
        confidenceLevel: document.getElementById('confidenceLevel'),
        customConfidence: document.getElementById('customConfidence'),
        // Error messages
        successesError: document.getElementById('successes-error'),
        sampleSizeError: document.getElementById('sampleSize-error'),
        confidenceError: document.getElementById('confidence-error'),
        // Result displays
        solutionCard: document.getElementById('solutionCard'),
        resultsCard: document.getElementById('resultsCard'),
        placeholderCard: document.getElementById('placeholderCard'),
        sampleProportion: document.getElementById('sampleProportion'),
        marginOfError: document.getElementById('marginOfError'),
        confidenceInterval: document.getElementById('confidenceInterval'),
        confidenceIntervalPercent: document.getElementById('confidenceIntervalPercent'),
        confidenceIntervalTitle: document.getElementById('confidenceIntervalTitle'),
        zScore: document.getElementById('zScore'),
        standardError: document.getElementById('standardError'),
        // Solution steps
        step1Formula: document.getElementById('step1Formula'),
        step2Formula: document.getElementById('step2Formula'),
        step3Formula: document.getElementById('step3Formula'),
        step4Formula: document.getElementById('step4Formula'),
        step5Formula: document.getElementById('step5Formula'),
        // Calculator buttons
        calcButtons: document.querySelectorAll('.calc-button')
    };
}

/** Function sets up event listeners. */
function setupEventListeners() {
    // Input change listeners
    elements.successes.addEventListener('input', handleInputChange);
    elements.sampleSize.addEventListener('input', handleInputChange);
    elements.confidenceLevel.addEventListener('change', handleConfidenceLevelChange);
    elements.customConfidence.addEventListener('input', handleInputChange);
    
    // Input validation listeners
    elements.successes.addEventListener('blur', validateSuccesses);
    elements.sampleSize.addEventListener('blur', validateSampleSize);
    elements.customConfidence.addEventListener('blur', validateCustomConfidence);

    // Input focus listeners
    elements.successes.addEventListener('focus', () => setActiveInput(elements.successes));
    elements.sampleSize.addEventListener('focus', () => setActiveInput(elements.sampleSize));
    elements.customConfidence.addEventListener('focus', () => setActiveInput(elements.customConfidence));

    // Input blur listeners
    elements.successes.addEventListener('blur', removeActiveInputHighlight);
    elements.sampleSize.addEventListener('blur', removeActiveInputHighlight);
    elements.customConfidence.addEventListener('blur', removeActiveInputHighlight);

    // Calculator button listeners
    elements.calcButtons.forEach(button => {
        button.addEventListener('click', handleCalculatorButtonClick);
    });
}

/** Function highlights active input field.
 * @param {HTMLElement} inputElement Focused input element
 */
function setActiveInput(inputElement) {
    if (activeInput && activeInput !== inputElement) {
        activeInput.classList.remove('active-input');
    }
    activeInput = inputElement;
    activeInput.classList.add('active-input');
    activeInput.focus();
}

/** Function removes highlight from input. */
function removeActiveInputHighlight() {
    if (activeInput) {
        activeInput.classList.remove('active-input');
    }
}

/** Function handles calculator button clicks.
 * @param {Event} event Button click event
 */
function handleCalculatorButtonClick(event) {
    const inputOrder = [elements.successes, elements.sampleSize];
    if (elements.confidenceLevel.value === 'custom') {
        inputOrder.push(elements.customConfidence);
    }

    if (!activeInput) {
        setActiveInput(inputOrder[0]); // Function sets default active input.
    }

    const buttonValue = event.target.dataset.value;
    const buttonAction = event.target.dataset.action;

    if (buttonValue !== undefined) {
        if (buttonValue === '.' && activeInput.value.includes('.')) return;
        activeInput.value += buttonValue; // Statement appends button value.
    } else if (buttonAction) {
        switch (buttonAction) {
            case 'clear':
                elements.successes.value = '';
                elements.sampleSize.value = '';
                elements.customConfidence.value = '';
                elements.confidenceLevel.value = '95';
                elements.customConfidence.style.display = 'none';
                if (activeInput) {
                    activeInput.classList.remove('active-input');
                    activeInput = null;
                }
                break;
            case 'up':
                let currentIndexUp = inputOrder.indexOf(activeInput);
                let prevIndex = (currentIndexUp - 1 + inputOrder.length) % inputOrder.length;
                setActiveInput(inputOrder[prevIndex]); // Function switches to previous input.
                break;
            case 'down':
                let currentIndexDown = inputOrder.indexOf(activeInput);
                let nextIndex = (currentIndexDown + 1) % inputOrder.length;
                setActiveInput(inputOrder[nextIndex]); // Function switches to next input.
                break;
        }
    }
    handleInputChange(); // Function triggers recalculation.
}

/** Function handles input changes, validates. */
function handleInputChange() {
    clearErrorStates(); // Function clears error messages.
    if (validateAllInputs()) {
        calculateConfidenceInterval(); // Function performs confidence calculation.
        displayResults(); // Function displays calculation results.
    } else {
        showPlaceholder(); // Function shows placeholder card.
    }
}

/** Function handles confidence level changes. */
function handleConfidenceLevelChange() {
    const selectedLevel = elements.confidenceLevel.value;
    elements.customConfidence.style.display = selectedLevel === 'custom' ? 'block' : 'none';
    if (selectedLevel === 'custom') {
        elements.customConfidence.focus();
        setActiveInput(elements.customConfidence); // Function sets custom input active.
    } else {
        elements.customConfidence.value = '';
        if (activeInput === elements.customConfidence) {
            activeInput.classList.remove('active-input');
            activeInput = null;
        }
    }
    handleInputChange(); // Function triggers recalculation.
}

/** Function validates successes input. */
function validateSuccesses() {
    const successes = parseFloat(elements.successes.value);
    const sampleSize = parseFloat(elements.sampleSize.value);
    if (!elements.successes.value || isNaN(successes) || successes < 0) {
        showError('successes', 'Successes must be non-negative.');
        return false;
    }
    if (!isNaN(sampleSize) && successes > sampleSize) {
        showError('successes', 'Successes cannot exceed sample.');
        return false;
    }
    return true;
}

/** Function validates sample size input. */
function validateSampleSize() {
    const sampleSize = parseFloat(elements.sampleSize.value);
    if (!elements.sampleSize.value || isNaN(sampleSize) || sampleSize <= 0) {
        showError('sampleSize', 'Sample size must be positive.');
        return false;
    }
    return true;
}

/** Function that validates custom confidence level. */
function validateCustomConfidence() {
    if (elements.confidenceLevel.value !== 'custom') return true;
    const confidence = parseFloat(elements.customConfidence.value);
    if (!elements.customConfidence.value || isNaN(confidence) || confidence <= 0 || confidence >= 100) {
        showError('confidence', 'Confidence must be 0-100.');
        return false;
    }
    return true;
}

/** Function that validates all inputs. */
function validateAllInputs() {
    return validateSuccesses() && validateSampleSize() && validateCustomConfidence();
}

/** Function that shows error for input.
 * @param {string} field Input field name
 * @param {string} message Error message text
 */
function showError(field, message) {
    const errorElement = elements[field + 'Error'];
    const inputElement = elements[field] || elements.customConfidence;
    errorElement.textContent = message;
    errorElement.classList.add('show');
    inputElement.classList.add('error');
}

/** Function that clears all error messages. */
function clearErrorStates() {
    [elements.successesError, elements.sampleSizeError, elements.confidenceError].forEach(el => {
        el.classList.remove('show');
        el.textContent = '';
    });
    [elements.successes, elements.sampleSize, elements.customConfidence].forEach(el => {
        el.classList.remove('error');
    });
}

/** Function that calculates confidence interval. */
function calculateConfidenceInterval() {
    const x = parseFloat(elements.successes.value);
    const n = parseFloat(elements.sampleSize.value);
    const confidenceLevel = getConfidenceLevel();
    const sampleProportion = x / n;
    const zScore = getZScore(confidenceLevel);
    const standardError = Math.sqrt((sampleProportion * (1 - sampleProportion)) / n);
    const marginOfError = zScore * standardError;
    const lowerBound = Math.max(0, sampleProportion - marginOfError);
    const upperBound = Math.min(1, sampleProportion + marginOfError);
    calculationResults = {
        sampleProportion,
        marginOfError,
        confidenceInterval: [lowerBound, upperBound],
        confidenceLevel,
        zScore,
        standardError
    };
}

/** Function that gets confidence level.
 * @returns {number} Confidence level percentage
 */
function getConfidenceLevel() {
    return elements.confidenceLevel.value === 'custom' ? 
        parseFloat(elements.customConfidence.value) : 
        parseFloat(elements.confidenceLevel.value);
}

/** Function gets z-score for confidence.
 * @param {number} confidenceLevel Confidence level percentage
 * @returns {number} Corresponding z-score
 */
function getZScore(confidenceLevel) {
    if (Z_SCORES[confidenceLevel]) return Z_SCORES[confidenceLevel];
    console.warn("Simplified z-score for custom level.");
    if (confidenceLevel >= 99) return Z_SCORES[99];
    if (confidenceLevel <= 90) return Z_SCORES[90];
    if (confidenceLevel > 90 && confidenceLevel < 95) {
        const ratio = (confidenceLevel - 90) / (95 - 90);
        return Z_SCORES[90] + ratio * (Z_SCORES[95] - Z_SCORES[90]);
    }
    if (confidenceLevel > 95 && confidenceLevel < 99) {
        const ratio = (confidenceLevel - 95) / (99 - 95);
        return Z_SCORES[95] + ratio * (Z_SCORES[99] - Z_SCORES[95]);
    }
    return 1.96; // Default is 95% z-score.
}

/** Function displays calculation results. */
function displayResults() {
    if (!calculationResults) return;
    elements.solutionCard.style.display = 'block';
    elements.resultsCard.style.display = 'block';
    elements.placeholderCard.style.display = 'none';
    displayStepByStepSolution(); // Function shows solution steps.
    elements.confidenceIntervalTitle.textContent = `${calculationResults.confidenceLevel}% Confidence Interval`;
    elements.sampleProportion.textContent = `${formatDecimal(calculationResults.sampleProportion)} (${formatPercent(calculationResults.sampleProportion)})`;
    elements.marginOfError.textContent = `±${formatDecimal(calculationResults.marginOfError)} (±${formatPercent(calculationResults.marginOfError)})`;
    elements.confidenceInterval.textContent = `[${formatDecimal(calculationResults.confidenceInterval[0])}, ${formatDecimal(calculationResults.confidenceInterval[1])}]`;
    elements.confidenceIntervalPercent.textContent = `[${formatPercent(calculationResults.confidenceInterval[0])}, ${formatPercent(calculationResults.confidenceInterval[1])}]`;
    elements.zScore.textContent = formatDecimal(calculationResults.zScore, 3);
    elements.standardError.textContent = formatDecimal(calculationResults.standardError);
}

/** Function displays step-by-step solution. */
function displayStepByStepSolution() {
    const x = parseFloat(elements.successes.value);
    const n = parseFloat(elements.sampleSize.value);
    const results = calculationResults;
    elements.step1Formula.textContent = `p̂ = ${x}/${n} = ${formatDecimal(results.sampleProportion)}`;
    elements.step2Formula.textContent = `z = ${formatDecimal(results.zScore, 3)} for ${results.confidenceLevel}%`;
    elements.step3Formula.textContent = `SE = √(${formatDecimal(results.sampleProportion)}×${formatDecimal(1 - results.sampleProportion)}/${n}) = ${formatDecimal(results.standardError)}`;
    elements.step4Formula.textContent = `ME = ${formatDecimal(results.zScore, 3)} × ${formatDecimal(results.standardError)} = ±${formatDecimal(results.marginOfError)}`;
    elements.step5Formula.textContent = `CI = ${formatDecimal(results.sampleProportion)} ± ${formatDecimal(results.marginOfError)} = [${formatDecimal(results.confidenceInterval[0])}, ${formatDecimal(results.confidenceInterval[1])}]`;
}

/** Function shows placeholder card. */
function showPlaceholder() {
    elements.solutionCard.style.display = 'none';
    elements.resultsCard.style.display = 'none';
    elements.placeholderCard.style.display = 'block';
}

/** Function formats number as decimal.
 * @param {number} value Number to format
 * @param {number} decimals Decimal places (default: 4)
 * @returns {string} Formatted decimal string
 */
function formatDecimal(value, decimals = 4) {
    return value.toFixed(decimals);
}

/** Function formats number as percentage.
 * @param {number} value Decimal to convert
 * @returns {string} Formatted percentage string
 */
function formatPercent(value) {
    return (value * 100).toFixed(2) + '%';
}

// Listener starts calculator on DOM load.
document.addEventListener('DOMContentLoaded', initializeCalculator);