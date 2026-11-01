require('dotenv').config();
const app = require('./Backend/src/app');
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
