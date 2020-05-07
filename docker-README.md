# SQAN in Docker

Nginx is used to serve the generated markup and js files created by the UI node server.

The ui files make calls to the backend api node server for data. 

## Setup

Using `-p sqan` allows the project name (and consequently the container name) to be consistent from one deployment to the next. That way containers are named with `sqan_[service]_1`. If you've checked out the repository to a directory named `sqan`, that works too. 


Create a shared volume for build steps and serving steps (these are also available in the Makefile):

    docker volume create --name=nodemodules
    docker volume create --name=apimodules

Generate SSL keys with:

    sudo openssl req -subj '/CN=localhost' -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./config/ssl/nginx.key -out ./config/ssl/nginx.crt

Install node packages for the UI and API with:

    docker-compose -f docker-compose-builder.yml run --rm install

Bring up the containers:

    docker-compose -p sqan up -d

Make sure everything is running (no Exit 1 States):

    docker-compose -p sqan ps

To run the UI build step interactively (to see if errors come up):

    docker-compose -p sqan exec ui bash

    npm run builddev


To restore the mongodb:

```
  mongo:
    image: mongo:4.0-xenial
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example
    volumes:
      - ./mongo:/data/db
      - ./mongodump:/opt/mongodump
```

    cd /opt/mongodump/mongodump/
    mongorestore --host localhost --db SQAN




