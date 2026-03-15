(function () {
    function labelForLink(url) {
        if (!url) return 'View Project';
        if (url.includes('play.google.com')) return 'View on Play Store';
        if (url.includes('github.com')) return 'View on GitHub';
        return 'View Project';
    }

    function pickFeatured(projects) {
        if (!Array.isArray(projects) || !projects.length) return null;
        const live = projects.find(p => String(p && p.status || '').toLowerCase() === 'live');
        return live || projects[0];
    }

    async function loadProjects() {
        const candidates = ['../projects.json', '/projects.json', 'projects.json'];
        for (const url of candidates) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) continue;
                // eslint-disable-next-line no-await-in-loop
                const data = await res.json();
                if (Array.isArray(data)) return data;
            } catch (_) {
                // try next
            }
        }
        return null;
    }

    async function hydratePublishedApp() {
        const titleEl = document.getElementById('app-title');
        const subEl = document.getElementById('app-sub');
        const ctaEl = document.getElementById('app-cta');
        if (!titleEl || !subEl || !ctaEl) return;

        const projects = await loadProjects();
        const p = pickFeatured(projects);
        if (!p) return;

        const name = String(p.name || 'Project');
        const status = String(p.status || '').toLowerCase();
        const link = p.link ? String(p.link) : '';
        const desc = String(p.description || p.tagline || '');

        const where = link.includes('play.google.com') ? 'Play Store' : (status === 'live' ? 'Live' : 'Project');
        titleEl.textContent = '';
        const span = document.createElement('span');
        span.textContent = name;
        titleEl.appendChild(span);
        titleEl.appendChild(document.createTextNode(` — ${status === 'live' ? 'Live on ' + where : where}`));
        subEl.textContent = desc || 'Published app.';

        if (link) {
            ctaEl.href = link;
            ctaEl.textContent = (link.includes('play.google.com') ? '☀️ ' : '') + labelForLink(link);
            ctaEl.rel = 'noopener noreferrer';
            ctaEl.target = '_blank';
            ctaEl.style.display = 'inline-flex';
        } else {
            ctaEl.style.display = 'none';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hydratePublishedApp);
    } else {
        hydratePublishedApp();
    }
})();
