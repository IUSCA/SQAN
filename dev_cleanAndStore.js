#DEBUG=profile:* env=dev PORT=12402 nodemon -i node_modules ./index.js

pm2 delete cleanAndStore
pm2 start bin/cleanAndStore.js --watch --ignore-watch="\.log$ \.sh$"
pm2 logs cleanAndStore
