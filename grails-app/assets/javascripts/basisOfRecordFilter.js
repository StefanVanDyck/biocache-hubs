$(function () {
    var form = document.getElementById('basisOfRecordFilter');
    if (!form) {
        return;
    }

    var select = document.getElementById('basisOfRecordFilterSelect');
    var recordTypeClause = /^-?(?:basis_of_record|basisOfRecord):(?:"[^"]+"|[^\s()]+)$/i;
    var url = new URL(window.location.href);
    var selectedValue = null;

    function isRecordTypeFilter(filter) {
        var expression = filter.trim();
        if (expression.charAt(0) === '-') {
            expression = expression.substring(1).trim();
        }
        if (expression.charAt(0) === '(' && expression.charAt(expression.length - 1) === ')') {
            expression = expression.substring(1, expression.length - 1).trim();
        }

        if (/^\*:\*\s+-\s*(?:basis_of_record|basisOfRecord):(?:"[^"]+"|[^\s()]+)$/i.test(expression)) {
            return true;
        }

        var clauses = expression.split(/\s+OR\s+/i);
        return clauses.length > 0 && clauses.every(function (clause) {
            clause = clause.trim();
            return clauses.length === 1
                ? recordTypeClause.test(clause)
                : isRecordTypeFilter(clause);
        });
    }

    url.searchParams.getAll('fq').some(function (filter) {
        var match = filter.match(/^(?:basis_of_record|basisOfRecord):(?:"([^"]+)"|([^ ]+))$/i);
        if (match) {
            selectedValue = match[1] || match[2];
            return true;
        }
        return false;
    });

    if (selectedValue && Array.prototype.some.call(select.options, function (option) {
        return option.value === selectedValue;
    })) {
        select.value = selectedValue;
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        var nextUrl = new URL(window.location.href);
        var filters = nextUrl.searchParams.getAll('fq').filter(function (filter) {
            return !isRecordTypeFilter(filter);
        });
        nextUrl.searchParams.delete('fq');
        filters.forEach(function (filter) {
            nextUrl.searchParams.append('fq', filter);
        });
        if (select.value) {
            nextUrl.searchParams.append('fq', 'basis_of_record:' + select.value);
        }
        nextUrl.searchParams.delete('start');
        nextUrl.searchParams.delete('offset');
        window.location.href = nextUrl.toString();
    });
});