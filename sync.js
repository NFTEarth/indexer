require('dotenv').config();
const fetch = require('axios')


console.log(`Syncing from block ${process.argv[2]} to ${process.argv[3]}`)

fetch({
  url: `http://localhost:${process.env.PORT}/admin/sync-events`,
  method: 'POST',
  data: {
    "fromBlock": parseInt(process.argv[2]),
    "toBlock": parseInt(process.argv[3])
  },
  headers: {
    'x-admin-api-key': process.env.ADMIN_API_KEY
  }
}).then(console.log)
.catch(console.error);