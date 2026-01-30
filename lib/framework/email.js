// Email wrapper for EmailJS. Keeps calls safe when EmailJS isn't present (e.g., in static previews).
export function initEmail(key) {
    if (window && window.emailjs && typeof window.emailjs.init === 'function') {
        window.emailjs.init(key);
    } else {
        console.warn('EmailJS not available in this environment.');
    }
}

export function sendEmailForm(service, template, formElement) {
    return new Promise((resolve, reject) => {
        if (!window || !window.emailjs || typeof window.emailjs.sendForm !== 'function') {
            return reject(new Error('EmailJS not available'));
        }
        window.emailjs.sendForm(service, template, formElement)
            .then(res => resolve(res))
            .catch(err => reject(err));
    });
}

export default { initEmail, sendEmailForm };
