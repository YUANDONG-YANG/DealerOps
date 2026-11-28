import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component - Double Value Correct', () => {
  it('doubleValue returns correct value', () => {
    render(<App />);
    expect(screen.getByText('Double 10: 20')).toBeInTheDocument();
  });
});
