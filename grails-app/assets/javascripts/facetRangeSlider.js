/**
 * Creates a range slider widget for a facet with numeric or date values.
 *
 * @param {string} facetId - The ID of the facet.
 * @param {string} queryString - The current query string for building filter links.
 * @param {Object} facetResult - The facet result data with fieldResult array.
 * @returns {HTMLElement} The DOM element representing the range slider widget.
 */
function createFacetRangeSlider(facetId, queryString, facetResult) {
  const data = facetResult.fieldResult;
  
  // The last entry is typically "not supplied" or missing values
  const notSuppliedEntry = data[data.length - 1];
  const labeledEntries = data.slice(0, data.length - 1);
  
  if (labeledEntries.length === 0) {
    return document.createTextNode('No data available');
  }
  
  const firstEntry = labeledEntries[0];
  const lastEntry = labeledEntries[labeledEntries.length - 1];

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  const widget = el("div", "facet-range-slider-widget");
  const histogram = el("div", "facet-range-slider-histogram");
  const trackArea = el("div", "facet-range-slider-track-area");
  const trackBg = el("div", "facet-range-slider-track-bg");
  const rangeFill = el("div", "facet-range-slider-range-fill");
  const sliderMin = el("input");
  const sliderMax = el("input");
  const axis = el("div", "facet-range-slider-axis");
  const axisLeft = el("span");
  const axisRight = el("span");
  const sliderFilterLink = el("a", "facet-range-slider-filter-link");

  const maxIdx = labeledEntries.length - 1;
  sliderMin.type = sliderMax.type = "range";
  sliderMin.min = sliderMax.min = 0;
  sliderMin.max = sliderMax.max = maxIdx;
  sliderMin.step = sliderMax.step = 1;
  sliderMin.value = 0;
  sliderMax.value = maxIdx;

  axisLeft.textContent = firstEntry.label;
  axisRight.textContent = lastEntry.label;

  trackArea.append(trackBg, rangeFill, sliderMin, sliderMax);
  axis.append(axisLeft, axisRight);
  widget.append(histogram, trackArea, axis, sliderFilterLink);

  // Add "not supplied" link if available
  if (notSuppliedEntry && notSuppliedEntry.count > 0) {
    const notSuppliedLink = el("a", "facet-range-slider-not-supplied-link");
    notSuppliedLink.textContent = `${notSuppliedEntry.label} (${notSuppliedEntry.count.toLocaleString()})`;
    notSuppliedLink.href = `?${queryString}&fq=${encodeURIComponent(`-${facetId}:*`)}`;
    widget.append(notSuppliedLink);
  }

  const maxCount = Math.max(...labeledEntries.map((e) => e.count));

  const bars = labeledEntries.map((entry, i) => {
    const bar = el("div", "facet-range-slider-bar");
    bar.style.height =
      maxCount > 0 ? ((entry.count / maxCount) * 100).toFixed(2) + "%" : "0%";
    bar.title = `${entry.label}: ${entry.count.toLocaleString()}`;
    histogram.appendChild(bar);
    return { el: bar, idx: i };
  });

  function updateFill() {
    let low = parseInt(sliderMin.value, 10);
    let high = parseInt(sliderMax.value, 10);
    if (low > high) [low, high] = [high, low];

    rangeFill.style.left = (low / maxIdx) * 100 + "%";
    rangeFill.style.right = ((maxIdx - high) / maxIdx) * 100 + "%";

    let inRangeCount = 0;
    bars.forEach((b) => {
      if (b.idx >= low && b.idx <= high) {
        inRangeCount += labeledEntries[b.idx].count;
        b.el.classList.add("in-range");
      } else {
        b.el.classList.remove("in-range");
      }
    });

    const loLabel = labeledEntries[low].label;
    const hiLabel = labeledEntries[high].label;
    sliderFilterLink.textContent =
      low === high
        ? `${loLabel} (${inRangeCount.toLocaleString()})`
        : `${loLabel} – ${hiLabel} (${inRangeCount.toLocaleString()})`;
  }

  function onSliderInput() {
    let low = parseInt(sliderMin.value, 10);
    let high = parseInt(sliderMax.value, 10);
    if (low >= high) {
      if (this === sliderMin) sliderMin.value = high - 1;
      else sliderMax.value = low + 1;
    }
    
    // Ensure we don't go out of bounds
    low = Math.max(0, Math.min(maxIdx - 1, parseInt(sliderMin.value, 10)));
    high = Math.max(1, Math.min(maxIdx, parseInt(sliderMax.value, 10)));
    
    widget.setAttribute("data-low", low);
    widget.setAttribute("data-high", high);

    // Build the filter query for date range
    const lowLabel = labeledEntries[low].label;
    const highLabel = labeledEntries[high].label;
    
    sliderFilterLink.href = `?${queryString}&fq=${encodeURIComponent(`${facetId}:[${lowLabel} TO ${highLabel}]`)}`;

    updateFill();
  }

  sliderMin.addEventListener("input", onSliderInput);
  sliderMax.addEventListener("input", onSliderInput);

  onSliderInput();
  updateFill();

  return widget;
}
