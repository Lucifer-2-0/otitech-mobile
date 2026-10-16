import { supabase } from '../../js/supabase.js';

const form = document.querySelector('#loginForm');
const status = document.querySelector('#loginStatus');
const submit = form?.querySelector('[type="submit"]');

const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
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

        window.location.replace('dashboard.html');
    } catch (error) {
        status.textContent = error.message.includes('Failed to fetch')
            ? 'Could not reach Supabase. Check your connection.'
            : error.message;
        form.querySelector('#password').value = '';
        form.querySelector('#password').focus();
    } finally {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
    }
});