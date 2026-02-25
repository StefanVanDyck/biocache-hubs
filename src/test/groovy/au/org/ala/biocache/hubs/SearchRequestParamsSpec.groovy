package au.org.ala.biocache.hubs

import spock.lang.Specification

class SearchRequestParamsSpec extends Specification {

    // --- Default values ---

    void "facetRanges defaults to empty array"() {
        expect:
        new SearchRequestParams().facetRanges == [] as String[]
    }

    void "facetRangeStart defaults to empty string"() {
        expect:
        new SearchRequestParams().facetRangeStart == ""
    }

    void "facetRangeEnd defaults to empty string"() {
        expect:
        new SearchRequestParams().facetRangeEnd == ""
    }

    void "facetRangeGap defaults to empty string"() {
        expect:
        new SearchRequestParams().facetRangeGap == ""
    }

    // --- toString / getEncodedParams include facet range params ---

    void "toString includes facetRanges when set"() {
        given:
        def params = new SearchRequestParams(
            q: "*:*",
            facetRanges: ["year"] as String[],
            facetRangeStart: "2000",
            facetRangeEnd: "2024",
            facetRangeGap: "1"
        )

        when:
        def result = params.toString()

        then:
        result.contains("&facetRanges=year")
        result.contains("&facetRangeStart=2000")
        result.contains("&facetRangeEnd=2024")
        result.contains("&facetRangeGap=1")
    }

    void "toString includes multiple facetRanges fields"() {
        given:
        def params = new SearchRequestParams(
            q: "*:*",
            facetRanges: ["year", "month"] as String[],
            facetRangeStart: "1",
            facetRangeEnd: "12",
            facetRangeGap: "1"
        )

        when:
        def result = params.toString()

        then:
        result.contains("&facetRanges=year")
        result.contains("&facetRanges=month")
    }

    void "toString omits facetRange params when facetRanges is empty"() {
        given:
        def params = new SearchRequestParams(
            q: "*:*",
            facetRanges: [] as String[],
            facetRangeStart: "2000",
            facetRangeEnd: "2024",
            facetRangeGap: "1"
        )

        when:
        def result = params.toString()

        then:
        !result.contains("facetRanges")
        !result.contains("facetRangeStart")
        !result.contains("facetRangeEnd")
        !result.contains("facetRangeGap")
    }

    void "toString omits facetRange params when facet is disabled"() {
        given:
        def params = new SearchRequestParams(
            q: "*:*",
            facet: false,
            facetRanges: ["year"] as String[],
            facetRangeStart: "2000",
            facetRangeEnd: "2024",
            facetRangeGap: "1"
        )

        when:
        def result = params.toString()

        then:
        !result.contains("facetRanges")
        !result.contains("facetRangeStart")
    }

    void "toString omits facetRangeStart when empty"() {
        given:
        def params = new SearchRequestParams(
            q: "*:*",
            facetRanges: ["year"] as String[],
            facetRangeGap: "1"
        )

        when:
        def result = params.toString()

        then:
        result.contains("&facetRanges=year")
        result.contains("&facetRangeGap=1")
        !result.contains("facetRangeStart")
        !result.contains("facetRangeEnd")
    }

    void "getEncodedParams encodes facet range values"() {
        given:
        def params = new SearchRequestParams(
            q: "*:*",
            facetRanges: ["event_date"] as String[],
            facetRangeStart: "2000-01-01T00:00:00Z",
            facetRangeEnd: "2024-12-31T23:59:59Z",
            facetRangeGap: "+1YEAR"
        )

        when:
        def result = params.getEncodedParams()

        then:
        result.contains("&facetRanges=event_date")
        result.contains("&facetRangeStart=")
        result.contains("&facetRangeGap=")
        // Encoded values should not contain raw colons from the date
        !result.contains("facetRangeStart=2000-01-01T00:00:00Z")
    }

    // --- SpatialSearchRequestParams inherits facet range params ---

    void "SpatialSearchRequestParams inherits facet range params in toString"() {
        given:
        def params = new SpatialSearchRequestParams(
            q: "*:*",
            facetRanges: ["year"] as String[],
            facetRangeStart: "1900",
            facetRangeEnd: "2025",
            facetRangeGap: "5",
            lat: -33.8f,
            lon: 151.2f,
            radius: 10.0f
        )

        when:
        def result = params.toString()

        then:
        result.contains("&facetRanges=year")
        result.contains("&facetRangeStart=1900")
        result.contains("&facetRangeEnd=2025")
        result.contains("&facetRangeGap=5")
        result.contains("&lat=")
        result.contains("&lon=")
        result.contains("&radius=")
    }

    // --- Equality ---

    void "equal params with same facet range fields"() {
        given:
        def params1 = new SearchRequestParams(
            q: "*:*",
            facetRanges: ["year"] as String[],
            facetRangeStart: "2000",
            facetRangeEnd: "2024",
            facetRangeGap: "1"
        )
        def params2 = new SearchRequestParams(
            q: "*:*",
            facetRanges: ["year"] as String[],
            facetRangeStart: "2000",
            facetRangeEnd: "2024",
            facetRangeGap: "1"
        )

        expect:
        params1 == params2
    }

    void "unequal params with different facet range gap"() {
        given:
        def params1 = new SearchRequestParams(
            q: "*:*",
            facetRanges: ["year"] as String[],
            facetRangeGap: "1"
        )
        def params2 = new SearchRequestParams(
            q: "*:*",
            facetRanges: ["year"] as String[],
            facetRangeGap: "5"
        )

        expect:
        params1 != params2
    }
}
