import React, { useState } from 'react';
import { PaymentWrapper } from './components/PaymentForm';

export default function App() {
  const [amount, setAmount] = useState('10.00');
  const [description, setDescription] = useState('Invoice');
  const [email, setEmail] = useState('');

  return (
    <div className="App">
      <h1>Make a Payment</h1>
      <div>
        <label>Amount (USD)
          <input value={amount} onChange={e => setAmount(e.target.value)} />
        </label>
      </div>
      <div>
        <label>Description
          <input value={description} onChange={e => setDescription(e.target.value)} />
        </label>
      </div>
      <div>
        <label>Email (for receipt)
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </label>
      </div>

      <PaymentWrapper amount={amount} description={description} email={email} />
    </div>
  );
}
