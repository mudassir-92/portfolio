/* ── EmailJS Init ── */
(function () {
    if (typeof emailjs !== 'undefined' && window.CONFIG) {
        emailjs.init(window.CONFIG.EMAILJS_PUBLIC_KEY);
    }
})();

/* ── Reveal on scroll ── */
const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

/* ── Active nav highlight ── */
const secs = document.querySelectorAll('section[id]');
const nls = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
    let cur = '';
    secs.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id; });
    nls.forEach(a => { a.style.color = a.getAttribute('href') === '#' + cur ? '#111827' : ''; });
});

/* ── Contact Form Submit (EmailJS) ── */
function handleSubmit(e) {
    e.preventDefault();
    const btn = document.querySelector('.fsub');

    // Grab values
    const name = document.getElementById('f-name')?.value.trim() || '';
    const email = document.getElementById('f-email')?.value.trim() || '';
    const appType = document.getElementById('f-apptype')?.value || '';
    const platform = document.getElementById('f-platform')?.value || '';
    const budget = document.getElementById('f-budget')?.value || '';
    const timeline = document.getElementById('f-timeline')?.value || '';
    const message = document.getElementById('f-message')?.value.trim() || '';

    // Basic validation
    if (!name || !email) {
        btn.textContent = '⚠️ Please fill name & email';
        btn.style.background = '#ea580c';
        btn.style.boxShadow = '0 4px 16px rgba(234,88,12,0.3)';
        setTimeout(() => {
            btn.textContent = 'Send Project Brief →';
            btn.style.background = '';
            btn.style.boxShadow = '';
        }, 3000);
        return;
    }

    // Show sending state
    btn.textContent = 'Sending...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    const now = new Date();
    const timeStr = now.toLocaleString('en-US', {
        dateStyle: 'medium', timeStyle: 'short'
    });

    const templateParams = {
        name: name,
        email: email,
        app_type: appType,
        platform: platform,
        budget: budget,
        timeline: timeline,
        message: message,
        time: timeStr
    };

    // Check if EmailJS is loaded
    if (typeof emailjs === 'undefined' || !window.CONFIG) {
        btn.textContent = '❌ Config not loaded — check config.js';
        btn.style.background = '#dc2626';
        btn.disabled = false;
        btn.style.opacity = '1';
        setTimeout(() => {
            btn.textContent = 'Send Project Brief →';
            btn.style.background = '';
            btn.style.boxShadow = '';
        }, 4000);
        return;
    }

    // Send contact email to you
    emailjs.send(window.CONFIG.EMAILJS_SERVICE_ID, window.CONFIG.EMAILJS_CONTACT_TEMPLATE_ID, templateParams)
        .then(function () {
            // Wait 2s, then send auto-reply to client
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve(emailjs.send(window.CONFIG.EMAILJS_SERVICE_ID, window.CONFIG.EMAILJS_AUTOREPLY_TEMPLATE_ID, templateParams));
                }, 2000);
            });
        })
        .then(function () {
            // Success
            btn.textContent = '✅ Brief Sent! Check your email for confirmation';
            btn.style.background = '#059669';
            btn.style.boxShadow = '0 4px 16px rgba(5,150,105,0.3)';
            btn.disabled = false;
            btn.style.opacity = '1';

            // Clear form
            ['f-name', 'f-email', 'f-apptype', 'f-platform', 'f-budget', 'f-timeline', 'f-message'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (el.tagName === 'SELECT') el.selectedIndex = 0;
                    else el.value = '';
                }
            });

            setTimeout(() => {
                btn.textContent = 'Send Project Brief →';
                btn.style.background = '';
                btn.style.boxShadow = '';
            }, 5000);
        })
        .catch(function (err) {
            console.error('EmailJS Error:', err);
            btn.textContent = '❌ Failed to send — try again';
            btn.style.background = '#dc2626';
            btn.style.boxShadow = '0 4px 16px rgba(220,38,38,0.3)';
            btn.disabled = false;
            btn.style.opacity = '1';
            setTimeout(() => {
                btn.textContent = 'Send Project Brief →';
                btn.style.background = '';
                btn.style.boxShadow = '';
            }, 4000);
        });
}

