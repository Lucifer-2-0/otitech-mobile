import { authApi } from '../../js/api.js';

const ACCESS_TOKEN_KEY = 'otitech_access_token';
const REFRESH_TOKEN_KEY = 'otitech_refresh_token';
const status = document.querySelector('#sellerAuthStatus');
const signInForm = document.querySelector('#sellerSignInForm');
const registerForm = document.querySelector('#sellerRegisterForm');
const signInPanel = document.querySelector('#signInPanel');
const registerPanel = document.querySelector('#registerPanel');
const showSignIn = document.querySelector('#showSignIn');
const showRegister = document.querySelector('#showRegister');

const setPanel = (mode) => {
    const signingIn = mode === 'sign-in';
    signInPanel.hidden = !signingIn;
    registerPanel.hidden = signingIn;
    showSignIn.classList.toggle('is-active', signingIn);
    showRegister.classList.toggle('is-active', !signingIn);
    showSignIn.setAttribute('aria-selected', String(signingIn));
    showRegister.setAttribute('aria-selected', String(!signingIn));
    status.textContent = '';
};

const saveSession = (session) => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
};

const requireSeller = (user) => {
    if (user?.role !== 'seller') {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        throw new Error('This portal is for seller accounts. Use the admin sign-in for staff access.');
    }
};

showSignIn.addEventListener('click', () => setPanel('sign-in'));
showRegister.addEventListener('click', () => setPanel('register'));

signInForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!signInForm.reportValidity()) return;
    const button = signInForm.querySelector('[type="submit"]');
    button.disabled = true;
    status.textContent = 'Signing in…';
    try {
        const data = new FormData(signInForm);
        const response = await authApi.login(data.get('email').toString().trim(), data.get('password').toString());
        requireSeller(response.data.user);
        saveSession(response.data);
        window.location.replace('dashboard.html');
    } catch (error) {
        status.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!registerForm.reportValidity()) return;
    const button = registerForm.querySelector('[type="submit"]');
    button.disabled = true;
    status.textContent = 'Creating your account…';
    try {
        const data = new FormData(registerForm);
        const response = await authApi.registerSeller({
            fullName: data.get('fullName').toString().trim(),
            email: data.get('email').toString().trim(),
            password: data.get('password').toString(),
        });
        saveSession(response.data);
        window.location.replace('dashboard.html');
    } catch (error) {
        status.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

const checkExistingSession = async () => {
    if (!sessionStorage.getItem(ACCESS_TOKEN_KEY)) return;
    try {
        const response = await authApi.me();
        requireSeller(response.data);
        window.location.replace('dashboard.html');
    } catch {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
};

checkExistingSession();
