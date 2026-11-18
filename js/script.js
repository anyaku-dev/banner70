'use strict';
(() => {
  const root = document.documentElement;
  const motionOK = root.classList.contains('has-motion');
  window.BANNER70_MOTION = true;

  const config = window.BANNER70_CONFIG || {};
  const checkoutUrl = typeof config.checkoutUrl === 'string' && /^https:\/\//i.test(config.checkoutUrl.trim()) ? config.checkoutUrl.trim() : '';
  const contactUrl = typeof config.contactUrl === 'string' && /^https:\/\//i.test(config.contactUrl.trim()) ? config.contactUrl.trim() : 'https://anyaku.co.jp/contact/';
  document.querySelectorAll('[data-checkout]').forEach(link => {
    const label = checkoutUrl ? link.dataset.checkoutLabel : link.dataset.inquiryLabel;
    link.href = checkoutUrl || contactUrl;
    link.innerHTML = `${label} <span aria-hidden="true">↗</span>`;
    link.setAttribute('aria-label', checkoutUrl ? `${label}（外部決済ページへ）` : `${label}（ANYAKUの公式お問い合わせページへ）`);
  });
  const checkoutStatus = document.getElementById('checkoutStatus');
  if (checkoutStatus && checkoutUrl) checkoutStatus.textContent = '外部の決済ページに移動します。ご購入前に利用条件をご確認ください。';
  const purchaseDeliveryNote = document.getElementById('purchaseDeliveryNote');
  if (purchaseDeliveryNote) purchaseDeliveryNote.hidden = !checkoutUrl;

  const menuButton = document.getElementById('menuButton');
  const mobileNav = document.getElementById('mobileNav');
  if (menuButton && mobileNav) {
    const closeMenu = () => {
      mobileNav.hidden = true;
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'メニューを開く');
      document.body.classList.remove('menu-open');
    };
    menuButton.addEventListener('click', () => {
      if (menuButton.getAttribute('aria-expanded') === 'true') return closeMenu();
      mobileNav.hidden = false;
      menuButton.setAttribute('aria-expanded', 'true');
      menuButton.setAttribute('aria-label', 'メニューを閉じる');
      document.body.classList.add('menu-open');
    });
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 800 && !mobileNav.hidden) closeMenu(); });
  }

  // ---- Motion: scroll reveals ----
  const INSTANT_DELAY = '-20s'; // negative delay = finished animation, used to show content without replaying it
  const formatCount = n => n.toLocaleString('ja-JP');
  const splitLines = heading => {
    const groups = [[]];
    [...heading.childNodes].forEach(node => node.nodeName === 'BR' ? groups.push([]) : groups[groups.length - 1].push(node));
    heading.replaceChildren(...groups.filter(nodes => nodes.some(n => n.textContent.trim())).map((nodes, index) => {
      const line = document.createElement('span');
      const inner = document.createElement('span');
      line.className = 'split-line';
      inner.style.setProperty('--line', index);
      inner.append(...nodes);
      line.append(inner);
      return line;
    }));
    heading.classList.add('is-split');
  };
  // Assigns a stagger index to every direct child; headings are split into masked lines.
  const choreograph = (container, start = 0) => {
    let index = start;
    [...container.children].forEach(child => {
      if (child.matches('h1, h2')) {
        splitLines(child);
        child.style.setProperty('--i', index);
        index += 1.5;
      } else if (child.querySelector('h2')) {
        index = choreograph(child, index);
      } else {
        child.classList.add('motion-item');
        child.style.setProperty('--i', index);
        index += 1;
      }
    });
    return index;
  };
  const countUp = (el, delay) => {
    const target = Number(el.dataset.countTo);
    const duration = 1600;
    let start;
    const step = now => {
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      el.textContent = formatCount(Math.round(target * (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))));
      if (t < 1) requestAnimationFrame(step);
    };
    setTimeout(() => requestAnimationFrame(step), delay);
  };
  // Sweeps the Before/After divider once to hint that it is draggable; cancels on user interaction.
  const peekComparison = (comparison, delay) => {
    const input = comparison.querySelector('.comparison-range');
    const keys = [[0, 50], [.32, 76], [.72, 26], [1, 50]];
    const duration = 2000;
    let stopped = false;
    let start;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      comparison.style.setProperty('--pos', `${input.value}%`);
    };
    ['pointerdown', 'keydown', 'focusin'].forEach(type => comparison.addEventListener(type, stop, { once: true, passive: true }));
    const step = now => {
      if (stopped) return;
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      const k = keys.findIndex(([at], i) => i > 0 && t <= at);
      const [t0, v0] = keys[k - 1];
      const [t1, v1] = keys[k];
      const local = (t - t0) / (t1 - t0);
      const eased = (1 - Math.cos(local * Math.PI)) / 2;
      comparison.style.setProperty('--pos', `${t < 1 ? v0 + (v1 - v0) * eased : input.value}%`);
      if (t < 1) requestAnimationFrame(step);
    };
    setTimeout(() => { if (!stopped) requestAnimationFrame(step); }, delay);
  };
  const showReveal = (el, delayMs, instant) => {
    el.style.setProperty('--reveal-delay', instant ? INSTANT_DELAY : `${delayMs}ms`);
    el.classList.add('is-shown');
    el.querySelectorAll('[data-count-to]').forEach(num => {
      if (instant) num.textContent = formatCount(Number(num.dataset.countTo));
      else countUp(num, delayMs + 350);
    });
    if (!instant) el.querySelectorAll('.comparison').forEach(c => peekComparison(c, delayMs + 1000));
  };
  let revealObserver = null;
  if (motionOK && 'IntersectionObserver' in window) {
    document.querySelectorAll('.reveal').forEach(el => {
      if (el.querySelector('h2')) {
        el.classList.add('has-heading');
        choreograph(el);
      }
    });
    document.querySelectorAll('.reveal-children').forEach(el => choreograph(el));
    document.querySelectorAll('.collection-counter strong, .price-total').forEach(el => {
      const node = [...el.childNodes].find(n => n.nodeType === Node.TEXT_NODE && /\d/.test(n.textContent));
      if (!node) return;
      const value = node.textContent.trim();
      const num = document.createElement('span');
      num.className = 'count-num';
      num.setAttribute('aria-hidden', 'true');
      num.dataset.countTo = value.replace(/\D/g, '');
      num.textContent = '0';
      const label = document.createElement('span');
      label.className = 'sr-only';
      label.textContent = value;
      node.replaceWith(num, label);
    });
    // Elements entering together are staggered as one batch, in document order.
    revealObserver = new IntersectionObserver(entries => {
      const entering = [];
      entries.forEach(entry => {
        if (entry.isIntersecting) entering.push(entry.target);
        else if (entry.boundingClientRect.bottom < 0) {
          showReveal(entry.target, 0, true);
          revealObserver.unobserve(entry.target);
        }
      });
      entering
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        .forEach((el, index) => {
          const step = el.classList.contains('reveal-tile') ? 45 : 110;
          showReveal(el, Math.min(index * step, 660), false);
          revealObserver.unobserve(el);
        });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  }
  const observeReveals = nodes => {
    if (!revealObserver) return nodes.forEach(el => el.classList.add('is-shown'));
    nodes.forEach(el => revealObserver.observe(el));
  };

  const categories = {
    business: [11,12,13,14,15,17,22,24,25,27,28,29,42,43,44,45,46,47,48,49,50,55,56,61,62,63,64,65,66,68,70],
    beauty: [2,5,6,7,16,18,19,20,21,31,33,39,40,41,51,53,54,57,69],
    campaign: [1,3,4,8,10,26,32,34,35,37,38],
    lifestyle: [9,23,30,36,52,58,59,60,67]
  };
  const categoryMap = new Map();
  Object.entries(categories).forEach(([key, numbers]) => numbers.forEach(n => categoryMap.set(n, key)));
  const banners = Array.from({ length: 70 }, (_, i) => ({ number: i + 1, category: categoryMap.get(i + 1) || 'lifestyle' }));
  const galleryGrid = document.getElementById('galleryGrid');
  const filtersWrap = document.getElementById('galleryFilters');
  const galleryResult = document.getElementById('galleryResult');
  const moreWrap = document.getElementById('galleryMoreWrap');
  const moreButton = document.getElementById('galleryMore');
  const dialog = document.getElementById('galleryDialog');
  const dialogImage = document.getElementById('dialogImage');
  const dialogCount = document.getElementById('dialogCount');
  const dialogClose = document.getElementById('dialogClose');
  let currentCategory = 'all';
  let limit = 24;
  let lightboxGroup = banners;
  let activeIndex = 0;
  let lastFocus = null;
  const imgPath = n => `assets/banner-template/banner-template_sample_${n}.jpg`;
  const prettyNumber = n => String(n).padStart(2, '0');
  const filtered = () => currentCategory === 'all' ? banners : banners.filter(b => b.category === currentCategory);
  const updateDialog = () => {
    const banner = lightboxGroup[activeIndex];
    if (!banner) return;
    dialogImage.src = imgPath(banner.number);
    dialogImage.alt = `バナーデザイン No. ${prettyNumber(banner.number)} の拡大画像`;
    dialogCount.textContent = `BANNER ${prettyNumber(banner.number)} / 70`;
    if (motionOK && dialog.open) {
      dialogImage.classList.remove('is-swapping');
      void dialogImage.offsetWidth;
      dialogImage.classList.add('is-swapping');
    }
  };
  const moveDialog = delta => {
    activeIndex = (activeIndex + delta + lightboxGroup.length) % lightboxGroup.length;
    updateDialog();
  };
  const showDialog = index => {
    if (!dialog || typeof dialog.showModal !== 'function') return;
    activeIndex = index;
    lastFocus = document.activeElement;
    updateDialog();
    dialog.showModal();
    document.body.classList.add('dialog-open');
    dialogClose.focus();
  };
  if (dialog) {
    dialogClose.addEventListener('click', () => dialog.close());
    document.getElementById('dialogPrev').addEventListener('click', () => moveDialog(-1));
    document.getElementById('dialogNext').addEventListener('click', () => moveDialog(1));
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); lastFocus?.focus(); });
    dialog.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveDialog(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveDialog(1); }
    });
  }
  // keepShown: number of leading items that were already visible and should not replay their entrance.
  const renderGallery = (keepShown = 0) => {
    lightboxGroup = filtered();
    const shown = lightboxGroup.slice(0, limit);
    const fragment = document.createDocumentFragment();
    const fresh = [];
    shown.forEach((banner, index) => {
      const btn = document.createElement('button');
      btn.className = 'gallery-item reveal reveal-tile';
      btn.type = 'button';
      btn.setAttribute('aria-label', `デザイン ${prettyNumber(banner.number)} を拡大する`);
      const img = document.createElement('img');
      img.src = imgPath(banner.number);
      img.alt = `バナー見本 No. ${prettyNumber(banner.number)}`;
      img.width = 512;
      img.height = 512;
      img.loading = index < 6 ? 'eager' : 'lazy';
      img.decoding = 'async';
      const overlay = document.createElement('span');
      overlay.className = 'gallery-item-overlay';
      overlay.innerHTML = `<span>NO. ${prettyNumber(banner.number)}</span><span class="gallery-zoom" aria-hidden="true">↗</span>`;
      btn.append(img, overlay);
      btn.addEventListener('click', () => showDialog(index));
      if (index < keepShown) showReveal(btn, 0, true);
      else fresh.push(btn);
      fragment.append(btn);
    });
    galleryGrid.replaceChildren(fragment);
    observeReveals(fresh);
    galleryResult.textContent = `${shown.length} / ${lightboxGroup.length} DESIGNS`;
    const left = Math.max(0, lightboxGroup.length - shown.length);
    moreWrap.hidden = left === 0;
    moreButton.innerHTML = `さらにデザインを見る <span>（残り${left}種類）↓</span>`;
  };
  if (galleryGrid) {
    renderGallery();
    filtersWrap.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
      currentCategory = btn.dataset.filter;
      limit = 24;
      filtersWrap.querySelectorAll('[data-filter]').forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderGallery();
    }));
    moreButton.addEventListener('click', () => {
      const existing = Math.min(limit, filtered().length);
      limit += 24;
      renderGallery(existing);
      const nextCard = galleryGrid.querySelectorAll('.gallery-item')[existing];
      nextCard?.focus({ preventScroll: true });
      nextCard?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  document.querySelectorAll('.comparison-range').forEach(input => {
    const parent = input.closest('.comparison');
    input.addEventListener('input', () => parent.style.setProperty('--pos', `${input.value}%`));
  });
  const demoVideo = document.getElementById('demoVideo');
  const demoMuteToggle = document.getElementById('demoMuteToggle');
  if (demoVideo && demoMuteToggle) {
    demoVideo.muted = true;
    const updateMuteToggle = () => {
      const soundOn = !demoVideo.muted && demoVideo.volume > 0;
      demoMuteToggle.textContent = soundOn ? '音をオフにする' : '音をオンにする';
      demoMuteToggle.setAttribute('aria-pressed', String(soundOn));
    };
    demoMuteToggle.addEventListener('click', () => {
      if (!demoVideo.muted && demoVideo.volume > 0) demoVideo.muted = true;
      else {
        if (demoVideo.volume === 0) demoVideo.volume = 1;
        demoVideo.muted = false;
      }
      updateMuteToggle();
    });
    demoVideo.addEventListener('volumechange', updateMuteToggle);
    updateMuteToggle();

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const startVideo = () => { demoVideo.play().catch(() => {}); };
      if ('IntersectionObserver' in window) {
        const videoObserver = new IntersectionObserver(entries => {
          if (!entries[0].isIntersecting) return;
          videoObserver.disconnect();
          startVideo();
        }, { threshold: 0.5 });
        videoObserver.observe(demoVideo);
      } else startVideo();
    }
  }
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    const updateScroll = () => backToTop.classList.toggle('is-visible', window.scrollY > 1000);
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
  observeReveals(document.querySelectorAll('.reveal:not(.gallery-item)'));

  // ---- Motion: hero intro + parallax ----
  const hero = document.querySelector('.hero');
  if (motionOK && hero) {
    const heroTitle = hero.querySelector('h1');
    if (heroTitle) splitLines(heroTitle);
    const tiles = [...hero.querySelectorAll('.hero-tile')];
    tiles.forEach((tile, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      tile.style.setProperty('--i', row + col + col * .2);
    });
    // Start the tile wave once the above-the-fold images are decoded (or after a short timeout).
    const eagerLoads = tiles.filter(tile => tile.loading !== 'lazy').map(tile => tile.complete
      ? Promise.resolve()
      : new Promise(resolve => {
        tile.addEventListener('load', resolve, { once: true });
        tile.addEventListener('error', resolve, { once: true });
      }));
    Promise.race([Promise.all(eagerLoads), new Promise(resolve => setTimeout(resolve, 1200))])
      .then(() => requestAnimationFrame(() => hero.classList.add('is-ready')));

    let heroHeight = hero.offsetHeight;
    let heroInView = true;
    let frame = 0;
    const pointer = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const render = () => {
      frame = 0;
      current.x += (pointer.x - current.x) * .08;
      current.y += (pointer.y - current.y) * .08;
      hero.style.setProperty('--px', current.x.toFixed(4));
      hero.style.setProperty('--py', current.y.toFixed(4));
      hero.style.setProperty('--hero-scroll', Math.min(1, Math.max(0, window.scrollY / heroHeight)).toFixed(4));
      if (heroInView && (Math.abs(pointer.x - current.x) > .001 || Math.abs(pointer.y - current.y) > .001)) frame = requestAnimationFrame(render);
    };
    const requestRender = () => { if (!frame && heroInView) frame = requestAnimationFrame(render); };
    new IntersectionObserver(([entry]) => {
      heroInView = entry.isIntersecting;
      if (heroInView) requestRender();
    }).observe(hero);
    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', () => { heroHeight = hero.offsetHeight; requestRender(); }, { passive: true });
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hero.addEventListener('pointermove', e => {
        const rect = hero.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width - .5) * 2;
        pointer.y = ((e.clientY - rect.top) / rect.height - .5) * 2;
        requestRender();
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; requestRender(); });
    }
    requestRender();
  }
})();
