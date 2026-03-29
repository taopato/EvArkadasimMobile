# Ev Arkadaşım API Bağlantı Rehberi

Bu mobil uygulama `EvArkadasimCleanArchitecture` backend API'si ile çalışır.

## Aktif Base URL Yapısı

- Frontend runtime base URL: `app.json > expo.extra.EXPO_PUBLIC_API_URL`
- Frontend API katmanı: `src/services/api.js`
- Geliştirme config yardımı: `src/shared/config/env.ts`

Uygulama istekleri teknik olarak şu kalıpta gider:

```text
{BASE_URL}/api/{Controller}/{Action}
```

## Şu An Aktif Kullanılan Ana Endpointler

### Auth

- `POST /api/Auth/Login`
- `POST /api/Auth/GoogleLogin`
- `POST /api/Auth/SendVerificationCode`
- `POST /api/Auth/VerifyCodeAndRegister`
- `POST /api/Auth/VerifyCodeForReset`
- `POST /api/Auth/ResetPassword`

### Houses

- `POST /api/Houses`
- `POST /api/Houses/{houseId}/invitations`
- `GET /api/Houses/{houseId}/members`
- `GET /api/Houses/GetUserHouses/{userId}`
- `GET /api/Houses/GetUserDebts/{userId}/{houseId}`
- `GET /api/Houses/GetUserDebtBetween/{houseId}?userAId={a}&userBId={b}`

### Expenses

- `POST /api/Expenses`
- `POST /api/Expenses/CreateIrregular`
- `GET /api/Expenses/GetExpenses/{houseId}`
- `GET /api/Expenses/GetExpense/{expenseId}`
- `PUT /api/Expenses/UpdateExpense/{expenseId}`
- `DELETE /api/Expenses/DeleteExpense/{expenseId}`

### Payments

- `POST /api/Payments/CreatePayment`
- `POST /api/Payments/AddPaymentWithAllocations`
- `GET /api/Payments/GetPayments/{houseId}`
- `GET /api/Payments/GetPendingPayments/{userId}`
- `POST /api/Payments/ApprovePayment/{paymentId}`
- `POST /api/Payments/RejectPayment/{paymentId}`

### Ledger

- `GET /api/LedgerLines/ByHouse/{houseId}`
- `GET /api/LedgerLines/ByExpense/{expenseId}`

### Users

- `GET /api/Users/GetAllUsers`

## Çalıştırma Notu

1. Backend'i Visual Studio veya `dotnet run` ile aç.
2. Backend URL'inin frontenddeki IP ile aynı ağda erişilebilir olduğundan emin ol.
3. Frontend klasöründe `npm start` çalıştır.
4. Expo Go ile QR okut.

## Bilinen Not

Google login'in gerçek çalışması için frontend ve backend tarafındaki Google client ID alanları doldurulmalıdır.
