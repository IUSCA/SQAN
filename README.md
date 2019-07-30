# Scalable Quality Assurance for Neuroimaging - (SQAN)
## Web based instrumental & protocol quality control for medical imaging

## Introduction

SQAN (formerly RADY-SCA) is a full-stack system solution for the harvesting, archiving, and quality-control verification of DICOM-format medical imaging data and metadata.  SQAN consists of four principle components:

* Incoming (node.js)
  * Watches for and retrieves imaging data from a transfer service (e.g. an Orthanc instance)
  * Extracts and compresses metadata and stores in a database
* Quality Control (node.js)
  * Performs protocol and exam-level verification on newly arrived data, and on existing data as requested
* API (node.js/ExpressJS)
  * Provides authorized access to metadata and QC results
* UI (AngularJS)
  * Allows authorized users to view stored data, QC results, modify QC templates and access controls, comment on QC issues, alert affected researchers, and re-run QC tests
  
  
## Requirements

* node.js (>8.0)
* npm (>6.1)
* MongoDB (>3.4)
* nginx


## Deployment

1.  Clone this repository
2.  `cd sqan && npm install && cd api && npm install && cd ../ui && npm install && cd ..`
3.  `cd config && ./genkey.sh`
  * generates public/private keys for JSON Web Token signing/verification
4.  `cp index.sample.js index.js`
  * Modify config/index.js as needed
5. `cd ../ui && cp config.sample.js config.js`
  * Modify ui/config.js as needed
6.  Launch API
  * `node api/dicom.js` or use `pm2` or similiar process manager to run API
7.  Configure nginx to serve API/UI 
8.  (optional) Load sample dataset (available upon request)
9.  (optional) Initiate Incoming and QC processes
  * `node bin/incoming.js`
  * `node bin/qc.js`

## nginx configuration

Sample nginx configuration to serve UI and API
  
```
    location /sqan {
        alias /opt/sca/sqan-demo/ui;
        index index.html;
    }
    
    location /api/qc/ {
        proxy_pass http://localhost:22340/;
    }
```

Make sure the port for the API matches that set in `config/index.js` and the location for the API matches the setting in `ui/config.js`
