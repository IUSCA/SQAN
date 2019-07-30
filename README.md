# SQAN
## Scalable Quality Assurance for Neuroimaging

### Web based instrumental & protocol quality control for medical imaging

## Introduction

SQAN (formerly RADY-SCA) is a full-stack system solution for the harvesting, archiving, and quality-control verification of DICOM-format medical imaging data and metadata.  SQAN consists of four principle components:

* Incoming (node.js)
  * Watches for and retrieves imaging data from a transfer service (e.g. an Orthanc instance)
  * Extracts and compresses metadata and stores in a database
* Quality Control (node.js)
  * Performs protocol and exam-level verification on newly arrived data, and on existing data as requested
* API (node.js/ExpressJS)
  * Provides authorized access to metadata and QC resuls
* UI (AngularJS)
  * Allows authorized users to view stored data, QC results, modify QC templates and access controls, comment on QC issues, alert affected researchers, and re-run QC tests
  
  
## Requirements

* node.js (>8.0)
* npm (>6.1)
* MongoDB (>3.4)


## Deployment

1.  Clone this repository
2.  `cd sqan && npm install`
3.  `cd api && npm install && cd ..`
4.  `cd ui && npm install && cd ..`
5.  `cd config && ./genkey.sh`  <- generate public/private keys for JSON Web Token signing/verification
6.  `cp index.sample.js index.js`
7.  Modify config/index.js as needed
8.  `cd ../ui && cp config.sample.js config.js`
9.  Modify ui/config.js as needed
10.  Launch API
  * `node api/dicom.js`
