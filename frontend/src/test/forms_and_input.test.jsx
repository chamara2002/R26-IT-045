import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../components/ui/index.jsx';

// Sample Form Component simulating disease detection input forms
function SampleDetectionForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    parity: '',
    calving_date: '',
    cannot_stand: false,
    eating: '100',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
    >
      <Input
        label="Parity (Calvings)"
        name="parity"
        type="number"
        value={formData.parity}
        onChange={handleChange}
      />
      <Input
        label="Calving Date"
        name="calving_date"
        type="date"
        value={formData.calving_date}
        onChange={handleChange}
      />
      <label>
        <input
          type="checkbox"
          name="cannot_stand"
          data-testid="cannot_stand_checkbox"
          checked={formData.cannot_stand}
          onChange={handleChange}
        />
        Cow cannot stand (Recumbent)
      </label>
      <select
        name="eating"
        data-testid="eating_select"
        value={formData.eating}
        onChange={handleChange}
      >
        <option value="100">Eating normally (100%)</option>
        <option value="60">Eating less (60%)</option>
        <option value="20">Refusing feed (20%)</option>
      </select>
      <button type="submit">Submit Assessment</button>
    </form>
  );
}

describe('Frontend - Forms and User Inputs', () => {
  it('updates form state on numeric parity text input change', () => {
    let captured = null;
    const { container } = render(<SampleDetectionForm onSubmit={(data) => { captured = data; }} />);
    
    const parityInput = container.querySelector('input[name="parity"]');
    fireEvent.change(parityInput, { target: { name: 'parity', value: '4' } });
    expect(parityInput.value).toBe('4');

    fireEvent.click(screen.getByRole('button', { name: /Submit Assessment/i }));
    expect(captured.parity).toBe('4');
  });

  it('updates form state on calving date selection', () => {
    let captured = null;
    const { container } = render(<SampleDetectionForm onSubmit={(data) => { captured = data; }} />);
    
    const dateInput = container.querySelector('input[name="calving_date"]');
    fireEvent.change(dateInput, { target: { name: 'calving_date', value: '2026-10-15' } });
    expect(dateInput.value).toBe('2026-10-15');

    fireEvent.click(screen.getByRole('button', { name: /Submit Assessment/i }));
    expect(captured.calving_date).toBe('2026-10-15');
  });

  it('toggles checkbox boolean state for physical distress symptoms', () => {
    let captured = null;
    render(<SampleDetectionForm onSubmit={(data) => { captured = data; }} />);
    
    const checkbox = screen.getByTestId('cannot_stand_checkbox');
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Submit Assessment/i }));
    expect(captured.cannot_stand).toBe(true);
  });

  it('updates dropdown selection for feed consumption percentage', () => {
    let captured = null;
    render(<SampleDetectionForm onSubmit={(data) => { captured = data; }} />);
    
    const select = screen.getByTestId('eating_select');
    fireEvent.change(select, { target: { name: 'eating', value: '20' } });
    expect(select.value).toBe('20');

    fireEvent.click(screen.getByRole('button', { name: /Submit Assessment/i }));
    expect(captured.eating).toBe('20');
  });
});
