/* /me enhancements:
   - Render projects from ../projects.json
   - CTA project card
   - 3D tilt on cards
   - Donut cursor animation
*/

(function () {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const siteDataPromise = loadJson(['../data.json', '/data.json', 'data.json']);
    let fallbackRevealObserver = null;

    async function loadJson(candidates) {
        for (const url of candidates) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) continue;
                const ct = (res.headers && res.headers.get) ? (res.headers.get('content-type') || '') : '';
                // If a host rewrite returns HTML (common with SPA redirects), skip it.
                if (ct.includes('text/html')) continue;
                // eslint-disable-next-line no-await-in-loop
                return await res.json();
            } catch (_) {
                // try next
            }
        }
        return null;
    }

    function readMaybe(data, key) {
        if (!data) return '';
        if (typeof data[key] === 'string') return data[key].trim();
        if (data.hero && typeof data.hero[key] === 'string') return data.hero[key].trim();
        return '';
    }

    function observeRevealsSafe(root = document) {
        if (typeof window.observeReveals === 'function') {
            window.observeReveals(root);
            return;
        }

        // Fallback observer for dynamically injected nodes (in case inline script hasn't defined observeReveals yet).
        if (!fallbackRevealObserver) {
            fallbackRevealObserver = new IntersectionObserver(entries => {
                entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
            }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        }

        root.querySelectorAll('.reveal:not(.visible):not([data-reveal-fb="1"])').forEach((el) => {
            el.dataset.revealFb = '1';
            fallbackRevealObserver.observe(el);
        });
    }

    async function hydrateProofStripFromData() {
        const inner = document.getElementById('proof-strip-inner');
        if (!inner) return;

        try {
            const data = await siteDataPromise;
            if (!data) {
                const sec = document.getElementById('proof-strip');
                if (sec) sec.style.display = 'none';
                return;
            }

            const list = Array.isArray(data.proofStrip) ? data.proofStrip : [];
            const clean = list
                .map(it => ({
                    icon: (it && it.icon) ? String(it.icon).trim() : '',
                    value: (it && it.value) ? String(it.value).trim() : '',
                    label: (it && it.label) ? String(it.label).trim() : ''
                }))
                .filter(it => it.value || it.label);

            if (!clean.length) {
                const sec = document.getElementById('proof-strip');
                if (sec) sec.style.display = 'none';
                return;
            }

            inner.innerHTML = '';
            clean.slice(0, 8).forEach((it) => {
                const item = document.createElement('div');
                item.className = 'ps-item';

                if (it.icon) {
                    const ic = document.createElement('span');
                    ic.className = 'ps-icon';
                    ic.textContent = it.icon;
                    item.appendChild(ic);
                }

                if (it.value) {
                    const val = document.createElement('span');
                    val.className = 'ps-val';
                    val.textContent = it.value;
                    item.appendChild(val);
                }

                if (it.label) {
                    const lbl = document.createElement('span');
                    lbl.className = 'ps-lbl';
                    lbl.textContent = it.label;
                    item.appendChild(lbl);
                }

                inner.appendChild(item);
            });
        } catch (_) {
            const sec = document.getElementById('proof-strip');
            if (sec) sec.style.display = 'none';
        }
    }

    function getProjectScreens(project) {
        const keys = ['screen1', 'screen2', 'screen3', 'screen4'];
        return keys
            .map(k => (project && typeof project[k] === 'string' ? project[k].trim() : ''))
            .filter(Boolean);
    }

    function labelForLink(url) {
        if (!url) return 'View';
        if (url.includes('play.google.com')) return 'View on Play Store';
        if (url.includes('github.com')) return 'View on GitHub';
        return 'View Project';
    }

    function tagsForProject(project) {
        if (!project) return [];
        const tags = project.tags;
        if (!Array.isArray(tags)) return [];
        return tags.map(t => String(t).trim()).filter(Boolean);
    }

    function factsForProject(project) {
        if (!project) return [];
        const out = [];

        const platform = project.platform ? String(project.platform).trim() : '';
        const rating = (project.rating !== undefined && project.rating !== null) ? String(project.rating).trim() : '';
        const downloads = project.downloads ? String(project.downloads).trim() : '';
        const role = project.role ? String(project.role).trim() : '';
        const year = (project.year !== undefined && project.year !== null) ? String(project.year).trim() : '';

        if (platform) out.push({ k: 'Platform', v: platform });
        if (rating) out.push({ k: 'Rating', v: rating });
        if (downloads) out.push({ k: 'Downloads', v: downloads });
        if (role) out.push({ k: 'Role', v: role });
        if (year) out.push({ k: 'Year', v: year });

        return out;
    }

    function statusChip(project) {
        const status = (project && project.status) ? String(project.status).toLowerCase() : '';
        if (status === 'live') return { label: 'Live', cls: 'chip-green' };
        if (status === 'in-progress') return { label: 'In Progress', cls: 'chip-orange' };
        return { label: 'Project', cls: 'chip-gray' };
    }

    function sublineForProject(project) {
        const url = (project && project.link) ? String(project.link) : '';
        const status = (project && project.status) ? String(project.status).toLowerCase() : '';

        if (status === 'in-progress') return 'In progress';
        if (url.includes('play.google.com')) return 'Google Play Store';
        if (url.includes('github.com')) return 'GitHub';
        return 'Project';
    }

    function makeCard({ className, revealDelayMs }) {
        const el = document.createElement('div');
        el.className = className;
        el.classList.add('tilt-card');
        el.style.setProperty('--reveal-delay', `${revealDelayMs}ms`);
        el.setAttribute('data-tilt', '1');
        return el;
    }

    function makePhoneSwiper({ projectName, icon, screens, swiperKey }) {
        const media = document.createElement('div');
        media.className = 'proj-media';

        const phone = document.createElement('div');
        phone.className = 'phone-frame proj-phone-frame';

        const notch = document.createElement('div');
        notch.className = 'phone-notch';

        const screen = document.createElement('div');
        screen.className = 'phone-screen';
        screen.classList.add('is-loading');

        const swiper = document.createElement('div');
        swiper.className = 'swiper proj-swiper';
        swiper.dataset.swiperKey = String(swiperKey);
        swiper.dataset.projectName = projectName || 'Project';

        const wrapper = document.createElement('div');
        wrapper.className = 'swiper-wrapper';

        if (screens && screens.length) {
            screens.forEach((src, i) => {
                const slide = document.createElement('div');
                slide.className = 'swiper-slide';
                const img = document.createElement('img');
                img.src = src;
                img.alt = `${projectName} screenshot`;
                img.loading = 'lazy';
                img.decoding = 'async';
                img.setAttribute('fetchpriority', 'low');
                if (i === 0) {
                    img.addEventListener('load', () => screen.classList.remove('is-loading'), { once: true });
                    img.addEventListener('error', () => screen.classList.remove('is-loading'), { once: true });
                }
                slide.appendChild(img);
                wrapper.appendChild(slide);
            });
        } else {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide proj-slide-placeholder';
            const ph = document.createElement('div');
            ph.className = 'proj-placeholder';
            const phIcon = document.createElement('div');
            phIcon.className = 'proj-placeholder-ic';
            phIcon.textContent = icon || '📱';
            ph.appendChild(phIcon);
            slide.appendChild(ph);
            wrapper.appendChild(slide);
            screen.classList.remove('is-loading');
        }

        swiper.appendChild(wrapper);
        screen.appendChild(swiper);

        phone.appendChild(notch);
        phone.appendChild(screen);
        media.appendChild(phone);
        return media;
    }

    function renderProjectCard(project, index) {
        const chip = statusChip(project);
        const isFeatured = index === 0;
        const screens = getProjectScreens(project);
        const tags = tagsForProject(project);
        const facts = factsForProject(project);

        const card = makeCard({
            className: `proj-card card reveal${isFeatured ? ' feat' : ''}`,
            revealDelayMs: Math.min(480, index * 80)
        });

        const row = document.createElement('div');
        row.className = 'proj-row';

        const body = document.createElement('div');
        body.className = 'proj-body';

        const top = document.createElement('div');
        top.className = 'proj-top';

        const iconSm = document.createElement('div');
        iconSm.className = 'proj-icon-sm';
        iconSm.textContent = '📱';

        top.appendChild(iconSm);

        if (chip.label === 'Live') {
            const liveTag = document.createElement('div');
            liveTag.className = 'live-tag';
            const dot = document.createElement('span');
            dot.className = 'live-dot';
            const txt = document.createElement('span');
            txt.className = 'live-txt';
            const main = document.createElement('span');
            main.className = 'live-tag-main';
            main.textContent = 'Live';
            const sub = document.createElement('span');
            sub.className = 'live-tag-sub';
            sub.textContent = sublineForProject(project);
            txt.appendChild(main);
            txt.appendChild(sub);
            liveTag.appendChild(dot);
            liveTag.appendChild(txt);
            top.appendChild(liveTag);
        } else {
            const st = document.createElement('span');
            st.className = `chip ${chip.cls}`;
            st.textContent = chip.label;
            top.appendChild(st);
        }

        const title = document.createElement('div');
        title.className = 'proj-title';
        title.textContent = project.name || 'Project';

        const subline = document.createElement('div');
        subline.className = 'proj-subline';
        subline.textContent = sublineForProject(project);

        const desc = document.createElement('div');
        desc.className = 'proj-desc';
        desc.textContent = project.description || project.tagline || '';

        const factsRow = document.createElement('div');
        factsRow.className = 'proj-facts';
        facts.forEach((f) => {
            const item = document.createElement('div');
            item.className = 'proj-fact';
            const k = document.createElement('span');
            k.className = 'proj-fact-k';
            k.textContent = f.k;
            const v = document.createElement('span');
            v.className = 'proj-fact-v';
            v.textContent = f.v;
            item.appendChild(k);
            item.appendChild(v);
            factsRow.appendChild(item);
        });

        const stack = document.createElement('div');
        stack.className = 'proj-stack';
        const tagColors = ['chip-blue', 'chip-teal', 'chip-green', 'chip-orange'];
        tags.forEach((t, i) => {
            const c = document.createElement('span');
            c.className = `chip ${tagColors[i % tagColors.length]}`;
            c.textContent = t;
            stack.appendChild(c);
        });

        const links = document.createElement('div');
        links.className = 'proj-links';

        if (project.link) {
            const a = document.createElement('a');
            a.className = 'pl pl-primary';
            a.href = project.link;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = labelForLink(project.link);
            links.appendChild(a);
        }

        if (project.github) {
            const g = document.createElement('a');
            g.className = 'pl pl-ghost';
            g.href = project.github;
            g.target = '_blank';
            g.rel = 'noopener noreferrer';
            g.textContent = 'GitHub';
            links.appendChild(g);
        }

        body.appendChild(top);
        body.appendChild(title);
        if (chip.label !== 'Live') body.appendChild(subline);
        if (facts.length) body.appendChild(factsRow);
        if (project.tagline) {
            const tag = document.createElement('div');
            tag.className = 'proj-tagline';
            tag.textContent = project.tagline;
            body.appendChild(tag);
        }
        if (project.description) body.appendChild(desc);
        if (tags.length) body.appendChild(stack);
        body.appendChild(links);

        const media = makePhoneSwiper({
            projectName: project.name || 'Project',
            icon: '📱',
            screens,
            swiperKey: `p-${index}`
        });

        row.appendChild(body);
        row.appendChild(media);
        card.appendChild(row);

        return card;
    }

    function renderCtaCard(revealDelayMs) {
        const card = makeCard({
            className: 'proj-card card cta reveal',
            revealDelayMs
        });

        const row = document.createElement('div');
        row.className = 'proj-row';

        const body = document.createElement('div');
        body.className = 'proj-body';

        const top = document.createElement('div');
        top.className = 'proj-top';

        const iconSm = document.createElement('div');
        iconSm.className = 'proj-icon-sm';
        iconSm.textContent = '✦';

        const st = document.createElement('span');
        st.className = 'chip chip-blue';
        st.textContent = 'Your Slot';

        top.appendChild(iconSm);
        top.appendChild(st);

        const title = document.createElement('div');
        title.className = 'proj-title';
        title.textContent = 'Your App Could Be Here';

        const subline = document.createElement('div');
        subline.className = 'proj-subline';
        subline.textContent = 'Available slot';

        const desc = document.createElement('div');
        desc.className = 'proj-desc';
        desc.textContent = 'Tell me more about you and what you are building. Free consultation, reply within 24 hours.';

        const links = document.createElement('div');
        links.className = 'proj-links';
        const a = document.createElement('a');
        a.className = 'pl pl-primary';
        a.href = '#contact';
        a.textContent = 'Start a Project →';
        links.appendChild(a);

        body.appendChild(top);
        body.appendChild(title);
        body.appendChild(subline);
        body.appendChild(desc);
        body.appendChild(links);

        const media = makePhoneSwiper({
            projectName: 'Your App',
            icon: '✨',
            screens: [],
            swiperKey: 'cta'
        });

        row.appendChild(body);
        row.appendChild(media);
        card.appendChild(row);
        return card;
    }

    function initProjectSwipers() {
        if (reduceMotion) return;
        if (!window.Swiper) return;

        document.querySelectorAll('.proj-swiper:not([data-swiper-ready="1"])').forEach((el) => {
            const slides = el.querySelectorAll('.swiper-slide');
            const slideCount = slides.length;

            el.dataset.swiperReady = '1';

            if (slideCount <= 1) return;

            // eslint-disable-next-line no-new
            new window.Swiper(el, {
                loop: true,
                effect: 'fade',
                fadeEffect: { crossFade: true },
                speed: 650,
                allowTouchMove: true,
                grabCursor: true,
                autoplay: {
                    delay: 2200,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true
                }
            });
        });
    }

    function setupTilt() {
        if (reduceMotion) return;
        const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
        if (!finePointer) return;

        const max = 5.5;
        document.querySelectorAll('[data-tilt="1"]').forEach((card) => {
            let raf = 0;
            let resetTimer = 0;

            function updateFromEvent(e) {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                const rx = (py - 0.5) * -2 * max;
                const ry = (px - 0.5) * 2 * max;
                card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
                card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
                card.style.setProperty('--glow-x', `${Math.round(px * 100)}%`);
                card.style.setProperty('--glow-y', `${Math.round(py * 100)}%`);
            }

            card.addEventListener('pointerenter', () => {
                card.classList.remove('tilt-reset');
                if (resetTimer) window.clearTimeout(resetTimer);
            });

            card.addEventListener('pointermove', (e) => {
                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => updateFromEvent(e));
            });

            card.addEventListener('pointerleave', () => {
                card.style.setProperty('--rx', '0deg');
                card.style.setProperty('--ry', '0deg');
                card.classList.add('tilt-reset');
                if (resetTimer) window.clearTimeout(resetTimer);
                resetTimer = window.setTimeout(() => card.classList.remove('tilt-reset'), 220);
            });
        });
    }

    function setupDonutCursor() {
        if (reduceMotion) return;

        const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
        if (!finePointer) return;

        const donut = document.querySelector('.cursor-donut');
        const dot = document.querySelector('.cursor-dot');
        if (!donut || !dot) return;

        const tailCount = 7;
        const tails = [];
        for (let i = 0; i < tailCount; i += 1) {
            const t = document.createElement('div');
            t.className = 'cursor-tail';
            t.style.width = `${Math.max(4, 10 - i)}px`;
            t.style.height = `${Math.max(4, 10 - i)}px`;
            t.style.opacity = '0';
            t.style.background = `rgba(37, 99, 235, ${0.20 - i * 0.018})`;
            document.body.appendChild(t);
            tails.push(t);
        }

        let targetX = window.innerWidth / 2;
        let targetY = window.innerHeight / 2;
        let donutX = targetX;
        let donutY = targetY;
        let dotX = targetX;
        let dotY = targetY;
        let visible = false;
        let lastMove = performance.now();

        const tailX = new Array(tailCount).fill(targetX);
        const tailY = new Array(tailCount).fill(targetY);

        function render() {
            const donutEase = 0.14;
            const dotEase = 0.22;
            const tailEaseBase = 0.28;

            donutX += (targetX - donutX) * donutEase;
            donutY += (targetY - donutY) * donutEase;
            dotX += (targetX - dotX) * dotEase;
            dotY += (targetY - dotY) * dotEase;

            donut.style.transform = `translate3d(${donutX - donut.offsetWidth / 2}px, ${donutY - donut.offsetHeight / 2}px, 0)`;
            dot.style.transform = `translate3d(${dotX - dot.offsetWidth / 2}px, ${dotY - dot.offsetHeight / 2}px, 0)`;

            // Tail: each dot follows the previous dot, so it briefly lingers when stopping.
            let px = dotX;
            let py = dotY;
            for (let i = 0; i < tails.length; i += 1) {
                const ease = Math.max(0.14, tailEaseBase - i * 0.02);
                tailX[i] += (px - tailX[i]) * ease;
                tailY[i] += (py - tailY[i]) * ease;
                tails[i].style.transform = `translate3d(${tailX[i] - tails[i].offsetWidth / 2}px, ${tailY[i] - tails[i].offsetHeight / 2}px, 0)`;
                px = tailX[i];
                py = tailY[i];
            }

            // Hide the custom cursor shortly after the mouse stops, so the UI isn't cluttered.
            const idleMs = performance.now() - lastMove;
            const idleThreshold = 170;
            const tailFadeAfter = 220;

            if (visible) {
                const moving = idleMs < idleThreshold;
                if (moving) {
                    donut.style.opacity = '1';
                    dot.style.opacity = '1';
                    document.body.classList.add('cursor-custom-on');
                    tails.forEach(t => { t.style.opacity = '1'; });
                } else {
                    // Donut/dot off when idle: fall back to the normal system cursor.
                    donut.style.opacity = '0';
                    dot.style.opacity = '0';
                    document.body.classList.remove('cursor-custom-on');

                    // Tail lingers briefly then fades out.
                    const tailAlpha = Math.max(0, 1 - Math.max(0, idleMs - tailFadeAfter) / 220);
                    tails.forEach((t) => { t.style.opacity = String(tailAlpha); });
                }
            }

            requestAnimationFrame(render);
        }

        window.addEventListener('pointermove', (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
            lastMove = performance.now();
            if (!visible) {
                visible = true;
                donut.style.opacity = '1';
                dot.style.opacity = '1';
                document.body.classList.add('cursor-custom-on');
                tails.forEach(t => { t.style.opacity = '1'; });
            }
        }, { passive: true });

        window.addEventListener('pointerdown', () => donut.classList.add('is-down'));
        window.addEventListener('pointerup', () => donut.classList.remove('is-down'));

        const hoverSelectors = 'a, button, .pl, .btn-primary, .btn-outline, .proj-card';
        document.addEventListener('pointerover', (e) => {
            const t = e.target;
            if (t && t.closest && t.closest(hoverSelectors)) donut.classList.add('is-hover');
        });
        document.addEventListener('pointerout', (e) => {
            const t = e.target;
            if (t && t.closest && t.closest(hoverSelectors)) donut.classList.remove('is-hover');
        });

        requestAnimationFrame(render);
    }

    async function renderProjectsFromJson() {
        const grid = document.getElementById('proj-grid');
        if (!grid) return;

        let projects = [];
        try {
            const data = await loadJson(['../projects.json', '/projects.json', 'projects.json']);
            if (!data) throw new Error('projects.json not reachable');
            projects = data;
            if (!Array.isArray(projects)) throw new Error('projects.json is not an array');
        } catch (_) {
            grid.innerHTML = '';
            const warn = makeCard({ className: 'proj-card card reveal', revealDelayMs: 0 });
            const row = document.createElement('div');
            row.className = 'proj-row';
            const body = document.createElement('div');
            body.className = 'proj-body';

            const top = document.createElement('div');
            top.className = 'proj-top';
            const iconSm = document.createElement('div');
            iconSm.className = 'proj-icon-sm';
            iconSm.textContent = '⚠️';
            const chip = document.createElement('span');
            chip.className = 'chip chip-orange';
            chip.textContent = 'Not Loaded';
            top.appendChild(iconSm);
            top.appendChild(chip);

            const title = document.createElement('div');
            title.className = 'proj-title';
            title.textContent = 'Projects failed to load';

            const desc = document.createElement('div');
            desc.className = 'proj-desc';
            desc.textContent = 'This section reads from projects.json. If JSON isn’t loading on Netlify, make sure the publish directory is the repo root (.) and remove any SPA redirect that rewrites /projects.json to HTML.';

            body.appendChild(top);
            body.appendChild(title);
            body.appendChild(desc);

            const media = makePhoneSwiper({ projectName: 'Projects', icon: '📄', screens: [], swiperKey: 'err' });
            row.appendChild(body);
            row.appendChild(media);
            warn.appendChild(row);
            grid.appendChild(warn);

            observeRevealsSafe(document);
            return;
        }

        grid.innerHTML = '';
        projects.forEach((p, i) => grid.appendChild(renderProjectCard(p, i)));
        grid.appendChild(renderCtaCard(Math.min(480, projects.length * 80)));

        observeRevealsSafe(document);

        setupTilt();
        initProjectSwipers();
    }

    async function renderReviewsFromJson() {
        const host = document.getElementById('rev-marquee');
        if (!host) return;

        const trackA = host.querySelector('.rev-track[data-track="a"]');
        const trackB = host.querySelector('.rev-track[data-track="b"]');
        if (!trackA || !trackB) return;

        let reviews = [];
        try {
            const data = await loadJson(['../reviews.json', '/reviews.json', 'reviews.json']);
            if (!data) throw new Error('reviews.json not reachable');
            reviews = data;
            if (!Array.isArray(reviews)) throw new Error('reviews.json is not an array');
        } catch (_) {
            // If reviews can't load, hide the section quietly.
            const sec = document.getElementById('reviews');
            if (sec) sec.style.display = 'none';
            return;
        }

        const clean = reviews
            .map(r => ({
                by: (r && r.by) ? String(r.by).trim() : '',
                text: (r && (r.reviews || r.review || r.text)) ? String(r.reviews || r.review || r.text).trim() : ''
            }))
            .filter(r => r.by && r.text);

        if (!clean.length) {
            const sec = document.getElementById('reviews');
            if (sec) sec.style.display = 'none';
            return;
        }

        function cardEl(r) {
            const el = document.createElement('div');
            el.className = 'rev-card';

            const q = document.createElement('div');
            q.className = 'rev-quote';
            q.textContent = '“';

            const text = document.createElement('div');
            text.className = 'rev-text';
            text.textContent = r.text;

            const by = document.createElement('div');
            by.className = 'rev-by';
            by.textContent = r.by;

            el.appendChild(q);
            el.appendChild(text);
            el.appendChild(by);
            return el;
        }

        function fillTrack(track, list) {
            track.innerHTML = '';
            // Build a base list that is "long enough", then duplicate it once.
            const base = [];
            while (base.length < 8) base.push(...list);
            const doubled = base.concat(base);
            doubled.forEach(r => track.appendChild(cardEl(r)));
        }

        fillTrack(trackA, clean);
        fillTrack(trackB, clean.slice().reverse());

        observeRevealsSafe(document);
    }

    async function renderFaqFromJson() {
        const grid = document.getElementById('faq-grid');
        if (!grid) return;

        let faqs = [];
        try {
            const data = await loadJson(['../faqs.json', '/faqs.json', 'faqs.json']);
            if (!data) throw new Error('faqs.json not reachable');
            faqs = data;
            if (!Array.isArray(faqs)) throw new Error('faqs.json is not an array');
        } catch (_) {
            const sec = document.getElementById('faq');
            if (sec) sec.style.display = 'none';
            return;
        }

        const clean = faqs
            .map(f => ({
                q: (f && f.question) ? String(f.question).trim() : '',
                a: (f && f.answer) ? String(f.answer).trim() : ''
            }))
            .filter(f => f.q && f.a);

        if (!clean.length) {
            const sec = document.getElementById('faq');
            if (sec) sec.style.display = 'none';
            return;
        }

        const maxAll = 12;
        const initialCount = Math.min(4, clean.length, maxAll);
        const fullCount = Math.min(clean.length, maxAll);

        function renderFaqItems(count) {
            grid.innerHTML = '';
            clean.slice(0, count).forEach((f, i) => {
                const d = document.createElement('details');
                d.className = `faq-item card reveal${i ? ` d${Math.min(3, i)}` : ''}`;

                const s = document.createElement('summary');
                s.className = 'faq-q';

                const q = document.createElement('span');
                q.className = 'faq-q-text';
                q.textContent = f.q;

                const ic = document.createElement('span');
                ic.className = 'faq-ic';
                ic.textContent = '+';

                s.appendChild(q);
                s.appendChild(ic);

                const a = document.createElement('div');
                a.className = 'faq-a';
                a.textContent = f.a;

                d.appendChild(s);
                d.appendChild(a);
                grid.appendChild(d);
            });

            observeRevealsSafe(document);
            setupTilt();
        }

        renderFaqItems(initialCount);

        const existingBtn = document.getElementById('faq-more-btn');
        if (existingBtn) existingBtn.remove();

        if (clean.length > initialCount) {
            let expanded = false;
            const btn = document.createElement('button');
            btn.id = 'faq-more-btn';
            btn.type = 'button';
            btn.className = 'btn-outline faq-more';
            btn.textContent = 'Show all FAQs →';
            btn.setAttribute('aria-expanded', 'false');

            btn.addEventListener('click', () => {
                expanded = !expanded;
                btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                btn.textContent = expanded ? 'Show fewer FAQs' : 'Show all FAQs →';
                renderFaqItems(expanded ? fullCount : initialCount);
            });

            grid.insertAdjacentElement('afterend', btn);
        }
    }

    async function hydrateHeroFromData() {
        const img = document.getElementById('hero-main-ss');
        if (!img) return;

        try {
            const data = await siteDataPromise;
            if (!data) return;

            const badge = readMaybe(data, 'heroBadge');
            const name = readMaybe(data, 'heroName');
            const role = readMaybe(data, 'heroRole');
            const location = readMaybe(data, 'heroLocation');
            const emLive = readMaybe(data, 'heroEmLive');
            const emStore = readMaybe(data, 'heroEmStore');
            const pText = readMaybe(data, 'heroPrimaryText');
            const pHref = readMaybe(data, 'heroPrimaryHref');
            const sText = readMaybe(data, 'heroSecondaryText');
            const sHref = readMaybe(data, 'heroSecondaryHref');
            const navText = readMaybe(data, 'navCtaText');
            const navHref = readMaybe(data, 'navCtaHref');
            const mainSSHref = readMaybe(data, 'mainSSHref');

            const badgeEl = document.getElementById('hero-badge-text');
            if (badge && badgeEl) badgeEl.textContent = badge;
            const nameEl = document.getElementById('hero-name');
            if (name && nameEl) nameEl.textContent = name;
            const roleEl = document.getElementById('hero-role');
            if (role && roleEl) roleEl.textContent = role;
            const locEl = document.getElementById('hero-location');
            if (location && locEl) locEl.textContent = location;
            const emLiveEl = document.getElementById('hero-em-live');
            if (emLive && emLiveEl) emLiveEl.textContent = emLive;
            const emStoreEl = document.getElementById('hero-em-store');
            if (emStore && emStoreEl) emStoreEl.textContent = emStore;

            const prim = document.getElementById('hero-cta-primary');
            if (prim) {
                if (pText) prim.textContent = pText;
                if (pHref) prim.setAttribute('href', pHref);
            }
            const sec = document.getElementById('hero-cta-secondary');
            if (sec) {
                if (sText) sec.textContent = sText;
                if (sHref) sec.setAttribute('href', sHref);
            }
            const nav = document.getElementById('nav-cta');
            if (nav) {
                if (navText) nav.textContent = navText;
                if (navHref) nav.setAttribute('href', navHref);
            }

            const phoneLink = document.getElementById('hero-phone-link');
            if (phoneLink && mainSSHref) {
                phoneLink.setAttribute('href', mainSSHref);
            }

            const mainSS = data && typeof data.mainSS === 'string' ? data.mainSS.trim() : '';
            if (mainSS) {
                const screen = img.closest('.phone-screen');
                if (screen) screen.classList.add('is-loading');
                img.addEventListener('load', () => screen && screen.classList.remove('is-loading'), { once: true });
                img.addEventListener('error', () => screen && screen.classList.remove('is-loading'), { once: true });
                img.src = mainSS;
            }
        } catch (_) {
            // keep the default src
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            hydrateHeroFromData();
            hydrateProofStripFromData();
            renderProjectsFromJson();
            renderReviewsFromJson();
            renderFaqFromJson();
            setupDonutCursor();
        });
    } else {
        hydrateHeroFromData();
        hydrateProofStripFromData();
        renderProjectsFromJson();
        renderReviewsFromJson();
        renderFaqFromJson();
        setupDonutCursor();
    }
})();
