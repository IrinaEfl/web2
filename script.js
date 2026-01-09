// NewsPortal - Основное приложение
class NewsPortal {
    constructor() {
        this.config = {
            apiUrl: '/api/news',
            pageSize: 12,
            debounceTime: 500
        };
        
        this.state = {
            articles: [],
            totalResults: 0,
            currentPage: 1,
            totalPages: 1,
            loading: false,
            searchQuery: '',
            category: 'all',
            dateFilter: 'all',
            viewMode: 'grid',
            apiStatus: 'loading'
        };
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadNews();
    }
    
    cacheElements() {
        this.elements = {
            // Поиск
            searchInput: document.getElementById('search-input'),
            clearSearch: document.getElementById('clear-search'),
            
            // Фильтры
            categoryFilter: document.getElementById('category-filter'),
            dateFilter: document.getElementById('date-filter'),
            refreshBtn: document.getElementById('refresh-btn'),
            
            // Контент
            newsGrid: document.getElementById('news-grid'),
            contentTitle: document.getElementById('content-title'),
            searchInfoText: document.getElementById('search-info-text'),
            resultsCount: document.getElementById('results-count'),
            
            // Состояния
            loading: document.getElementById('loading'),
            emptyState: document.getElementById('empty-state'),
            initialState: document.getElementById('initial-state'),
            
            // Пагинация
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            currentPage: document.getElementById('current-page'),
            totalPages: document.getElementById('total-pages'),
            pagination: document.getElementById('pagination'),
            
            // Вид
            gridViewBtn: document.getElementById('grid-view-btn'),
            listViewBtn: document.getElementById('list-view-btn'),
            
            // Статус
            apiStatus: document.getElementById('api-status'),
            apiStatusText: document.getElementById('api-status-text'),
            statusDot: document.querySelector('.status-dot')
        };
    }
    
    bindEvents() {
        // Поиск с debounce
        let debounceTimer;
        this.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.state.searchQuery = e.target.value;
                this.state.currentPage = 1;
                this.loadNews();
            }, this.config.debounceTime);
        });
        
        // Очистка поиска
        this.elements.clearSearch.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.state.searchQuery = '';
            this.state.currentPage = 1;
            this.loadNews();
        });
        
        // Фильтры
        this.elements.categoryFilter.addEventListener('change', (e) => {
            this.state.category = e.target.value;
            this.state.currentPage = 1;
            this.loadNews();
        });
        
        this.elements.dateFilter.addEventListener('change', (e) => {
            this.state.dateFilter = e.target.value;
            this.state.currentPage = 1;
            this.loadNews();
        });
        
        // Обновление
        this.elements.refreshBtn.addEventListener('click', () => {
            this.state.currentPage = 1;
            this.loadNews();
            this.showNotification('Новости обновлены', 'success');
        });
        
        // Пагинация
        this.elements.prevBtn.addEventListener('click', () => this.prevPage());
        this.elements.nextBtn.addEventListener('click', () => this.nextPage());
        
        // Вид
        this.elements.gridViewBtn.addEventListener('click', () => this.setViewMode('grid'));
        this.elements.listViewBtn.addEventListener('click', () => this.setViewMode('list'));
        
        // Настройки
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.showNotification('Настройки в разработке', 'info');
        });
    }
    
    async loadNews() {
        if (this.state.loading) return;
        
        this.state.loading = true;
        this.showLoading(true);
        this.hideStates();
        
        try {
            const params = new URLSearchParams({
                page: this.state.currentPage,
                size: this.config.pageSize
            });
            
            if (this.state.searchQuery) {
                params.append('q', this.state.searchQuery);
            }
            
            if (this.state.category !== 'all') {
                params.append('category', this.state.category);
            }
            
            if (this.state.dateFilter !== 'all') {
                params.append('date', this.state.dateFilter);
            }
            
            const url = `${this.config.apiUrl}?${params.toString()}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            this.handleNewsData(data);
            
        } catch (error) {
            console.error('Ошибка загрузки новостей:', error);
            this.showNotification('Ошибка загрузки новостей', 'error');
            this.showEmptyState();
        } finally {
            this.state.loading = false;
            this.showLoading(false);
        }
    }
    
    handleNewsData(data) {
        // Обновляем статус API
        this.updateApiStatus(data.source);
        
        if (data.status === 'success' && data.articles && data.articles.length > 0) {
            this.state.articles = data.articles;
            this.state.totalResults = data.totalResults;
            this.state.totalPages = Math.ceil(data.totalResults / this.config.pageSize);
            
            this.renderNews();
            this.updateUI();
            this.showNewsGrid();
            
            if (data.message) {
                this.showNotification(data.message, data.source === 'demo' ? 'warning' : 'info');
            }
        } else {
            this.showEmptyState();
        }
    }
    
    renderNews() {
        this.elements.newsGrid.innerHTML = '';
        
        this.state.articles.forEach((article, index) => {
            const articleEl = this.createArticleElement(article, index);
            this.elements.newsGrid.appendChild(articleEl);
        });
        
        // Обновляем класс для режима просмотра
        this.elements.newsGrid.className = `news-grid ${this.state.viewMode}-view`;
    }
    
    createArticleElement(article, index) {
        const articleEl = document.createElement('article');
        articleEl.className = 'news-card';
        
        // Категория
        const category = this.getArticleCategory(article);
        
        // Дата
        const date = new Date(article.publishedAt);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        // Изображение
        const imageUrl = article.urlToImage || `https://source.unsplash.com/random/600x400?${category}`;
        
        articleEl.innerHTML = `
            <div class="news-image">
                <img src="${imageUrl}" alt="${article.title}" 
                     onerror="this.onerror=null; this.src='https://source.unsplash.com/random/600x400?news'">
            </div>
            <div class="news-content">
                <span class="news-category">${this.getCategoryName(category)}</span>
                <h3 class="news-title">${article.title}</h3>
                <p class="news-description">${article.description || ''}</p>
                <div class="news-meta">
                    <span class="news-source">${article.source?.name || 'Неизвестно'}</span>
                    <span class="news-date">${formattedDate}</span>
                </div>
            </div>
        `;
        
        // Клик по статье
        if (article.url) {
            articleEl.style.cursor = 'pointer';
            articleEl.addEventListener('click', () => {
                window.open(article.url, '_blank');
            });
        }
        
        return articleEl;
    }
    
    getArticleCategory(article) {
        if (this.state.category !== 'all') return this.state.category;
        
        const text = (article.title + ' ' + article.description).toLowerCase();
        const categories = {
            'business': ['бизнес', 'финанс', 'рынок', 'экономик'],
            'technology': ['технолог', 'ии', 'компьютер', 'гаджет'],
            'sports': ['спорт', 'футбол', 'матч', 'соревнован'],
            'science': ['наук', 'исследован', 'космос', 'учен'],
            'health': ['медицин', 'здоров', 'лечен', 'врач'],
            'entertainment': ['кино', 'музык', 'шоу', 'развлечен']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }
    
    getCategoryName(category) {
        const names = {
            'business': 'Бизнес',
            'technology': 'Технологии',
            'sports': 'Спорт',
            'science': 'Наука',
            'health': 'Здоровье',
            'entertainment': 'Развлечения',
            'general': 'Общее'
        };
        
        return names[category] || 'Общее';
    }
    
    updateUI() {
        // Заголовок
        let title = 'Последние новости';
        if (this.state.searchQuery) {
            title = `Поиск: "${this.state.searchQuery}"`;
        } else if (this.state.category !== 'all') {
            title = this.getCategoryName(this.state.category);
        }
        
        this.elements.contentTitle.textContent = title;
        this.elements.searchInfoText.textContent = title;
        
        // Количество результатов
        this.elements.resultsCount.textContent = `Найдено: ${this.state.totalResults}`;
        
        // Пагинация
        this.elements.currentPage.textContent = this.state.currentPage;
        this.elements.totalPages.textContent = this.state.totalPages;
        
        // Кнопки пагинации
        this.elements.prevBtn.disabled = this.state.currentPage === 1;
        this.elements.nextBtn.disabled = this.state.currentPage >= this.state.totalPages;
        
        // Показываем/скрываем пагинацию
        this.elements.pagination.style.display = this.state.totalResults > 0 ? 'flex' : 'none';
    }
    
    updateApiStatus(source) {
        this.state.apiStatus = source === 'demo' ? 'offline' : 'online';
        
        if (this.elements.statusDot) {
            this.elements.statusDot.className = 'status-dot';
            if (this.state.apiStatus === 'offline') {
                this.elements.statusDot.classList.add('offline');
                this.elements.apiStatusText.textContent = 'Демо-режим';
            } else {
                this.elements.apiStatusText.textContent = 'API активен';
            }
        }
    }
    
    prevPage() {
        if (this.state.currentPage > 1) {
            this.state.currentPage--;
            this.loadNews();
        }
    }
    
    nextPage() {
        if (this.state.currentPage < this.state.totalPages) {
            this.state.currentPage++;
            this.loadNews();
        }
    }
    
    setViewMode(mode) {
        this.state.viewMode = mode;
        
        // Обновляем кнопки
        this.elements.gridViewBtn.classList.toggle('active', mode === 'grid');
        this.elements.listViewBtn.classList.toggle('active', mode === 'list');
        
        // Обновляем сетку
        this.elements.newsGrid.className = `news-grid ${mode}-view`;
    }
    
    showLoading(show) {
        this.elements.loading.style.display = show ? 'flex' : 'none';
    }
    
    hideStates() {
        this.elements.emptyState.style.display = 'none';
        this.elements.initialState.style.display = 'none';
        this.elements.newsGrid.style.display = 'none';
    }
    
    showNewsGrid() {
        this.elements.newsGrid.style.display = 'grid';
        this.elements.emptyState.style.display = 'none';
        this.elements.initialState.style.display = 'none';
    }
    
    showEmptyState() {
        this.elements.newsGrid.style.display = 'none';
        this.elements.emptyState.style.display = 'block';
        this.elements.initialState.style.display = 'none';
        this.elements.pagination.style.display = 'none';
    }
    
    showInitialState() {
        this.elements.newsGrid.style.display = 'none';
        this.elements.emptyState.style.display = 'none';
        this.elements.initialState.style.display = 'block';
        this.elements.pagination.style.display = 'none';
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-area');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="close-notification" style="margin-left: auto; background: none; border: none; cursor: pointer; color: inherit;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Закрытие
        const closeBtn = notification.querySelector('.close-notification');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Автоудаление
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        container.appendChild(notification);
        
        // Анимация скрытия
        if (!document.querySelector('#slideOutStyle')) {
            const style = document.createElement('style');
            style.id = 'slideOutStyle';
            style.textContent = `
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.newsApp = new NewsPortal();
});