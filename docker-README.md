# SQAN in Docker

Nginx is used to serve the generated markup and js files created by the UI node server.

The ui files make calls to the backend api node server for data. 

## Setup

Create a shared volume for build steps and serving steps (these are also available in the Makefile):

    docker volume create --name=nodemodules
    docker volume create --name=apimodules

Generate SSL keys with:

    sudo openssl req -subj '/CN=localhost' -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./config/ssl/nginx.key -out ./config/ssl/nginx.crt

Install node packages for the UI and API with:

    docker-compose -f docker-compose-builder.yml run --rm install

Bring up the containers:

    docker-compose up -d

Make sure everything is running (no Exit 1 States):

    docker-compose ps

To run the UI build step interactively (to see if errors come up):

    docker-compose exec ui bash

    npm run builddev







