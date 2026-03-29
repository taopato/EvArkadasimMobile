// src/shared/ui/Card.js
import React from 'react';
import { PremiumCard } from './premium/Card';

export const Card = ({ style, children, padding, elevation }) => {
  return (
    <PremiumCard style={style} padding={padding} elevation={elevation}>
      {children}
    </PremiumCard>
  );
};

export default Card;
