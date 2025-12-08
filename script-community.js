// ========== 全局常量定义（新增） ==========
const CONSTANTS = {
    VALID_CATEGORIES: ['家常菜', '减脂餐', '甜品', '烘焙', '小吃', '饮品'],
    LONG_PRESS_DELAY: 800,
    PAGE_SIZE: 10,
    LOCAL_STORAGE_KEYS: {
        POSTS: 'communityPosts',
        LIKES: 'userLikes',
        COLLECTIONS: 'userCollections',
        FOLLOWS: 'userFollows',
        CURRENT_USER: 'currentUser',
        POST_LIKE_USERS: 'postLikeUsers',
        COMMENT_LIKES: 'commentLikes',
        POST_COMMENTS: 'postComments',
        POST_REPORTS: 'postReports',
        HAS_SHOWN_WELCOME: 'hasShownWelcome'
    },
    EMPTY_STATE_TEXTS: {
        POSTS: '快来发布第一个帖子，分享你的美食故事吧～',
        SEARCH: '未找到相关帖子，换个关键词试试吧～',
        MY_POSTS: '你还没有发布任何帖子',
        MY_COMMENTS: '你还没有发布任何评论',
        COLLECTIONS: '暂无收藏的帖子',
        FOLLOWS: '暂无关注的博主',
        LIKES: '暂无获赞的帖子'
    }
};

// ========== 工具函数封装 ==========
const StorageUtil = {
    get: (key, defaultValue = null) => {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.error(`读取本地存储 ${key} 失败:`, e);
            return defaultValue;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                alert('本地存储已满，正在清理旧数据...');
                // 清理最旧的5条帖子数据
                const posts = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POSTS, []);
                if (posts.length > 10) {
                    posts.splice(-5);
                    StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.POSTS, posts);
                    // 重新尝试保存
                    localStorage.setItem(key, JSON.stringify(value));
                    alert('清理成功，数据已保存！');
                } else {
                    alert('本地存储已满，请清理部分内容后重试！');
                }
            } else {
                console.error(`写入本地存储 ${key} 失败:`, e);
            }
        }
    },
    remove: (key) => {
        localStorage.removeItem(key);
    }
};

// ========== 安全工具函数（新增） ==========
const SafeUtil = {
    // 转义HTML，防止XSS攻击
    escapeHTML: (str) => {
        if (!str) return '';
        return str.replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char] || char));
    },
    // 生成唯一ID
    generateUniqueId: () => {
        return Date.now() + Math.floor(Math.random() * 100000);
    }
};

// ========== 数据存储工具函数 ==========
function getPosts() {
    return StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POSTS, []);
}

function savePosts(posts) {
    StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.POSTS, posts);
    updateLikesBadge();
}

function getLikedPosts() {
    return StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.LIKES, {});
}

function saveLikedPost(postId, isLiked) {
    const likes = getLikedPosts();
    postId = Number(postId); // 统一转为数字类型
    if (isLiked) {
        likes[postId] = true;
        saveLikeUser(postId, getCurrentUser().username);
    } else {
        delete likes[postId];
        deleteLikeUser(postId, getCurrentUser().username);
    }
    StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.LIKES, likes);
    
    const posts = getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
        posts[postIndex].likes = (posts[postIndex].likes || 0) + (isLiked ? 1 : -1);
        savePosts(posts);
    }
}

function isPostLiked(postId) {
    const likes = getLikedPosts();
    return likes[Number(postId)] === true;
}

// 收藏相关存储
function getCollections() {
    return StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.COLLECTIONS, []);
}

function saveCollection(postId, isCollect) {
    // 同步操作，确保数据立即更新
    let collections = getCollections().map(id => Number(id)); // 统一转为数字数组
    postId = Number(postId);
    if (isCollect) {
        if (!collections.includes(postId)) {
            collections.push(postId);
        }
    } else {
        collections = collections.filter(id => id !== postId);
    }
    // 统一使用 StorageUtil 处理存储
    StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.COLLECTIONS, collections);
}

function isPostCollected(postId) {
    const collections = getCollections().map(id => Number(id));
    return collections.includes(Number(postId));
}

// 关注相关存储
function getFollows() {
    return StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.FOLLOWS, []);
}

function saveFollow(author, isFollow) {
    let follows = getFollows();
    author = author.trim();
    if (isFollow) {
        if (!follows.includes(author)) {
            follows.push(author);
        }
    } else {
        follows = follows.filter(a => a !== author);
    }
    StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.FOLLOWS, follows);
}

function isAuthorFollowed(author) {
    const follows = getFollows();
    return follows.includes(author.trim());
}

// 用户信息存储
function getCurrentUser() {
    return StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.CURRENT_USER, {
        username: "美食爱好者",
        avatar: "https://picsum.photos/id/237/40/40"
    });
}

function saveCurrentUser(user) {
    StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.CURRENT_USER, user);
}

// 点赞用户记录
function getLikeUsers(postId) {
    const likeUsers = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POST_LIKE_USERS, {});
    return likeUsers[Number(postId)] || [];
}

function saveLikeUser(postId, username) {
    const likeUsers = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POST_LIKE_USERS, {});
    postId = Number(postId);
    if (!likeUsers[postId]) {
        likeUsers[postId] = [];
    }
    if (!likeUsers[postId].includes(username)) {
        likeUsers[postId].push(username);
    }
    StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.POST_LIKE_USERS, likeUsers);
}

function deleteLikeUser(postId, username) {
    const likeUsers = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POST_LIKE_USERS, {});
    postId = Number(postId);
    if (likeUsers[postId]) {
        likeUsers[postId] = likeUsers[postId].filter(name => name !== username);
        StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.POST_LIKE_USERS, likeUsers);
    }
}

// 评论点赞存储
function getCommentLikes() {
    return StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.COMMENT_LIKES, {});
}

function saveCommentLike(commentId, isLiked) {
    const commentLikes = getCommentLikes();
    commentId = Number(commentId);
    if (isLiked) {
        commentLikes[commentId] = true;
    } else {
        delete commentLikes[commentId];
    }
    StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.COMMENT_LIKES, commentLikes);
}

function isCommentLiked(commentId) {
    const commentLikes = getCommentLikes();
    return commentLikes[Number(commentId)] === true;
}

function updateLikesBadge() {
    const posts = getPosts();
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const badgeEl = document.getElementById('total-likes-badge');
    if (badgeEl) {
        badgeEl.textContent = totalLikes;
    }
}

// ========== 帖子数据处理（拆分函数） ==========
function getFilteredPosts(filter = 'all', searchKeyword = '', sortType = 'latest', page = 1) {
    let posts = getPosts();
    
    // 搜索过滤
    if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase().trim();
        posts = posts.filter(post => 
            post.title.toLowerCase().includes(keyword) || 
            post.content.toLowerCase().includes(keyword)
        );
    }
    
    // 分类过滤
    if (filter !== 'all' && CONSTANTS.VALID_CATEGORIES.includes(filter)) {
        posts = posts.filter(post => post.category === filter);
    }
    
    // 排序处理
    if (sortType === 'latest') {
        posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortType === 'hot') {
        posts.sort((a, b) => (b.hot || 0) - (a.hot || 0));
    } else if (sortType === 'liked') {
        posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    
    // 分页处理
    const startIndex = (page - 1) * CONSTANTS.PAGE_SIZE;
    const endIndex = startIndex + CONSTANTS.PAGE_SIZE;
    return {
        list: posts.slice(startIndex, endIndex),
        total: posts.length,
        page,
        totalPages: Math.ceil(posts.length / CONSTANTS.PAGE_SIZE)
    };
}

// ========== 随机评论工具函数 ==========
const randomUsers = ['吃货小A', '减脂达人', '美食爱好者', '厨房小白', '甜品控', '烘焙新手', '家常菜大厨', '宝妈一枚'];
const randomCommentTemplates = [
    '看起来太好吃了！求详细教程～',
    '我试过这个做法，真的超赞！',
    '请问食材的比例是多少呀？',
    '收藏了，周末就试试做！',
    '颜色搭配绝了，食欲拉满😍',
    '为什么我做的总是失败，求指点',
    '这个配方减脂期可以吃吗？',
    '烤箱温度和时间是多少？',
    '太厉害了，新手也能学会！',
    '搭配米饭我能吃三大碗🍚'
];

function generateRandomComment() {
    const randomUser = randomUsers[Math.floor(Math.random() * randomUsers.length)];
    const randomContent = randomCommentTemplates[Math.floor(Math.random() * randomCommentTemplates.length)];
    const randomTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    return {
        id: SafeUtil.generateUniqueId(),
        author: randomUser,
        content: SafeUtil.escapeHTML(randomContent),
        createdAt: randomTime,
        likes: Math.floor(Math.random() * 10),
        replies: []
    };
}

function generateAndSaveRandomComments(postId) {
    postId = Number(postId);
    const commentCount = Math.floor(Math.random() * 3) + 2;
    const comments = [];
    for (let i = 0; i < commentCount; i++) {
        const comment = generateRandomComment();
        // 随机生成回复
        if (Math.random() > 0.5) {
            const replyCount = Math.floor(Math.random() * 2) + 1;
            for (let j = 0; j < replyCount; j++) {
                const reply = generateRandomComment();
                reply.replyTo = comment.author;
                comment.replies.push(reply);
            }
        }
        comments.push(comment);
    }
    let allComments = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, {});
    allComments[postId] = comments;
    StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, allComments);
    
    let posts = getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
        posts[postIndex].comments = comments.length;
        savePosts(posts);
    }
    return comments;
}

function formatCommentTime(isoTime) {
    if (!isoTime) return '未知时间';
    
    const now = new Date();
    const commentTime = new Date(isoTime);
    const diffMs = now - commentTime;
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return commentTime.toLocaleDateString();
}

// ========== 评论DOM创建（拆分函数） ==========
function createCommentElement(comment, isReply = false, postId) {
    const liked = isCommentLiked(comment.id);
    const currentUser = getCurrentUser().username;
    const commentEl = document.createElement('div');
    commentEl.className = isReply ? 'comment-item comment-reply' : 'comment-item';
    commentEl.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${SafeUtil.escapeHTML(comment.author)}</span>
            <span class="comment-time">${formatCommentTime(comment.createdAt)}</span>
        </div>
        <div class="comment-content">
            ${comment.replyTo ? `<span class="text-warning">@${SafeUtil.escapeHTML(comment.replyTo)}</span> ` : ''}
            ${comment.content}
        </div>
        <div class="comment-actions">
            ${comment.author === currentUser ? 
                `<button class="comment-action-btn delete-comment-btn" data-comment-id="${comment.id}" data-post-id="${postId}">
                    <i class="bi bi-trash"></i> 删除
                </button>` : ''}
            <button class="comment-action-btn reply-comment-btn" 
                data-comment-id="${comment.id}" 
                data-post-id="${postId}" 
                data-reply-to="${SafeUtil.escapeHTML(comment.author)}">
                <i class="bi bi-reply"></i> 回复
            </button>
        </div>
        <div class="comment-like-btn ${liked ? 'liked' : ''}" data-comment-id="${comment.id}">
            <i class="bi ${liked ? 'bi-heart-fill' : 'bi-heart'}"></i>
            <span>${comment.likes || 0}</span>
        </div>
    `;
    return commentEl;
}

// ========== 评论事件绑定（拆分函数） ==========
function bindCommentEvents(commentEl, comment, postId, isDetailModal = false) {
    // 绑定评论点赞事件
    const likeBtn = commentEl.querySelector('.comment-like-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', () => {
            const commentId = Number(likeBtn.dataset.commentId);
            const currentlyLiked = isCommentLiked(commentId);
            likeBtn.classList.toggle('liked', !currentlyLiked);
            const likeIcon = likeBtn.querySelector('i');
            likeIcon.classList.toggle('bi-heart-fill', !currentlyLiked);
            likeIcon.classList.toggle('bi-heart', currentlyLiked);
            likeBtn.querySelector('span').textContent = (comment.likes || 0) + (currentlyLiked ? -1 : 1);
            saveCommentLike(commentId, !currentlyLiked);
            
            // 更新本地存储的评论点赞数
            let allComments = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, {});
            const commentIndex = allComments[postId].findIndex(c => c.id === commentId);
            if (commentIndex !== -1) {
                allComments[postId][commentIndex].likes = (allComments[postId][commentIndex].likes || 0) + (currentlyLiked ? -1 : 1);
                StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, allComments);
            }
        });
    }
    
    // 绑定删除评论事件
    const deleteBtn = commentEl.querySelector('.delete-comment-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('确定要删除这条评论吗？')) {
                let allComments = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, {});
                allComments[postId] = allComments[postId].filter(c => c.id !== Number(deleteBtn.dataset.commentId));
                StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, allComments);
                loadPostComments(postId, isDetailModal);
                renderMyComments(); // 同步更新我的评论列表
            }
        });
    }
    
    // 绑定回复评论事件
    const replyBtn = commentEl.querySelector('.reply-comment-btn');
    if (replyBtn) {
        replyBtn.addEventListener('click', () => {
            const replyTo = replyBtn.dataset.replyTo;
            const inputId = isDetailModal ? 'detailCommentInput' : `comment-input-${postId}`;
            const input = document.getElementById(inputId);
            if (input) {
                input.value = `@${replyTo} `;
                input.focus();
                // 保存回复目标
                input.dataset.replyTo = replyTo;
                input.dataset.replyCommentId = replyBtn.dataset.commentId;
            }
        });
    }
}

// ========== 评论加载与渲染函数 ==========
function loadPostComments(postId, isDetailModal = false) {
    postId = Number(postId);
    let allComments = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, {});
    if (!allComments[postId] || allComments[postId].length === 0) {
        allComments[postId] = generateAndSaveRandomComments(postId);
    }
    let comments = allComments[postId];
    
    let commentListEl;
    if (isDetailModal) {
        commentListEl = document.getElementById('detailCommentsList');
    } else {
        commentListEl = document.getElementById(`comments-list-${postId}`);
    }
    
    if (!commentListEl) return;
    commentListEl.innerHTML = '';
    const fragment = document.createDocumentFragment();

    // 渲染主评论和回复
    comments.forEach(comment => {
        const commentEl = createCommentElement(comment, false, postId);
        bindCommentEvents(commentEl, comment, postId, isDetailModal);
        fragment.appendChild(commentEl);
        
        // 渲染回复
        if (comment.replies && comment.replies.length > 0) {
            comment.replies.forEach(reply => {
                const replyEl = createCommentElement(reply, true, postId);
                bindCommentEvents(replyEl, reply, postId, isDetailModal);
                commentEl.appendChild(replyEl);
            });
        }
    });
    
    commentListEl.appendChild(fragment);
}

// ========== 帖子DOM创建（拆分函数） ==========
function createPostElement(post) {
    const currentUser = getCurrentUser();
    const liked = isPostLiked(post.id);
    const collected = isPostCollected(post.id);
    const commentCount = post.comments || Math.floor(Math.random() * 3) + 2;
    const hotTag = post.hot ? '<span class="post-hot">热门</span>' : '';
    
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.innerHTML = `
        <img src="${SafeUtil.escapeHTML(post.image)}" class="post-img" alt="${SafeUtil.escapeHTML(post.title)}" data-img="${SafeUtil.escapeHTML(post.image)}">
        <div class="post-content">
            <h3 class="post-title">${hotTag}${SafeUtil.escapeHTML(post.title)}</h3>
            <p class="post-desc">${SafeUtil.escapeHTML(post.content)}</p>
            <div class="post-footer">
                <div class="post-author">
                    <img src="${post.author === currentUser.username ? currentUser.avatar : `https://picsum.photos/id/${(post.author.charCodeAt(0) || 0) % 50}/20/20`}" class="author-avatar">
                    <span>@${SafeUtil.escapeHTML(post.author || '美食爱好者')}</span>
                    ${post.author !== currentUser.username ? 
                        `<button class="follow-btn ms-2 ${isAuthorFollowed(post.author) ? 'followed' : ''}" data-author="${SafeUtil.escapeHTML(post.author)}">
                            ${isAuthorFollowed(post.author) ? '已关注' : '关注'}
                        </button>` : ''}
                </div>
                <div class="post-actions">
                    <span class="post-category">${SafeUtil.escapeHTML(post.category)}</span>
                    <div class="post-like ${liked ? 'liked' : ''}" data-post-id="${post.id}">
                        <i class="bi bi-heart like-icon ${liked ? 'bi-heart-fill' : 'bi-heart'}"></i>
                        <span class="like-count">${post.likes || 0}</span>
                    </div>
                    <div class="post-comment" data-post-id="${post.id}">
                        <i class="bi bi-chat-left comment-icon"></i>
                        <span class="comment-count">${commentCount}</span>
                    </div>
                    <div class="post-collect ${collected ? 'collected' : ''}" data-post-id="${post.id}">
                        <i class="bi ${collected ? 'bi-bookmark-heart-fill' : 'bi-bookmark-heart'}"></i>
                        <span>${collected ? '已收藏' : '收藏'}</span>
                    </div>
                    <div class="share-btn" data-post-id="${post.id}">
                        <i class="bi bi-share"></i>
                        <span>分享</span>
                        <div class="share-options" id="share-options-${post.id}">
                            <div class="share-option" data-share-type="wechat">
                                <i class="bi bi-wechat text-success"></i>
                                <span>微信</span>
                            </div>
                            <div class="share-option" data-share-type="weibo">
                                <i class="bi bi-weibo text-danger"></i>
                                <span>微博</span>
                            </div>
                            <div class="share-option" data-share-type="copy">
                                <i class="bi bi-clipboard text-primary"></i>
                                <span>复制链接</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="comments-section" id="comments-${post.id}" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
            <div class="comments-list" id="comments-list-${post.id}"></div>
            <div class="comment-input-container d-flex gap-2 mt-3">
                <input type="text" class="comment-input form-control rounded-pill" id="comment-input-${post.id}" placeholder="输入评论内容...">
                <button class="comment-submit btn btn-warning rounded-pill" data-post-id="${post.id}">发布</button>
            </div>
        </div>
    `;
    return postElement;
}

// ========== 帖子事件绑定（拆分函数） ==========
function bindPostEvents(postElement, post, targetContainer) {
    const currentUser = getCurrentUser();
    let pressTimer = null;
    let isLongPress = false;
    let activeShareOptions = null;

    // 图片预览
    const postImg = postElement.querySelector('.post-img');
    if (postImg) {
        postImg.addEventListener('click', (e) => {
            e.stopPropagation();
            const previewModal = new bootstrap.Modal(document.getElementById('imagePreviewModal'));
            const previewImage = document.getElementById('previewImage');
            if (previewImage) {
                previewImage.src = postImg.dataset.img;
            }
            previewModal.show();
        });
    }
    
    // 点赞功能
    const likeBtn = postElement.querySelector('.post-like');
    if (likeBtn) {
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = Number(likeBtn.dataset.postId);
            const currentlyLiked = isPostLiked(postId);
            
            likeBtn.classList.toggle('liked', !currentlyLiked);
            const likeIcon = likeBtn.querySelector('.like-icon');
            if (likeIcon) {
                likeIcon.classList.toggle('bi-heart-fill', !currentlyLiked);
                likeIcon.classList.toggle('bi-heart', currentlyLiked);
            }
            const likeCount = likeBtn.querySelector('.like-count');
            if (likeCount) {
                likeCount.textContent = (post.likes || 0) + (currentlyLiked ? -1 : 1);
            }
            
            saveLikedPost(postId, !currentlyLiked);
        });
        
        // 查看点赞列表（仅自己的帖子）
        if (post.author === currentUser.username) {
            likeBtn.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                openLikeList(post.id);
            });
        }
    }
    
    // 收藏功能
    const collectBtn = postElement.querySelector('.post-collect');
    if (collectBtn) {
        collectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = Number(collectBtn.dataset.postId);
            const currentlyCollected = isPostCollected(postId);
            
            collectBtn.classList.toggle('collected', !currentlyCollected);
            const collectIcon = collectBtn.querySelector('i');
            if (collectIcon) {
                collectIcon.classList.toggle('bi-bookmark-heart-fill', !currentlyCollected);
                collectIcon.classList.toggle('bi-bookmark-heart', currentlyCollected);
            }
            const collectText = collectBtn.querySelector('span');
            if (collectText) {
                collectText.textContent = !currentlyCollected ? '已收藏' : '收藏';
            }
            
            saveCollection(postId, !currentlyCollected);
            
            // 如果是收藏列表，重新渲染
            if (targetContainer === 'collection-container') {
                renderCollections();
            }
        });
    }
    
    // 分享功能
    const shareBtn = postElement.querySelector('.share-btn');
    if (shareBtn) {
        const shareOptions = postElement.querySelector(`#share-options-${post.id}`);
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (shareOptions) {
                // 关闭其他分享选项
                document.querySelectorAll('.share-options').forEach(opt => {
                    if (opt.id !== `share-options-${post.id}`) opt.classList.remove('show');
                });
                shareOptions.classList.toggle('show');
                activeShareOptions = shareOptions.classList.contains('show') ? shareOptions : null;
            }
        });
        
        // 分享选项点击
        postElement.querySelectorAll('.share-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = option.dataset.shareType;
                const postUrl = window.location.href + '#post-' + post.id;
                
                if (type === 'copy') {
                    navigator.clipboard.writeText(postUrl).then(() => {
                        alert('链接已复制到剪贴板！');
                    }).catch(() => {
                        alert('复制失败，请手动复制链接！');
                    });
                } else {
                    alert(`已分享到${option.textContent.trim()}！`);
                }
                if (shareOptions) {
                    shareOptions.classList.remove('show');
                    activeShareOptions = null;
                }
            });
        });
    }
    
    // 关注功能
    const followBtn = postElement.querySelector('.follow-btn');
    if (followBtn) {
        followBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const author = followBtn.dataset.author;
            const isFollowed = isAuthorFollowed(author);
            saveFollow(author, !isFollowed);
            followBtn.className = `follow-btn ms-2 ${!isFollowed ? 'followed' : ''}`;
            followBtn.textContent = !isFollowed ? '已关注' : '关注';
        });
    }
    
    // 帖子卡片点击打开详情
    postElement.addEventListener('click', (e) => {
        if (isLongPress) {
            e.stopPropagation();
            isLongPress = false;
            return;
        }
        if (!e.target.closest('.post-like') && 
            !e.target.closest('.post-comment') && 
            !e.target.closest('.post-collect') && 
            !e.target.closest('.share-btn') &&
            !e.target.closest('.follow-btn')) {
            openPostDetail(post);
        }
    });
    
    // 长按操作（删除/编辑）
    const handleLongPress = (e) => {
        e.preventDefault();
        if (post.author !== currentUser.username) return;
        isLongPress = false;
        pressTimer = setTimeout(() => {
            isLongPress = true;
            const action = prompt('请选择操作：\n1-删除\n2-编辑', '');
            if (action === '1') {
                if(confirm('确定要删除这条帖子吗？')) {
                    const posts = getPosts();
                    const postIndex = posts.findIndex(p => p.id === post.id);
                    if (postIndex !== -1) {
                        posts.splice(postIndex, 1);
                        savePosts(posts);
                        // 刷新列表
                        const activeFilter = document.querySelector('.category-filter .btn.active')?.dataset.filter || 'all';
                        const searchKeyword = document.getElementById('search-input')?.value || '';
                        const activeSort = document.querySelector('.sort-btn.active')?.dataset.sort || 'latest';
                        renderPosts(activeFilter, searchKeyword, activeSort, targetContainer);
                    }
                }
            } else if (action === '2') {
                openEditPostModal(post);
            }
        }, CONSTANTS.LONG_PRESS_DELAY);
    };
    
    // 绑定长按事件（区分移动端/桌面端）
    postElement.addEventListener('mousedown', handleLongPress);
    postElement.addEventListener('touchstart', handleLongPress);
    
    // 清除长按计时器
    const clearPressTimer = () => {
        clearTimeout(pressTimer);
    };
    postElement.addEventListener('mouseup', clearPressTimer);
    postElement.addEventListener('mouseleave', clearPressTimer);
    postElement.addEventListener('touchend', clearPressTimer);
    postElement.addEventListener('touchcancel', clearPressTimer);
    
    return { activeShareOptions };
}

// ========== 分页组件渲染（新增） ==========
function renderPagination(containerId, paginationData) {
    const { totalPages, page, total } = paginationData;
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <nav class="pagination-nav" aria-label="帖子分页">
            <ul class="pagination justify-content-center">
                <li class="page-item ${page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${page - 1}">上一页</a>
                </li>
    `;
    
    // 生成页码
    for (let i = 1; i <= totalPages; i++) {
        // 只显示当前页前后2页
        if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) {
            paginationHTML += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        } else if (Math.abs(i - page) === 3) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    paginationHTML += `
                <li class="page-item ${page === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${page + 1}">下一页</a>
                </li>
            </ul>
            <p class="pagination-info text-center mt-2">共 ${total} 条帖子，当前第 ${page}/${totalPages} 页</p>
        </nav>
    `;
    
    container.innerHTML = paginationHTML;
    
    // 绑定分页事件
    container.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = Number(link.dataset.page);
            if (targetPage >= 1 && targetPage <= totalPages && targetPage !== page) {
                const activeFilter = document.querySelector('.category-filter .btn.active')?.dataset.filter || 'all';
                const searchKeyword = document.getElementById('search-input')?.value || '';
                const activeSort = document.querySelector('.sort-btn.active')?.dataset.sort || 'latest';
                const targetContainer = document.querySelector('.posts-container')?.id || 'posts-container';
                renderPosts(activeFilter, searchKeyword, activeSort, targetContainer, targetPage);
            }
        });
    });
}

// ========== 渲染帖子 ==========
function renderPosts(filter = 'all', searchKeyword = '', sortType = 'latest', targetContainer = 'posts-container', page = 1) {
    const container = document.getElementById(targetContainer);
    if (!container) return;
    
    // 显示加载状态
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>美味加载中...</p></div>';
    
    // 模拟加载延迟（优化体验）
    setTimeout(() => {
        const { list: posts, total, totalPages } = getFilteredPosts(filter, searchKeyword, sortType, page);
        
        if (posts.length === 0) {
            const emptyText = searchKeyword 
                ? CONSTANTS.EMPTY_STATE_TEXTS.SEARCH 
                : CONSTANTS.EMPTY_STATE_TEXTS.POSTS;
            container.innerHTML = `
                <div class="empty-posts">
                    <i class="bi bi-book"></i>
                    <h4>${searchKeyword ? '搜索结果为空' : '暂无相关帖子'}</h4>
                    <p>${emptyText}</p>
                    <button class="btn" id="empty-publish-btn-${targetContainer}">发布帖子</button>
                </div>
            `;
            // 绑定空状态发布按钮
            const publishBtn = document.getElementById(`empty-publish-btn-${targetContainer}`);
            if (publishBtn) {
                publishBtn.addEventListener('click', () => {
                    const modal = new bootstrap.Modal(document.getElementById('publishPostModal'));
                    modal.show();
                });
            }
            // 清空分页
            renderPagination(`${targetContainer}-pagination`, { totalPages: 0, page, total });
            return;
        }

        container.innerHTML = '';
        const fragment = document.createDocumentFragment();
        let activeShareOptionsList = [];

        posts.forEach((post) => {
            const postElement = createPostElement(post);
            const { activeShareOptions } = bindPostEvents(postElement, post, targetContainer);
            if (activeShareOptions) activeShareOptionsList.push(activeShareOptions);
            fragment.appendChild(postElement);
        });

        container.appendChild(fragment);
        
        // 渲染分页
        renderPagination(`${targetContainer}-pagination`, {
            list: posts,
            total,
            page,
            totalPages
        });
        
        // 点击空白处关闭所有分享选项
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.share-btn')) {
                activeShareOptionsList.forEach(opt => {
                    if (opt) opt.classList.remove('show');
                });
            }
        });
    }, 300);
}

// ========== 编辑帖子功能 ==========
function openEditPostModal(post) {
    if (!post) return;
    
    const modal = new bootstrap.Modal(document.getElementById('editPostModal'));
    const editPostId = document.getElementById('edit-post-id');
    const editPostTitle = document.getElementById('edit-post-title');
    const editPostCategory = document.getElementById('edit-post-category');
    const editPostContent = document.getElementById('edit-post-content');
    const editPostImgPreview = document.getElementById('edit-post-img-preview');
    
    if (editPostId) editPostId.value = post.id;
    if (editPostTitle) editPostTitle.value = SafeUtil.escapeHTML(post.title);
    if (editPostCategory) editPostCategory.value = post.category;
    if (editPostContent) editPostContent.value = SafeUtil.escapeHTML(post.content);
    if (editPostImgPreview) {
        editPostImgPreview.src = SafeUtil.escapeHTML(post.image);
        editPostImgPreview.style.display = 'block';
        editPostImgPreview.style.maxWidth = '100%';
        editPostImgPreview.style.maxHeight = '200px';
    }
    
    // 图片预览
    const imgInput = document.getElementById('edit-post-img');
    let imageDataUrl = post.image;
    
    // 移除旧的事件监听，避免重复绑定
    const newImgInput = imgInput.cloneNode(true);
    imgInput.parentNode.replaceChild(newImgInput, imgInput);
    
    newImgInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                imageDataUrl = event.target.result;
                if (editPostImgPreview) {
                    editPostImgPreview.src = imageDataUrl;
                }
            };
            reader.readAsDataURL(file);
        }
    });
    
    // 保存编辑
    const submitEditPost = document.getElementById('submit-edit-post');
    if (submitEditPost) {
        submitEditPost.onclick = function() {
            const title = editPostTitle ? editPostTitle.value.trim() : '';
            const category = editPostCategory ? editPostCategory.value : '';
            const content = editPostContent ? editPostContent.value.trim() : '';
            const postId = editPostId ? Number(editPostId.value) : 0;
            
            // 验证
            let hasError = false;
            const titleError = document.getElementById('edit-title-error');
            const contentError = document.getElementById('edit-content-error');
            
            if (titleError) titleError.style.display = 'none';
            if (contentError) contentError.style.display = 'none';
            
            if (!title && titleError) {
                titleError.style.display = 'block';
                hasError = true;
            }
            if (!content && contentError) {
                contentError.style.display = 'block';
                hasError = true;
            }
            if (!CONSTANTS.VALID_CATEGORIES.includes(category)) {
                alert('分类不合法！');
                hasError = true;
            }
            
            if (hasError) return;
            
            // 更新帖子
            const posts = getPosts();
            const postIndex = posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                posts[postIndex].title = title;
                posts[postIndex].category = category;
                posts[postIndex].content = content;
                if (imageDataUrl) {
                    posts[postIndex].image = imageDataUrl;
                }
                savePosts(posts);
                
                // 刷新列表
                const activeFilter = document.querySelector('.category-filter .btn.active')?.dataset.filter || 'all';
                const searchKeyword = document.getElementById('search-input')?.value || '';
                const activeSort = document.querySelector('.sort-btn.active')?.dataset.sort || 'latest';
                renderPosts(activeFilter, searchKeyword, activeSort);
                
                // 关闭模态框
                modal.hide();
            }
        };
    }
    
    modal.show();
}

// ========== 发布帖子功能 ==========
function initPublishFunction() {
    const publishBtn = document.getElementById('publish-post-btn');
    const modal = new bootstrap.Modal(document.getElementById('publishPostModal'));
    const submitPostBtn = document.getElementById('submit-post');
    const postImgInput = document.getElementById('post-img');
    const postImgPreview = document.getElementById('post-img-preview');
    
    const titleError = document.getElementById('title-error');
    const contentError = document.getElementById('content-error');
    const imgError = document.getElementById('img-error');
    
    let imageDataUrl = '';

    // 重置错误提示
    const resetErrors = () => {
        if (titleError) titleError.style.display = 'none';
        if (contentError) contentError.style.display = 'none';
        if (imgError) imgError.style.display = 'none';
    };

    // 绑定发布按钮（适配HTML中的空状态按钮ID）
    document.addEventListener('click', (e) => {
        if (e.target.id === 'empty-publish-btn' || e.target.id.startsWith('empty-publish-btn-')) {
            resetErrors();
            modal.show();
        }
    });

    // 打开发布模态框
    if (publishBtn) {
        publishBtn.addEventListener('click', function() {
            resetErrors();
            modal.show();
        });
    }

    // 图片预览功能
    if (postImgInput && postImgPreview) {
        // 移除旧的事件监听
        const newPostImgInput = postImgInput.cloneNode(true);
        postImgInput.parentNode.replaceChild(newPostImgInput, postImgInput);
        
        newPostImgInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    imageDataUrl = event.target.result;
                    postImgPreview.src = imageDataUrl;
                    postImgPreview.style.display = 'block';
                    postImgPreview.style.maxWidth = '100%';
                    postImgPreview.style.maxHeight = '200px';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 提交发布帖子
    if (submitPostBtn) {
        submitPostBtn.addEventListener('click', function() {
            resetErrors();
            
            const postTitle = document.getElementById('post-title');
            const postCategory = document.getElementById('post-category');
            const postContent = document.getElementById('post-content');
            
            const title = postTitle ? postTitle.value.trim() : '';
            const category = postCategory ? postCategory.value : '';
            const content = postContent ? postContent.value.trim() : '';

            let hasError = false;
            if (!title && titleError) {
                titleError.style.display = 'block';
                hasError = true;
            }
            if (!content && contentError) {
                contentError.style.display = 'block';
                hasError = true;
            }
            if (!imageDataUrl && imgError) {
                imgError.style.display = 'block';
                hasError = true;
            }
            if (!CONSTANTS.VALID_CATEGORIES.includes(category)) {
                alert('分类不合法！');
                hasError = true;
            }

            if (hasError) {
                const firstError = document.querySelector('.form-error[style="display: block;"]');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            // 创建帖子对象
            const initialCommentCount = Math.floor(Math.random() * 3) + 2;
            const newPost = {
                id: SafeUtil.generateUniqueId(),
                title: title,
                category: category,
                content: content,
                image: imageDataUrl,
                author: getCurrentUser().username,
                createdAt: new Date().toISOString(),
                hot: Math.floor(Math.random() * 100),
                likes: 0,
                comments: initialCommentCount
            };

            // 保存到本地存储
            const posts = getPosts();
            posts.unshift(newPost);
            savePosts(posts);

            // 为新帖子生成随机评论
            generateAndSaveRandomComments(newPost.id);

            // 刷新帖子列表
            const activeFilter = document.querySelector('.category-filter .btn.active')?.dataset.filter || 'all';
            const searchKeyword = document.getElementById('search-input')?.value || '';
            const activeSort = document.querySelector('.sort-btn.active')?.dataset.sort || 'latest';
            renderPosts(activeFilter, searchKeyword, activeSort);

            // 重置表单并关闭模态框
            if (postTitle) postTitle.value = '';
            if (postContent) postContent.value = '';
            if (newPostImgInput) newPostImgInput.value = '';
            if (postImgPreview) postImgPreview.style.display = 'none';
            imageDataUrl = '';
            modal.hide();
        });
    }
}

// ========== 帖子详情弹窗逻辑 ==========
function openPostDetail(post) {
    if (!post) return;
    
    const modal = new bootstrap.Modal(document.getElementById('postDetailModal'));
    const currentUser = getCurrentUser();
    
    // 填充基础数据
    const modalLabel = document.getElementById('postDetailModalLabel');
    const detailPostImg = document.getElementById('detailPostImg');
    const detailPostAuthor = document.getElementById('detailPostAuthor');
    const detailPostCategory = document.getElementById('detailPostCategory');
    const detailPostContent = document.getElementById('detailPostContent');
    const detailPostLikes = document.getElementById('detailPostLikes');
    const detailModalEl = document.getElementById('postDetailModal');
    const detailPostCommentsCount = document.getElementById('detailPostCommentsCount');
    
    if (detailModalEl) {
        detailModalEl.dataset.postId = post.id; // 为弹窗添加帖子 ID
    }
    if (modalLabel) modalLabel.textContent = SafeUtil.escapeHTML(post.title);
    if (detailPostImg) detailPostImg.src = SafeUtil.escapeHTML(post.image);
    if (detailPostAuthor) detailPostAuthor.textContent = `@${SafeUtil.escapeHTML(post.author)}`;
    if (detailPostCategory) detailPostCategory.textContent = SafeUtil.escapeHTML(post.category);
    if (detailPostContent) detailPostContent.textContent = SafeUtil.escapeHTML(post.content);
    if (detailPostLikes) detailPostLikes.textContent = `${post.likes || 0} 点赞`;
    if (detailPostCommentsCount) detailPostCommentsCount.textContent = `${post.comments || 0} 评论`;
    
    // 更新作者头像
    const authorAvatar = document.querySelector('#postDetailModal .rounded-circle');
    if (authorAvatar) {
        authorAvatar.src = post.author === currentUser.username 
            ? currentUser.avatar 
            : `https://picsum.photos/id/${(post.author.charCodeAt(0) || 0) % 50}/40/40`;
    }
    
    // 添加关注按钮
    const authorInfoEl = document.querySelector('#postDetailModal .d-flex.justify-content-between.align-items-center');
    if (authorInfoEl) {
        // 移除原有关注按钮
        const oldFollowBtn = authorInfoEl.querySelector('.follow-btn');
        if (oldFollowBtn) oldFollowBtn.remove();
        
        // 创建新的关注按钮
        const followBtn = document.createElement('button');
        followBtn.className = `follow-btn ${isAuthorFollowed(post.author) ? 'followed' : ''}`;
        followBtn.textContent = isAuthorFollowed(post.author) ? '已关注' : '关注';
        followBtn.addEventListener('click', () => {
            const isFollowed = isAuthorFollowed(post.author);
            saveFollow(post.author, !isFollowed);
            followBtn.className = `follow-btn ${!isFollowed ? 'followed' : ''}`;
            followBtn.textContent = !isFollowed ? '已关注' : '关注';
        });
        authorInfoEl.appendChild(followBtn);
    }
    
    // 加载评论
    loadPostComments(post.id, true);

    modal.show();
}

// ========== 筛选/搜索/排序功能 ==========
function initFilterButtons() {
    document.querySelectorAll('.category-filter .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-filter .btn').forEach(b => {
                b.classList.remove('active', 'btn-warning');
                b.classList.add('btn-outline-warning');
            });
            btn.classList.add('active', 'btn-warning');
            btn.classList.remove('btn-outline-warning');
            
            const searchKeyword = document.getElementById('search-input')?.value || '';
            const activeSort = document.querySelector('.sort-btn.active')?.dataset.sort || 'latest';
            renderPosts(btn.dataset.filter, searchKeyword, activeSort);
        });
    });
}

function initSearchFunction() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    let searchDebounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            const activeFilter = document.querySelector('.category-filter .btn.active')?.dataset.filter || 'all';
            const activeSort = document.querySelector('.sort-btn.active')?.dataset.sort || 'latest';
            renderPosts(activeFilter, searchInput.value, activeSort);
        }, 300);
    });
}

function initSortFunction() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const activeFilter = document.querySelector('.category-filter .btn.active')?.dataset.filter || 'all';
            const searchKeyword = document.getElementById('search-input')?.value || '';
            renderPosts(activeFilter, searchKeyword, btn.dataset.sort);
        });
    });
}

// ========== 我的帖子功能 ==========
function initMyPostsFunction() {
    const myPostsBtn = document.getElementById('my-posts-btn');
    if (!myPostsBtn) return;
    
    // 动态创建我的帖子模态框（防止重复创建）
    if (document.getElementById('userPostsModal')) return;
    
    const myPostsModalHTML = `
        <div class="modal fade" id="userPostsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-file-text-fill text-warning"></i> 我的帖子
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-stats mb-4">
                            <div class="stat-item">
                                <span class="stat-number" id="my-posts-count">0</span>
                                <span class="stat-label">发布的帖子数</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number" id="my-posts-likes">0</span>
                                <span class="stat-label">帖子获赞数</span>
                            </div>
                        </div>
                        <div class="posts-container" id="my-posts-container"></div>
                        <div id="my-posts-container-pagination"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    // 将模态框添加到body
    document.body.insertAdjacentHTML('beforeend', myPostsModalHTML);
    
    const myPostsModal = new bootstrap.Modal(document.getElementById('userPostsModal'));
    
    myPostsBtn.addEventListener('click', () => {
        const posts = getPosts();
        const myPosts = posts.filter(post => post.author === getCurrentUser().username);
        const myPostsCount = myPosts.length;
        const myPostsLikes = myPosts.reduce((sum, post) => sum + (post.likes || 0), 0);
        
        const myPostsCountEl = document.getElementById('my-posts-count');
        const myPostsLikesEl = document.getElementById('my-posts-likes');
        if (myPostsCountEl) myPostsCountEl.textContent = myPostsCount;
        if (myPostsLikesEl) myPostsLikesEl.textContent = myPostsLikes;
        
        renderPosts('all', '', 'latest', 'my-posts-container');
        myPostsModal.show();
        
        // 绑定发布按钮
        const myPostsPublishBtn = document.getElementById('my-posts-publish-btn');
        if (myPostsPublishBtn) {
            myPostsPublishBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('publishPostModal'));
                modal.show();
                myPostsModal.hide();
            });
        }
    });
}

// ========== 收到的赞功能 ==========
function initLikedPostsFunction() {
    const likedPostsBtn = document.getElementById('liked-posts-btn');
    const likedPostsModal = new bootstrap.Modal(document.getElementById('likedPostsModal'));
    
    if (likedPostsBtn) {
        likedPostsBtn.addEventListener('click', () => {
            const posts = getPosts();
            const likedPosts = posts.filter(post => (post.likes || 0) > 0);
            const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
            
            const totalLikesCount = document.getElementById('total-likes-count');
            const likedPostsCount = document.getElementById('liked-posts-count');
            if (totalLikesCount) totalLikesCount.textContent = totalLikes;
            if (likedPostsCount) likedPostsCount.textContent = likedPosts.length;
            
            renderPosts('all', '', 'liked', 'liked-posts-container');
            likedPostsModal.show();
        });
    }
}

// ========== 我的评论功能 ==========
function getMyComments() {
    const allComments = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, {});
    const myComments = [];
    const currentUser = getCurrentUser().username;

    Object.keys(allComments).forEach(postId => {
        const postComments = allComments[postId];
        const userComments = postComments.filter(comment => comment.author === currentUser);
        
        // 关联对应的帖子信息
        const posts = getPosts();
        const post = posts.find(p => p.id === Number(postId));
        if (post) {
            userComments.forEach(comment => {
                myComments.push({
                    ...comment,
                    postTitle: SafeUtil.escapeHTML(post.title),
                    postId: Number(postId),
                    postCategory: SafeUtil.escapeHTML(post.category)
                });
            });
        }
    });

    // 按评论发布时间倒序排序
    return myComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderMyComments() {
    const myComments = getMyComments();
    const container = document.getElementById('my-comments-container');
    const countEl = document.getElementById('my-comments-count');
    
    if (!container || !countEl) return;
    
    // 更新评论总数
    countEl.textContent = myComments.length;

    if (myComments.length === 0) {
        container.innerHTML = `
            <div class="empty-posts">
                <i class="bi bi-chat-left"></i>
                <h4>你还没有发布任何评论</h4>
                <p>${CONSTANTS.EMPTY_STATE_TEXTS.MY_COMMENTS}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    myComments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-card';
        commentItem.innerHTML = `
            <div class="comment-card-header">
                <span class="post-title-link" data-post-id="${comment.postId}">${comment.postTitle}</span>
                <span class="badge bg-warning text-dark">${comment.postCategory}</span>
                <button class="comment-action-btn delete-comment-btn ms-2" data-comment-id="${comment.id}" data-post-id="${comment.postId}">
                    <i class="bi bi-trash"></i> 删除
                </button>
            </div>
            <div class="comment-card-content">
                <p>${comment.content}</p>
            </div>
            <div class="comment-card-footer">
                <span class="text-muted">发布于 ${formatCommentTime(comment.createdAt)}</span>
            </div>
        `;
        
        // 点击帖子标题跳转到帖子详情
        const postTitleLink = commentItem.querySelector('.post-title-link');
        if (postTitleLink) {
            postTitleLink.addEventListener('click', () => {
                const posts = getPosts();
                const post = posts.find(p => p.id === Number(comment.postId));
                if (post) {
                    const myCommentsModal = bootstrap.Modal.getInstance(document.getElementById('myCommentsModal'));
                    if (myCommentsModal) myCommentsModal.hide();
                    openPostDetail(post);
                }
            });
        }
        
        // 删除评论
        const deleteBtn = commentItem.querySelector('.delete-comment-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('确定要删除这条评论吗？')) {
                    let allComments = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, {});
                    const postId = Number(deleteBtn.dataset.postId);
                    allComments[postId] = allComments[postId].filter(c => c.id !== Number(deleteBtn.dataset.commentId));
                    StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, allComments);
                    renderMyComments();
                }
            });
        }

        fragment.appendChild(commentItem);
    });
    
    container.appendChild(fragment);
}

function initMyCommentsFunction() {
    const myCommentsBtn = document.getElementById('my-comments-btn');
    const myCommentsModal = new bootstrap.Modal(document.getElementById('myCommentsModal'));
    
    if (myCommentsBtn) {
        myCommentsBtn.addEventListener('click', () => {
            renderMyComments();
            myCommentsModal.show();
        });
    }
}

// ========== 头像上传功能 ==========
function initAvatarUploadFunction() {
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const avatarModal = new bootstrap.Modal(document.getElementById('avatarUploadModal'));
    const avatarFileInput = document.getElementById('avatarFileInput');
    const avatarPreviewImg = document.getElementById('avatarPreviewImg');
    const saveAvatarBtn = document.getElementById('saveAvatarBtn');
    
    if (!changeAvatarBtn || !avatarPreviewImg || !saveAvatarBtn) return;
    
    let imageDataUrl = '';
    
    // 初始化预览图
    changeAvatarBtn.addEventListener('click', () => {
        const currentUser = getCurrentUser();
        avatarPreviewImg.src = SafeUtil.escapeHTML(currentUser.avatar);
        imageDataUrl = currentUser.avatar;
        avatarModal.show();
    });
    
    // 图片预览
    if (avatarFileInput) {
        // 避免重复绑定事件
        const newAvatarInput = avatarFileInput.cloneNode(true);
        avatarFileInput.parentNode.replaceChild(newAvatarInput, avatarFileInput);
        
        newAvatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    imageDataUrl = event.target.result;
                    avatarPreviewImg.src = imageDataUrl;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // 保存头像
    saveAvatarBtn.addEventListener('click', () => {
        if (!imageDataUrl) return;
        
        const currentUser = getCurrentUser();
        currentUser.avatar = imageDataUrl;
        saveCurrentUser(currentUser);
        
        // 更新页面中的头像
        document.querySelectorAll('.author-avatar, #postDetailModal .rounded-circle, #userAvatarBtn').forEach(img => {
            img.src = currentUser.avatar;
        });
        
        avatarModal.hide();
        alert('头像更换成功！');
    });
}

// ========== 我的收藏功能 ==========
function renderCollections() {
    const collections = getCollections().map(id => Number(id));
    const posts = getPosts();
    const collectionPosts = posts.filter(post => collections.includes(post.id));
    const container = document.getElementById('collection-container');
    const countEl = document.getElementById('collection-count');
    
    if (!container || !countEl) return;
    
    countEl.textContent = collectionPosts.length;
    
    if (collectionPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-posts">
                <i class="bi bi-bookmark-heart"></i>
                <h4>暂无收藏的帖子</h4>
                <p>${CONSTANTS.EMPTY_STATE_TEXTS.COLLECTIONS}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    let isProcessing = false; // 添加状态锁，避免重复操作
    
    collectionPosts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'post-card';
        postElement.style.transition = 'opacity 0.2s ease'; // 添加过渡动画
        const hotTag = post.hot ? '<span class="post-hot">热门</span>' : '';
        postElement.innerHTML = `
            <img src="${SafeUtil.escapeHTML(post.image)}" class="post-img" alt="${SafeUtil.escapeHTML(post.title)}" data-img="${SafeUtil.escapeHTML(post.image)}">
            <div class="post-content">
                <h3 class="post-title">${hotTag}${SafeUtil.escapeHTML(post.title)}</h3>
                <p class="post-desc">${SafeUtil.escapeHTML(post.content)}</p>
                <div class="post-footer">
                    <div class="post-author">
                        <img src="${post.author === getCurrentUser().username ? getCurrentUser().avatar : `https://picsum.photos/id/${(post.author.charCodeAt(0) || 0) % 50}/20/20`}" class="author-avatar">
                        <span>@${SafeUtil.escapeHTML(post.author || '美食爱好者')}</span>
                    </div>
                    <div class="post-actions">
                        <span class="post-category">${SafeUtil.escapeHTML(post.category)}</span>
                        <div class="post-like" data-post-id="${post.id}">
                            <i class="bi bi-heart-fill like-icon"></i>
                            <span class="like-count">${post.likes || 0}</span>
                        </div>
                        <div class="post-collect collected" data-post-id="${post.id}">
                            <i class="bi bi-bookmark-heart-fill"></i>
                            <span>已收藏</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 图片预览
        const postImg = postElement.querySelector('.post-img');
        if (postImg) {
            postImg.addEventListener('click', (e) => {
                e.stopPropagation();
                const previewModal = new bootstrap.Modal(document.getElementById('imagePreviewModal'));
                const previewImage = document.getElementById('previewImage');
                if (previewImage) {
                    previewImage.src = postImg.dataset.img;
                }
                previewModal.show();
            });
        }
        
        // 取消收藏 - 核心修复部分
        const collectBtn = postElement.querySelector('.post-collect');
        if (collectBtn) {
            collectBtn.addEventListener('click', (e) => {
                // 1. 强制阻止事件冒泡，避免被父元素事件拦截
                e.stopImmediatePropagation();
                e.preventDefault();
                
                // 2. 状态锁，避免重复点击
                if (isProcessing) return;
                isProcessing = true;
                
                // 3. 视觉反馈：按钮置灰，卡片淡出
                collectBtn.style.opacity = '0.5';
                collectBtn.style.pointerEvents = 'none';
                postElement.style.opacity = '0';
                
                // 4. 异步执行操作，避开主线程阻塞
                setTimeout(() => {
                    try {
                        const postId = Number(collectBtn.dataset.postId);
                        saveCollection(postId, false);
                        renderCollections(); // 重新渲染列表
                    } catch (err) {
                        console.error('取消收藏失败:', err);
                        alert('取消收藏失败，请重试！');
                        // 恢复视觉状态
                        collectBtn.style.opacity = '1';
                        collectBtn.style.pointerEvents = 'auto';
                        postElement.style.opacity = '1';
                    } finally {
                        isProcessing = false;
                    }
                }, 100); // 匹配过渡动画时长
            });
        }
        
        // 点击查看详情 - 优化事件判断
        postElement.addEventListener('click', (e) => {
            // 排除收藏按钮区域的点击
            if (!e.target.closest('.post-collect') && !isProcessing) {
                openPostDetail(post);
            }
        });
        
        fragment.appendChild(postElement);
    });
    
    container.appendChild(fragment);
}

function initCollectionFunction() {
    const myCollectionBtn = document.getElementById('my-collection-btn');
    const collectionModal = new bootstrap.Modal(document.getElementById('myCollectionModal'));
    
    if (myCollectionBtn) {
        myCollectionBtn.addEventListener('click', () => {
            renderCollections();
            collectionModal.show();
        });
    }
}

// ========== 我的关注功能 ==========
function renderFollows() {
    const follows = getFollows();
    const container = document.getElementById('follow-list');
    const countEl = document.getElementById('follow-count');
    
    if (!container || !countEl) return;
    
    countEl.textContent = follows.length;
    
    if (follows.length === 0) {
        container.innerHTML = `
            <div class="empty-posts">
                <i class="bi bi-people"></i>
                <h4>暂无关注的博主</h4>
                <p>${CONSTANTS.EMPTY_STATE_TEXTS.FOLLOWS}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    let isProcessing = false; // 添加状态锁
    
    follows.forEach(author => {
        const followItem = document.createElement('div');
        followItem.className = 'd-flex align-items-center justify-content-between p-3 border-bottom';
        followItem.style.transition = 'opacity 0.2s ease'; // 添加过渡动画
        followItem.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="https://picsum.photos/id/${(author.charCodeAt(0) || 0) % 50}/40/40" class="rounded-circle me-2" width="40" height="40">
                <span class="fw-bold">@${SafeUtil.escapeHTML(author)}</span>
            </div>
            <button class="follow-btn followed" data-author="${SafeUtil.escapeHTML(author)}">已关注</button>
        `;
        
        // 取消关注 - 优化版
        const followBtn = followItem.querySelector('.follow-btn');
        if (followBtn) {
            followBtn.addEventListener('click', (e) => {
                e.stopImmediatePropagation();
                e.preventDefault();
                
                if (isProcessing) return;
                isProcessing = true;
                
                // 视觉反馈
                followBtn.style.opacity = '0.5';
                followBtn.style.pointerEvents = 'none';
                followItem.style.opacity = '0';
                
                // 异步执行操作
                setTimeout(() => {
                    try {
                        const authorName = followBtn.dataset.author;
                                                    saveFollow(authorName, false);
                        renderFollows(); // 重新渲染关注列表
                    } catch (err) {
                        console.error('取消关注失败:', err);
                        alert('取消关注失败，请重试！');
                        // 恢复视觉状态
                        followBtn.style.opacity = '1';
                        followBtn.style.pointerEvents = 'auto';
                        followItem.style.opacity = '1';
                    } finally {
                        isProcessing = false;
                    }
                }, 100);
            });
        }
        
        // 点击博主名称查看其发布的帖子
        const authorNameEl = followItem.querySelector('.fw-bold');
        if (authorNameEl) {
            authorNameEl.addEventListener('click', () => {
                const followModal = bootstrap.Modal.getInstance(document.getElementById('myFollowsModal'));
                if (followModal) followModal.hide();
                
                // 打开博主帖子列表模态框
                openAuthorPostsModal(author);
            });
        }
        
        fragment.appendChild(followItem);
    });
    
    container.appendChild(fragment);
}

function initFollowFunction() {
    const myFollowsBtn = document.getElementById('my-follows-btn');
    const followModal = new bootstrap.Modal(document.getElementById('myFollowsModal'));
    
    if (myFollowsBtn) {
        myFollowsBtn.addEventListener('click', () => {
            renderFollows();
            followModal.show();
        });
    }
}

// ========== 博主帖子列表模态框 ==========
function openAuthorPostsModal(author) {
    // 动态创建博主帖子模态框（防止重复创建）
    if (!document.getElementById('authorPostsModal')) {
        const authorPostsModalHTML = `
            <div class="modal fade" id="authorPostsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-person-circle text-warning"></i> @<span id="authorName"></span> 的帖子
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="posts-container" id="author-posts-container"></div>
                            <div id="author-posts-container-pagination"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', authorPostsModalHTML);
    }
    
    const modal = new bootstrap.Modal(document.getElementById('authorPostsModal'));
    const authorNameEl = document.getElementById('authorName');
    if (authorNameEl) authorNameEl.textContent = SafeUtil.escapeHTML(author);
    
    // 筛选该博主的帖子
    const filterAuthorPosts = (page = 1) => {
        const posts = getPosts().filter(post => post.author === author);
        const startIndex = (page - 1) * CONSTANTS.PAGE_SIZE;
        const endIndex = startIndex + CONSTANTS.PAGE_SIZE;
        return {
            list: posts.slice(startIndex, endIndex),
            total: posts.length,
            page,
            totalPages: Math.ceil(posts.length / CONSTANTS.PAGE_SIZE)
        };
    };
    
    // 渲染博主帖子
    const renderAuthorPosts = (page = 1) => {
        const container = document.getElementById('author-posts-container');
        if (!container) return;
        
        container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>加载博主帖子中...</p></div>';
        
        setTimeout(() => {
            const { list: authorPosts, total, totalPages } = filterAuthorPosts(page);
            
            if (authorPosts.length === 0) {
                container.innerHTML = `
                    <div class="empty-posts">
                        <i class="bi bi-file-text"></i>
                        <h4>该博主暂无发布的帖子</h4>
                        <p>快去关注其他美食博主吧～</p>
                    </div>
                `;
                renderPagination('author-posts-container-pagination', { totalPages: 0, page, total });
                return;
            }
            
            container.innerHTML = '';
            const fragment = document.createDocumentFragment();
            
            authorPosts.forEach(post => {
                const postElement = createPostElement(post);
                bindPostEvents(postElement, post, 'author-posts-container');
                fragment.appendChild(postElement);
            });
            
            container.appendChild(fragment);
            
            // 渲染分页
            renderPagination('author-posts-container-pagination', {
                list: authorPosts,
                total,
                page,
                totalPages
            });
        }, 300);
    };
    
    renderAuthorPosts();
    modal.show();
    
    // 绑定分页事件（复用逻辑）
    document.getElementById('author-posts-container-pagination')?.addEventListener('click', (e) => {
        if (e.target.closest('.page-link')) {
            const targetPage = Number(e.target.closest('.page-link').dataset.page);
            if (targetPage >= 1) {
                renderAuthorPosts(targetPage);
            }
        }
    });
}

// ========== 点赞列表弹窗功能 ==========
function openLikeList(postId) {
    postId = Number(postId);
    const likeUsers = getLikeUsers(postId);
    
    // 动态创建点赞列表模态框
    if (!document.getElementById('likeListModal')) {
        const likeListModalHTML = `
            <div class="modal fade" id="likeListModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-md">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-heart-fill text-danger"></i> 点赞列表
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="like-users-list" class="like-users-list"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', likeListModalHTML);
    }
    
    const modal = new bootstrap.Modal(document.getElementById('likeListModal'));
    const likeUsersListEl = document.getElementById('like-users-list');
    
    if (!likeUsersListEl) return;
    
    if (likeUsers.length === 0) {
        likeUsersListEl.innerHTML = `
            <div class="empty-posts text-center p-3">
                <i class="bi bi-heart"></i>
                <p>暂无用户点赞该帖子</p>
            </div>
        `;
    } else {
        likeUsersListEl.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        likeUsers.forEach(username => {
            const userItem = document.createElement('div');
            userItem.className = 'd-flex align-items-center p-2 border-bottom';
            userItem.innerHTML = `
                <img src="https://picsum.photos/id/${(username.charCodeAt(0) || 0) % 50}/40/40" class="rounded-circle me-2" width="40" height="40">
                <span class="fw-medium">@${SafeUtil.escapeHTML(username)}</span>
                ${!isAuthorFollowed(username) ? 
                    `<button class="ms-auto follow-btn btn-sm" data-author="${SafeUtil.escapeHTML(username)}">关注</button>` : 
                    `<button class="ms-auto follow-btn btn-sm followed" data-author="${SafeUtil.escapeHTML(username)}">已关注</button>`}
            `;
            
            // 关注/取消关注功能
            const followBtn = userItem.querySelector('.follow-btn');
            if (followBtn) {
                followBtn.addEventListener('click', () => {
                    const author = followBtn.dataset.author;
                    const isFollowed = isAuthorFollowed(author);
                    saveFollow(author, !isFollowed);
                    followBtn.className = `ms-auto follow-btn btn-sm ${!isFollowed ? 'followed' : ''}`;
                    followBtn.textContent = !isFollowed ? '已关注' : '关注';
                });
            }
            
            fragment.appendChild(userItem);
        });
        
        likeUsersListEl.appendChild(fragment);
    }
    
    modal.show();
}

// ========== 举报功能 ==========
function initReportFunction() {
    // 为帖子详情页添加举报按钮
    document.addEventListener('click', (e) => {
        if (e.target.closest('.report-post-btn')) {
            const postId = Number(e.target.closest('.report-post-btn').dataset.postId);
            openReportModal(postId);
        }
    });
    
    // 动态创建举报模态框
    if (!document.getElementById('reportModal')) {
        const reportModalHTML = `
            <div class="modal fade" id="reportModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-sm">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-exclamation-triangle text-warning"></i> 举报帖子
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" id="report-post-id" value="">
                            <div class="mb-3">
                                <label class="form-label">举报原因</label>
                                <select class="form-select" id="report-reason">
                                    <option value="">请选择举报原因</option>
                                    <option value="色情低俗">色情低俗</option>
                                    <option value="广告营销">广告营销</option>
                                    <option value="恶意攻击">恶意攻击</option>
                                    <option value="内容不实">内容不实</option>
                                    <option value="其他">其他</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">详细说明（选填）</label>
                                <textarea class="form-control" id="report-desc" rows="3" placeholder="请描述具体问题..."></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-danger" id="submit-report">提交举报</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', reportModalHTML);
        
        // 绑定提交举报事件
        document.getElementById('submit-report')?.addEventListener('click', () => {
            const postId = Number(document.getElementById('report-post-id')?.value);
            const reason = document.getElementById('report-reason')?.value;
            const desc = document.getElementById('report-desc')?.value.trim() || '';
            
            if (!reason) {
                alert('请选择举报原因！');
                return;
            }
            
            // 保存举报信息
            const reports = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POST_REPORTS, {});
            if (!reports[postId]) {
                reports[postId] = [];
            }
            reports[postId].push({
                id: SafeUtil.generateUniqueId(),
                reporter: getCurrentUser().username,
                reason,
                desc,
                createdAt: new Date().toISOString()
            });
            StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.POST_REPORTS, reports);
            
            // 关闭模态框并提示
            const modal = bootstrap.Modal.getInstance(document.getElementById('reportModal'));
            modal.hide();
            alert('举报提交成功，我们会尽快处理！');
        });
    }
}
    // ========== 头像下拉菜单功能 ==========
function initAvatarDropdown() {
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdownMenu = document.getElementById('avatarDropdownMenu');
  if (!avatarBtn || !dropdownMenu) return;

  // 切换下拉菜单显示/隐藏
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发全局点击关闭
    const isHidden = dropdownMenu.style.display === 'none';
    dropdownMenu.style.display = isHidden ? 'block' : 'none';
  });

  // 点击空白处关闭下拉菜单
  document.addEventListener('click', () => {
    if (dropdownMenu.style.display === 'block') {
      dropdownMenu.style.display = 'none';
    }
  });

  // 阻止下拉菜单内部点击触发关闭
  dropdownMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // 初始化头像显示（同步当前用户头像）
  const currentUser = getCurrentUser();
  const avatarImg = avatarBtn.querySelector('img');
  if (avatarImg) {
    avatarImg.src = SafeUtil.escapeHTML(currentUser.avatar);
  }

  // 可选：退出登录功能
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('确定要退出登录吗？')) {
        // 清空用户信息（保留帖子等数据，仅重置当前用户）
        saveCurrentUser({
          username: "美食爱好者",
          avatar: "https://picsum.photos/id/237/40/40"
        });
        // 刷新页面
        window.location.reload();
      }
    });
  }
}

// ========== 欢迎引导弹窗 ==========
function initWelcomeGuide() {
    const hasShownWelcome = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.HAS_SHOWN_WELCOME, false);
    if (hasShownWelcome) return;
    
    // 动态创建欢迎引导模态框
    const welcomeModalHTML = `
        <div class="modal fade show" id="welcomeModal" tabindex="-1" style="display: block; background-color: rgba(0,0,0,0.5);" aria-modal="true">
            <div class="modal-dialog modal-md">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-white">
                        <h5 class="modal-title">🎉 欢迎来到美食社区！</h5>
                        <button type="button" class="btn-close btn-close-white" id="close-welcome-modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="welcome-steps">
                            <div class="step-item mb-3">
                                <span class="step-number bg-warning text-white rounded-circle d-inline-block w-25 h-25 d-flex align-items-center justify-content-center mb-2">1</span>
                                <p>发布你的美食作品，分享烹饪心得</p>
                            </div>
                            <div class="step-item mb-3">
                                <span class="step-number bg-warning text-white rounded-circle d-inline-block w-25 h-25 d-flex align-items-center justify-content-center mb-2">2</span>
                                <p>点赞、收藏喜欢的帖子，关注美食博主</p>
                            </div>
                            <div class="step-item">
                                <span class="step-number bg-warning text-white rounded-circle d-inline-block w-25 h-25 d-flex align-items-center justify-content-center mb-2">3</span>
                                <p>参与评论互动，交流美食技巧</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-warning" id="start-exploring-btn">开始探索</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', welcomeModalHTML);
    
    // 绑定关闭事件
    const closeWelcomeModal = () => {
        const modal = document.getElementById('welcomeModal');
        if (modal) modal.remove();
        StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.HAS_SHOWN_WELCOME, true);
    };
    
    document.getElementById('close-welcome-modal')?.addEventListener('click', closeWelcomeModal);
    document.getElementById('start-exploring-btn')?.addEventListener('click', closeWelcomeModal);
}
// ========== 头像下拉菜单功能 ==========
function initAvatarDropdown() {
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdownMenu = document.getElementById('avatarDropdownMenu');
  if (!avatarBtn || !dropdownMenu) return;

  // 初始化时隐藏菜单（冗余保障）
  dropdownMenu.classList.remove('show');
  
  // 切换下拉菜单显示/隐藏
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡
    dropdownMenu.classList.toggle('show');
  });

  // 点击空白处关闭下拉菜单
  document.addEventListener('click', () => {
    if (dropdownMenu.classList.contains('show')) {
      dropdownMenu.classList.remove('show');
    }
  });

  // 阻止下拉菜单内部点击触发关闭
  dropdownMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // 初始化头像显示（同步当前用户头像）
  const currentUser = getCurrentUser();
  const avatarImg = avatarBtn.querySelector('img');
  if (avatarImg) {
    avatarImg.src = SafeUtil.escapeHTML(currentUser.avatar || "https://picsum.photos/id/237/40/40");
  }

  // 退出登录功能
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('确定要退出登录吗？')) {
        // 清空用户信息
        saveCurrentUser({
          username: "美食爱好者",
          avatar: "https://picsum.photos/id/237/40/40"
        });
        // 刷新页面
        window.location.reload();
      }
      // 关闭下拉菜单
      dropdownMenu.classList.remove('show');
    });
  }

  // 绑定其他菜单项事件（示例：更换头像）
  const changeAvatarBtn = document.getElementById('change-avatar-btn');
  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', () => {
      const avatarModal = new bootstrap.Modal(document.getElementById('avatarUploadModal'));
      avatarModal.show();
      dropdownMenu.classList.remove('show');
    });
  }

  // 我的帖子按钮
  const myPostsBtn = document.getElementById('my-posts-btn');
  if (myPostsBtn) {
    myPostsBtn.addEventListener('click', () => {
      const modal = new bootstrap.Modal(document.getElementById('userPostsModal'));
      modal.show();
      dropdownMenu.classList.remove('show');
    });
  }
}

// 确保DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  initAvatarDropdown();
});

// ========== 初始化所有功能 ==========
function initAllFunctions() {
    // 初始化核心功能
    initPublishFunction();
    initFilterButtons();
    initSearchFunction();
    initSortFunction();
    initMyPostsFunction();
    initLikedPostsFunction();
    initMyCommentsFunction();
    initAvatarUploadFunction();
    initCollectionFunction();
    initFollowFunction();
    initReportFunction();
    initAvatarDropdown()
    
    // 首次加载帖子列表
    renderPosts();
    
    // 初始化欢迎引导（仅首次）
    setTimeout(initWelcomeGuide, 1000);
    
    // 初始化点赞数徽章
    updateLikesBadge();
    
    // 全局点击事件：关闭分享选项
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.share-btn')) {
            document.querySelectorAll('.share-options').forEach(opt => {
                opt.classList.remove('show');
            });
        }
    });
    // ========== 头像下拉菜单功能 ==========
function initAvatarDropdown() {
    // 获取DOM元素
    const avatarButton = document.getElementById('userAvatar');
    const dropdownMenu = document.getElementById('avatarDropdown');
    if (!avatarButton || !dropdownMenu) return;

    // 初始化状态
    let isMenuOpen = false;
    dropdownMenu.style.display = 'none';

    // 更新收到的赞数量显示
    function updateLikesCount() {
        const likesBadge = document.querySelector('.received-likes .badge');
        if (likesBadge) {
            const posts = getPosts();
            const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
            likesBadge.textContent = totalLikes;
        }
    }

    // 切换下拉菜单显示状态
    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
        dropdownMenu.style.display = isMenuOpen ? 'block' : 'none';
        if (isMenuOpen) {
            updateLikesCount(); // 显示时更新赞数量
        }
    }

    // 关闭下拉菜单
    function closeMenu() {
        if (isMenuOpen) {
            isMenuOpen = false;
            dropdownMenu.style.display = 'none';
        }
    }

    // 头像点击事件
    avatarButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    // 点击页面其他区域关闭菜单
    document.addEventListener('click', closeMenu);

    // 阻止菜单内部点击关闭
    dropdownMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 初始化头像显示
    const currentUser = getCurrentUser();
    const avatarImg = avatarButton.querySelector('img');
    if (avatarImg) {
        avatarImg.src = SafeUtil.escapeHTML(currentUser.avatar || 'https://picsum.photos/id/237/40/40');
    }

    // 菜单项事件绑定
    const menuActions = {
        'change-avatar': () => {
            const avatarModal = new bootstrap.Modal(document.getElementById('avatarModal'));
            avatarModal.show();
            closeMenu();
        },
        'my-posts': () => {
            renderMyPosts();
            const postsModal = new bootstrap.Modal(document.getElementById('myPostsModal'));
            postsModal.show();
            closeMenu();
        },
        'my-collection': () => {
            renderCollections();
            const collectionModal = new bootstrap.Modal(document.getElementById('collectionModal'));
            collectionModal.show();
            closeMenu();
        },
        'my-follows': () => {
            renderFollows();
            const followsModal = new bootstrap.Modal(document.getElementById('followsModal'));
            followsModal.show();
            closeMenu();
        },
        'received-likes': () => {
            renderLikedPosts();
            const likesModal = new bootstrap.Modal(document.getElementById('likesModal'));
            likesModal.show();
            closeMenu();
        },
        'my-comments': () => {
            renderMyComments();
            const commentsModal = new bootstrap.Modal(document.getElementById('commentsModal'));
            commentsModal.show();
            closeMenu();
        },
        'logout': () => {
            if (confirm('确定要退出登录吗？')) {
                // 重置用户信息
                saveCurrentUser({
                    username: '美食爱好者',
                    avatar: 'https://picsum.photos/id/237/40/40'
                });
                window.location.reload();
            }
            closeMenu();
        }
    };

    // 绑定所有菜单项点击事件
    Object.keys(menuActions).forEach(action => {
        const item = dropdownMenu.querySelector(`[data-action="${action}"]`);
        if (item) {
            item.addEventListener('click', menuActions[action]);
        }
    });

    // 初始更新一次赞数量
    updateLikesCount();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initAvatarDropdown();
});
    // 评论发布功能（通用）
    document.addEventListener('click', (e) => {
        if (e.target.closest('.comment-submit')) {
            const submitBtn = e.target.closest('.comment-submit');
            const postId = Number(submitBtn.dataset.postId);
            const isDetailModal = submitBtn.closest('#postDetailModal') ? true : false;
            const inputId = isDetailModal ? 'detailCommentInput' : `comment-input-${postId}`;
            const input = document.getElementById(inputId);
            
            if (!input) return;
            const content = input.value.trim();
            if (!content) {
                alert('评论内容不能为空！');
                return;
            }
            
            // 获取回复目标
            const replyTo = input.dataset.replyTo || '';
            const replyCommentId = input.dataset.replyCommentId || '';
            
            // 创建新评论
            const newComment = {
                id: SafeUtil.generateUniqueId(),
                author: getCurrentUser().username,
                content: SafeUtil.escapeHTML(content),
                createdAt: new Date().toISOString(),
                likes: 0,
                replies: [],
                ...(replyTo ? { replyTo } : {})
            };
            
            // 保存评论
            let allComments = StorageUtil.get(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, {});
            if (!allComments[postId]) {
                allComments[postId] = [];
            }
            
            // 如果是回复，添加到对应评论的replies中
            if (replyCommentId) {
                const commentIndex = allComments[postId].findIndex(c => c.id === Number(replyCommentId));
                if (commentIndex !== -1) {
                    allComments[postId][commentIndex].replies.push(newComment);
                } else {
                    allComments[postId].push(newComment);
                }
            } else {
                allComments[postId].push(newComment);
            }
            
            StorageUtil.set(CONSTANTS.LOCAL_STORAGE_KEYS.POST_COMMENTS, allComments);
            
            // 更新帖子评论数
            let posts = getPosts();
            const postIndex = posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                posts[postIndex].comments = (posts[postIndex].comments || 0) + 1;
                savePosts(posts);
            }
            
            // 重新加载评论
            loadPostComments(postId, isDetailModal);
            
            // 重置输入框
            input.value = '';
            delete input.dataset.replyTo;
            delete input.dataset.replyCommentId;
            
            // 同步更新我的评论列表
            renderMyComments();
        }
    });
}

// ========== 页面加载完成后初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
    initAllFunctions();
});



// ========== 适配无地图版本：高德地图附近饭店搜索（自动定位版+直接导航） ==========
document.addEventListener('DOMContentLoaded', function() {
    // 1. 配置高德地图 Key（替换为你自己的Key）
    const AMAP_JS_KEY = "b0427c8a38493461af1b092c4161ec95"; 
    const AMAP_WEB_KEY = "b0427c8a38493461af1b092c4161ec95"; 
    
    // 2. 全局变量
    let userLocation = null;
    
    // 3. 检查DOM元素是否存在
    const checkDOM = () => {
        const elements = {
            restaurantList: document.getElementById('restaurant-list')
        };
        
        const missing = Object.entries(elements).filter(([key, el]) => !el).map(([key]) => key);
        if (missing.length > 0) {
            console.error(`高德地图功能初始化失败：缺失DOM元素 - ${missing.join(', ')}`);
            const alertContainer = document.createElement('div');
            alertContainer.className = 'alert alert-warning mt-3';
            alertContainer.innerHTML = `<i class="bi bi-exclamation-triangle"></i> 地图功能初始化失败：页面缺少必要的DOM元素（restaurant-list）`;
            document.body.appendChild(alertContainer);
            setTimeout(() => alertContainer.remove(), 5000);
            return null;
        }
        return elements;
    };
    
    // 4. 初始化主函数
    const initAMap = () => {
        const elements = checkDOM();
        if (!elements) return; 
        
        const { restaurantList } = elements;
        
        // 5. 动态加载高德地图API（仅用于定位）
        const loadAMapScript = () => {
            return new Promise((resolve, reject) => {
                if (window.AMap) {
                    resolve(window.AMap);
                    return;
                }
                
                const script = document.createElement('script');
                script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_JS_KEY}`;
                script.type = 'text/javascript';
                script.async = true;
                
                script.onload = () => resolve(window.AMap);
                script.onerror = () => reject(new Error('高德地图JSAPI加载失败，请检查Key是否有效或网络状况'));
                
                document.head.appendChild(script);
            });
        };
        
        // 6. 加载API并自动触发定位
        loadAMapScript().then(AMap => {
            restaurantList.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-geo-alt me-2"></i> 正在自动定位并搜索附近饭店...
                </div>
            `;
            handleLocation(AMap, restaurantList);
        }).catch(error => {
            console.error('地图初始化失败：', error);
            elements.restaurantList.innerHTML = `
                <div class="text-center text-danger py-3">
                    <i class="bi bi-exclamation-circle me-2"></i> ${error.message}
                    <div class="mt-2">
                        <button class="btn btn-sm btn-warning" onclick="initAMap()">重新加载</button>
                    </div>
                </div>
            `;
        });
    };
    
    // 7. 处理定位逻辑
    const handleLocation = (AMap, restaurantList) => {
        restaurantList.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-warning" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">正在获取您的位置...</p>
            </div>
        `;
        
        // 动态加载定位插件
        AMap.plugin('AMap.Geolocation', () => {
            const geolocation = new AMap.Geolocation({
                enableHighAccuracy: true, 
                timeout: 15000, 
                buttonPosition: 'RB'
            });
            
            // 执行定位
            geolocation.getCurrentPosition((status, result) => {
                if (status === 'complete') {
                    // 定位成功
                    userLocation = {
                        lng: result.position.lng,
                        lat: result.position.lat,
                        address: result.formattedAddress || '未知位置'
                    };
                    
                    // 优先使用 JSAPI 搜索，失败则用 Web 服务 API
                    searchNearbyRestaurantsByJSAPI(AMap, restaurantList)
                        .catch(() => searchNearbyRestaurantsByWebAPI(restaurantList));
                } else {
                    // 定位失败
                    restaurantList.innerHTML = `
                        <div class="text-center text-danger py-3">
                            <i class="bi bi-exclamation-circle me-2"></i> 定位失败：${result.message || '未知错误'}
                            <div class="mt-2">
                                <button class="btn btn-sm btn-warning" onclick="handleLocation(AMap, restaurantList)">重新定位</button>
                            </div>
                        </div>
                    `;
                }
            });
        });
    };
    
    // 8. 方案1：使用 JSAPI PlaceSearch 搜索
    const searchNearbyRestaurantsByJSAPI = (AMap, restaurantList) => {
        return new Promise((resolve, reject) => {
            restaurantList.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border text-warning" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">正在搜索10公里内的饭店...</p>
                </div>
            `;
            
            // 动态加载POI搜索插件
            AMap.plugin('AMap.PlaceSearch', () => {
                const placeSearch = new AMap.PlaceSearch({
                    pageSize: 10, 
                    pageIndex: 1,
                    type: '050000', 
                    panel: false 
                });
                
                // 搜索10公里范围内的餐饮
                placeSearch.searchNearBy('饭店', [userLocation.lng, userLocation.lat], 10000, (status, result) => {
                    if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
                        renderStyledRestaurants(restaurantList, result.poiList.pois);
                        resolve();
                    } else {
                        // 无结果，尝试搜索“餐饮”
                        placeSearch.searchNearBy('餐饮', [userLocation.lng, userLocation.lat], 15000, (s, r) => {
                            if (s === 'complete' && r.poiList && r.poiList.pois.length > 0) {
                                renderStyledRestaurants(restaurantList, r.poiList.pois);
                                resolve();
                            } else {
                                reject();
                            }
                        });
                    }
                });
            });
        });
    };
    
    // 9. 方案2：使用 Web 服务 API 搜索
    const searchNearbyRestaurantsByWebAPI = (restaurantList) => {
        restaurantList.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-warning" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">备用通道搜索中...</p>
            </div>
        `;
        
        // 构造 Web 服务 API 请求 URL
        const webApiUrl = `https://restapi.amap.com/v3/place/around?key=${AMAP_WEB_KEY}&location=${userLocation.lng},${userLocation.lat}&keywords=饭店,餐饮&types=050000&radius=15000&offset=10&page=1&extensions=all`;
        
        fetch(webApiUrl)
            .then(response => response.json())
            .then(result => {
                if (result.status === '1' && result.pois && result.pois.length > 0) {
                    renderStyledRestaurants(restaurantList, result.pois);
                } else {
                    restaurantList.innerHTML = `
                        <div class="text-center text-muted py-3">
                            <i class="bi bi-utensils me-2"></i> 未找到附近餐饮，建议扩大搜索范围或检查位置权限
                            <p class="mt-2 small text-danger">Web API 提示：${result.info || '无结果'}</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Web 服务 API 搜索失败：', error);
                restaurantList.innerHTML = `
                    <div class="text-center text-danger py-3">
                        <i class="bi bi-exclamation-circle me-2"></i> 搜索失败：${error.message}
                        <div class="mt-2">
                            <button class="btn btn-sm btn-warning" onclick="searchNearbyRestaurantsByWebAPI(restaurantList)">重试</button>
                        </div>
                    </div>
                `;
            });
    };
    
    // 10. 渲染美化后的餐厅卡片
    const renderStyledRestaurants = (container, restaurants) => {
        if (!container || !restaurants?.length) {
            container.innerHTML = `
                <div class="collect-empty" style="text-align:center; padding:30px; color:#a07846;">
                    <i class="bi bi-map-marker" style="font-size:36px; margin-bottom:10px;"></i>
                    <h4>暂无附近餐厅</h4>
                    <p>未获取到周边餐饮推荐～</p>
                </div>
            `;
            return;
        }

        let html = '';
        restaurants.forEach(rest => {
            const distance = rest.distance ? parseInt(rest.distance) : 0;
            const distanceText = distance > 1000 
                ? `${(distance/1000).toFixed(1)}km` 
                : `${distance}m`;
            const score = rest.score || rest.rating || 0;

            // 无图时，用店名生成文字占位图
            const imgUrl = rest.photos?.[0]?.url 
                ? rest.photos[0].url 
                : `https://via.placeholder.com/300x200?text=${encodeURIComponent(rest.name)}`;

            html += `
                <div class="restaurant-card" data-rest='${JSON.stringify(rest)}'>
                    <img src="${imgUrl}" alt="${rest.name}">
                    <h4>${rest.name}</h4>
                    <div class="restaurant-meta">
                        <div class="restaurant-rating">
                            <i class="bi bi-star-fill"></i>
                            <span>${score}</span>
                        </div>
                        <div class="restaurant-distance">
                            <i class="bi bi-signpost-split"></i>
                            <span>${distanceText}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // 给所有餐厅卡片绑定点击事件，触发弹窗
        document.querySelectorAll('.restaurant-card').forEach(card => {
            card.addEventListener('click', () => {
                try {
                    const rest = JSON.parse(card.dataset.rest);
                    showRestaurantModal(rest);
                } catch (e) {
                    console.error('解析餐厅数据失败：', e);
                    alert('获取餐厅信息失败，请重试');
                }
            });
        });
    };

    // 11. 显示餐厅介绍弹窗（核心修改：直接唤起APP导航）
    const showRestaurantModal = (rest) => {
        // 1. 先检查页面是否有弹窗容器，没有则动态创建
        let modal = document.getElementById('restaurant-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'restaurant-modal';
            modal.className = 'modal fade';
            modal.tabIndex = -1;
            modal.innerHTML = `
                <div class="modal-dialog modal-md">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="restaurant-modal-title"></h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <img id="restaurant-modal-img" class="restaurant-modal-img">
                            <div class="mb-2 restaurant-modal-meta">
                                <span class="text-warning"><i class="bi bi-star-fill"></i></span>
                                <span id="restaurant-modal-score">--</span>
                                <span class="ms-3"><i class="bi bi-signpost-split"></i> <span id="restaurant-modal-distance">--</span></span>
                            </div>
                            <div class="mb-3">
                                <h6 class="text-muted">地址</h6>
                                <p id="restaurant-modal-address" class="mb-0">--</p>
                            </div>
                            <div class="mb-3">
                                <h6 class="text-muted">简介</h6>
                                <p id="restaurant-modal-desc" class="mb-0">暂无简介</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            <button type="button" class="btn btn-warning" id="restaurant-nav-btn">
                                <i class="bi bi-map"></i> 导航到这里
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // 2. 填充弹窗数据
        document.getElementById('restaurant-modal-title').textContent = rest.name || '未知餐厅';
        document.getElementById('restaurant-modal-img').src = rest.photos?.[0]?.url 
            ? rest.photos[0].url 
            : `https://via.placeholder.com/300x200?text=${encodeURIComponent(rest.name || '未知餐厅')}`;
        document.getElementById('restaurant-modal-score').textContent = rest.score || rest.rating || '0.0';
        document.getElementById('restaurant-modal-distance').textContent = rest.distance 
            ? (rest.distance > 1000 ? `${(rest.distance/1000).toFixed(1)}km` : `${rest.distance}m`) 
            : '未知距离';
        document.getElementById('restaurant-modal-address').textContent = rest.address || rest.address_detail?.full || '未知地址';
        document.getElementById('restaurant-modal-desc').textContent = rest.business_area || rest.type || '暂无商家简介';

        // 3. 核心修改：直接唤起高德地图APP导航，失败降级网页版
        document.getElementById('restaurant-nav-btn').onclick = () => {
            try {
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                let appUrl = '';
                let webUrl = '';

                if (rest.location?.lng && rest.location?.lat) {
                    // 有经纬度：精准导航
                    appUrl = `amapuri://navigation?from=我的位置&to=${encodeURIComponent(rest.name || '未知餐厅')}&lat=${rest.location.lat}&lon=${rest.location.lng}&dev=0`;
                    webUrl = `https://amap.com/navigation?from=我的位置&to=${encodeURIComponent(rest.name || '未知餐厅')}&location=${rest.location.lng},${rest.location.lat}`;
                } else {
                    // 无经纬度：先搜索
                    appUrl = `amapuri://search?keywords=${encodeURIComponent(rest.name || '未知餐厅') + ' ' + (rest.address || '')}&dev=0`;
                    webUrl = `https://amap.com/search?query=${encodeURIComponent(rest.name || '未知餐厅') + ' ' + (rest.address || '')}`;
                }

                if (isMobile) {
                    // 移动端优先唤起APP
                    window.location.href = appUrl;
                    // 1.5秒后检测是否唤起成功，失败则跳转网页版
                    setTimeout(() => {
                        const isHidden = document.hidden || document.webkitHidden || document.msHidden;
                        if (!isHidden) {
                            window.open(webUrl, '_blank');
                        }
                    }, 1500);
                } else {
                    // PC端直接跳转网页版
                    window.open(webUrl, '_blank');
                }

                // 关闭弹窗
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            } catch (e) {
                console.error('导航功能异常：', e);
                alert('导航功能暂时不可用，请手动搜索');
            }
        };

        // 4. 显示弹窗
        try {
            new bootstrap.Modal(modal).show();
        } catch (e) {
            console.error('弹窗显示失败：', e);
            alert('无法打开餐厅详情，请检查Bootstrap是否正确加载');
        }
    };

    // 12. 暴露全局函数
    window.initAMap = initAMap;
    window.searchNearbyRestaurantsByWebAPI = searchNearbyRestaurantsByWebAPI;
    
    // 13. 启动初始化
    initAMap();
});

// 全局暴露
window.toggleCollection = toggleCollection;
window.removeCollection = toggleCollection;
window.viewCollectedRecipe = (id) => { showDetails(id); collectModal.hide(); };
window.viewMyRecipe = viewMyRecipe;
window.deleteUserRecipe = deleteUserRecipe;
window.fetchRecipes = fetchRecipes;
window.showDetails = showDetails;
window.handleAiRecipeClick = handleAiRecipeClick;
