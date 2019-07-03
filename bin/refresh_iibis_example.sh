#!/bin/bash
curl -X GET https://apps.indyrad.iupui.edu/iibis/api/sca?token=INSERT_TOKEN_HERE > /opt/sca/docker-data/mongodb1/iibis_dump.json
docker exec -it mongodb1 sh -c "mongoimport -d rady -c iibis --type json --jsonArray --file /data/db/iibis_dump.json"
