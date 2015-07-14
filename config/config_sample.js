exports.config = {
    amqp: {
        host: "localhost",
        login: "amqpuser",
        password: "amqppass",
        vhost: "dicom"
    },

    //for bin/analyze.js
    incoming_headers: "/usr/local/incoming-dicom-headers",

    //where the analysis.json and raw headers are stored
    analyzed_headers: "/usr/local/analyzed-dicom-headers"
}
