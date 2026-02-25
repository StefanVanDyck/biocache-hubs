/**
 * Creates a range slider widget for a facet with numeric or date values.
 *
 * Handles the response format from biocache-service range facets:
 * - Numeric (year): labels like "[2000 TO 2000]", fq is null
 * - Date (event_date, date_identified): labels from i18n, fq like 'event_date:"2020-01-01T00:00:00Z"'
 * - Before bucket: label "[* TO ...]" (numeric) or first entry for dates
 * - After bucket: label "[... TO *]" (numeric)
 * - Not supplied: fq like "-year:*", i18nCode ending in ".novalue"
 *
 * @param {string} facetId - The Solr field name (e.g., "year", "event_date").
 * @param {string} queryString - The current search query parameters.
 * @param {Array} data - Array of FieldResultDTO objects from biocache-service, each with
 *   {label, i18nCode, count, fq}.
 * @returns {HTMLElement} The DOM element representing the range slider widget.
 */
function createFacetRangeSlider(facetId, queryString, data) {
  // ---- Classify entries ----
  var beforeEntry = null;
  var afterEntry = null;
  var notSuppliedEntry = null;
  var rangeEntries = [];

  for (var i = 0; i < data.length; i++) {
    var entry = data[i];
    if (_isNotSupplied(entry, facetId)) {
      notSuppliedEntry = entry;
    } else if (_isBeforeBucket(entry)) {
      beforeEntry = entry;
    } else if (_isAfterBucket(entry)) {
      afterEntry = entry;
    } else {
      rangeEntries.push(entry);
    }
  }

  // Nothing to show if no range entries
  if (rangeEntries.length === 0) {
    var empty = _el("div", "facet-range-slider-widget");
    empty.textContent = "No data available";
    return empty;
  }

  // ---- Detect facet type and extract display labels / fq values ----
  var isDateFacet = _isDateFacet(facetId);
  var parsed = rangeEntries.map(function(entry) {
    return {
      displayLabel: _extractDisplayLabel(entry, facetId, isDateFacet),
      rangeValue: _extractRangeValue(entry, facetId, isDateFacet),
      count: entry.count || 0,
      raw: entry
    };
  });

  // ---- Build DOM ----
  var widget = _el("div", "facet-range-slider-widget");
  var histogram = _el("div", "facet-range-slider-histogram");
  var trackArea = _el("div", "facet-range-slider-track-area");
  var trackBg = _el("div", "facet-range-slider-track-bg");
  var rangeFill = _el("div", "facet-range-slider-range-fill");
  var sliderMin = _el("input");
  var sliderMax = _el("input");
  var axis = _el("div", "facet-range-slider-axis");
  var axisLeft = _el("span");
  var axisRight = _el("span");
  var sliderFilterLink = _el("a", "facet-range-slider-filter-link tooltips");
  var sliderFilterIcon = _el("span", "fa fa-square-o");
  sliderFilterIcon.innerHTML = "&nbsp;";
  var sliderFilterItem = _el("span", "facet-item");
  sliderFilterLink.appendChild(sliderFilterIcon);
  sliderFilterLink.appendChild(sliderFilterItem);

  var maxIdx = parsed.length - 1;
  sliderMin.type = sliderMax.type = "range";
  sliderMin.min = sliderMax.min = 0;
  sliderMin.max = sliderMax.max = maxIdx;
  sliderMin.step = sliderMax.step = 1;
  sliderMin.value = 0;
  sliderMax.value = maxIdx;

  axisLeft.textContent = parsed[0].displayLabel;
  axisRight.textContent = parsed[parsed.length - 1].displayLabel;

  trackArea.appendChild(trackBg);
  trackArea.appendChild(rangeFill);
  trackArea.appendChild(sliderMin);
  trackArea.appendChild(sliderMax);
  axis.appendChild(axisLeft);
  axis.appendChild(axisRight);

  widget.appendChild(histogram);
  widget.appendChild(trackArea);
  widget.appendChild(axis);
  widget.appendChild(sliderFilterLink);

  // ---- Histogram bars (one per parsed entry — Solr gap controls bin count) ----
  var counts = parsed.map(function(p) { return p.count; });
  var maxCount = Math.max.apply(null, counts);

  var bars = parsed.map(function(entry, idx) {
    var bar = _el("div", "facet-range-slider-bar");
    bar.style.height =
      maxCount > 0 ? ((entry.count / maxCount) * 100).toFixed(2) + "%" : "0%";
    bar.title = entry.displayLabel + ": " + entry.count.toLocaleString();
    histogram.appendChild(bar);
    return { el: bar, idx: idx };
  });

  // ---- Slider logic ----
  function updateFill() {
    var low = parseInt(sliderMin.value, 10);
    var high = parseInt(sliderMax.value, 10);
    if (low > high) { var tmp = low; low = high; high = tmp; }

    if (maxIdx > 0) {
      rangeFill.style.left = (low / maxIdx) * 100 + "%";
      rangeFill.style.right = ((maxIdx - high) / maxIdx) * 100 + "%";
    } else {
      rangeFill.style.left = "0%";
      rangeFill.style.right = "0%";
    }

    var inRangeCount = 0;
    bars.forEach(function(b) {
      var inRange = b.idx >= low && b.idx <= high;
      if (inRange) {
        inRangeCount += parsed[b.idx].count;
      }
      b.el.classList.toggle("in-range", inRange);
    });

    var loLabel = parsed[low].displayLabel;
    var hiLabel = parsed[high].displayLabel;
    var rangeText =
      low === high
        ? loLabel
        : loLabel + " – " + hiLabel;

    // Update the link label and count, preserving the icon + facet-item structure
    sliderFilterItem.textContent = rangeText;
    var countSpan = _el("span", "facetCount");
    countSpan.textContent = " (" + inRangeCount.toLocaleString() + ")";
    sliderFilterItem.appendChild(countSpan);
  }

  function onSliderInput() {
    var low = parseInt(sliderMin.value, 10);
    var high = parseInt(sliderMax.value, 10);
    if (low >= high) {
      if (this === sliderMin) {
        sliderMin.value = Math.max(0, high - 1);
      } else {
        sliderMax.value = Math.min(maxIdx, low + 1);
      }
    }
    low = parseInt(sliderMin.value, 10);
    high = parseInt(sliderMax.value, 10);

    widget.setAttribute("data-low", low);
    widget.setAttribute("data-high", high);

    // Build the fq parameter for the selected range
    var fq = _buildRangeFq(facetId, parsed[low].rangeValue, parsed[high].rangeValue, isDateFacet);
    sliderFilterLink.href = "?" + queryString + "&fq=" + encodeURIComponent(fq);

    updateFill();
  }

  sliderMin.addEventListener("input", onSliderInput);
  sliderMax.addEventListener("input", onSliderInput);

  onSliderInput.call(sliderMin);

  // ---- Before / After / Not-supplied links ----
  // These use the same checkbox-icon + label pattern as regular facet list items.
  if (beforeEntry && beforeEntry.count > 0) {
    var beforeLink = _facetLink(
      "?" + queryString + "&fq=" + encodeURIComponent(_buildEntryFq(beforeEntry, facetId)),
      "Before " + parsed[0].displayLabel,
      beforeEntry.count
    );
    widget.appendChild(beforeLink);
  }

  if (afterEntry && afterEntry.count > 0) {
    var afterLink = _facetLink(
      "?" + queryString + "&fq=" + encodeURIComponent(_buildEntryFq(afterEntry, facetId)),
      "After " + parsed[parsed.length - 1].displayLabel,
      afterEntry.count
    );
    widget.appendChild(afterLink);
  }

  if (notSuppliedEntry && notSuppliedEntry.count > 0) {
    var notSuppliedLink = _facetLink(
      "?" + queryString + "&fq=" + encodeURIComponent(notSuppliedEntry.fq || ("-" + facetId + ":*")),
      notSuppliedEntry.label,
      notSuppliedEntry.count
    );
    widget.appendChild(notSuppliedLink);
  }

  return widget;
}

// ---- Helper functions (prefixed with _ to avoid global conflicts) ----

/** Create a DOM element with an optional CSS class. */
function _el(tag, className) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/**
 * Create a facet-style link that mirrors the regular facet list items:
 *   <a class="facet-range-slider-filter-link facet-range-slider-extra-link tooltips">
 *     <span class="fa fa-square-o">&nbsp;</span>
 *     <span class="facet-item">Label <span class="facetCount"> (N)</span></span>
 *   </a>
 */
function _facetLink(href, label, count) {
  var a = _el("a", "facet-range-slider-filter-link facet-range-slider-extra-link tooltips");
  a.href = href;

  var icon = _el("span", "fa fa-square-o");
  icon.innerHTML = "&nbsp;";
  a.appendChild(icon);

  var item = _el("span", "facet-item");
  item.textContent = label;

  var countSpan = _el("span", "facetCount");
  countSpan.textContent = " (" + count.toLocaleString() + ")";
  item.appendChild(countSpan);

  a.appendChild(item);
  return a;
}

/** Known date facet field names. */
var _DATE_FACETS = ["event_date", "date_identified", "first_loaded_date", "last_load_date"];

/** Check if this facet is a date-type facet. */
function _isDateFacet(facetId) {
  return _DATE_FACETS.indexOf(facetId) !== -1 || facetId.indexOf("date") !== -1;
}

/**
 * Detect a "not supplied" entry.
 * These have fq like "-year:*" or i18nCode ending in ".novalue".
 */
function _isNotSupplied(entry, facetId) {
  if (entry.fq && entry.fq === "-" + facetId + ":*") return true;
  if (entry.i18nCode && entry.i18nCode.indexOf(".novalue") !== -1) return true;
  return false;
}

/**
 * Detect a "before" bucket for numeric range facets.
 * Label looks like "[* TO 1599]".
 */
function _isBeforeBucket(entry) {
  return entry.label && /^\[\*\s+TO\s+/.test(entry.label);
}

/**
 * Detect an "after" bucket for numeric range facets.
 * Label looks like "[2025 TO *]".
 */
function _isAfterBucket(entry) {
  return entry.label && /\s+TO\s+\*\]$/.test(entry.label);
}

/**
 * Extract a user-friendly display label from a range entry.
 *
 * Numeric: "[2000 TO 2000]" -> "2000"
 * Date: i18nCode like "event_date.2020-01-01T00:00:00Z" -> "2020"
 */
function _extractDisplayLabel(entry, facetId, isDateFacet) {
  if (isDateFacet) {
    // Try extracting year from i18nCode (format: "field.2020-01-01T00:00:00Z")
    if (entry.i18nCode) {
      var dateMatch = entry.i18nCode.match(/(\d{4})-\d{2}-\d{2}/);
      if (dateMatch) return dateMatch[1];
    }
    // Try extracting from fq (format: 'event_date:"2020-01-01T00:00:00Z"')
    if (entry.fq) {
      var fqDateMatch = entry.fq.match(/(\d{4})-\d{2}-\d{2}/);
      if (fqDateMatch) return fqDateMatch[1];
    }
    // Fall back to label
    var labelDateMatch = entry.label.match(/(\d{4})/);
    return labelDateMatch ? labelDateMatch[1] : entry.label;
  }

  // Numeric: parse "[2000 TO 2000]" -> "2000"
  var rangeMatch = entry.label.match(/^\[(.+?)\s+TO\s+(.+?)\]$/);
  if (rangeMatch) {
    // For gap=1, start and end are the same (e.g., [2000 TO 2000]); show just the start
    return rangeMatch[1] === rangeMatch[2] ? rangeMatch[1] : rangeMatch[1] + "–" + rangeMatch[2];
  }

  return entry.label;
}

/**
 * Extract the raw Solr value used for building range fq queries.
 *
 * Numeric: "[2000 TO 2000]" -> "2000" (the start of the range)
 * Date: from i18nCode "event_date.2020-01-01T00:00:00Z" -> "2020-01-01T00:00:00Z"
 */
function _extractRangeValue(entry, facetId, isDateFacet) {
  if (isDateFacet) {
    // Extract date from i18nCode
    if (entry.i18nCode) {
      var dotIdx = entry.i18nCode.indexOf(".");
      if (dotIdx !== -1) {
        var dateStr = entry.i18nCode.substring(dotIdx + 1);
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
      }
    }
    // Extract from fq (format: 'event_date:"2020-01-01T00:00:00Z"')
    if (entry.fq) {
      var fqMatch = entry.fq.match(/"(.+?)"/);
      if (fqMatch) return fqMatch[1];
    }
    return entry.label;
  }

  // Numeric: extract start value from "[2000 TO 2000]"
  var rangeMatch = entry.label.match(/^\[(.+?)\s+TO\s+(.+?)\]$/);
  if (rangeMatch) return rangeMatch[1];

  return entry.label;
}

/**
 * Build a Solr fq parameter for a range selection.
 *
 * Numeric: "year:[2000 TO 2020]"
 * Date: "event_date:[2000-01-01T00:00:00Z TO 2020-01-01T00:00:00Z]"
 */
function _buildRangeFq(facetId, lowValue, highValue, isDateFacet) {
  return facetId + ":[" + lowValue + " TO " + highValue + "]";
}

/**
 * Build the fq for a before/after bucket entry.
 * Uses the entry's own fq if available, otherwise constructs from the label.
 */
function _buildEntryFq(entry, facetId) {
  if (entry.fq) return entry.fq;
  // For numeric before/after, the label IS the range (e.g., "[* TO 1599]")
  return facetId + ":" + entry.label;
}
