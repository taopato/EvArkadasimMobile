// src/shared/ui/Button.js
import React from 'react';
import { PremiumButton } from './premium/Button';

// Eski kullanım uyumu için aynı API ile premium buton
export const Button = (props) => {
  return <PremiumButton {...props} />;
};

export default Button;
