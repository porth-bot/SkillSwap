/**
 * SkillSwap: Student Talent Exchange Platform
 * Main JavaScript File
 * 
 * Client-side interactions, form validation, and UI enhancements
 */

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initUserMenu();
    initMobileNav();
    initAlerts();
    initModals();
    initForms();
    initTabs();
    initTooltips();
    initDropdowns();
    initScrollEffects();
    initSkillTags();
    initRatingInputs();
    initCharacterCounters();
    initConfirmDialogs();
    initSearch();
    initDatePickers();
    initPasswordToggle();
});

// =============================================================================
// NAVBAR
// =============================================================================

function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Add shadow on scroll
        if (currentScrollY > 10) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScrollY = currentScrollY;
    }, { passive: true });
}

// =============================================================================
// USER MENU
// =============================================================================

function initUserMenu() {
    const userMenu = document.querySelector('.user-menu');
    if (!userMenu) return;

    const trigger = userMenu.querySelector('.user-menu-trigger');
    
    trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target)) {
            userMenu.classList.remove('open');
        }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            userMenu.classList.remove('open');
        }
    });
}

// =============================================================================
// MOBILE NAVIGATION
// =============================================================================

function initMobileNav() {
    const toggle = document.querySelector('.navbar-toggle');
    const nav = document.querySelector('.navbar-nav');
    
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
        
        // Update icon
        const icon = toggle.querySelector('i');
        if (icon) {
            icon.className = nav.classList.contains('open') 
                ? 'fas fa-times' 
                : 'fas fa-bars';
        }
    });

    // Close nav when clicking a link
    nav.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            const icon = toggle.querySelector('i');
            if (icon) icon.className = 'fas fa-bars';
        });
    });
}

// =============================================================================
// ALERTS
// =============================================================================

function initAlerts() {
    document.querySelectorAll('.alert').forEach(alert => {
        const closeBtn = alert.querySelector('.alert-close');
        
        closeBtn?.addEventListener('click', () => {
            dismissAlert(alert);
        });

        // Auto-dismiss after 5 seconds for success/info alerts
        if (alert.classList.contains('alert-success') || alert.classList.contains('alert-info')) {
            setTimeout(() => dismissAlert(alert), 5000);
        }
    });
}

function dismissAlert(alert) {
    alert.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => alert.remove(), 300);
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }
`;
document.head.appendChild(style);

// Toast notification function
window.showToast = function(message, type = 'info', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button class="toast-close" aria-label="Dismiss">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => dismissToast(toast));

    setTimeout(() => dismissToast(toast), duration);
};

function dismissToast(toast) {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
}

// Add toastOut animation
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes toastOut {
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(toastStyle);

// =============================================================================
// MODALS
// =============================================================================

function initModals() {
    // Open modal triggers
    document.querySelectorAll('[data-modal-target]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = trigger.getAttribute('data-modal-target');
            openModal(modalId);
        });
    });

    // Close modal triggers
    document.querySelectorAll('[data-modal-close]').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal-overlay');
            if (modal) closeModal(modal);
        });
    });

    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay);
            }
        });
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal-overlay.open');
            if (openModal) closeModal(openModal);
        }
    });
}

window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        
        // Focus first focusable element
        const focusable = modal.querySelector('input, button, textarea, select, a[href]');
        focusable?.focus();
    }
};

window.closeModal = function(modal) {
    if (typeof modal === 'string') {
        modal = document.getElementById(modal);
    }
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
};

// =============================================================================
// FORMS
// =============================================================================

function initForms() {
    // Client-side validation
    document.querySelectorAll('form[data-validate]').forEach(form => {
        form.addEventListener('submit', (e) => {
            if (!validateForm(form)) {
                e.preventDefault();
            }
        });

        // Real-time validation
        form.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('blur', () => validateInput(input));
            input.addEventListener('input', () => {
                if (input.classList.contains('is-invalid')) {
                    validateInput(input);
                }
            });
        });
    });

    // Prevent double submit
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span class="spinner"></span> Processing...`;
                
                // Re-enable after 10 seconds (safety net)
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = submitBtn.getAttribute('data-original-text') || 'Submit';
                }, 10000);
            }
        });

        // Store original button text
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.setAttribute('data-original-text', submitBtn.innerHTML);
        }
    });
}

function validateForm(form) {
    let isValid = true;
    form.querySelectorAll('[required], [data-validate]').forEach(input => {
        if (!validateInput(input)) {
            isValid = false;
        }
    });
    return isValid;
}

function validateInput(input) {
    const value = input.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (input.required && !value) {
        isValid = false;
        errorMessage = 'This field is required';
    }

    // Email validation
    if (isValid && input.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
    }

    // Password validation
    if (isValid && input.getAttribute('data-validate') === 'password' && value) {
        if (value.length < 8) {
            isValid = false;
            errorMessage = 'Password must be at least 8 characters';
        } else if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
            isValid = false;
            errorMessage = 'Password must contain uppercase, lowercase, and a number';
        }
    }

    // Password confirmation
    if (isValid && input.getAttribute('data-validate') === 'password-confirm') {
        const passwordInput = document.querySelector('input[name="password"]');
        if (passwordInput && value !== passwordInput.value) {
            isValid = false;
            errorMessage = 'Passwords do not match';
        }
    }

    // Min/Max length
    if (isValid && input.minLength > 0 && value.length < input.minLength) {
        isValid = false;
        errorMessage = `Must be at least ${input.minLength} characters`;
    }

    if (isValid && input.maxLength > 0 && value.length > input.maxLength) {
        isValid = false;
        errorMessage = `Must be no more than ${input.maxLength} characters`;
    }

    // Update UI
    const formGroup = input.closest('.form-group');
    let errorEl = formGroup?.querySelector('.form-error');

    if (!isValid) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        
        if (formGroup && errorMessage) {
            if (!errorEl) {
                errorEl = document.createElement('span');
                errorEl.className = 'form-error';
                input.parentNode.insertBefore(errorEl, input.nextSibling);
            }
            errorEl.textContent = errorMessage;
        }
    } else {
        input.classList.remove('is-invalid');
        if (value) input.classList.add('is-valid');
        errorEl?.remove();
    }

    return isValid;
}

// =============================================================================
// TABS
// =============================================================================

function initTabs() {
    document.querySelectorAll('.tabs').forEach(tabsContainer => {
        const tabs = tabsContainer.querySelectorAll('.tab');
        const tabContents = tabsContainer.parentElement.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.getAttribute('data-tab');

                // Update tabs
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetId) {
                        content.classList.add('active');
                    }
                });
            });
        });
    });
}

// =============================================================================
// TOOLTIPS
// =============================================================================

function initTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        const tooltipText = element.getAttribute('data-tooltip');
        
        element.addEventListener('mouseenter', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            tooltip.style.cssText = `
                position: fixed;
                background: var(--color-slate-900);
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 9999;
                pointer-events: none;
                animation: fadeIn 0.2s ease;
            `;
            document.body.appendChild(tooltip);

            const rect = element.getBoundingClientRect();
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
            tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;

            element._tooltip = tooltip;
        });

        element.addEventListener('mouseleave', () => {
            element._tooltip?.remove();
        });
    });
}

// =============================================================================
// DROPDOWNS
// =============================================================================

function initDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const menu = dropdown.querySelector('.dropdown-menu');

        trigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
    });

    // Close all dropdowns on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown.open').forEach(d => {
            d.classList.remove('open');
        });
    });
}

// =============================================================================
// SCROLL EFFECTS
// =============================================================================

function initScrollEffects() {
    // Fade in on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Add fade-in styles
const fadeStyle = document.createElement('style');
fadeStyle.textContent = `
    .fade-in {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .fade-in-visible {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(fadeStyle);

// =============================================================================
// SKILL TAGS
// =============================================================================

function initSkillTags() {
    document.querySelectorAll('.skill-tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tag = btn.closest('.skill-tag');
            const form = btn.closest('form');
            
            if (form) {
                // If part of a form, just remove visually and update hidden input
                tag.style.animation = 'fadeOut 0.2s ease forwards';
                setTimeout(() => tag.remove(), 200);
            }
        });
    });

    // Skill input autocomplete
    document.querySelectorAll('.skill-input').forEach(input => {
        const container = input.closest('.skill-input-container');
        const tagsList = container?.querySelector('.skills-tags-list');
        const hiddenInput = container?.querySelector('input[type="hidden"]');

        if (!tagsList) return;

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const value = input.value.trim().replace(',', '');
                if (value) {
                    addSkillTag(value, tagsList, hiddenInput);
                    input.value = '';
                }
            }
        });
    });
}

function addSkillTag(skill, tagsList, hiddenInput) {
    const tag = document.createElement('span');
    tag.className = 'skill-tag';
    tag.innerHTML = `
        ${skill}
        <button type="button" class="skill-tag-remove" aria-label="Remove ${skill}">
            <i class="fas fa-times"></i>
        </button>
    `;

    tag.querySelector('.skill-tag-remove').addEventListener('click', () => {
        tag.remove();
        updateHiddenSkillsInput(tagsList, hiddenInput);
    });

    tagsList.appendChild(tag);
    updateHiddenSkillsInput(tagsList, hiddenInput);
}

function updateHiddenSkillsInput(tagsList, hiddenInput) {
    if (!hiddenInput) return;
    const skills = Array.from(tagsList.querySelectorAll('.skill-tag'))
        .map(tag => tag.textContent.trim());
    hiddenInput.value = skills.join(',');
}

// =============================================================================
// RATING INPUTS
// =============================================================================

function initRatingInputs() {
    document.querySelectorAll('.rating-input').forEach(container => {
        const inputs = container.querySelectorAll('input[type="radio"]');
        const labels = container.querySelectorAll('label');

        labels.forEach((label, index) => {
            label.addEventListener('mouseenter', () => {
                labels.forEach((l, i) => {
                    l.style.color = i <= index ? 'var(--color-warning)' : 'var(--color-slate-300)';
                });
            });

            label.addEventListener('mouseleave', () => {
                const checkedIndex = Array.from(inputs).findIndex(input => input.checked);
                labels.forEach((l, i) => {
                    l.style.color = i <= checkedIndex ? 'var(--color-warning)' : 'var(--color-slate-300)';
                });
            });
        });
    });
}

// =============================================================================
// CHARACTER COUNTERS
// =============================================================================

function initCharacterCounters() {
    document.querySelectorAll('textarea[maxlength], input[maxlength]').forEach(input => {
        const maxLength = input.getAttribute('maxlength');
        if (!maxLength) return;

        const counter = document.createElement('div');
        counter.className = 'character-counter';
        counter.style.cssText = `
            font-size: 12px;
            color: var(--text-tertiary);
            text-align: right;
            margin-top: 4px;
        `;
        
        input.parentNode.insertBefore(counter, input.nextSibling);

        const updateCounter = () => {
            const remaining = maxLength - input.value.length;
            counter.textContent = `${input.value.length} / ${maxLength}`;
            counter.style.color = remaining < 20 ? 'var(--color-warning)' : 'var(--text-tertiary)';
            if (remaining < 0) counter.style.color = 'var(--color-error)';
        };

        input.addEventListener('input', updateCounter);
        updateCounter();
    });
}

// =============================================================================
// CONFIRM DIALOGS
// =============================================================================

function initConfirmDialogs() {
    document.querySelectorAll('[data-confirm]').forEach(element => {
        element.addEventListener('click', (e) => {
            const message = element.getAttribute('data-confirm');
            if (!confirm(message)) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    });
}

// Custom confirm dialog
window.showConfirm = function(options) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay open';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 class="modal-title">${options.title || 'Confirm'}</h3>
                </div>
                <div class="modal-body">
                    <p>${options.message || 'Are you sure?'}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-action="cancel">
                        ${options.cancelText || 'Cancel'}
                    </button>
                    <button class="btn ${options.danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">
                        ${options.confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
            overlay.remove();
            document.body.style.overflow = '';
            resolve(false);
        });

        overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
            overlay.remove();
            document.body.style.overflow = '';
            resolve(true);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                document.body.style.overflow = '';
                resolve(false);
            }
        });
    });
};

// =============================================================================
// SEARCH
// =============================================================================

function initSearch() {
    const searchForms = document.querySelectorAll('.search-form');
    
    searchForms.forEach(form => {
        const input = form.querySelector('input[type="search"]');
        const resultsContainer = form.querySelector('.search-results');
        
        if (!input) return;

        let debounceTimer;
        
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = input.value.trim();
                if (query.length >= 2 && resultsContainer) {
                    // Implement live search here if needed
                    // fetch(`/api/search?q=${encodeURIComponent(query)}`)
                }
            }, 300);
        });
    });
}

// =============================================================================
// DATE PICKERS
// =============================================================================

function initDatePickers() {
    // Set min date to today for future-only date inputs
    document.querySelectorAll('input[type="datetime-local"][data-future-only]').forEach(input => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        input.min = now.toISOString().slice(0, 16);
    });

    // Format display dates
    document.querySelectorAll('[data-date]').forEach(element => {
        const date = new Date(element.getAttribute('data-date'));
        const format = element.getAttribute('data-format') || 'medium';
        
        const options = {
            short: { month: 'short', day: 'numeric' },
            medium: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
            time: { hour: 'numeric', minute: '2-digit' },
            datetime: { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
        };

        element.textContent = date.toLocaleDateString('en-US', options[format] || options.medium);
    });

    // Relative time
    document.querySelectorAll('[data-relative-time]').forEach(element => {
        const date = new Date(element.getAttribute('data-relative-time'));
        element.textContent = getRelativeTime(date);
    });
}

function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// =============================================================================
// PASSWORD TOGGLE
// =============================================================================

function initPasswordToggle() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const input = toggle.previousElementSibling;
            if (!input) return;

            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;

            const icon = toggle.querySelector('i');
            if (icon) {
                icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            }
        });
    });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Copy to clipboard
window.copyToClipboard = async function(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        showToast('Failed to copy', 'error');
    }
};

// Export functions for global use
window.validateForm = validateForm;
window.validateInput = validateInput;
window.getRelativeTime = getRelativeTime;
window.formatNumber = formatNumber;
window.debounce = debounce;
window.throttle = throttle;
