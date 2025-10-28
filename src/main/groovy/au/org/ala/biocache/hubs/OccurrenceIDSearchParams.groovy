package au.org.ala.biocache.hubs

import grails.validation.Validateable

class OccurrenceIDSearchParams implements Validateable{
    String occurrenceID = ""

    @Override
    String toString() {
        "OccurrenceID=" + occurrenceID
    }
}
