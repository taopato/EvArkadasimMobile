# Roomora canonical design reference

This folder contains the final LIGHT references selected from Stitch exports
19 through 28. Intermediate duplicates and conflicting palette experiments are
not part of this set.

## Source of truth

- Primary: `#2F6FA8`
- Background: `#F7F9FC`
- Surface: `#FFFFFF`
- Primary text: `#172839`
- Secondary text: `#5E6B78`
- Border: `#D8E0E8`
- Typography: Hanken Grotesk, letter spacing `0`
- Main tabs: Ana Sayfa, Faturalar, Giderler, Ayarlar
- Operational screens are stack screens and do not render the bottom tab bar.

The numbered PNG files in `stitch-final-light` are visual references. Product
behavior, API contracts, authorization and live data always take precedence
over generated placeholder content.

The `implemented-screens` folder contains screenshots produced by the automated
390x844 browser flow against the local backend.
