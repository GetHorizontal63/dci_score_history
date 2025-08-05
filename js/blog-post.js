// DCI Blog Post Page JavaScript

let currentPost = null;
let allPosts = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('DCI Blog Post Page Loaded');
    
    // Get the post slug from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const postSlug = urlParams.get('post') || urlParams.get('slug');
    
    if (postSlug) {
        loadBlogPost(postSlug);
    } else {
        // No post specified, redirect to blog index
        window.location.href = 'blog.html';
    }
});

async function loadBlogPost(slug) {
    const contentContainer = document.getElementById('blog-post-content');
    const errorState = document.getElementById('error-state');
    
    try {
        // Show loading state
        contentContainer.innerHTML = `
            <div class="blog-loading">
                <i class="fas fa-spinner"></i>
                <span>Loading post...</span>
            </div>
        `;
        
        // Get post from embedded data
        currentPost = blogPostsData[slug];
        if (!currentPost) {
            throw new Error('Post not found');
        }
        
        // Set allPosts for related posts functionality
        allPosts = blogPostIndex.filter(post => post.published);
        
        // Display the post
        displayBlogPost(currentPost);
        
        // Load related posts
        loadRelatedPosts(currentPost);
        
        // Update page metadata
        updatePageMetadata(currentPost);
        
    } catch (error) {
        console.error('Error loading blog post:', error);
        contentContainer.style.display = 'none';
        errorState.style.display = 'block';
    }
}

function displayBlogPost(post) {
    const contentContainer = document.getElementById('blog-post-content');
    
    // Format the date
    const postDate = new Date(post.date);
    const formattedDate = postDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Create tags HTML
    const tagsHTML = post.tags && post.tags.length > 0 ? `
        <div class="blog-post-tags">
            <h4>Tags</h4>
            <div class="tag-list">
                ${post.tags.map(tag => `
                    <span class="tag">${tag}</span>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    // Create the blog post HTML
    contentContainer.innerHTML = `
        <div class="blog-post-header">
            <div class="blog-post-category">${formatCategoryName(post.category)}</div>
            <h1 class="blog-post-title">${escapeHtml(post.title)}</h1>
            <p class="blog-post-excerpt">${escapeHtml(post.excerpt)}</p>
            <div class="blog-post-meta">
                <div class="blog-post-author">
                    <i class="fas fa-user"></i>
                    <span>${escapeHtml(post.author)}</span>
                </div>
                <div class="blog-post-date">
                    <i class="fas fa-calendar"></i>
                    <span>${formattedDate}</span>
                </div>
                <div class="blog-post-read-time">
                    <i class="fas fa-clock"></i>
                    <span>${escapeHtml(post.readTime)}</span>
                </div>
            </div>
        </div>
        
        <div class="blog-post-body">
            ${post.content || ''}
        </div>
        
        ${tagsHTML}
        
        <div class="social-sharing">
            <h4>Share this post</h4>
            <div class="social-buttons">
                <a href="#" class="social-btn twitter" onclick="shareOnTwitter()" title="Share on Twitter">
                    <i class="fab fa-twitter"></i>
                </a>
                <a href="#" class="social-btn facebook" onclick="shareOnFacebook()" title="Share on Facebook">
                    <i class="fab fa-facebook-f"></i>
                </a>
                <a href="#" class="social-btn linkedin" onclick="shareOnLinkedIn()" title="Share on LinkedIn">
                    <i class="fab fa-linkedin-in"></i>
                </a>
            </div>
        </div>
    `;
}

function formatPostContent(content) {
    // Convert line breaks to paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map(paragraph => {
        // Check if it's a heading (starts with ##)
        if (paragraph.startsWith('## ')) {
            return `<h2>${paragraph.substring(3)}</h2>`;
        }
        // Check if it's a subheading (starts with ###)
        if (paragraph.startsWith('### ')) {
            return `<h3>${paragraph.substring(4)}</h3>`;
        }
        // Regular paragraph
        return `<p>${paragraph}</p>`;
    }).join('');
}

async function loadRelatedPosts(currentPost) {
    const relatedPostsSection = document.getElementById('related-posts');
    const relatedPostsGrid = document.getElementById('related-posts-grid');
    
    try {
        // Find posts in the same category, excluding the current post
        const relatedPosts = allPosts
            .filter(post => 
                post.slug !== currentPost.slug && 
                post.category === currentPost.category
            )
            .slice(0, 3); // Show max 3 related posts
        
        if (relatedPosts.length > 0) {
            // Load full post data for related posts
            const relatedPostPromises = relatedPosts.map(async (postInfo) => {
                try {
                    const response = await fetch(`../data/blog_posts/${postInfo.filename}`);
                    if (response.ok) {
                        return await response.json();
                    }
                    return null;
                } catch (error) {
                    return null;
                }
            });
            
            const loadedRelatedPosts = await Promise.all(relatedPostPromises);
            const validRelatedPosts = loadedRelatedPosts.filter(post => post !== null);
            
            if (validRelatedPosts.length > 0) {
                displayRelatedPosts(validRelatedPosts);
                relatedPostsSection.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading related posts:', error);
    }
}

function displayRelatedPosts(relatedPosts) {
    const relatedPostsGrid = document.getElementById('related-posts-grid');
    
    relatedPostsGrid.innerHTML = relatedPosts.map(post => {
        const postDate = new Date(post.date);
        const formattedDate = postDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        return `
            <a href="blog-post.html?post=${post.slug}" class="related-post">
                <div class="related-post-category">${formatCategoryName(post.category)}</div>
                <h4 class="related-post-title">${escapeHtml(post.title)}</h4>
                <p class="related-post-excerpt">${escapeHtml(post.excerpt)}</p>
                <div class="related-post-meta">
                    <span>${formattedDate}</span>
                    <span>${escapeHtml(post.readTime)}</span>
                </div>
            </a>
        `;
    }).join('');
}

function updatePageMetadata(post) {
    // Update page title
    document.title = `${post.title} - DCI Scores Blog`;
    document.getElementById('page-title').textContent = `${post.title} - DCI Scores Blog`;
    
    // Update meta description
    const description = post.excerpt.substring(0, 155) + '...';
    document.getElementById('page-description').setAttribute('content', description);
}

// Utility functions
function formatCategoryName(category) {
    const categoryMap = {
        'analysis': 'Analysis',
        'history': 'History', 
        'season': 'Season',
        'corps': 'Corps Spotlight'
    };
    return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Social sharing functions
function shareOnTwitter() {
    if (currentPost) {
        const text = `${currentPost.title} - ${currentPost.excerpt.substring(0, 100)}...`;
        const url = window.location.href;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    }
}

function shareOnFacebook() {
    if (currentPost) {
        const url = window.location.href;
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    }
}

function shareOnLinkedIn() {
    if (currentPost) {
        const url = window.location.href;
        const title = currentPost.title;
        const summary = currentPost.excerpt.substring(0, 200);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}`, '_blank');
    }
}
