# Use the official image as a parent image.
FROM centos:7

# Set the working directory.
WORKDIR /opt/sca/sqan

# for node version 12.x
RUN curl -sL https://rpm.nodesource.com/setup_12.x | bash 
RUN yum -y install nodejs

# check that installation worked
RUN node --version 
RUN npm --version 

# Copy the file from your host to your current location.
COPY package.json .

# Run the command inside your image filesystem.
RUN npm install

# Copy the rest of your app's source code from your host to your image filesystem.
COPY . .

# Get UI ready to go
WORKDIR /opt/sca/sqan/ui

# Run the command inside your image filesystem.
RUN npm install

WORKDIR /opt/sca/sqan/api

# Run the specified command within the container.
CMD [ "npm", "start" ]

WORKDIR /opt/sca/sqan/ui

# Run the specified command within the container.
CMD [ "npm", "run", "builddev" ]

# TODO
# serve content

# Inform Docker that the container is listening on the specified port at runtime.
# EXPOSE 8080

