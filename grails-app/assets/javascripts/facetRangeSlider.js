/**
 * Creates a range slider widget for a facet with numeric or date values.
 *
 * @param {string} facetId - The ID of the facet.
 * @param {Array} data - An array of facet entries, each with 'label' and 'count'.
 * @param {string} facetDisplayName - The display name of the facet (not used in this implementation).
 * @returns {HTMLElement} The DOM element representing the range slider widget.
 */
function createFacetRangeSlider(facetId, queryString, data) {
  const firstEntry = data[0];
  const lastEntry = data[data.length - 2];
  const labeledEntries = data.slice(0, data.length - 2);
  const notSuppliedEntry = data[data.length - 1];

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
  const notSuppliedLink = el("a", "facet-range-slider-filter-link");

  const maxIdx = data.length - 2;
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
  widget.append(histogram, trackArea, axis, sliderFilterLink, notSuppliedLink);

  notSuppliedLink.textContent = `${notSuppliedEntry.label} (${notSuppliedEntry.count.toLocaleString()})`;
  notSuppliedLink.href = `?${queryString}&fq=${encodeURIComponent(`-${facetId}`)}`;

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
      if (b.idx >= low && b.idx < high) {
        inRangeCount += data[b.idx].count;
        b.el.classList.toggle("in-range", true);
      } else {
        b.el.classList.toggle("in-range", false);
      }
    });

    const loLabel = data[low].label;
    const hiLabel = data[high].label;
    sliderFilterLink.textContent =
      low === high
        ? loLabel
        : `${loLabel} – ${hiLabel} (${inRangeCount.toLocaleString()})`;
  }

  function onSliderInput() {
    let low = parseInt(sliderMin.value, 10);
    let high = parseInt(sliderMax.value, 10);
    if (low >= high) {
      if (this === sliderMin) sliderMin.value = high - 1;
      else sliderMax.value = low + 1;
    }
    widget.setAttribute("low", low);
    widget.setAttribute("high", high);

    sliderFilterLink.href = `?${queryString}&fq=${encodeURIComponent(`${facetId}:[${data[low].label} TO ${data[high].label}]`)}`;

    updateFill();
  }

  sliderMin.addEventListener("input", onSliderInput);
  sliderMax.addEventListener("input", onSliderInput);

  onSliderInput();
  updateFill();

  return widget;
}
