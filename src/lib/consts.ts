export const TANDAS_NAMES = {
    firsts_tickets: '1ª Tanda',
    seconds_tickets: '2ª Tanda',
    thirds_tickets: '3ª Tanda',
};

export const SELL_TYPE = {
    ubication: 'Ubicación',
    batch: 'Tanda',
};

// Deductions applied to gross revenue ("Monto generado").
// IVA: 19% of the gross amount.
// Payku: 2.79% commission, with IVA charged on top of that commission.
export const IVA_RATE = 0.19;
export const PAYKU_RATE = 0.0279;