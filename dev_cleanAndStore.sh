
#beaware ... any changes to /api won't be watched - since pm2 only wathec the current directory

pm2 delete cleanAndStore
pm2 start bin/cleanAndStore.js --watch --ignore-watch="\.log$ \.sh$"
pm2 logs cleanAndStore
