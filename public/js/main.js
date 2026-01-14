// main js file for skillswap

document.addEventListener('DOMContentLoaded', function() {
    initNavbar();
    initMobileMenu();
    initAlerts();
    initForms();
    initModals();
    initTabs();
    initDropdowns();
    initDarkMode();
    initRatings();
    initSearch();
    initCharts();
});

// navbar scroll effect
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 10) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// mobile hamburger menu
function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav-links');
    
    if (!toggle || !nav) return;
    
    toggle.addEventListener('click', function() {
        nav.classList.toggle('open');
        toggle.classList.toggle('active');
    });
}

// auto-dismiss alerts after 5 seconds
function initAlerts() {
    const alerts = document.querySelectorAll('.alert');
    
    alerts.forEach(function(alert) {
        // close button
        const close = alert.querySelector('.alert-close');
        if (close) {
            close.addEventListener('click', function() {
                alert.remove();
            });
        }
        
        // auto dismiss success/info alerts
        if (alert.classList.contains('alert-success') || alert.classList.contains('alert-info')) {
            setTimeout(function() {
                alert.style.opacity = '0';
                setTimeout(function() { alert.remove(); }, 300);
            }, 5000);
        }
    });
}

// form validation
function initForms() {
    const forms = document.querySelectorAll('form[data-validate]');
    
    forms.forEach(function(form) {
        form.addEventListener('submit', function(e) {
            let valid = true;
            
            // check required fields
            const required = form.querySelectorAll('[required]');
            required.forEach(function(field) {
                if (!field.value.trim()) {
                    valid = false;
                    field.classList.add('error');
                    showFieldError(field, 'This field is required');
                } else {
                    field.classList.remove('error');
                    hideFieldError(field);
                }
            });
            
            // check email fields
            const emails = form.querySelectorAll('input[type="email"]');
            emails.forEach(function(field) {
                if (field.value && !isValidEmail(field.value)) {
                    valid = false;
                    field.classList.add('error');
                    showFieldError(field, 'Please enter a valid email');
                }
            });
            
            // check password match
            const password = form.querySelector('input[name="password"]');
            const confirm = form.querySelector('input[name="confirmPassword"]');
            if (password && confirm && password.value !== confirm.value) {
                valid = false;
                confirm.classList.add('error');
                showFieldError(confirm, 'Passwords do not match');
            }
            
            if (!valid) {
                e.preventDefault();
            }
        });
    });
    
    // real-time validation
    document.querySelectorAll('input, textarea').forEach(function(field) {
        field.addEventListener('blur', function() {
            if (field.required && !field.value.trim()) {
                field.classList.add('error');
            } else {
                field.classList.remove('error');
            }
        });
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(field, message) {
    let error = field.parentNode.querySelector('.field-error');
    if (!error) {
        error = document.createElement('span');
        error.className = 'field-error';
        field.parentNode.appendChild(error);
    }
    error.textContent = message;
}

function hideFieldError(field) {
    const error = field.parentNode.querySelector('.field-error');
    if (error) error.remove();
}

// modal dialogs
function initModals() {
    // open modal
    document.querySelectorAll('[data-modal]').forEach(function(trigger) {
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('open');
                document.body.style.overflow = 'hidden';
            }
        });
    });
    
    // close modal
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(function(el) {
        el.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    });
    
    // close on escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal.open');
            if (modal) {
                modal.classList.remove('open');
                document.body.style.overflow = '';
            }
        }
    });
}

// tabs
function initTabs() {
    document.querySelectorAll('.tabs').forEach(function(tabGroup) {
        const buttons = tabGroup.querySelectorAll('.tab-btn');
        const panels = tabGroup.querySelectorAll('.tab-panel');
        
        buttons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const target = this.getAttribute('data-tab');
                
                // update buttons
                buttons.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                
                // update panels
                panels.forEach(function(p) {
                    if (p.id === target) {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });
            });
        });
    });
}

// dropdowns
function initDropdowns() {
    document.querySelectorAll('.dropdown').forEach(function(dropdown) {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        if (!toggle || !menu) return;
        
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
    });
    
    // close dropdowns when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown.open').forEach(function(d) {
            d.classList.remove('open');
        });
    });
}

// dark mode toggle
function initDarkMode() {
    const toggle = document.querySelector('.dark-mode-toggle');
    
    // check saved preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.documentElement.classList.add('dark');
    }
    
    if (toggle) {
        toggle.addEventListener('click', function() {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // update icon
            const icon = this.querySelector('span');
            if (icon) {
                icon.textContent = isDark ? '☀️' : '🌙';
            }
        });
    }
}

// star ratings
function initRatings() {
    document.querySelectorAll('.rating-input').forEach(function(container) {
        const stars = container.querySelectorAll('.star');
        const input = container.querySelector('input[type="hidden"]');
        
        stars.forEach(function(star, index) {
            star.addEventListener('click', function() {
                const value = index + 1;
                if (input) input.value = value;
                
                stars.forEach(function(s, i) {
                    s.classList.toggle('active', i < value);
                });
            });
            
            star.addEventListener('mouseenter', function() {
                stars.forEach(function(s, i) {
                    s.classList.toggle('hover', i <= index);
                });
            });
        });
        
        container.addEventListener('mouseleave', function() {
            stars.forEach(function(s) { s.classList.remove('hover'); });
        });
    });
}

// search with debounce
function initSearch() {
    const searchInputs = document.querySelectorAll('.search-input');
    
    searchInputs.forEach(function(input) {
        let timeout;
        
        input.addEventListener('input', function() {
            clearTimeout(timeout);
            const query = this.value;
            const resultsContainer = document.querySelector(this.dataset.results);
            
            if (!resultsContainer) return;
            
            if (query.length < 2) {
                resultsContainer.innerHTML = '';
                return;
            }
            
            // debounce - wait 300ms after typing stops
            timeout = setTimeout(function() {
                // show loading
                resultsContainer.innerHTML = '<div class="loading">Searching...</div>';
                
                // fetch results
                fetch('/api/search?q=' + encodeURIComponent(query))
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (data.results && data.results.length > 0) {
                            resultsContainer.innerHTML = data.results.map(function(r) {
                                return '<a href="' + r.url + '" class="search-result">' + r.name + '</a>';
                            }).join('');
                        } else {
                            resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
                        }
                    })
                    .catch(function() {
                        resultsContainer.innerHTML = '<div class="error">Search failed</div>';
                    });
            }, 300);
        });
    });
}

// charts for admin dashboard (using chart.js if available)
function initCharts() {
    // session chart
    const sessionChart = document.getElementById('sessionChart');
    if (sessionChart && typeof Chart !== 'undefined') {
        const ctx = sessionChart.getContext('2d');
        const data = JSON.parse(sessionChart.dataset.stats || '{}');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Sessions',
                    data: data.values || [5, 8, 12, 7, 15, 10, 6],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // skills chart
    const skillsChart = document.getElementById('skillsChart');
    if (skillsChart && typeof Chart !== 'undefined') {
        const ctx = skillsChart.getContext('2d');
        const data = JSON.parse(skillsChart.dataset.stats || '{}');
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels || ['Math', 'Science', 'English', 'Languages', 'CS'],
                datasets: [{
                    data: data.values || [30, 25, 20, 15, 10],
                    backgroundColor: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

// utility: confirm before destructive actions
document.querySelectorAll('[data-confirm]').forEach(function(el) {
    el.addEventListener('click', function(e) {
        const message = this.dataset.confirm || 'Are you sure?';
        if (!confirm(message)) {
            e.preventDefault();
        }
    });
});

// utility: copy to clipboard
document.querySelectorAll('[data-copy]').forEach(function(el) {
    el.addEventListener('click', function() {
        const text = this.dataset.copy;
        navigator.clipboard.writeText(text).then(function() {
            el.textContent = 'Copied!';
            setTimeout(function() { el.textContent = 'Copy'; }, 2000);
        });
    });
});

// utility: character counter for textareas
document.querySelectorAll('textarea[maxlength]').forEach(function(textarea) {
    const max = textarea.getAttribute('maxlength');
    const counter = document.createElement('span');
    counter.className = 'char-counter';
    counter.textContent = '0 / ' + max;
    textarea.parentNode.appendChild(counter);
    
    textarea.addEventListener('input', function() {
        counter.textContent = this.value.length + ' / ' + max;
        if (this.value.length > max * 0.9) {
            counter.classList.add('warning');
        } else {
            counter.classList.remove('warning');
        }
    });
});

// utility: password visibility toggle
document.querySelectorAll('.password-toggle').forEach(function(toggle) {
    toggle.addEventListener('click', function() {
        const input = this.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            this.textContent = '🙈';
        } else {
            input.type = 'password';
            this.textContent = '👁️';
        }
    });
});

// print function for reports
function printReport() {
    window.print();
}

// export table to CSV
function exportToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(function(row) {
        const cols = row.querySelectorAll('td, th');
        const rowData = [];
        cols.forEach(function(col) {
            // escape quotes and wrap in quotes
            let text = col.textContent.replace(/"/g, '""');
            rowData.push('"' + text + '"');
        });
        csv.push(rowData.join(','));
    });
    
    // download
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ctrl+k for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const search = document.querySelector('.search-input');
        if (search) search.focus();
    }
});

console.log('skillswap loaded');
