require('dotenv').config();
const fetch = require('axios')


console.log(`Syncing from block ${process.argv[0]} to ${process.argv[1]}`)

fetch({
  url: `http://localhost:${process.env.PORT}/admin/sync-events`,
  method: 'POST',
  data: {
    "fromBlock": process.argv[0],
    "toBlock": process.argv[0]
  },
  headers: {
    'x-admin-api-key': process.env.ADMIN_API_KEY
  }
}).then(console.log)
.catch(console.error);