// storage-util.js
const StorageUtil = {
    // 获取本地存储数据
    get: function(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.error('获取本地存储失败:', e);
            return defaultValue;
        }
    },
    
    // 设置本地存储数据
    set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('设置本地存储失败:', e);
            return false;
        }
    },
    
    // 删除本地存储数据
    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('删除本地存储失败:', e);
            return false;
        }
    }
};

// 常量定义
const CONSTANTS = {
    LOCAL_STORAGE_KEYS: {
        USER_DATA: 'tastyhub_user_data',
        CURRENT_USER: 'tastyhub_current_user',
        POSTS: 'tastyhub_posts',
        LIKES: 'tastyhub_likes',
        POST_LIKE_USERS: 'tastyhub_post_like_users',
        COMMENT_LIKES: 'tastyhub_comment_likes',
        POST_COMMENTS: 'tastyhub_post_comments',
        COLLECTIONS: 'tastyhub_collections',
        FOLLOWS: 'tastyhub_follows',
        POST_REPORTS: 'tastyhub_post_reports'
    },
    LONG_PRESS_DELAY: 500,
    VALID_CATEGORIES: ['recipe', 'tips', 'question', 'share', 'other'] // 示例有效分类
};