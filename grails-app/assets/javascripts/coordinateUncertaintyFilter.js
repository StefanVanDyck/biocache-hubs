$(function () {
    var form = document.getElementById('coordinateUncertaintyRangeFilter');
    if (!form) {
        return;
    }

    var minimum = document.getElementById('minimumCoordinateUncertainty');
    var maximum = document.getElementById('maximumCoordinateUncertainty');
    var slider = document.getElementById('coordinateUncertaintySlider');
    var error = document.getElementById('coordinateUncertaintyRangeError');
    var field = 'coordinateUncertaintyInMeters';
    var rangeQuery = /^coordinateUncertaintyInMeters:\[(-?\d+(?:\.\d+)?|\*)\s+TO\s+(-?\d+(?:\.\d+)?|\*)\]$/;
    var limit = Number(maximum.max);
    var start = [0, limit];
    var url = new URL(window.location.href);

    url.searchParams.getAll('fq').some(function (filter) {
        var match = filter.match(rangeQuery);
        if (match) {
            start = [
                match[1] === '*' ? 0 : Math.round(Number(match[1])),
                match[2] === '*' ? limit : Math.round(Number(match[2]))
            ];
            return true;
        }
        return false;
    });

    noUiSlider.create(slider, {
        start: start,
        connect: true,
        step: 1,
        range: {min: 0, max: limit},
        format: {
            to: function (value) { return String(Math.round(value)); },
            from: Number
        },
        handleAttributes: [
            {'aria-label': slider.getAttribute('data-min-label')},
            {'aria-label': slider.getAttribute('data-max-label')}
        ]
    });

    function validate() {
        var valid = minimum.validity.valid && maximum.validity.valid &&
            minimum.valueAsNumber <= maximum.valueAsNumber;
        error.hidden = valid;
        minimum.setAttribute('aria-invalid', String(!valid));
        maximum.setAttribute('aria-invalid', String(!valid));
        return valid;
    }

    slider.noUiSlider.on('update', function (values) {
        minimum.value = values[0];
        maximum.value = values[1];
        validate();
    });

    // Preserve out-of-range URL values so applying never silently clamps a filter.
    minimum.value = start[0];
    maximum.value = start[1];
    validate();

    [minimum, maximum].forEach(function (input) {
        input.addEventListener('input', function () {
            if (validate()) {
                slider.noUiSlider.set([minimum.valueAsNumber, maximum.valueAsNumber]);
            }
        });
        input.addEventListener('invalid', function () {
            error.hidden = false;
        });
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!validate()) {
            return;
        }

        var nextUrl = new URL(window.location.href);
        var filters = nextUrl.searchParams.getAll('fq').filter(function (filter) {
            return !rangeQuery.test(filter);
        });
        nextUrl.searchParams.delete('fq');
        filters.forEach(function (filter) {
            nextUrl.searchParams.append('fq', filter);
        });
        nextUrl.searchParams.append('fq', field + ':[' + minimum.value + ' TO ' + maximum.value + ']');
        nextUrl.searchParams.delete('start');
        window.location.href = nextUrl.toString();
    });
});
