#!/bin/bash
## Init your vars, kids
CURLEX=999
DOCKEREX=999
NODEEX=999

dumppath=/opt/sca/docker-data/data/mongodb1/data/db/iibis_dump.json

## Download (quietly) the data as JSON
curl -sS -X GET https://apps.indyrad.iupui.edu/iibis/api/sca?token=W7ocxGeLELtG4jGVEcAt5Sjp627NrunG > ${dumppath}

## How did Curl exit?
CURLEX=$?

## If bad, email admins
if [[ "${CURLEX}" -ne 0 ]]; then
    echo "Curl failed to download IIBIS data. Please check the logs at /opt/sca/var/log/refresh_iibis.." | mail -s "IIBIS download failure on rady.sca" root@rady.sca.iu.edu
    exit 1
fi

## Validate JSON before trying ingest with drop
record_count=$(node -p "var fs = require('fs'); let r = fs.readFileSync(process.argv[1]); i=JSON.parse(r); i.length" ${dumppath})

## How did node exit?
NODEEX=$?

##If node failed or array is empty or invalid, email admins
if [[ "${NODEEX}" -ne 0 ]] || [[ "${record_count}" < 10 ]]; then
    echo "Invalid or corrupt IIBIS data file. Please check the logs at /opt/sca/var/log/refresh_iibis.." | mail -s "IIBIS parsing failure on rady.sca" root@rady.sca.iu.edu
    exit 1
fi

## Ingest - note, this can probably be done from the host with mongoimport --host as well
## Also, removed -ti since it was causing issues with cron
docker exec mongodb1 sh -c "mongoimport -d rady -c iibis --drop --type json --jsonArray --file /data/db/iibis_dump.json"

## How did Docker / Mongo exit?
DOCKEREX=$?


## Also, if failure email admins.
if [[ "${DOCKEREX}" -ne 0 ]]; then
    echo "Mongo failed to ingest IIBIS data. Please check the logs at /opt/sca/var/log/refresh_iibis.." | mail -s "IIBIS mongo failure on rady.sca" root@rady.sca.iu.edu
fi
