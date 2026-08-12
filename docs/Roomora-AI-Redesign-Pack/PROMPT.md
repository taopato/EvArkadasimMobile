# Roomora Mobile Screen Redesign Prompt

Design exactly four production-ready mobile app screens for **Roomora**, a shared-living expense, bill, and balance management application for roommates in Turkey.

## How to use the uploaded images

- Images **01-04** are the canonical Roomora visual references. Do not redesign these screens. Use them to match Roomora's typography, color system, spacing, component dimensions, icon style, density, and overall visual tone.
- Images **05-08** are the current versions of the screens that must be redesigned.
- Use the references as a design-system guide, not as pixel-perfect templates. Preserve the target screens' real functionality while improving hierarchy, clarity, consistency, and ergonomics.

## Generate exactly these four independent screens

1. **Fatura Detayı**
2. **Faturayı Düzenle**
3. **Düzenli Gider Ekle**
4. **Harcama Detayı**

Each output must be a separate, full-height, 390 px-wide mobile screen. Do not create a presentation board, phone mockup, marketing page, design-system poster, or multiple screens inside one frame.

## Canonical Roomora design system

- Mood: soft premium, calm, trustworthy, modern, friendly, and professional.
- Font: Hanken Grotesk. Letter spacing must be 0.
- Primary: `#2F6FA8`; dark primary: `#24567F`; primary tint: `#EAF3FB`.
- Background: `#F7F9FC`; surfaces: `#FFFFFF`.
- Primary text: `#172839`; secondary text: `#5F6872`; borders: `#D8E0E8`.
- Success/receivable only: `#006B5B`. Pending/warning only: `#B87920`. Error/destructive only: `#BA1A1A`.
- Use restrained shadows, 8-12 px component radii, 16 px horizontal page padding, and minimum 44 px touch targets.
- Do not use gradients, glassmorphism, excessive rounded cards, purple/cyan AI-style colors, huge buttons, or decorative illustrations.
- All visible UI copy must be Turkish. Use `₺1.250,00` currency and `15.07.2026` / `gg.aa.yyyy` date formats.
- These are inner screens: use a safe-area-aware top bar with a back icon and a centered title. Do not show bottom navigation.
- Use familiar outline icons. Keep actions compact and consistent with images 01-04.
- Do not invent banking analytics, collection targets, premium badges, encryption claims, receipt requirements, or unsupported product features.

## Screen requirements

### 1. Fatura Detayı

Show the bill title, category, period, status, amount, due date, payer, creator, and optional note. Clearly show every participant, each person's share amount, and payment state. Keep edit and delete actions subtle. Show `Ödeme Bildir` only when contextually relevant. Avoid an oversized hero card that consumes most of the screen.

### 2. Faturayı Düzenle

Use a prominent but compact amount input inspired by image 03. Include category, payer selection, participant multi-select with names/avatars, and an equal-split summary rounded to two decimal places. Date and due-date fields must support both masked numeric input (`gg.aa.yyyy`) and calendar selection. Include an optional note. Use a keyboard-safe scroll layout and a stable bottom `Değişiklikleri Kaydet` action.

### 3. Düzenli Gider Ekle

Support two real plan types: `Sabit aylık` and `Taksitli gider`. Include amount, expense type, payer, participants, equal-split summary, payment day, and starting month. For installments, include total installment count and remaining installment count so a six-installment purchase can be added when only four installments remain. Communicate quietly that scheduled items become active five days before their due date and close after the period; do not use a large warning banner.

### 4. Harcama Detayı

Show amount, title, date, category, payer, note, participants, and exact split amounts. When present, show personal line items under the relevant participant. Include a compact `Düzenle` action and a separate destructive delete action. Do not show fake security or marketing text.

## Consistent sample data

- Household: `Kadıköy Evi`
- Members: `Tarık Çetintürk`, `Tufan Çalışkan`, `Berdan Ulaş Dağ`
- Keep names and amounts consistent across all four screens.
- Every form must include clear default, focused, validation-error, and disabled visual rules, but render the normal populated state in the final screens.

Return only the four finished mobile screens. Keep their visual language indistinguishable from the canonical Roomora screens in images 01-04 while making the workflows clearer and more polished.
