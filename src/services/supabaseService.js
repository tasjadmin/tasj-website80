// createClient unneccessary
import { supabaseConfig } from "../config/supabaseConfig"

const baseUrl = `${supabaseConfig.url}/functions/v1`;

const SupabaseService = async (edgeFunctionName, payload) => {
    const functionUrl = `${baseUrl}/${edgeFunctionName}`;

    const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseConfig.key}`,
            "apikey": `${supabaseConfig.key}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error);
    }

    return data;
};

export async function createSessionCheckout(payload) {
    return SupabaseService(supabaseConfig.createSessionCheckout, { ...payload, successUrl: supabaseConfig.successUrl, cancelUrl: supabaseConfig.cancelUrl });
}

export async function getTranscationDetails(sessionId) {
    const functionUrl = `${baseUrl}/${supabaseConfig.getTranscationDetails}?session_id=${sessionId}`;

    const response = await fetch(functionUrl, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseConfig.key}`,
            "apikey": `${supabaseConfig.key}`,
        }
    });

    if (!response.ok) {
        const text = await response.text();
        try {
            const data = JSON.parse(text);
            throw new Error(data.error || 'Failed to fetch transaction');
        } catch (e) {
            throw new Error(text || 'Failed to fetch transaction');
        }
    }

    return await response.json();
}
