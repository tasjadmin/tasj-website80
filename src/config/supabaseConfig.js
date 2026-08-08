export const supabaseConfig = {
    url: process.env.REACT_APP_SUPABASE_URL,
    key: process.env.REACT_APP_SUPABASE_ANON_KEY,
    getTranscationDetails: 'payment',
    createSessionCheckout: 'payment',
    successUrl: "payment/success",
    cancelUrl: "payment/cancel"
}