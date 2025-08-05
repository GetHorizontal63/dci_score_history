// DCI Blog System JavaScript

let blogPosts = [];
let filteredPosts = [];
let currentPage = 1;
const postsPerPage = 9;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DCI Blog System Loaded');
    
    // Initialize blog
    loadBlogPosts();
    setupEventListeners();
});

async function loadBlogPosts() {
    const blogGrid = document.getElementById('blog-grid');
    const featuredPost = document.getElementById('featured-post');
    
    // Show loading state
    blogGrid.innerHTML = '<div class="blog-loading"><i class="fas fa-spinner"></i>Loading posts...</div>';
    featuredPost.innerHTML = '<div class="blog-loading"><i class="fas fa-spinner"></i>Loading featured post...</div>';
    
    try {
        // Use embedded blog data instead of fetching external files
        const loadedPosts = Object.values(blogPostsData).filter(post => post.published);
        blogPosts = loadedPosts;
        filteredPosts = [...blogPosts];
        
        // Sort by date (newest first)
        filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        displayFeaturedPost();
        displayBlogPosts();
        
    } catch (error) {
        console.error('Error loading blog posts:', error);
        
        // Use sample data if files don't exist
        blogPosts = getSampleBlogPosts();
        filteredPosts = [...blogPosts];
        filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        displayFeaturedPost();
        displayBlogPosts();
    }
}

// Function to load individual blog post by filename
async function loadBlogPost(filename) {
    try {
        const response = await fetch(`../data/blog_posts/${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error loading blog post ${filename}:`, error);
        return null;
    }
}

// Function to load blog post by slug (searches index for filename)
async function loadBlogPostBySlug(slug) {
    try {
        const response = await fetch('../data/blog_posts/index.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const indexData = await response.json();
        const postInfo = indexData.posts.find(post => post.slug === slug && post.published);
        
        if (postInfo) {
            return await loadBlogPost(postInfo.filename);
        }
        return null;
    } catch (error) {
        console.error(`Error loading blog post by slug ${slug}:`, error);
        return null;
    }
}

// Function to get all available blog post filenames
async function getBlogPostFilenames() {
    try {
        const response = await fetch('../data/blog_posts/index.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const indexData = await response.json();
        return indexData.posts
            .filter(post => post.published)
            .map(post => post.filename);
    } catch (error) {
        console.error('Error loading blog post index:', error);
        return [];
    }
}

function getSampleBlogPosts() {
    return [
        {
            id: 1,
            title: "2025 DCI Season Preview: What to Expect",
            excerpt: "As we approach the 2025 DCI season, we take a look at the top corps to watch, new rule changes, and predictions for this year's championship race.",
            content: "The 2025 DCI season promises to be one of the most competitive in recent memory...",
            category: "season",
            author: "DCI Insider",
            date: "2025-08-01",
            readTime: "5 min read",
            featured: true,
            image: null
        },
        {
            id: 2,
            title: "The Evolution of Drum Corps Scoring: A Statistical Analysis",
            excerpt: "Diving deep into 60+ years of DCI scoring data to uncover trends, patterns, and the changing nature of competitive excellence.",
            content: "Since the inception of DCI in 1972, scoring has evolved dramatically...",
            category: "analysis",
            author: "Data Analyst",
            date: "2025-07-28",
            readTime: "8 min read",
            featured: false,
            image: null
        },
        {
            id: 3,
            title: "Blue Devils Dynasty: Analyzing Their Decade of Dominance",
            excerpt: "How the Blue Devils established themselves as the most successful corps of the 2010s through innovation, talent, and consistent excellence.",
            content: "The Blue Devils' success in the 2010s was unprecedented...",
            category: "corps",
            author: "Corps Historian",
            date: "2025-07-25",
            readTime: "6 min read",
            featured: false,
            image: null
        },
        {
            id: 4,
            title: "The Impact of Weather on DCI Championships",
            excerpt: "Examining how weather conditions have affected performances at DCI Championships throughout history, from heat waves to thunderstorms.",
            content: "Weather has always been an unpredictable factor in drum corps...",
            category: "history",
            author: "Weather Researcher",
            date: "2025-07-22",
            readTime: "4 min read",
            featured: false,
            image: null
        },
        {
            id: 5,
            title: "Understanding Modern DCI Judging: A Deep Dive",
            excerpt: "Breaking down the current DCI judging system, caption areas, and how scores are calculated to determine championship results.",
            content: "The modern DCI judging system is complex and nuanced...",
            category: "analysis",
            author: "Judge Education",
            date: "2025-07-20",
            readTime: "7 min read",
            featured: false,
            image: null
        },
        {
            id: 6,
            title: "The Rise of Open Class: Spotlight on Competitive Growth",
            excerpt: "How Open Class corps have elevated their game and closed the gap with World Class competition in recent years.",
            content: "Open Class drum corps have experienced remarkable growth...",
            category: "corps",
            author: "Open Class Expert",
            date: "2025-07-18",
            readTime: "5 min read",
            featured: false,
            image: null
        }
    ];
}

function setupEventListeners() {
    const categoryFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('search-input');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    categoryFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    loadMoreBtn.addEventListener('click', loadMorePosts);
}

function applyFilters() {
    const categoryFilter = document.getElementById('category-filter').value;
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    
    filteredPosts = blogPosts.filter(post => {
        const matchesCategory = !categoryFilter || post.category === categoryFilter;
        const matchesSearch = !searchQuery || 
            post.title.toLowerCase().includes(searchQuery) ||
            post.excerpt.toLowerCase().includes(searchQuery) ||
            post.category.toLowerCase().includes(searchQuery) ||
            post.author.toLowerCase().includes(searchQuery);
        
        return matchesCategory && matchesSearch;
    });
    
    // Sort filtered results
    filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    currentPage = 1;
    displayFeaturedPost();
    displayBlogPosts();
    updateLoadMoreButton();
}

function displayFeaturedPost() {
    const featuredPost = document.getElementById('featured-post');
    
    // Find featured post or use the first post
    const featured = filteredPosts.find(post => post.featured) || filteredPosts[0];
    
    if (!featured) {
        featuredPost.style.display = 'none';
        return;
    }
    
    featuredPost.style.display = 'block';
    featuredPost.innerHTML = createFeaturedPostHTML(featured);
}

function displayBlogPosts() {
    const blogGrid = document.getElementById('blog-grid');
    const emptyState = document.getElementById('empty-state');
    
    // Filter out featured post from regular grid
    const regularPosts = filteredPosts.filter(post => !post.featured);
    const postsToShow = regularPosts.slice(0, currentPage * postsPerPage);
    
    if (regularPosts.length === 0) {
        blogGrid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    blogGrid.innerHTML = postsToShow.map(post => createBlogPostHTML(post)).join('');
    
    updateLoadMoreButton();
}

function createFeaturedPostHTML(post) {
    const formattedDate = formatDate(post.date);
    const categoryName = formatCategoryName(post.category);
    
    return `
        <a href="blog-post.html?post=${post.slug}" class="featured-post-link">
            <div class="featured-post-content">
                <div class="featured-post-image">
                    ${post.image ? 
                        `<img src="${post.image}" alt="${post.title}">` : 
                        `<i class="fas fa-newspaper placeholder-icon"></i>`
                    }
                </div>
                <div class="featured-post-text">
                    <div class="featured-post-badge">Featured</div>
                    <h2 class="featured-post-title">${escapeHtml(post.title)}</h2>
                    <p class="featured-post-excerpt">${escapeHtml(post.excerpt)}</p>
                    <div class="featured-post-meta">
                        <div class="featured-post-author">
                            <i class="fas fa-user"></i>
                            ${escapeHtml(post.author)}
                        </div>
                        <div class="featured-post-date">
                            <i class="fas fa-calendar"></i>
                            ${formattedDate}
                        </div>
                        <div class="featured-post-category">
                            <i class="fas fa-tag"></i>
                            ${categoryName}
                        </div>
                    </div>
                </div>
            </div>
        </a>
    `;
}

function createBlogPostHTML(post) {
    const formattedDate = formatDate(post.date);
    const categoryName = formatCategoryName(post.category);
    
    return `
        <a href="blog-post.html?post=${post.slug}" class="blog-post-link">
            <article class="blog-post" data-id="${post.id}">
                <div class="blog-post-image">
                    ${post.image ? 
                        `<img src="${post.image}" alt="${post.title}">` : 
                        `<i class="fas fa-newspaper placeholder-icon"></i>`
                    }
                </div>
                <div class="blog-post-content">
                    <div class="blog-post-category">${categoryName}</div>
                    <h3 class="blog-post-title">${escapeHtml(post.title)}</h3>
                    <p class="blog-post-excerpt">${escapeHtml(post.excerpt)}</p>
                    <div class="blog-post-meta">
                        <div class="blog-post-author">
                            <i class="fas fa-user"></i>
                            ${escapeHtml(post.author)}
                        </div>
                        <div class="blog-post-date">
                            <i class="fas fa-calendar"></i>
                            ${formattedDate}
                        </div>
                        <div class="blog-post-read-time">${escapeHtml(post.readTime)}</div>
                    </div>
                </div>
            </article>
        </a>
    `;
}

function loadMorePosts() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    loadMoreBtn.classList.add('loading');
    loadMoreBtn.innerHTML = '<i class="fas fa-spinner"></i>Loading...';
    
    // Simulate loading delay
    setTimeout(() => {
        currentPage++;
        displayBlogPosts();
        
        loadMoreBtn.classList.remove('loading');
        loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i>Load More Posts';
    }, 500);
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    const regularPosts = filteredPosts.filter(post => !post.featured);
    const hasMorePosts = (currentPage * postsPerPage) < regularPosts.length;
    
    if (hasMorePosts) {
        loadMoreBtn.style.display = 'inline-flex';
        loadMoreBtn.disabled = false;
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

function formatCategoryName(category) {
    const categoryNames = {
        'analysis': 'Analysis',
        'history': 'History',
        'data': 'Data Insights',
        'season': 'Season Recap',
        'corps': 'Corps Spotlight'
    };
    
    return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
