import 'dotenv/config';

import app from './Backend/src/Tool-calling/app.js'; //change path according to file that you are running

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
