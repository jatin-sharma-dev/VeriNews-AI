const API_BASE = 'http://127.0.0.1:5001';

document.addEventListener('DOMContentLoaded', () => {
    // 1. View Switching Logic
    const landingView = document.getElementById('landingView');
    const dashboardView = document.getElementById('dashboardView');
    const brandLogo = document.getElementById('brandLogo');
    const heroScanBtn = document.getElementById('heroScanBtn');
    const finalCtaBtn = document.getElementById('finalCtaBtn');

    function showDashboard() {
        if (landingView && dashboardView) {
            landingView.classList.add('hidden');
            dashboardView.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function showLanding() {
        if (landingView && dashboardView) {
            dashboardView.classList.add('hidden');
            landingView.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    if (heroScanBtn) heroScanBtn.addEventListener('click', showDashboard);
    if (finalCtaBtn) finalCtaBtn.addEventListener('click', showDashboard);
    if (brandLogo) {
        brandLogo.addEventListener('click', (e) => {
            e.preventDefault();
            showLanding();
        });
    }

    // 2. Live backend status indicator (masthead)
    const liveDot = document.getElementById('liveDot');
    const liveLabel = document.getElementById('liveLabel');

    async function checkHealth() {
        try {
            const res = await fetch(`${API_BASE}/health`);
            if (!res.ok) throw new Error();
            if (liveDot) liveDot.className = 'w-1.5 h-1.5 rounded-full bg-verified animate-pulse-glow';
            if (liveLabel) liveLabel.textContent = 'DESK ONLINE · REAL-TIME SCAN';
        } catch {
            if (liveDot) liveDot.className = 'w-1.5 h-1.5 rounded-full bg-flagged';
            if (liveLabel) liveLabel.textContent = 'BACKEND UNREACHABLE';
        }
    }
    checkHealth();

    // 3. DOM Elements — scanner
    const senderInput = document.getElementById('senderInput');
    const subjectInput = document.getElementById('subjectInput');
    const bodyInput = document.getElementById('bodyInput');
    const scanBtn = document.getElementById('scanBtn');
    const resetBtn = document.getElementById('resetBtn');
    const sampleSuspiciousBtn = document.getElementById('sampleSuspiciousBtn');
    const sampleLegitBtn = document.getElementById('sampleLegitBtn');

    const emptyState = document.getElementById('emptyState');
    const resultContainer = document.getElementById('resultContainer');

    const riskScore = document.getElementById('riskScore');
    const verdictStatus = document.getElementById('verdictStatus');
    const scoreCircle = document.getElementById('scoreCircle');

    const resDomain = document.getElementById('resDomain');
    const resConfidence = document.getElementById('resConfidence');
    const explanationList = document.getElementById('explanationList');
    const flaggedList = document.getElementById('flaggedList');
    const metaStats = document.getElementById('metaStats');

    const SCAN_BTN_DEFAULT = `<i class="fa-solid fa-stamp text-base"></i> <span class="font-mono">Run scan</span>`;
    const SCAN_BTN_LOADING = `<span class="scan-loader-ring"></span> <span class="font-mono">Scanning...</span>`;

    // Security helper — escape HTML to prevent XSS from email content
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 4. Sample loaders
    if (sampleSuspiciousBtn) {
        sampleSuspiciousBtn.addEventListener('click', () => {
            senderInput.value = 'security@random-mailer.xyz';
            subjectInput.value = 'URGENT: Your account will be suspended!!!';
            bodyInput.value = 'Dear Customer, click here to verify your account immediately or it will be suspended. Visit http://secure-verify-now.tk to confirm your password.';
        });
    }
    if (sampleLegitBtn) {
        sampleLegitBtn.addEventListener('click', () => {
            senderInput.value = 'sarah@company.com';
            subjectInput.value = 'Meeting notes from yesterday';
            bodyInput.value = 'Hi team, attaching the notes from our sync yesterday. Let me know if I missed anything. Talk soon.';
        });
    }

    // 5. Reset
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            senderInput.value = '';
            subjectInput.value = '';
            bodyInput.value = '';
            if (resultContainer) resultContainer.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
        });
    }

    // 6. Build the stamp ring SVG (score circle + rotating mono label ring)
    function buildStampSvg() {
        return `
            <svg class="stamp-svg" viewBox="0 0 176 176">
                <defs>
                    <path id="ringPath" d="M 88,88 m -70,0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0" />
                </defs>
                <circle class="stamp-ring-outer" cx="88" cy="88" r="82" />
                <circle class="stamp-ring-inner" cx="88" cy="88" r="70" />
                <text class="stamp-ring-text">
                    <textPath href="#ringPath" startOffset="0%">
                        VERIMAIL &#8226; AI SCAN &#8226; VERIMAIL &#8226; AI SCAN &#8226;
                    </textPath>
                </text>
            </svg>
        `;
    }
    if (scoreCircle) scoreCircle.insertAdjacentHTML('afterbegin', buildStampSvg());

    // 7. Scan action
    if (scanBtn) {
        scanBtn.addEventListener('click', async () => {
            const body = bodyInput.value.trim();
            if (!body) {
                alert('Paste the email body first!');
                bodyInput.focus();
                return;
            }

            scanBtn.disabled = true;
            scanBtn.innerHTML = SCAN_BTN_LOADING;

            if (emptyState) emptyState.classList.add('hidden');
            if (resultContainer) resultContainer.classList.add('hidden');

            try {
                const response = await fetch(`${API_BASE}/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sender: senderInput.value.trim(),
                        subject: subjectInput.value.trim(),
                        body: body
                    })
                });

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`Server returned status ${response.status} (non-JSON response). Check the backend terminal.`);
                }

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Scan request failed.');

                const score = data.rating_score;
                const isPhish = data.is_phishing;

                // Verdict stamp
                if (riskScore) riskScore.textContent = score;
                if (verdictStatus) {
                    verdictStatus.textContent = isPhish ? 'Likely Phishing' : 'Looks Legitimate';
                    verdictStatus.className = `mt-6 font-mono px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] border ${
                        isPhish
                            ? 'bg-flagged/10 text-flagged border-flagged/30'
                            : 'bg-verified/10 text-verified border-verified/30'
                    }`;
                }
                if (scoreCircle) {
                    scoreCircle.className = `stamp-wrap ${isPhish ? 'text-flagged' : 'text-verified'}`;
                    scoreCircle.insertAdjacentHTML('afterbegin', buildStampSvg());
                    scoreCircle.classList.remove('stamp-thud');
                    void scoreCircle.offsetWidth;
                    scoreCircle.classList.add('stamp-thud');
                }

                // Sender + confidence
                if (resDomain) resDomain.textContent = escapeHtml(data.sender_domain || 'unknown');
                if (resConfidence) resConfidence.textContent = `${data.ml_confidence}%`;

                // Meta stats line
                const wordCount = body.split(/\s+/).filter(Boolean).length;
                if (metaStats) {
                    metaStats.textContent = `${wordCount} words scanned \u2022 model confidence ${data.ml_confidence}%`;
                }

                // Field notes — derived from flagged_reasons
                const reasonsText = data.flagged_reasons.join(' | ').toLowerCase();
                const hasUrgency = reasonsText.includes('urgency');
                const hasBait = reasonsText.includes('credential') || reasonsText.includes('bait');
                const hasSenderRisk = reasonsText.includes('webmail') || reasonsText.includes('tld') || reasonsText.includes('domain');

                if (explanationList) {
                    explanationList.innerHTML = `
                        <div class="flex items-start space-x-4 p-4 rounded-xl bg-white/[0.02]">
                            <div class="mt-0.5 ${hasUrgency ? 'text-flagged' : 'text-verified'}">
                                <i class="fa-solid fa-bolt text-lg"></i>
                            </div>
                            <div>
                                <span class="block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-mist/35 mb-1">Urgency &amp; Pressure</span>
                                <span class="text-mist/80">${
                                    hasUrgency
                                        ? 'Uses urgent, high-pressure language designed to make you act before thinking.'
                                        : 'No urgency or pressure tactics detected in the wording.'
                                }</span>
                            </div>
                        </div>

                        <div class="flex items-start space-x-4 p-4 rounded-xl bg-white/[0.02]">
                            <div class="mt-0.5 ${hasBait ? 'text-flagged' : 'text-verified'}">
                                <i class="fa-solid fa-key text-lg"></i>
                            </div>
                            <div>
                                <span class="block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-mist/35 mb-1">Credential &amp; Financial Bait</span>
                                <span class="text-mist/80">${
                                    hasBait
                                        ? 'Asks for passwords, account verification, or payment details \u2014 a classic phishing hook.'
                                        : 'No requests for credentials, payments, or account verification found.'
                                }</span>
                            </div>
                        </div>

                        <div class="flex items-start space-x-4 p-4 rounded-xl bg-white/[0.02]">
                            <div class="mt-0.5 ${hasSenderRisk ? 'text-flagged' : 'text-verified'}">
                                <i class="fa-solid fa-at text-lg"></i>
                            </div>
                            <div>
                                <span class="block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-mist/35 mb-1">Sender Trust</span>
                                <span class="text-mist/80">${
                                    hasSenderRisk
                                        ? `Sent from <span class="text-flagged">${escapeHtml(data.sender_domain)}</span> \u2014 a pattern often seen in phishing campaigns.`
                                        : 'Sender domain shows no red flags on its own.'
                                }</span>
                            </div>
                        </div>
                    `;
                }

                // Flagged patterns list
                if (flaggedList) {
                    flaggedList.innerHTML = data.flagged_reasons.length
                        ? data.flagged_reasons.map(r => `
                            <div class="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-flagged/[0.15]">
                                <i class="fa-solid fa-triangle-exclamation text-flagged text-sm"></i>
                                <span class="text-sm text-mist/80">${escapeHtml(r)}</span>
                            </div>
                        `).join('')
                        : `<div class="p-4 rounded-xl bg-white/[0.02] border border-verified/[0.15] flex items-center gap-3">
                             <i class="fa-solid fa-circle-check text-verified text-sm"></i>
                             <span class="text-sm text-mist/80">No suspicious patterns flagged.</span>
                           </div>`;
                }

                if (resultContainer) resultContainer.classList.remove('hidden');

            } catch (err) {
                alert(err.message);
                if (emptyState) emptyState.classList.remove('hidden');
            } finally {
                scanBtn.disabled = false;
                scanBtn.innerHTML = SCAN_BTN_DEFAULT;
            }
        });
    }
});
