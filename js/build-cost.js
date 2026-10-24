const RATE_SOURCE = 'https://rates.buildocrat.store/data/rate-data.json';
const RATE_CACHE_KEY = 'otitech-build-cost-ratebook-v1';
const BASE_PLAN_AREA = 140;
const PRELIMINARIES_RATE = 0.1;

const REFERENCE_BOQ = [
    ['A01', 450], ['A02', 38], ['A04', 20], ['A07', 150], ['A08', 150],
    ['B01', 3.2], ['B02', 16], ['B06', 1.2], ['B12', 0.4], ['B07', 55],
    ['C03', 42], ['A05', 45], ['A06', 150], ['C01', 380], ['B03', 6],
    ['B09', 90], ['D01', 190], ['D02', 190], ['D04', 60], ['E01', 760],
    ['E02', 330], ['E03', 140], ['E04', 115], ['E06', 40], ['E07', 760],
    ['E08', 330], ['E20', 140], ['J01', 8], ['J03', 1], ['J04', 18],
    ['F01', 32], ['F02', 28], ['F23', 1], ['F03', 3], ['F04', 3],
    ['F05', 1], ['F12', 9], ['F14', 7]
];

const WATCH_ITEMS = [
    ['M-CEM-01', 'Cement, 50kg bag'],
    ['M-STL-01', 'Iron rods, 12–16mm per tonne'],
    ['M-BLK-01', '9-inch hollow block'],
    ['M-AGG-01', 'Sharp sand, 20-tonne load'],
    ['M-AGG-07', 'Granite, 30-tonne load'],
    ['M-RF-01', 'Longspan roofing, per m²']
];

const FINISH_RATES = {
    basic: { roof: 'D06', floor: 'E11', ceiling: 'E21' },
    standard: { roof: 'D02', floor: 'E04', ceiling: 'E20' },
    premium: { roof: 'D03', floor: 'E05', ceiling: 'E09' }
};

const AREA_SUGGESTIONS = {
    bungalow: { 2: 105, 3: 140, 4: 175, 5: 210, 6: 245 },
    duplex: { 2: 200, 3: 240, 4: 280, 5: 320, 6: 360 },
    apartment: { 2: 65, 3: 85, 4: 110, 5: 135, 6: 160 }
};

const form = document.getElementById('estimate-form');
const typeInput = document.getElementById('building-type');
const bedroomInput = document.getElementById('bedrooms');
const unitInput = document.getElementById('unit-count');
const floorInput = document.getElementById('floor-count');
const areaInput = document.getElementById('floor-area');
const locationInput = document.getElementById('build-location');
const finishInput = document.getElementById('finish-level');
const landInput = document.getElementById('land-cost');
const fxInput = document.getElementById('fx-scenario');
const fxOutput = document.getElementById('fx-scenario-value');
const bedroomsField = document.getElementById('bedrooms-field');
const unitsField = document.getElementById('units-field');
const floorsField = document.getElementById('floors-field');
const areaHint = document.getElementById('area-hint');
const rateStatus = document.getElementById('market-meta');
const rateList = document.getElementById('market-rates');
const fxDisplay = document.getElementById('market-fx');
const resultEmpty = document.getElementById('result-empty');
const resultContent = document.getElementById('result-content');
const estimateStatus = document.getElementById('estimate-status');

let rateBook = null;
let rateIndexes = null;
let areaWasEdited = false;
let estimateWasShown = false;

const formatNaira = (amount) => {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
    return '₦' + new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(safeAmount);
};

const formatDate = (value) => {
    if (!value) return 'date not supplied';
    const parsed = new Date(String(value).slice(0, 10) + 'T12:00:00');
    return Number.isNaN(parsed.getTime())
        ? String(value)
        : new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
};

const arrayInData = (data, test) => {
    if (!data || typeof data !== 'object') return [];
    return Object.values(data).find((value) => Array.isArray(value) && value.some(test)) || [];
};

const readRateBook = (data) => {
    const materials = Array.isArray(data.resources)
        ? data.resources
        : arrayInData(data, (row) => row && row.c === 'M-CEM-01' && ('r' in row || 'k' in row));
    const labour = Array.isArray(data.labour)
        ? data.labour
        : arrayInData(data, (row) => row && row.c === 'L-LAB' && ('day' in row || 'mon' in row));
    const plant = Array.isArray(data.plant)
        ? data.plant
        : arrayInData(data, (row) => row && row.c && String(row.c).startsWith('P-') && 'dry' in row);
    const buildUps = arrayInData(data, (row) => row && row.c === 'A01' && Array.isArray(row.l));

    if (!data.meta || !data.meta.updated || !materials.length || !labour.length || !plant.length || !buildUps.length) {
        throw new Error('The published rate book did not contain the expected price and build-up data.');
    }

    return {
        meta: data.meta,
        params: data.params || {},
        locations: Array.isArray(data.locations) ? data.locations : [],
        materials: new Map(materials.map((item) => [item.c, item])),
        labour: new Map(labour.map((item) => [item.c, item])),
        plant: new Map(plant.map((item) => [item.c, item])),
        buildUps: new Map(buildUps.map((item) => [item.c, item]))
    };
};

const createRange = (base, low, high, fallbackSpread = 0.15) => {
    const numericBase = Number(base);
    if (!Number.isFinite(numericBase)) return null;
    const numericLow = low === null || low === undefined || low === '' ? NaN : Number(low);
    const numericHigh = high === null || high === undefined || high === '' ? NaN : Number(high);
    return {
        base: numericBase,
        low: Number.isFinite(numericLow) ? numericLow : numericBase * (1 - fallbackSpread),
        high: Number.isFinite(numericHigh) ? numericHigh : numericBase * (1 + fallbackSpread)
    };
};

const resourcePrice = (code, fxMultiplier, seen = new Set()) => {
    if (seen.has(code)) return null;
    const item = rateIndexes.materials.get(code);
    if (!item) return null;

    const nextSeen = new Set(seen);
    nextSeen.add(code);

    if (item.k && item.k.b) {
        const ratio = Number(item.k.f);
        const spread = Number(item.k.s);
        if (!Number.isFinite(ratio)) return null;

        if (item.k.b === 'M-FX-USD') {
            const fx = Number(rateBook.meta.fx);
            if (!Number.isFinite(fx)) return null;
            const base = fx * ratio * fxMultiplier;
            const uncertainty = Number.isFinite(spread) ? spread : 0.2;
            return createRange(base, base * (1 - uncertainty), base * (1 + uncertainty));
        }

        const parent = resourcePrice(item.k.b, fxMultiplier, nextSeen);
        if (!parent) return null;
        return {
            base: parent.base * ratio,
            low: parent.low * ratio,
            high: parent.high * ratio
        };
    }

    if (item.r === undefined || item.r === null) return null;
    return createRange(item.r, item.lo, item.hi);
};

const labourPricePerHour = (code, locationFactor = 1) => {
    const item = rateIndexes.labour.get(code);
    if (!item) return null;

    const hoursPerDay = Number(rateBook.params.hrs) || 8;
    const daysPerMonth = Number(rateBook.params.dpm) || 26;
    const craftUplift = Number(rateBook.params.craftUplift) || 0.31;
    const staffOncost = Number(rateBook.params.staffOncost) || 0.253;
    const isStaff = Number.isFinite(Number(item.mon)) && item.mon !== null;
    const uplift = isStaff ? staffOncost : craftUplift;
    const day = isStaff ? Number(item.mon) / daysPerMonth : Number(item.day);
    if (!Number.isFinite(day) || day <= 0) return null;

    const lowDay = item.lo !== null && item.lo !== undefined && Number.isFinite(Number(item.lo)) ? Number(item.lo) : day * 0.85;
    const highDay = item.hi !== null && item.hi !== undefined && Number.isFinite(Number(item.hi)) ? Number(item.hi) : day * 1.15;
    return {
        base: (day * (1 + uplift) / hoursPerDay) * locationFactor,
        low: (lowDay * (1 + uplift) / hoursPerDay) * locationFactor,
        high: (highDay * (1 + uplift) / hoursPerDay) * locationFactor
    };
};

const plantPricePerDay = (code, fxMultiplier, locationFactor = 1) => {
    const item = rateIndexes.plant.get(code);
    if (!item) return null;
    const dry = createRange(item.dry, item.lo, item.hi);
    if (!dry) return null;

    const lubricantRate = Number(rateBook.params.lube) || 0.1;
    const fuel = item.fuel ? resourcePrice(item.fuel, fxMultiplier) : null;
    const fuelLitres = Number(item.lpd) || 0;
    const operator = item.op ? labourPricePerHour(item.op, 1) : null;
    const hoursPerDay = Number(rateBook.params.hrs) || 8;
    const operatorPerDay = operator ? {
        base: operator.base * hoursPerDay,
        low: operator.low * hoursPerDay,
        high: operator.high * hoursPerDay
    } : { base: 0, low: 0, high: 0 };

    return {
        base: (dry.base + (fuel ? fuel.base * fuelLitres * (1 + lubricantRate) : 0) + operatorPerDay.base) * locationFactor,
        low: (dry.low + (fuel ? fuel.low * fuelLitres * (1 + lubricantRate) : 0) + operatorPerDay.low) * locationFactor,
        high: (dry.high + (fuel ? fuel.high * fuelLitres * (1 + lubricantRate) : 0) + operatorPerDay.high) * locationFactor
    };
};

const compositeRate = (code, location, fxMultiplier) => {
    const item = rateIndexes.buildUps.get(code);
    if (!item || !Array.isArray(item.l)) return null;

    let material = { base: 0, low: 0, high: 0 };
    let labour = { base: 0, low: 0, high: 0 };
    let plant = { base: 0, low: 0, high: 0 };
    const wasteFallback = Number(rateBook.params.waste) || 0;

    for (const [kind, resourceCode, quantityValue] of item.l) {
        const quantity = Number(quantityValue);
        if (!Number.isFinite(quantity) || quantity <= 0) continue;

        if (kind === 'M') {
            const resource = rateIndexes.materials.get(resourceCode);
            const price = resourcePrice(resourceCode, fxMultiplier);
            if (!price) continue;
            const waste = Number(resource.w);
            const factor = quantity * (1 + (Number.isFinite(waste) ? waste : wasteFallback));
            material.base += price.base * factor;
            material.low += price.low * factor;
            material.high += price.high * factor;
        } else if (kind === 'L') {
            const price = labourPricePerHour(resourceCode);
            if (!price) continue;
            labour.base += price.base * quantity;
            labour.low += price.low * quantity;
            labour.high += price.high * quantity;
        } else if (kind === 'P') {
            const price = plantPricePerDay(resourceCode, fxMultiplier);
            if (!price) continue;
            plant.base += price.base * quantity;
            plant.low += price.low * quantity;
            plant.high += price.high * quantity;
        }
    }

    const factors = location || { material: 1, labour: 1, plant: 1 };
    return {
        base: material.base * factors.material + labour.base * factors.labour + plant.base * factors.plant,
        low: material.low * factors.material + labour.low * factors.labour + plant.low * factors.plant,
        high: material.high * factors.material + labour.high * factors.labour + plant.high * factors.plant
    };
};

const getLocation = (name) => {
    const row = rateBook.locations.find((location) => location[0] === name);
    if (!row) return { material: 1, labour: 1, plant: 1 };
    return {
        material: Number(row[1]) || 1,
        labour: Number(row[2]) || 1,
        plant: Number(row[3]) || 1
    };
};

const suggestedArea = () => {
    const type = typeInput.value;
    const bedrooms = Number(bedroomInput.value) || 3;
    const floors = Math.max(1, Number(floorInput.value) || 1);
    const units = Math.max(1, Number(unitInput.value) || 1);

    if (type === 'bungalow') return AREA_SUGGESTIONS.bungalow[bedrooms] || 140;
    if (type === 'duplex') return AREA_SUGGESTIONS.duplex[bedrooms] || 280;
    if (type === 'apartments') return (AREA_SUGGESTIONS.apartment[bedrooms] || 85) * units;
    return Math.max(500, floors * 250);
};

const refreshSuggestedArea = () => {
    if (!areaWasEdited) areaInput.value = String(suggestedArea());
};

const updateProjectFields = () => {
    const type = typeInput.value;
    const isApartments = type === 'apartments';
    const isHighRise = type === 'highrise';
    const isMultiStorey = type !== 'bungalow';

    bedroomsField.hidden = isHighRise;
    unitsField.hidden = !isApartments;
    floorsField.hidden = !isMultiStorey;
    floorInput.disabled = type === 'bungalow' || type === 'duplex';

    if (type === 'bungalow') {
        floorInput.value = '1';
        floorInput.min = '1';
        floorInput.max = '1';
        areaHint.textContent = 'Suggested from bedroom count. Enter the total measured floor area if you have it.';
    } else if (type === 'duplex') {
        floorInput.value = '2';
        floorInput.min = '2';
        floorInput.max = '2';
        areaHint.textContent = 'Suggested size covers both levels. Enter the total measured floor area if you have it.';
    } else if (isApartments) {
        floorInput.min = '2';
        floorInput.max = '4';
        if (Number(floorInput.value) < 2 || Number(floorInput.value) > 4) floorInput.value = '3';
        areaHint.textContent = 'Suggested from apartment count and bedrooms per apartment. Enter total floor area across all levels.';
    } else {
        floorInput.min = '5';
        floorInput.max = '40';
        if (Number(floorInput.value) < 5) floorInput.value = '8';
        areaHint.textContent = 'Enter the total gross floor area across all levels. The suggested size is only a starting point.';
    }

    refreshSuggestedArea();
};

const renderLocations = () => {
    locationInput.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a location';
    locationInput.append(placeholder);

    rateBook.locations.forEach((location) => {
        const option = document.createElement('option');
        option.value = location[0];
        option.textContent = location[0];
        locationInput.append(option);
    });

    if (rateBook.locations.some((location) => location[0] === 'Abuja (FCT)')) {
        locationInput.value = 'Abuja (FCT)';
    } else if (rateBook.locations.length) {
        locationInput.value = rateBook.locations[0][0];
    }
};

const renderMarketRates = () => {
    const locationName = locationInput.value || rateBook.meta.base || 'Abuja (FCT)';
    const factors = getLocation(locationName);
    const staleDays = Number(rateBook.params.stale) || 90;
    const sourceDate = new Date(String(rateBook.meta.updated).slice(0, 10) + 'T12:00:00');
    const ageDays = Math.floor((Date.now() - sourceDate.getTime()) / 86400000);
    const stale = Number.isFinite(ageDays) && ageDays > staleDays;

    rateStatus.textContent = (stale ? 'Older rate data · ' : 'Rates as at ') + formatDate(rateBook.meta.updated) + ' · ' + locationName;
    rateStatus.dataset.stale = String(stale);
    fxDisplay.textContent = Number.isFinite(Number(rateBook.meta.fx))
        ? formatNaira(Number(rateBook.meta.fx)) + ' / US$ · ' + (rateBook.meta.fxNote || 'source date not supplied')
        : 'Not supplied by the rate source';
    rateList.replaceChildren();

    WATCH_ITEMS.forEach(([code, fallbackName]) => {
        const item = rateIndexes.materials.get(code);
        const price = resourcePrice(code, 1);
        if (!item || !price) return;

        const card = document.createElement('article');
        card.className = 'build-cost-rate';
        const name = document.createElement('span');
        name.className = 'build-cost-rate__name';
        name.textContent = fallbackName;
        const amount = document.createElement('strong');
        amount.textContent = formatNaira(price.base * factors.material);
        const unit = document.createElement('span');
        unit.className = 'build-cost-rate__unit';
        const unitLabels = {
            nr: 'unit',
            m2: 'square metre',
            m3: 'cubic metre',
            t: 'tonne'
        };
        const unitLabel = unitLabels[item.u] || item.u || 'unit';
        unit.textContent = 'per ' + unitLabel + ' · ' + String(item.conf || 'REFERENCE').toLowerCase() + ' confidence';
        const range = document.createElement('span');
        range.className = 'build-cost-rate__range';
        range.textContent = formatNaira(price.low * factors.material) + ' to ' +
            formatNaira(price.high * factors.material) + ' source range';
        card.title = item.src || fallbackName;
        card.append(name, amount, unit, range);
        rateList.append(card);
    });

    if (!rateList.children.length) {
        rateStatus.textContent = 'The rate book is connected, but the watched material lines are unavailable.';
    }
};

const sectionLabel = (code) => {
    const section = String(code).charAt(0);
    const labels = {
        A: 'Site preparation & foundations',
        B: 'Concrete & structural frame',
        C: 'Blockwork & masonry',
        D: 'Roofing',
        E: 'Finishes',
        F: 'Electrical & plumbing',
        J: 'Doors & windows'
    };
    return labels[section] || 'Other measured work';
};

const buildingLabel = (type) => ({
    bungalow: 'Bungalow',
    duplex: 'Duplex',
    apartments: 'Block of flats / apartments',
    highrise: 'High-rise residential'
}[type] || 'Residential building');

const addContractAllowances = (range) => {
    const params = rateBook.params;
    const multiplier =
        (1 + PRELIMINARIES_RATE) *
        (1 + (Number(params.oh) || 0.075)) *
        (1 + (Number(params.cont) || 0.05)) *
        (1 + (Number(params.profit) || 0.1)) *
        (1 + (Number(params.vat) || 0.075));
    return {
        low: range.low * multiplier,
        base: range.base * multiplier,
        high: range.high * multiplier
    };
};

const estimate = () => {
    if (!rateBook || !rateIndexes) {
        estimateStatus.textContent = 'Wait for the dated market rates to load before calculating.';
        return;
    }

    const type = typeInput.value;
    const bedrooms = Number(bedroomInput.value) || 3;
    const floors = type === 'bungalow' ? 1 : Math.max(1, Number(floorInput.value) || 2);
    const grossArea = Math.max(40, Number(areaInput.value) || suggestedArea());
    const footprint = grossArea / floors;
    const locationName = locationInput.value;
    const location = getLocation(locationName);
    const finish = FINISH_RATES[finishInput.value] || FINISH_RATES.standard;
    const fxMultiplier = 1 + (Number(fxInput.value) || 0) / 100;
    const measured = { low: 0, base: 0, high: 0 };
    const breakdown = new Map();
    const missingCodes = [];

    REFERENCE_BOQ.forEach(([referenceCode, referenceQuantity]) => {
        let code = referenceCode;
        if (referenceCode === 'D02') code = finish.roof;
        if (referenceCode === 'E04') code = finish.floor;
        if (referenceCode === 'E20') code = finish.ceiling;

        const scopeArea = (referenceCode.charAt(0) === 'A' ||
            ['B01', 'B02', 'B06', 'B07', 'B12', 'C03'].includes(referenceCode))
            ? footprint
            : grossArea;
        const quantity = referenceQuantity * scopeArea / BASE_PLAN_AREA;
        const rate = compositeRate(code, location, fxMultiplier);
        if (!rate) {
            missingCodes.push(code);
            return;
        }

        const section = sectionLabel(referenceCode);
        const subtotal = breakdown.get(section) || { low: 0, base: 0, high: 0 };
        subtotal.low += quantity * rate.low;
        subtotal.base += quantity * rate.base;
        subtotal.high += quantity * rate.high;
        breakdown.set(section, subtotal);
        measured.low += quantity * rate.low;
        measured.base += quantity * rate.base;
        measured.high += quantity * rate.high;
    });

    const additionalFloorArea = Math.max(0, grossArea - footprint);
    if (additionalFloorArea > 0) {
        const extraStructure = [
            ['B03', (6 / BASE_PLAN_AREA) * additionalFloorArea],
            ['B09', (90 / BASE_PLAN_AREA) * additionalFloorArea],
            ['B14', 20 * Math.max(1, floors - 1)]
        ];

        extraStructure.forEach(([code, quantity]) => {
            const rate = compositeRate(code, location, fxMultiplier);
            if (!rate) {
                missingCodes.push(code);
                return;
            }
            const section = sectionLabel(code);
            const subtotal = breakdown.get(section) || { low: 0, base: 0, high: 0 };
            subtotal.low += quantity * rate.low;
            subtotal.base += quantity * rate.base;
            subtotal.high += quantity * rate.high;
            breakdown.set(section, subtotal);
            measured.low += quantity * rate.low;
            measured.base += quantity * rate.base;
            measured.high += quantity * rate.high;
        });
    }

    const contract = addContractAllowances(measured);
    const landCost = Math.max(0, Number(landInput.value) || 0);
    const resultTitle = document.getElementById('result-title');
    const scope = document.getElementById('result-scope');
    resultTitle.textContent = buildingLabel(type) + ' · indicative construction estimate';
    scope.textContent = grossArea.toLocaleString('en-NG') + ' m² total floor area · ' +
        floors + (floors === 1 ? ' floor' : ' floors') + ' · ' + (locationName || 'location not selected') +
        (type !== 'highrise' ? ' · ' + bedrooms + ' bedrooms' : '');

    document.getElementById('estimate-low').textContent = formatNaira(contract.low);
    document.getElementById('estimate-mid').textContent = formatNaira(contract.base);
    document.getElementById('estimate-high').textContent = formatNaira(contract.high);
    document.getElementById('estimate-per-sqm').textContent = formatNaira(contract.base / grossArea) + ' per m², with preliminaries, overheads, contingency, profit and VAT included.';

    const breakdownElement = document.getElementById('estimate-breakdown');
    breakdownElement.replaceChildren();
    breakdown.forEach((value, label) => {
        const row = document.createElement('div');
        row.className = 'build-cost-breakdown-row';
        const name = document.createElement('span');
        name.textContent = label;
        const amount = document.createElement('strong');
        amount.textContent = formatNaira(value.base);
        row.append(name, amount);
        breakdownElement.append(row);
    });

    const landRow = document.getElementById('land-total-row');
    landRow.hidden = landCost <= 0;
    if (landCost > 0) {
        document.getElementById('estimate-with-land').textContent =
            formatNaira(contract.low + landCost) + ' – ' + formatNaira(contract.high + landCost);
    }

    document.getElementById('estimate-source-date').textContent =
        'Rate book updated ' + formatDate(rateBook.meta.updated) + ' · FX: ' +
        (rateBook.meta.fxNote || 'CBN NFEM reference') + ' · Imported-item scenario +' +
        (Number(fxInput.value) || 0) + '%.';

    const enquiry = document.getElementById('boq-enquiry');
    const enquiryText = 'Hello OTI-TECH, please help me prepare a measured BOQ. ' +
        'Project: ' + buildingLabel(type) + ', ' + grossArea + ' m2, ' + floors + ' floors, ' +
        (locationName || 'location not selected') + ', ' + finishInput.value + ' finish.';
    enquiry.href = 'https://wa.me/2349017017156?text=' + encodeURIComponent(enquiryText);

    resultEmpty.hidden = true;
    resultContent.hidden = false;
    estimateWasShown = true;
    const notices = [];
    if (type === 'highrise') {
        notices.push('High-rise budgets need a project-specific design and measured BOQ. Lift, fire, power, deep foundation and specialist MEP packages are not included in this quick model.');
    }
    if (missingCodes.length) {
        notices.push('Some published rates were unavailable (' + [...new Set(missingCodes)].join(', ') + '); the result may be incomplete.');
    }
    if (Number(fxInput.value) > 0) {
        notices.push('The FX scenario adjusts only items the rate book explicitly marks as USD-linked.');
    }
    estimateStatus.textContent = notices.join(' ');
};

const updateRateBook = (data, statusLabel) => {
    rateBook = data;
    rateIndexes = readRateBook(data);
    renderLocations();
    renderMarketRates();
    if (estimateWasShown) estimate();
    if (statusLabel) rateStatus.textContent = statusLabel + ' · ' + rateStatus.textContent;
};

const fetchRateBook = async () => {
    const sameOriginUrl = new URL('/api/build-cost-rates', window.location.origin).toString();
    const endpoints = [sameOriginUrl, RATE_SOURCE];
    let lastError;

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, { cache: 'no-cache', headers: { Accept: 'application/json' } });
            if (!response.ok) throw new Error('Rate data request returned ' + response.status + '.');
            return await response.json();
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('Could not retrieve the published rate book.');
};

const loadRates = async () => {
    const refreshButton = document.getElementById('refresh-rates');
    refreshButton.disabled = true;
    refreshButton.textContent = 'Updating…';
    rateStatus.textContent = 'Loading dated market rates…';
    rateStatus.dataset.stale = 'false';

    try {
        const data = await fetchRateBook();
        try {
            localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(data));
        } catch (error) {
            // Storage can be unavailable in private browsing; live data still works.
        }
        updateRateBook(data, 'Updated now');
    } catch (error) {
        let cachedData = null;
        try {
            const cached = localStorage.getItem(RATE_CACHE_KEY);
            if (cached) cachedData = JSON.parse(cached);
        } catch (storageError) {
            cachedData = null;
        }

        if (cachedData) {
            try {
                updateRateBook(cachedData, 'Using saved rates · verify source date');
                estimateStatus.textContent = 'The live rate source is unavailable. This result uses saved rate data dated ' + formatDate(rateBook.meta.updated) + '.';
            } catch (cacheError) {
                rateStatus.textContent = 'Live market rates are unavailable. Please try again later.';
            }
        } else {
            rateStatus.textContent = 'Live market rates are unavailable. Please try again later.';
            fxDisplay.textContent = 'Unavailable';
            estimateStatus.textContent = 'No dated market-rate data is available, so an estimate cannot be calculated yet.';
        }
    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = 'Refresh';
    }
};

typeInput.addEventListener('change', () => {
    areaWasEdited = false;
    updateProjectFields();
    if (estimateWasShown) estimate();
});

[bedroomInput, unitInput, floorInput].forEach((input) => {
    input.addEventListener('change', () => {
        areaWasEdited = false;
        refreshSuggestedArea();
        if (estimateWasShown) estimate();
    });
});

areaInput.addEventListener('input', () => {
    areaWasEdited = true;
    if (estimateWasShown) estimate();
});

document.getElementById('reset-area').addEventListener('click', () => {
    areaWasEdited = false;
    refreshSuggestedArea();
    if (estimateWasShown) estimate();
});

locationInput.addEventListener('change', () => {
    if (rateBook) renderMarketRates();
    if (estimateWasShown) estimate();
});

[finishInput, landInput, fxInput].forEach((input) => {
    input.addEventListener('input', () => {
        if (input === fxInput) fxOutput.textContent = '+' + input.value + '%';
        if (input === landInput && !input.value) input.value = '';
        if (estimateWasShown) estimate();
    });
    input.addEventListener('change', () => {
        if (estimateWasShown) estimate();
    });
});

form.addEventListener('submit', (event) => {
    event.preventDefault();
    estimate();
});

document.getElementById('refresh-rates').addEventListener('click', loadRates);
document.getElementById('print-estimate').addEventListener('click', () => window.print());

updateProjectFields();
loadRates();
