// api/news.js - Vercel Serverless Function для новостей
const NEWS_API_KEY = 'ef0039f1ff4645b1ba064c31c2c766b0';

module.exports = async (req, res) => {
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Обрабатываем preflight запрос
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Разрешаем только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { q, category, date, page = 1, size = 12, demo } = req.query;
    
    // Если запрошен демо-режим
    if (demo === 'true') {
      const demoData = generateDemoData(category, size);
      return res.status(200).json(demoData);
    }
    
    let apiUrl = '';
    const pageSize = Math.min(parseInt(size), 100);
    
    if (q) {
      // Поиск новостей
      apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&pageSize=${pageSize}&page=${page}&language=ru&apiKey=${NEWS_API_KEY}`;
      
      if (date && date !== 'all') {
        const fromDate = getDateFilter(date);
        if (fromDate) {
          apiUrl += `&from=${fromDate}`;
        }
      }
    } else {
      // Топ новости
      apiUrl = `https://newsapi.org/v2/top-headlines?country=ru&pageSize=${pageSize}&page=${page}&apiKey=${NEWS_API_KEY}`;
      
      if (category && category !== 'all') {
        apiUrl += `&category=${category}`;
      }
    }
    
    console.log('Fetching from:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      // Если NewsAPI вернул ошибку, возвращаем демо-данные
      const demoData = generateDemoData(category, size);
      demoData.message = 'NewsAPI вернул ошибку. Показаны демо-данные.';
      return res.status(200).json(demoData);
    }
    
    // Фильтрация по дате на сервере
    let articles = data.articles || [];
    if (date && date !== 'all') {
      articles = filterByDate(articles, date);
    }
    
    const result = {
      status: 'success',
      source: 'newsapi',
      totalResults: data.totalResults || articles.length,
      articles: articles,
      page: parseInt(page),
      pageSize: pageSize
    };
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Server error:', error);
    
    // В случае ошибки возвращаем демо-данные
    const { category = 'all', size = 12 } = req.query;
    const demoData = generateDemoData(category, size);
    demoData.message = `Ошибка сервера: ${error.message}. Показаны демо-данные.`;
    
    res.status(200).json(demoData);
  }
};

// Вспомогательные функции
function getDateFilter(dateFilter) {
  const now = new Date();
  let fromDate = new Date();
  
  switch (dateFilter) {
    case 'today':
      fromDate.setDate(now.getDate() - 1);
      break;
    case 'week':
      fromDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      fromDate.setMonth(now.getMonth() - 1);
      break;
    default:
      return null;
  }
  
  return fromDate.toISOString().split('T')[0];
}

function filterByDate(articles, dateFilter) {
  const fromDate = getDateFilter(dateFilter);
  if (!fromDate) return articles;
  
  const filterDate = new Date(fromDate);
  return articles.filter(article => {
    if (!article.publishedAt) return false;
    const articleDate = new Date(article.publishedAt);
    return articleDate >= filterDate;
  });
}

function generateDemoData(category, size) {
  const allDemoArticles = [
    {
      title: "Новые технологии в медицине: прорыв в лечении рака",
      description: "Ученые разработали инновационный метод лечения онкологических заболеваний с использованием наночастиц.",
      url: "https://example.com/tech-medicine",
      urlToImage: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=400&fit=crop",
      publishedAt: new Date().toISOString(),
      source: { name: "Медицинские новости" }
    },
    {
      title: "Криптовалюты показывают рекордный рост",
      description: "Рынок цифровых активов вырос на 30% за последнюю неделю, Bitcoin обновил исторический максимум.",
      url: "https://example.com/crypto-growth",
      urlToImage: "https://images.unsplash.com/photo-1620336655055-bd87c5d1d73f?w=600&h=400&fit=crop",
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      source: { name: "Финансовый вестник" }
    },
    {
      title: "Запуск новой космической миссии к Марсу",
      description: "Ракета-носитель успешно вывела на орбиту исследовательский зонд для изучения поверхности Марса.",
      url: "https://example.com/space-mission",
      urlToImage: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600&h=400&fit=crop",
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      source: { name: "Космические исследования" }
    },
    {
      title: "Российские спортсмены завоевали золото на чемпионате мира",
      description: "Наши атлеты показали лучший результат в финальных соревнованиях по легкой атлетике.",
      url: "https://example.com/sports-gold",
      urlToImage: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&h=400&fit=crop",
      publishedAt: new Date(Date.now() - 259200000).toISOString(),
      source: { name: "Спортивные новости" }
    },
    {
      title: "Искусственный интеллект создает реалистичные изображения",
      description: "Новая нейросеть способна генерировать фотореалистичные изображения по текстовому описанию.",
      url: "https://example.com/ai-images",
      urlToImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop",
      publishedAt: new Date(Date.now() - 345600000).toISOString(),
      source: { name: "Технологии будущего" }
    },
    {
      title: "Экологи бьют тревогу: уровень океана продолжает расти",
      description: "Новые исследования показывают ускорение темпов подъема уровня мирового океана.",
      url: "https://example.com/climate-change",
      urlToImage: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=600&h=400&fit=crop",
      publishedAt: new Date(Date.now() - 432000000).toISOString(),
      source: { name: "Экологический мониторинг" }
    }
  ];
  
  // Фильтрация по категории если указана
  let articles = allDemoArticles;
  if (category && category !== 'all') {
    const categoryMap = {
      'business': ['Криптовалюты', 'рынок', 'финанс'],
      'technology': ['технологии', 'искусственный', 'нейросеть'],
      'sports': ['спортсмены', 'чемпионат', 'золото'],
      'science': ['космической', 'исследован', 'ученые'],
      'health': ['медицине', 'лечении', 'заболеван'],
      'entertainment': ['кино', 'музык', 'культура']
    };
    
    const keywords = categoryMap[category] || [];
    if (keywords.length > 0) {
      articles = allDemoArticles.filter(article => 
        keywords.some(keyword => 
          article.title.toLowerCase().includes(keyword.toLowerCase()) ||
          article.description.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }
  }
  
  // Ограничиваем количество
  articles = articles.slice(0, Math.min(size, 20));
  
  return {
    status: 'success',
    source: 'demo',
    totalResults: articles.length,
    articles: articles,
    page: 1,
    pageSize: articles.length,
    message: 'Демо-данные (NewsAPI может быть недоступен)'
  };
}