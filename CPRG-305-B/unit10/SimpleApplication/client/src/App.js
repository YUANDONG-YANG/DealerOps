import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [items, setItems] = useState([]);
  const [calculationResult, setCalculationResult] = useState(null);
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get('/api/data');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const calculate = async () => {
    try {
      const response = await axios.get(`/api/calculate/${num1}/${num2}`);
      setCalculationResult(response.data.result);
    } catch (error) {
      console.error('Error calculating:', error);
      setCalculationResult('Error');
    }
  };

  const sumValues = () => {
    return items.reduce((acc, item) => acc + item.value, 0);
  };

  const doubleValue = (value) => {
    if (typeof value !== 'number') {
      return "Error";
    }
    return value * 2;
  };

  return (
    <div>
      <h1>React App</h1>
      <h2>Data:</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}: {item.value}</li>
        ))}
      </ul>
      <p>Sum of values: {sumValues()}</p>

      <h2>Calculation:</h2>
      <input type="number" value={num1} onChange={(e) => setNum1(parseInt(e.target.value))} />
      +
      <input type="number" value={num2} onChange={(e) => setNum2(parseInt(e.target.value))} />
      <button onClick={calculate}>Calculate</button>
      {calculationResult !== null && <p>Result: {calculationResult}</p>}

      <h2>Testing Functions</h2>
      <p>Double 10: {doubleValue(10)}</p>
      <p>Double 'test': {doubleValue('test')}</p>
    </div>
  );
}

export default App;