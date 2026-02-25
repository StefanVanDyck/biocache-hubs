package au.org.ala.biocache.hubs

import grails.testing.web.controllers.ControllerUnitTest
import org.grails.web.json.JSONObject
import spock.lang.Specification

class OccurrenceControllerFacetsSpec extends Specification implements ControllerUnitTest<OccurrenceController> {

    def webServicesService = Mock(WebServicesService)

    def setup() {
        controller.webServicesService = webServicesService
    }

    void "facets action delegates to webServicesService.facetSearch"() {
        given:
        def mockResponse = new JSONObject([
            totalRecords: 100,
            facetResults: [[
                fieldName: "year",
                fieldResult: [
                    [label: "2020", count: 50, fq: "year:2020"],
                    [label: "2021", count: 50, fq: "year:2021"]
                ]
            ]]
        ])

        when:
        params.q = "*:*"
        params.facets = "year"
        controller.facets()

        then:
        1 * webServicesService.facetSearch({ SpatialSearchRequestParams rp ->
            rp.q == "*:*"
        }) >> mockResponse
        response.json.totalRecords == 100
    }

    void "facets action passes facetRanges params to service"() {
        given:
        def mockResponse = new JSONObject([
            totalRecords: 100,
            facetResults: [[
                fieldName: "year",
                fieldResult: [
                    [label: "[2000 TO 2001]", count: 30],
                    [label: "[2001 TO 2002]", count: 70]
                ]
            ]]
        ])

        when:
        params.q = "*:*"
        params.facetRanges = "year"
        params.facetRangeStart = "2000"
        params.facetRangeEnd = "2024"
        params.facetRangeGap = "1"
        controller.facets()

        then:
        1 * webServicesService.facetSearch({ SpatialSearchRequestParams rp ->
            rp.facetRanges == ["year"] as String[] &&
            rp.facetRangeStart == "2000" &&
            rp.facetRangeEnd == "2024" &&
            rp.facetRangeGap == "1"
        }) >> mockResponse
        response.json.totalRecords == 100
    }

    void "facets action passes multiple facetRanges"() {
        given:
        def mockResponse = new JSONObject([totalRecords: 0, facetResults: []])

        when:
        params.q = "*:*"
        params.list("facetRanges") // ensure list binding
        request.addParameter("facetRanges", "year")
        request.addParameter("facetRanges", "month")
        params.facetRangeGap = "1"
        controller.facets()

        then:
        1 * webServicesService.facetSearch({ SpatialSearchRequestParams rp ->
            rp.facetRanges.toList().containsAll(["year", "month"]) &&
            rp.facetRangeGap == "1"
        }) >> mockResponse
    }

    void "facets action works without facet range params"() {
        given:
        def mockResponse = new JSONObject([totalRecords: 50, facetResults: []])

        when:
        params.q = "taxon_name:Vulpes"
        params.facets = "year"
        controller.facets()

        then:
        1 * webServicesService.facetSearch({ SpatialSearchRequestParams rp ->
            rp.q == "taxon_name:Vulpes" &&
            rp.facetRanges == [] as String[] &&
            rp.facetRangeStart == "" &&
            rp.facetRangeEnd == "" &&
            rp.facetRangeGap == ""
        }) >> mockResponse
    }

    void "facets action forwards fq params correctly alongside range params"() {
        given:
        def mockResponse = new JSONObject([totalRecords: 10, facetResults: []])

        when:
        params.q = "*:*"
        request.addParameter("fq", "state:Victoria")
        request.addParameter("fq", "year:[2020 TO 2024]")
        params.facetRanges = "month"
        params.facetRangeStart = "1"
        params.facetRangeEnd = "12"
        params.facetRangeGap = "1"
        controller.facets()

        then:
        1 * webServicesService.facetSearch({ SpatialSearchRequestParams rp ->
            rp.fq.toList().containsAll(["state:Victoria", "year:[2020 TO 2024]"]) &&
            rp.facetRanges == ["month"] as String[] &&
            rp.facetRangeStart == "1" &&
            rp.facetRangeEnd == "12"
        }) >> mockResponse
    }

    void "facetSearch encodes range params in URL via getEncodedParams"() {
        given:
        def rp = new SpatialSearchRequestParams(
            q: "*:*",
            facetRanges: ["event_date"] as String[],
            facetRangeStart: "2000-01-01T00:00:00Z",
            facetRangeEnd: "2024-12-31T23:59:59Z",
            facetRangeGap: "+1YEAR"
        )

        when:
        def encoded = rp.getEncodedParams()

        then:
        encoded.contains("facetRanges=event_date")
        encoded.contains("facetRangeStart=")
        encoded.contains("facetRangeEnd=")
        encoded.contains("facetRangeGap=")
        // The + in +1YEAR should be encoded
        encoded.contains("facetRangeGap=%2B1YEAR")
    }
}
