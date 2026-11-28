const express = require('express');
const app = express();
const port = 5000;
const data = require('./data.json');

app.get('/api/data', (req, res) => {
  res.json(data);
});

app.get('/api/calculate/:num1/:num2', (req, res) => {
  const num1 = parseInt(req.params.num1);
  const num2 = parseInt(req.params.num2);

  if (isNaN(num1) || isNaN(num2)) {
    return res.status(400).json({ error: 'Invalid numbers' });
  }

  const result = num1 + num2;
  res.json({ result });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
