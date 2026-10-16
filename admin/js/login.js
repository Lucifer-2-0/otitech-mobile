import { supabase } from '../../js/supabase.js';
import { authApi } from '../../js/api.js';

const form = document.querySelector('#loginForm');
const status = document.querySelector('#loginStatus');
const submit = form?.querySelector('[type="submit"]');
const ACCESS_TOKEN_KEY = 'otitech_access_token';
const REFRESH_TOKEN_KEY = 'otitech_refresh_token';

const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session || sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
        window.location.replace('dashboard.html');
    }
};

checkSession();

form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    if (!form.reportValidity()) return;

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    const formData = new FormData(form);

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: formData.get('email').toString().trim(),
            password: formData.get('password').toString(),
        });

        if (error) throw error;
        if (!data.session) throw new Error('No session created');

        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        const profile = await authApi.me();
        if (profile.data.role === 'seller') {
            await supabase.auth.signOut();
            throw new Error('Seller accounts should sign in through the seller portal.');
        }

        window.location.replace('dashboard.html');
    } catch (supabaseError) {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        try {
            await supabase.auth.signOut();
            const response = await authApi.login(
                formData.get('email').toString().trim(),
                formData.get('password').toString(),
            );
            if (response.data.user.role === 'seller') throw new Error('Seller accounts should sign in through the seller portal.');
            sessionStorage.setItem(ACCESS_TOKEN_KEY, response.data.accessToken);
            sessionStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
            window.location.replace('dashboard.html');
        } catch (localError) {
            status.textContent = localError.message.includes('Failed to fetch') || supabaseError.message.includes('Failed to fetch')
                ? 'Could not reach the sign-in service. Check your connection.'
                : localError.message;
        }
        form.querySelector('#password').value = '';
        form.querySelector('#password').focus();
    } finally {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
    }
});
