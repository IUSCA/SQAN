
pm2 delete cleanAndStore
pm2 start cleanAndStore.js --watch --ignore-watch="\.log$ \.sh$"
pm2 logs cleanAndStore
