import { createClient } from '@supabase/supabase-js'
export const getPaymentConfig = async () => {
    const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY)
    const { data, error } = await supabase.functions.invoke('pay', {
        body: { name: 'Functions' },
    })
    console.log(data);
    console.log(error);
};
