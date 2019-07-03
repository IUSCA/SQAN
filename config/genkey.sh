openssl genrsa -out auth.key 2048
chmod 600 auth.key
openssl rsa -in auth.key -pubout > auth.pub
