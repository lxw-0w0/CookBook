// ========== 核心配置与词典 ==========
const DEEPSEEK_KEY = "sk-0188270c22224ddda38db93e589937dd";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const RECIPE_API = "https://www.themealdb.com/api/json/v1/1/";

// ========== 天行数据配置 (BMI 和 中文食谱共用) ==========
const TIAN_KEY = "bec01a55dc51195668cdec1ea3f12046"; // 你的新 Key
const BMI_API = "https://apis.tianapi.com/bmi/index";
const TIAN_RECIPE_API = "https://apis.tianapi.com/caipu/index"; // 新增菜谱接口

let currentSource = 'global'; // 当前数据源状态

// 扩充词典 (用于辅助翻译)
const DICTIONARY = {
    "Chicken": "鸡肉", "Chicken Breast": "鸡胸肉", "Chicken Legs": "鸡腿", "Handi": "瓦罐炖",
    "Beef": "牛肉", "Pork": "猪肉", "Lamb": "羊肉", "Fish": "鱼", "Shrimp": "虾",
    "Bean Sprouts": "豆芽", "Mushrooms": "蘑菇", "Oyster Sauce": "蚝油", "Corn Starch": "玉米淀粉",
    "Sesame Seed Oil": "芝麻油", "Vegetable Oil": "植物油", "White Pepper": "白胡椒粉",
    "Soy Sauce": "酱油", "Sugar": "糖", "Water": "水", "Garlic": "大蒜", "Ginger": "生姜",
    "Onions": "洋葱", "Peapods": "豌豆荚", "Pho": "越南河粉", "Asado": "阿萨多烤肉",
    "Lo Mein": "捞面", "Rendang": "仁当", "Mechado": "番茄炖肉", "Szechuan": "四川",
    "Sticky": "蜜汁", "Congee": "粥", "Karaage": "唐扬炸鸡", "Instructions": "烹饪步骤",
    "Ingredients": "食材清单", "Spring Onions": "葱", "Coriander": "香菜"
};

const SMART_MAP = {
    "红烧肉": "Sweet and Sour Pork", "回锅肉": "Pork", "宫保鸡丁": "Kung Pao Chicken",
    "鸡肉": "Chicken", "牛肉": "Beef", "汉堡": "Burger", "意面": "Pasta",
    "沙拉": "Salad", "披萨": "Pizza", "鱼": "Fish", "虾": "Shrimp",
    "减脂餐": "Healthy Meal", "甜品": "Dessert", "火锅": "Hot Pot",
    "快手菜": "Quick Meal", "海鲜": "Seafood", "蔬菜": "Vegetables", "鸡蛋": "Egg"
};

// 简单拼音首字母转换工具
const pinyinUtil = {
    getFirstLetter: function(str) {
        const firstLetters = [];
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            if (charCode >= 0x4e00 && charCode <= 0x9fa5) {
                firstLetters.push('a'); 
            } else {
                firstLetters.push(str[i].toLowerCase());
            }
        }
        return firstLetters;
    }
};


// 切换数据源逻辑
function switchSource(source) {
    currentSource = source;
    const input = document.getElementById('search-input');
    const tagsGlobal = document.getElementById('tags-global');
    const tagsCn = document.getElementById('tags-cn');
    
    if (source === 'global') {
        // 切换到全球模式
        input.placeholder = "试试搜：Chicken, Beef, 汉堡...";
        if(tagsGlobal) tagsGlobal.classList.remove('d-none'); // 显示全球标签
        if(tagsCn) tagsCn.classList.add('d-none');            // 隐藏中式标签
    } else {
        // 切换到中式模式
        input.placeholder = "试试搜：红烧肉, 宫保鸡丁, 鱼香肉丝...";
        if(tagsGlobal) tagsGlobal.classList.add('d-none');    // 隐藏全球标签
        if(tagsCn) tagsCn.classList.remove('d-none');         // 显示中式标签
    }
    
    // 提示用户
    showAlert(`已切换到：${source === 'global' ? '全球食谱' : '中式精选 '}`, 'success');
}




// ========== 智能翻译缓存系统 ==========
const translationCache = {
    generateKey: function(text) {
        let hash = 0;
        for (let i = 0; i < Math.min(text.length, 100); i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash = hash & hash;
        }
        return 'trans_' + Math.abs(hash).toString(36);
    },
    get: function(key) {
        try {
            const cached = localStorage.getItem(key);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                    return parsed.data;
                }
            }
        } catch (e) { console.warn("缓存读取失败:", e); }
        return null;
    },
    set: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify({ data: data, timestamp: Date.now() }));
        } catch (e) { console.warn("缓存保存失败:", e); }
    }
};

// ========== 菜谱详情缓存 ==========
const recipeCache = {
    get: function(id) {
        try {
            const cached = localStorage.getItem(`recipe_${id}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
                    return parsed.data;
                }
            }
        } catch (e) { console.warn("菜谱缓存读取失败:", e); }
        return null;
    },
    set: function(id, data) {
        try {
            localStorage.setItem(`recipe_${id}`, JSON.stringify({ data: data, timestamp: Date.now() }));
        } catch (e) { console.warn("菜谱缓存保存失败:", e); }
    }
};

let searchInput, searchBtn, recipeContainer, recipeModal, collectModal;
let customAlert, alertText, collectList, modalTitle, modalImg, modalIngredients, modalInstructions;
let bmiHeight, bmiWeight, bmiBtn, bmiResult, aiInput, aiBtn, chatHistory;

// ========== 2. 翻译与工具函数 ==========
async function translateText(text) {
    if (!text) return "";
    
    // 1. 检查缓存
    const cacheKey = translationCache.generateKey(text);
    const cached = translationCache.get(cacheKey);
    if (cached) {
        console.log("✅ 使用缓存翻译");
        return cached;
    }
    
    console.log("📡 请求API翻译");
    
    try {
        const systemPrompt = `你是一个专业的中文食谱翻译助手。请将以下菜谱内容翻译成中文：
1. 食材名称：将英文食材名翻译成中文（如：Chicken → 鸡肉）
2. 计量单位：将英文单位转换为中文单位（tbsp->汤匙, cup->杯 等）
3. 格式要求：保持所有分隔符 ||| 和 | 不变，不要添加任何解释`;

        const response = await fetch(DEEPSEEK_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${DEEPSEEK_KEY}` 
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text.slice(0, 3000) }
                ],
                temperature: 0.1,
                max_tokens: 2000
            })
        });
        
        const data = await response.json();
        let result = text;
        
        if (data.choices && data.choices.length > 0) {
            result = data.choices[0].message.content.trim();
            translationCache.set(cacheKey, result);
        }
        return result;
        
    } catch (e) {
        console.error("翻译API失败:", e);
        return localFallbackTranslate(text);
    }
}

// 本地后备翻译
function localFallbackTranslate(text) {
    console.log("🔄 使用本地翻译后备");
    let result = text;
    
    // 简单的单位替换
    const unitMap = {
        'tbsp': '汤匙', 'tablespoon': '汤匙', 'tablespoons': '汤匙',
        'tsp': '茶匙', 'teaspoon': '茶匙', 'teaspoons': '茶匙',
        'cup': '杯', 'cups': '杯',
        'oz': '盎司', 'ounce': '盎司', 'ounces': '盎司',
        'lb': '磅', 'pound': '磅', 'pounds': '磅',
        'g': '克', 'gram': '克', 'grams': '克',
        'kg': '千克', 'kilogram': '千克', 'kilograms': '千克',
        'ml': '毫升', 'milliliter': '毫升', 'milliliters': '毫升',
        'l': '升', 'liter': '升', 'liters': '升'
    };
    
    // 替换单位
    for (const [en, cn] of Object.entries(unitMap)) {
        const regex = new RegExp(`(\\d+[\\s]*)(?:${en})\\b`, 'gi');
        result = result.replace(regex, `$1${cn}`);
        const fractionRegex = new RegExp(`(\\d+\\/\\d+[\\s]*)(?:${en})\\b`, 'gi');
        result = result.replace(fractionRegex, `$1${cn}`);
    }
    
    // 翻译食材名称
    for (let key in DICTIONARY) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        result = result.replace(regex, DICTIONARY[key]);
    }
    return result;
}


function cleanMarkdown(text) {
    if (!text) return "";
    return text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>').replace(/\n/g, '<br>');
}

function resetUploadForm() {
    document.getElementById('recipe-title').value = '';
    document.getElementById('recipe-img').value = '';
    document.getElementById('recipe-ingredients').value = '';
    document.getElementById('recipe-steps').value = '';
    document.getElementById('recipe-time').value = '';
}

function showAlert(msg, type = 'info') {
    alertText.textContent = msg; 
    customAlert.className = `custom-alert show`;
    customAlert.style.borderLeftColor = type === 'warning' ? '#ffc107' : (type === 'success' ? '#28a745' : '#FF8C00');
    setTimeout(() => customAlert.classList.remove('show'), 2000);
}

// ========== 3. 用户数据 (带防崩溃保护) ==========
function initUserStorage() {
    if (!localStorage.getItem('userData')) {
        localStorage.setItem('userData', JSON.stringify({ users: [], currentUser: null }));
    }
}
function getUserData() { initUserStorage(); return JSON.parse(localStorage.getItem('userData')); }

function saveUserData(data) { 
    try {
        localStorage.setItem('userData', JSON.stringify(data)); 
    } catch(e) {
        console.error(e);
        showAlert('保存失败：图片太大或存储已满！', 'warning');
        throw e;
    }
}

function registerUser(username, password) {
    const data = getUserData();
    if (data.users.some(u => u.username === username)) return { success: false, msg: '用户名已存在' };
    if (password.length < 6) return { success: false, msg: '密码不少于6位' };
    data.users.push({ username, password: md5(password), collections: [], recipes: [] });
    saveUserData(data);
    return { success: true, msg: '注册成功' };
}
function loginUser(username, password) {
    const data = getUserData();
    const user = data.users.find(u => u.username === username && u.password === md5(password));
    if (!user) return { success: false, msg: '用户名或密码错误' };
    data.currentUser = username;
    saveUserData(data);
    return { success: true, msg: '登录成功' };
}
function logoutUser() {
    const data = getUserData(); data.currentUser = null; saveUserData(data);
    updateUserUI(); renderCollectList(); renderMyRecipesList(); showAlert('已退出登录', 'info');
    loadChatHistory();
}
function updateUserUI() {
    const data = getUserData();
    const loginBtn = document.getElementById('show-login-btn');
    const userInfo = document.getElementById('user-info');
    if (data.currentUser) {
        loginBtn.classList.add('d-none'); userInfo.classList.remove('d-none'); userInfo.classList.add('d-flex');
        document.getElementById('current-username').textContent = data.currentUser;
    } else {
        loginBtn.classList.remove('d-none'); userInfo.classList.add('d-none'); userInfo.classList.remove('d-flex');
    }
}

// ========== 4. 菜谱上传与展示 ==========
function addUserRecipe(recipe) {
    const data = getUserData();
    if (!data.currentUser) {
        showAlert('请先登录后再上传菜谱～', 'warning');
        new bootstrap.Modal(document.getElementById('loginModal')).show();
        return false;
    }
    const user = data.users.find(u => u.username === data.currentUser);
    if (!user.recipes) user.recipes = [];
    recipe.id = 'recipe_' + Date.now();
    recipe.createTime = new Date().toLocaleDateString();
    
    user.recipes.push(recipe);
    try {
        saveUserData(data); 
        showAlert('菜谱上传成功！', 'success');
        renderMyRecipesList();
        return true;
    } catch (e) {
        return false;
    }
}

function renderMyRecipesList() {
    const data = getUserData();
    const list = document.getElementById('myRecipesList');
    if (!data.currentUser) { list.innerHTML = ''; return; }
    
    const user = data.users.find(u => u.username === data.currentUser);
    const recipes = user.recipes || [];
    
    if (recipes.length === 0) {
        list.innerHTML = `<div class="collect-empty"><i class="bi bi-book"></i><h4>暂无上传菜谱</h4><p class="text-muted">快去上传你的独家菜谱吧～</p></div>`;
        return;
    }

    list.innerHTML = '<div class="collect-list"></div>';
    const container = list.querySelector('.collect-list');

    recipes.forEach(r => {
        const div = document.createElement('div');
        div.className = 'collect-item'; 
        div.innerHTML = `
            <img src="${r.image}" class="collect-item-img">
            <div class="collect-item-info">
                <h5 class="collect-item-title">${r.title}</h5>
                <div class="collect-item-meta">
                    <span><i class="bi bi-clock"></i> ${r.time || '未知'}分钟</span>
                    <span class="ms-2"><i class="bi bi-calendar"></i> ${r.createTime}</span>
                </div>
                <div class="collect-item-actions">
                    <button class="collect-item-btn btn-view" onclick="viewMyRecipe('${r.id}')"><i class="bi bi-eye"></i> 详情</button>
                    <button class="collect-item-btn btn-remove" onclick="deleteUserRecipe('${r.id}')"><i class="bi bi-trash"></i> 删除</button>
                </div>
            </div>`;
        container.appendChild(div);
    });
}

function viewMyRecipe(recipeId) {
    const data = getUserData();
    const user = data.users.find(u => u.username === data.currentUser);
    const recipe = user.recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    modalTitle.innerText = recipe.title;
    modalImg.src = recipe.image;
    let ingredientsHtml = '';
    recipe.ingredients.split(/\n/).forEach(ing => {
        if (ing.trim()) ingredientsHtml += `<li class="d-flex justify-content-between py-1 border-bottom border-light small"><span><i class="bi bi-dot text-warning"></i> ${ing.trim()}</span></li>`;
    });
    modalIngredients.innerHTML = ingredientsHtml;
    modalInstructions.innerHTML = recipe.steps.replace(/\n/g, "<br>");
    recipeModal.show();
    bootstrap.Modal.getInstance(document.getElementById('myRecipesModal')).hide();
}

function deleteUserRecipe(id) {
    const data = getUserData();
    const user = data.users.find(u => u.username === data.currentUser);
    user.recipes = user.recipes.filter(r => r.id !== id);
    saveUserData(data); renderMyRecipesList();
}

// ========== 5. 收藏功能 ==========
// ========== 收藏功能 (已修复图标变色与中式免翻译) ==========
async function toggleCollection(btn, item) {
    const data = getUserData();
    // 1. 登录检查
    if (!data.currentUser) { 
        new bootstrap.Modal(document.getElementById('loginModal')).show(); 
        return; 
    }
    
    const user = data.users.find(u => u.username === data.currentUser);
    // 注意：这里兼容了普通ID和带前缀的ID (cn_xxxx)
    const idx = user.collections.findIndex(c => c.idMeal === item.idMeal);
    
    // 获取按钮内部的图标元素，用于切换颜色
    const icon = btn.querySelector('i');
    
    if (idx > -1) { 
        // === 取消收藏 ===
        user.collections.splice(idx, 1); 
        
        // 样式切换：移除激活状态，变回灰色
        btn.classList.remove('active'); 
        if(icon) {
            icon.classList.remove('text-danger'); // 移除红色
            icon.classList.add('text-muted');     // 变回灰色
        }
        
        showAlert('已取消收藏'); 
    } else { 
        // === 添加收藏 ===
        try {
            let translatedTitle = item.strMeal;

            // 逻辑优化：只有非中式食谱（且没有现有中文名）才调用翻译 API
            // 如果是天行数据(source='tian')，本身就是中文，无需翻译
            if (item.source !== 'tian' && !item.strMealCN) {
                translatedTitle = await translateText(item.strMeal);
            }
            
            // 创建收藏项
            const collectionItem = {
                ...item,
                strMealCN: translatedTitle || item.strMeal // 优先使用翻译名或原名
            };
            
            user.collections.push(collectionItem); 
            
            // 样式切换：添加激活状态，变为红色
            btn.classList.add('active'); 
            if(icon) {
                icon.classList.remove('text-muted');  // 移除灰色
                icon.classList.add('text-danger');    // 变为红色
            }
            
            showAlert('收藏成功'); 
        } catch (error) {
            console.error("处理收藏失败:", error);
            // 降级处理：直接保存
            const collectionItem = { ...item, strMealCN: item.strMeal };
            user.collections.push(collectionItem); 
            
            btn.classList.add('active'); 
            if(icon) {
                icon.classList.remove('text-muted');
                icon.classList.add('text-danger');
            }
            showAlert('收藏成功'); 
        }
    }
    
    // 保存并刷新列表
    saveUserData(data); 
    // 如果当前打开了收藏列表模态框，实时刷新它
    if(document.getElementById('collectModal').classList.contains('show')) {
        renderCollectList();
    }
}

// 渲染收藏列表 (已适配中式文字封面)
function renderCollectList() {
    const data = getUserData();
    const list = document.getElementById('collectList');
    
    if (!data.currentUser || !data.users.find(u => u.username === data.currentUser)) {
        list.innerHTML = `<div class="collect-empty"><i class="bi bi-bookmark-heart"></i><h4>暂无收藏</h4></div>`;
        return;
    }
    
    const user = data.users.find(u => u.username === data.currentUser);
    
    if (user.collections.length === 0) {
        list.innerHTML = `<div class="collect-empty"><i class="bi bi-bookmark-heart"></i><h4>暂无收藏</h4></div>`;
        return;
    }
    
    list.innerHTML = '<div class="collect-list"></div>';
    const container = list.querySelector('.collect-list');
    
    user.collections.forEach((item) => {
        let displayTitle = item.strMealCN || item.strMeal;
        displayTitle = displayTitle.replace(/^\|/, '').trim();
        if (displayTitle.length > 25) displayTitle = displayTitle.substring(0, 25) + '...';
        
        // --- 核心逻辑：区分图片显示 ---
        let imgHtml = '';
        let clickAction = '';

        if (item.source === 'tian') {
            // [中式] 生成文字封面 (复用配色逻辑)
            const colorThemes = [
                { bg: '#ff9a8b', text: '#ffffff' }, { bg: '#4facfe', text: '#ffffff' },
                { bg: '#00cdac', text: '#ffffff' }, { bg: '#ff6b6b', text: '#ffffff' },
                { bg: '#a8edea', text: '#333333' }, { bg: '#f6d365', text: '#333333' }
            ];
            let hash = 0;
            const name = item.strMeal; // 使用保存的菜名
            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
            const theme = colorThemes[Math.abs(hash) % colorThemes.length];
            
            // 渲染一个小一点的文字方块
            imgHtml = `
                <div class="collect-item-img d-flex align-items-center justify-content-center" 
                     style="background: linear-gradient(135deg, ${theme.bg} 0%, ${theme.bg}80 100%); color: ${theme.text}; font-weight: bold; font-size: 1.5rem;">
                    ${name.charAt(0)}
                </div>`;
            
            // 点击详情时，调用专门的中式查看函数
            clickAction = `viewCollectedTianRecipe('${item.idMeal}')`;
            
        } else {
            // [全球] 正常显示图片
            imgHtml = `<img src="${item.strMealThumb}" class="collect-item-img">`;
            clickAction = `viewCollectedRecipe('${item.idMeal}')`;
        }
        // ---------------------------

        const div = document.createElement('div');
        div.className = 'collect-item'; 
        div.innerHTML = `
            ${imgHtml}
            <div class="collect-item-info">
                <h5 class="collect-item-title" title="${item.strMealCN || item.strMeal}">
                    ${item.source === 'tian' ? '<span class="badge bg-warning text-dark me-1" style="font-size:0.6rem">中</span>' : ''}
                    ${displayTitle}
                </h5>
                <div class="collect-item-actions">
                    <button class="collect-item-btn btn-view" onclick="${clickAction}"><i class="bi bi-eye"></i> 详情</button>
                    <button class="collect-item-btn btn-remove" onclick="toggleCollection(this, {idMeal:'${item.idMeal}'})"><i class="bi bi-trash"></i> 删除</button>
                </div>
            </div>`;
        container.appendChild(div);
    });
}

function isRecipeCollected(id) {
    const data = getUserData(); 
    if (!data.currentUser) return false;
    const user = data.users.find(u => u.username === data.currentUser);
    return user ? user.collections.some(c => c.idMeal === id) : false;
}

// ========== 6. 搜索与详情页 ==========

// 总搜索入口（分流器），因为现在新增了中国食谱
async function fetchRecipes(query) {

    // 1. 获取搜索词（如果未传参，则获取输入框的值）
    const searchQuery = query || document.getElementById('search-input').value.trim();
    if (!searchQuery) return;

    // 2. 显示加载动画
    const loadingText = currentSource === 'global' ? '翻译并搜索...' : '搜索中式美味...';
    recipeContainer.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-warning" style="width: 3rem; height: 3rem;"></div><p class="mt-3 text-muted">${loadingText}</p></div>`;
    
    // 3. 根据当前源，决定调用哪个函数
    if (currentSource === 'chinese') { 
        await fetchTianRecipes(searchQuery);  //天行函数
    } else {
        await fetchGlobalRecipes(searchQuery); // 调用刚才改名的旧函数
    }
}

// 处理天气推荐点击，因为天气不同推荐的食物不同，点击这里可以直接搜索推荐食物
function handleWeatherSearch(enWord, cnWord) {
    // 根据当前选中的源，决定搜哪个词
    const query = currentSource === 'global' ? enWord : cnWord;
    
    // 如果当前源不匹配，自动切换（可选，为了用户体验更好）
    // 这里我们简单处理，直接把词填入搜索框并搜索
    document.getElementById('search-input').value = query;
    fetchRecipes(query);
}

async function fetchGlobalRecipes(query) {
    recipeContainer.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-warning" style="width: 3rem; height: 3rem;"></div><p class="mt-3 text-muted">正在搜索并翻译...</p></div>`;
    
    try {
        let searchQuery = query.trim();
        
        if (/[\u4e00-\u9fa5]/.test(searchQuery)) {
            if (SMART_MAP[searchQuery]) {
                searchQuery = SMART_MAP[searchQuery];
            } 
            else {
                try {
                    const translated = await translateText(`将"${searchQuery}"翻译成对应的英文食物名称，仅返回单词或短语，不要解释`);
                    if (translated && translated.trim()) {
                        searchQuery = translated.trim();
                    }
                } catch (e) {
                    console.log("翻译API调用失败，使用备选方案");
                    searchQuery = pinyinUtil.getFirstLetter(searchQuery).join('');
                }
            }
        }

        const response = await fetch(`${RECIPE_API}search.php?s=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();

        if (!data.meals || data.meals.length === 0) {
            const broadQuery = searchQuery.split(' ')[0];
            if (broadQuery && broadQuery !== searchQuery) {
                const broadResponse = await fetch(`${RECIPE_API}search.php?s=${encodeURIComponent(broadQuery)}`);
                const broeata = await broadResponse.json();
                if (broadData.meals && broadData.meals.length > 0) {
                    showAlert(`未找到"${query}"的精确结果，为您展示相关食谱`, 'info');
                    await displayRecipes(broadData.meals);
                    return;
                }
            }
            recipeContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <h4>没找到相关菜谱</h4>
                    <p class="text-muted mt-2">试试其他关键词或检查拼写</p>
                    <div class="mt-3">
                        <button class="btn btn-sm btn-outline-warning me-2" onclick="document.getElementById('search-input').value='红烧肉';fetchRecipes('红烧肉')">红烧肉</button>
                        <button class="btn btn-sm btn-outline-warning me-2" onclick="document.getElementById('search-input').value='鱼';fetchRecipes('鱼')">鱼</button>
                        <button class="btn btn-sm btn-outline-warning" onclick="document.getElementById('search-input').value='蔬菜';fetchRecipes('蔬菜')">蔬菜</button>
                    </div>
                </div>`;
            return;
        }

        await displayRecipes(data.meals);

    } catch (error) {
        console.error("搜索出错:", error);
        recipeContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <h5>网络连接错误</h5>
                <p class="text-muted mt-2">请检查网络后重试</p>
                <button class="btn btn-warning mt-3" onclick="fetchRecipes('${query}')">重新尝试</button>
            </div>`;
    }
}

async function displayRecipes(list) {
    const limitedList = list.slice(0, 12);
    let cnTitles = [];
    
    try {
        const titles = limitedList.map(item => item.strMeal);
        const titlesText = titles.join(" ||| ");
        
        const translated = await translateText(titlesText);
        
        if (translated && translated.includes("|||")) {
            cnTitles = translated.split("|||").map(t => t.trim());
        } else {
            cnTitles = titles;
        }
    } catch (e) {
        console.log("标题翻译失败，使用原标题");
        cnTitles = limitedList.map(item => item.strMeal);
    }
    
    recipeContainer.innerHTML = "";
    limitedList.forEach((item, index) => {
        const isCollected = isRecipeCollected(item.idMeal);
        
        let displayTitle = cnTitles[index] || item.strMeal;
        displayTitle = displayTitle.replace(/^\|/, '').trim();
        
        if (displayTitle.length > 20) {
            displayTitle = displayTitle.substring(0, 20) + '...';
        }
        
        const col = document.createElement("div");
        col.className = "col";
        col.innerHTML = `
            <div class="card h-100" data-id="${item.idMeal}" onclick="showDetails('${item.idMeal}')">
                <button class="collect-btn ${isCollected ? 'active' : ''}" 
                        onclick="event.stopPropagation(); toggleCollection(this, ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                    <i class="bi bi-bookmark-heart ${isCollected ? 'active' : ''}"></i>
                </button>
                <img src="${item.strMealThumb || 'default-recipe.jpg'}" 
                     class="card-img-top" 
                     loading="lazy"
                     onerror="this.src='default-recipe.jpg'">
                <div class="card-body">
                    <h5 class="card-title" title="${displayTitle}">${displayTitle}</h5>
                    <div class="card-meta">
                        <div class="card-rating"><i class="bi bi-star-fill"></i> ${(Math.random() * 1.5 + 3.5).toFixed(1)}</div>
                        <div class="card-time"><i class="bi bi-clock"></i> ${Math.floor(Math.random() * 20 + 10)}分钟</div>
                    </div>
                </div>
            </div>`;
        recipeContainer.appendChild(col);
    });
    
    if (limitedList.length === 0) {
        recipeContainer.innerHTML = `<div class="col-12 text-center py-5"><h4>暂无相关菜谱</h4></div>`;
    }
}

window.showDetails = async function(id) {
    console.log("🔄 显示菜谱详情:", id);
    
    modalTitle.innerText = "加载中...";
    modalImg.src = "";
    modalIngredients.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-warning"></div>
            <p class="mt-2 text-muted">正在加载菜谱详情...</p>
        </div>`;
    modalInstructions.innerHTML = "";
    
    recipeModal.show();
    
    try {
        const cachedRecipe = recipeCache.get(id);
        if (cachedRecipe) {
            console.log("📦 使用缓存的菜谱数据");
            displayRecipeDetail(cachedRecipe);
            return;
        }
        
        const response = await fetch(`${RECIPE_API}lookup.php?i=${id}`);
        const data = await response.json();
        
        if (!data.meals || data.meals.length === 0) {
            throw new Error("未找到菜谱详情");
        }
        
        const item = data.meals[0];
        
        let ingredientsWithMeasures = [];
        for (let i = 1; i <= 20; i++) {
            const ing = item[`strIngredient${i}`];
            const measure = item[`strMeasure${i}`];
            if (ing && ing.trim()) {
                const fullIngredient = (measure ? measure + ' ' : '') + ing.trim();
                ingredientsWithMeasures.push(fullIngredient);
            }
        }
        
        const ingredientsText = ingredientsWithMeasures.join(" | ");
        const textToTranslate = `${item.strMeal} ||| ${ingredientsText} ||| ${item.strInstructions}`;
        
        let translatedText = textToTranslate;
        try {
            translatedText = await translateText(textToTranslate);
        } catch (translateError) {
            console.warn("翻译失败，使用原文:", translateError);
        }
        
        const parts = translatedText.split("|||").map(part => part ? part.trim() : "");
        
        const recipeData = {
            id: id,
            title: parts[0] || item.strMeal,
            image: item.strMealThumb || 'default-recipe.jpg',
            ingredients: parts[1] ? parts[1].split("|").map(i => i.trim()).filter(i => i) : ingredientsWithMeasures,
            instructions: parts[2] || item.strInstructions,
            rawIngredients: ingredientsWithMeasures,
            translatedParts: parts 
        };
        
        recipeCache.set(id, recipeData);
        displayRecipeDetail(recipeData);
        
    } catch (error) {
        console.error("❌ 加载菜谱失败:", error);
        
        modalTitle.innerText = "加载失败";
        modalInstructions.innerHTML = `
            <div class="text-center p-5">
                <i class="bi bi-exclamation-triangle text-danger fs-1"></i>
                <h5 class="mt-3">加载失败</h5>
                <p class="text-muted">${error.message || "请检查网络连接"}</p>
                <button class="btn btn-warning mt-3" onclick="showDetails('${id}')">
                    <i class="bi bi-arrow-clockwise"></i> 重新加载
                </button>
            </div>`;
    }
};

function displayRecipeDetail(recipeData) {
    // 确保图片容器显示
    const imgContainer = modalImg.parentElement;
    imgContainer.style.display = 'block';
    
    // 清除可能存在的文字图片（从上一个中式菜谱遗留下来的）
    const existingTextImage = imgContainer.querySelector('.text-image-container');
    if (existingTextImage) {
        existingTextImage.remove();
    }
    
    // 确保img标签显示
    modalImg.style.display = 'block';
    
    modalTitle.innerText = recipeData.title;
    
    modalImg.src = recipeData.image;
    modalImg.onerror = () => {
        modalImg.src = 'default-recipe.jpg';
    };
    
    let ingredientsHtml = "";
    if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        recipeData.ingredients.forEach((ingredient, index) => {
            if (ingredient && ingredient.trim()) {
                ingredientsHtml += `
                    <li class="d-flex justify-content-between py-2 border-bottom border-light">
                        <span><i class="bi bi-dot text-warning"></i> ${ingredient.trim()}</span>
                    </li>`;
            }
        });
    } else {
        ingredientsHtml = `<li class="text-muted py-2">暂无食材信息</li>`;
    }
    modalIngredients.innerHTML = ingredientsHtml;
    
    let instructionsHtml = recipeData.instructions || "暂无烹饪步骤";
    instructionsHtml = instructionsHtml
        .replace(/\r\n/g, "<br>")
        .replace(/\n/g, "<br>")
        .replace(/STEP\s*\d+/gi, match => `<strong>${match}</strong>`)
        .replace(/Step\s*\d+/gi, match => `<strong>${match}</strong>`);
    
    modalInstructions.innerHTML = instructionsHtml;
}


// ========== 7. 页面初始化 ==========
function handleAiRecipeClick() {
    const aiSection = document.getElementById('ai-robot-section');
    if (aiSection) {
        aiSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (aiInput) { aiInput.focus(); showAlert('你可以向AI大厨提问获取智能食谱啦～', 'success'); }
    }
}
function saveChatHistory() {
    if(getUserData().currentUser) localStorage.setItem(`chatHistory_${getUserData().currentUser}`, chatHistory.innerHTML);
}
function loadChatHistory() {
    const data = getUserData();
    const defaultChat = `<div class="message message-ai">👨‍🍳 你好！我是你的AI大厨，有什么烹饪问题都可以问我！</div>`;
    chatHistory.innerHTML = (data.currentUser && localStorage.getItem(`chatHistory_${data.currentUser}`)) || defaultChat;
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

//处理中文食谱

// ========== [核心修改] 天行数据中式搜索 ==========
async function fetchTianRecipes(query) {
    try {
        console.log(`正在请求天行数据: ${query}`);
        // 组装请求 URL (注意参数 num=12 控制返回数量)
        const url = `${TIAN_RECIPE_API}?key=${TIAN_KEY}&word=${encodeURIComponent(query)}&num=12`;
        
        // 天行数据支持 CORS，可以直接 fetch，无需代理插件
        const response = await fetch(url);
        const data = await response.json();

        console.log("天行数据返回:", data);

        if (data.code === 200 && data.result && data.result.list) {
            displayTianRecipes(data.result.list);
        } else {
            // 错误处理
            let errorMsg = data.msg || '未找到相关菜谱';
            if(data.code === 250) errorMsg = "数据返回为空 (换个词试试)";
            
            recipeContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <h4>未找到 "${query}"</h4>
                    <p class="text-muted">${errorMsg}</p>
                    <button class="btn btn-sm btn-outline-warning mt-2" onclick="fetchTianRecipes('红烧肉')">试试搜：红烧肉</button>
                    <button class="btn btn-sm btn-outline-warning mt-2" onclick="fetchTianRecipes('土豆')">试试搜：土豆</button>
                </div>`;
        }
    } catch (error) {
        console.error("中式搜索出错:", error);
        recipeContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-wifi-off text-danger fs-1"></i>
                <h5 class="mt-3">网络请求失败</h5>
                <p class="text-muted">${error.message}</p>
            </div>`;
    }
}

// 渲染天行数据列表
// 渲染天行数据列表 (已添加收藏功能)
function displayTianRecipes(list) {
    recipeContainer.innerHTML = "";
    list.forEach(item => {
        // 1. 生成纯CSS文字图片
        const generateTextImageHTML = (name, type) => {
            const firstChar = name.charAt(0);
            const colorThemes = [
                { bg: '#ff9a8b', text: '#ffffff' }, { bg: '#4facfe', text: '#ffffff' },
                { bg: '#00cdac', text: '#ffffff' }, { bg: '#ff6b6b', text: '#ffffff' },
                { bg: '#a8edea', text: '#333333' }, { bg: '#f6d365', text: '#333333' }
            ];
            let hash = 0;
            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
            const theme = colorThemes[Math.abs(hash) % colorThemes.length];
            
            return `
                <div class="text-image-container" style="
                    height: 180px; 
                    background: linear-gradient(135deg, ${theme.bg} 0%, ${theme.bg}80 100%);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    color: ${theme.text}; border-radius: 8px 8px 0 0; position: relative;
                ">
                    <div style="font-size: 4rem; font-weight: 900; opacity: 0.8; margin-bottom: 10px;">${firstChar}</div>
                    <div style="font-size: 1.2rem; font-weight: 700; text-align: center; padding: 0 10px;">${name}</div>
                    <div style="font-size: 0.9rem; opacity: 0.9; margin-top: 5px;">${type || '中式家常'}</div>
                </div>
            `;
        };
        
        let ingredientsArr = [];
        if (item.yuanliao) ingredientsArr = ingredientsArr.concat(item.yuanliao.split(/；|;/).filter(i => i.trim()));
        if (item.tiaoliao) ingredientsArr = ingredientsArr.concat(item.tiaoliao.split(/；|;/).filter(i => i.trim()));
        
        // 缓存数据 (保持不变)
        let formattedSteps = item.zuofa || "暂无步骤描述";
        formattedSteps = formattedSteps.replace(/(\d+\.)/g, '<br><br><strong>$1</strong>');
        if(formattedSteps.startsWith('<br><br>')) formattedSteps = formattedSteps.substring(8); 

        recipeCache.set(item.id, {
            id: item.id,
            title: item.cp_name,
            image: null,
            ingredients: ingredientsArr,
            instructions: formattedSteps,
            tags: item.type_name,
            desc: item.texing || item.tishi || item.cp_name,
            hasImage: false
        });

        // 🆕 收藏功能核心逻辑
        // 构造一个唯一ID，加前缀防止和全球食谱冲突
        const uniqueId = 'cn_' + item.id;
        const isCollected = isRecipeCollected(uniqueId);

        // 构造要保存到收藏夹的对象 (保存所有必要字段，以免详情页打不开)
        const saveItem = {
            idMeal: uniqueId,     // 必须字段：用于查找
            strMeal: item.cp_name, // 必须字段：用于显示标题
            source: 'tian',        // 标记来源
            // 保存详情页所需的所有原始数据
            id: item.id,
            cp_name: item.cp_name,
            type_name: item.type_name,
            yuanliao: item.yuanliao,
            tiaoliao: item.tiaoliao,
            zuofa: item.zuofa,
            texing: item.texing,
            tishi: item.tishi
        };

        const col = document.createElement("div");
        col.className = "col";
        col.innerHTML = `
            <div class="card h-100 shadow-sm border-0" onclick="showTianDetails('${item.id}')" style="cursor: pointer; transition: transform 0.2s;">
                <div class="position-absolute top-0 end-0 p-2 z-2 d-flex gap-2 align-items-center">
                    <span class="badge bg-warning text-dark shadow-sm">中式精选</span>
                    <button class="btn btn-light shadow-sm rounded-circle p-0 d-flex align-items-center justify-content-center ${isCollected ? 'active' : ''}" 
                            style="width: 32px; height: 32px; border: none;"
                            onclick="event.stopPropagation(); toggleCollection(this, ${JSON.stringify(saveItem).replace(/"/g, '&quot;')})">
                        <i class="bi bi-bookmark-heart ${isCollected ? 'text-danger' : 'text-muted'}" style="font-size: 1.1rem;"></i>
                    </button>
                </div>
                
                ${generateTextImageHTML(item.cp_name, item.type_name)}
                
                <div class="card-body">
                    <h5 class="card-title text-truncate">${item.cp_name}</h5>
                    <p class="card-text small text-muted" style="height: 3em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                        ${item.texing || item.tishi || '暂无详细介绍，点击查看做法。'}
                    </p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <small class="text-muted"><i class="bi bi-ui-checks"></i> ${ingredientsArr.length} 种食材</small>
                        <button class="btn btn-sm btn-outline-warning rounded-pill">查看做法</button>
                    </div>
                </div>
            </div>`;
        
        col.querySelector('.card').addEventListener('mouseenter', function() { this.style.transform = 'translateY(-5px)'; });
        col.querySelector('.card').addEventListener('mouseleave', function() { this.style.transform = 'translateY(0)'; });
        
        // 修正 toggleCollection 按钮点击后的样式切换逻辑
        // 我们需要在 CSS 中增加 .active 类的样式，或者在这里手动切换图标颜色
        // 为了简单，我们依赖 HTML 重绘，或者让 toggleCollection 函数稍微改动一下（见下文说明）
        
        recipeContainer.appendChild(col);
    });
}
// 显示天行数据详情 (修复了详情页内容不显示的问题)
// 显示天行数据详情 (已修复：不再清空下方内容)
function showTianDetails(id) {
    const recipe = recipeCache.get(id); 
    if(!recipe) {
        console.error("未找到缓存菜谱:", id);
        return;
    }

    console.log("打开详情页:", recipe);
    
    // 1. 设置标题
    modalTitle.innerText = recipe.title;
    
    // 2. 处理顶部大图 (核心修复部分)
    // 先隐藏真实的img标签，因为我们没有图片URL
    modalImg.style.display = 'none';
    
    // 检查是否已经插入过文字图片容器，如果有先移除，防止重复堆叠
    const existingTextImage = modalImg.parentElement.querySelector('.text-image-container');
    if (existingTextImage) {
        existingTextImage.remove();
    }

    // 生成颜色主题
    let hash = 0;
    for (let i = 0; i < recipe.title.length; i++) hash = recipe.title.charCodeAt(i) + ((hash << 5) - hash);
    const colorThemes = [
        { bg: '#ff9a8b', text: '#ffffff' }, { bg: '#4facfe', text: '#ffffff' },
        { bg: '#00cdac', text: '#ffffff' }, { bg: '#ff6b6b', text: '#ffffff' },
        { bg: '#a8edea', text: '#333333' }, { bg: '#f6d365', text: '#333333' }
    ];
    const theme = colorThemes[Math.abs(hash) % colorThemes.length];

    // 创建文字图片的 HTML 字符串
    const textImageHTML = `
        <div class="text-image-container w-100 d-flex flex-column align-items-center justify-content-center mb-4" 
             style="height: 260px; background: linear-gradient(135deg, ${theme.bg} 0%, ${theme.bg}90 100%); color: ${theme.text}; border-radius: 8px;">
            <i class="bi bi-egg-fried" style="font-size: 4rem; opacity: 0.5; margin-bottom: 15px;"></i>
            <h2 style="font-weight: bold; margin-bottom: 10px;">${recipe.title}</h2>
            <span class="badge bg-light text-dark opacity-75">${recipe.tags || '中式美味'}</span>
        </div>
    `;

    // 将文字图片插入到 modalImg 之后 (这样不会覆盖下面的食材列表)
    modalImg.insertAdjacentHTML('afterend', textImageHTML);

    // 3. 渲染食材列表
    let ingredientsHtml = "";
    if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(ing => {
            // 简单清洗一下数据，去掉可能的空行
            if(ing && ing.trim()) {
                ingredientsHtml += `
                    <li class="col-6 mb-2">
                        <div class="p-2 bg-light rounded d-flex align-items-center">
                            <i class="bi bi-check-circle-fill text-warning me-2 small"></i>
                            <span class="text-dark">${ing.trim()}</span>
                        </div>
                    </li>`;
            }
        });
        // 包装在 row 里以实现两列布局
        ingredientsHtml = `<div class="row">${ingredientsHtml}</div>`;
    } else {
        ingredientsHtml = `<div class="alert alert-secondary">暂无详细食材列表</div>`;
    }
    
    // 添加 "特色/提示" 到食材上方
    if (recipe.desc) {
        ingredientsHtml = `
            <div class="alert alert-warning border-0 bg-warning-subtle mb-3">
                <i class="bi bi-lightbulb-fill text-warning me-2"></i>
                <strong>大厨提示：</strong>${recipe.desc}
            </div>
            ${ingredientsHtml}
        `;
    }
    
    // 确保 modalIngredients 元素存在并更新
    if(modalIngredients) {
        modalIngredients.innerHTML = ingredientsHtml;
    } else {
        console.error("找不到 modal-ingredients 元素");
    }

    // 4. 渲染烹饪步骤
    // 确保 modalInstructions 元素存在并更新
    if(modalInstructions) {
        modalInstructions.innerHTML = `
            <div class="instruction-content" style="line-height: 1.8; color: #444; font-size: 1.05rem;">
                ${recipe.instructions || "暂无步骤描述"}
            </div>
        `;
    } else {
        console.error("找不到 modal-instructions 元素");
    }

    // 5. 显示模态框
    recipeModal.show();
}







document.addEventListener('DOMContentLoaded', () => {
    searchInput = document.getElementById("search-input");
    searchBtn = document.getElementById("search-btn");
    recipeContainer = document.getElementById("recipe-container");
    recipeModal = new bootstrap.Modal(document.getElementById('recipeModal'));
    collectModal = new bootstrap.Modal(document.getElementById('collectModal'));
    customAlert = document.getElementById('customAlert');
    alertText = document.getElementById('alert-text');
    collectList = document.getElementById('collectList');
    modalTitle = document.getElementById("modal-title");
    modalImg = document.getElementById("modal-img");
    modalIngredients = document.getElementById("modal-ingredients");
    modalInstructions = document.getElementById("modal-instructions");
    bmiHeight = document.getElementById("bmi-height");
    bmiWeight = document.getElementById("bmi-weight");
    bmiBtn = document.getElementById("bmi-btn");
    bmiResult = document.getElementById("bmi-result");
    aiInput = document.getElementById("ai-input");
    aiBtn = document.getElementById("ai-btn");
    chatHistory = document.getElementById("chat-history");

    initUserStorage(); updateUserUI(); renderCollectList(); renderMyRecipesList(); loadChatHistory();

    const searchIcon = document.querySelector('.search-container .bi-search');
    searchInput.addEventListener('focus', () => { searchInput.style.borderColor = '#FFB800'; searchIcon.style.color = '#FFB800'; });
    searchInput.addEventListener('blur', () => { searchInput.style.borderColor = '#FFD100'; searchIcon.style.color = '#666'; });
    searchBtn.addEventListener('click', (e) => {
        const q = searchInput.value.trim();
        if(q) {
            const ripple = document.createElement('span');
            const rect = e.target.getBoundingClientRect();
            ripple.style.cssText = `position:absolute;width:50px;height:50px;background:rgba(255,255,255,0.3);border-radius:50%;transform:translate(-50%,-50%) scale(0);animation:ripple 0.6s linear;pointer-events:none;left:${e.clientX - rect.left}px;top:${e.clientY - rect.top}px;`;
            searchBtn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
            fetchRecipes(q);
        }
    });
    searchInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') searchBtn.click(); });
    document.querySelectorAll('.trending-tags a').forEach(tag => {
        tag.addEventListener('click', () => { searchInput.value = tag.textContent; searchBtn.click(); });
    });
    document.querySelectorAll('.food-tag-item').forEach(tab => {
        tab.addEventListener('click', () => {
            const ingredient = tab.textContent; showAlert(`已选择食材「${ingredient}」`, 'info');
            let apiQuery = ingredient; if (SMART_MAP[apiQuery]) apiQuery = SMART_MAP[apiQuery];
            fetchRecipes(apiQuery);
        });
    });

    aiBtn.addEventListener('click', async () => {
        const q = aiInput.value.trim(); if(!q) return;
        chatHistory.innerHTML += `<div class="message message-user">${q}</div>`; aiInput.value='';
        const loading = document.createElement('div'); loading.className='message message-ai'; loading.innerText='...'; chatHistory.appendChild(loading);
        try {
            const res = await fetch(DEEPSEEK_URL, {
                method:"POST", headers:{"Content-Type":"application/json", "Authorization":`Bearer ${DEEPSEEK_KEY}`},
                body:JSON.stringify({model:"deepseek-chat", messages:[{role:"user", content:q}]})
            });
            const d = await res.json();
            chatHistory.removeChild(loading);
            chatHistory.innerHTML += `<div class="message message-ai">${cleanMarkdown(d.choices[0].message.content)}</div>`;
            saveChatHistory();
        } catch(e) { 
            chatHistory.removeChild(loading);
            chatHistory.innerHTML += `<div class="message message-ai text-danger">网络错误，请开启C插件</div>`; 
        }
        chatHistory.scrollTop = chatHistory.scrollHeight;
    });

    //bmi接入api
// ========== BMI计算函数 =========
bmiBtn.addEventListener('click', async () => {
    const height = parseFloat(bmiHeight.value);
    const weight = parseFloat(bmiWeight.value);
    
    if (!height || !weight) {
        showAlert("请输入身高和体重！", "warning");
        return;
    }
    
    // 验证输入范围
    if (height < 50 || height > 250) {
        showAlert("身高应在50-250厘米之间！", "warning");
        return;
    }
    
    if (weight < 10 || weight > 300) {
        showAlert("体重应在10-300公斤之间！", "warning");
        return;
    }
    
    try {
        // 使用GET请求
        const url = `${BMI_API}?key=${TIAN_KEY}&height=${height}&weight=${weight}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200) {
            // API请求成功
            const result = data.result;
            
            if (!result) {
                throw new Error("API返回数据格式错误");
            }
            
            const bmi = parseFloat(result.bmi);
            
            // 根据BMI值确定样式类
            let levelClass, levelText;
            
            // 解析正常BMI范围
            let minNorm = 18.5;
            let maxNorm = 23.9;
            
            if (result.normbmi && result.normbmi.includes('~')) {
                const normParts = result.normbmi.split('~').map(Number);
                minNorm = normParts[0];
                maxNorm = normParts[1];
            }
            
            if (bmi < minNorm) {
                levelClass = 'info';
                levelText = '偏瘦';
            } else if (bmi >= minNorm && bmi <= maxNorm) {
                levelClass = 'success';
                levelText = '正常';
            } else if (bmi > maxNorm && bmi <= 28) {
                levelClass = 'warning';
                levelText = '超重';
            } else {
                levelClass = 'danger';
                levelText = '肥胖';
            }
            
            // 显示结果
            bmiResult.innerHTML = `
                <div class="alert alert-${levelClass}">
                    <div class="d-flex align-items-center mb-3">
                        <i class="bi bi-graph-up-arrow fs-3 me-3"></i>
                        <div>
                            <h4 class="mb-0">BMI: ${bmi.toFixed(1)}</h4>
                            <span class="badge bg-${levelClass}">${levelText}</span>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-2"><i class="bi bi-rulers text-warning me-2"></i><strong>标准范围:</strong> ${result.normbmi || '18.5~23.9'}</p>
                            <p class="mb-2"><i class="bi bi-heart-pulse text-warning me-2"></i><strong>健康状况:</strong> ${result.healthy || '--'}</p>
                        </div>
                        <div class="col-md-6">
                            <p class="mb-2"><i class="bi bi-bullseye text-warning me-2"></i><strong>理想体重:</strong> ${result.idealweight ? parseFloat(result.idealweight).toFixed(1) + ' kg' : '--'}</p>
                            <p class="mb-2"><i class="bi bi-bounding-box text-warning me-2"></i><strong>标准体重范围:</strong> ${result.normweight || '--'} kg</p>
                        </div>
                    </div>
                    
                    <div class="mt-3 p-3 bg-light rounded">
                        <i class="bi bi-lightbulb text-warning me-2"></i>
                        <strong>健康建议:</strong> ${result.tip || '请保持健康的生活方式和饮食习惯'}
                    </div>
                </div>
            `;
            
            bmiResult.classList.remove('d-none');
            
            // 滚动到结果
            bmiResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            showAlert('BMI计算完成！', 'success');
            
        } else {
            // API返回错误
            const errorMsg = data.msg || `错误代码: ${data.code}`;
            showAlert(`计算失败：${errorMsg}`, 'error');
        }
        
    } catch (error) {
        // 网络错误
        showAlert('网络连接失败，请稍后重试', 'error');
    }
});



    document.getElementById('login-btn').addEventListener('click', () => {
        const res = loginUser(document.getElementById('login-username').value, document.getElementById('login-password').value);
        if(res.success) { bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide(); updateUserUI(); loadChatHistory(); renderMyRecipesList(); showAlert(res.msg, 'success'); }
        else document.getElementById('login-error').innerText = res.msg;
    });
    document.getElementById('register-btn').addEventListener('click', () => {
        const res = registerUser(document.getElementById('register-username').value, document.getElementById('register-password').value);
        document.getElementById('register-error').innerText = res.msg;
    });
    document.getElementById('logout-btn').addEventListener('click', logoutUser);
    
    document.getElementById('submit-recipe-btn').addEventListener('click', () => {
        const title = document.getElementById('recipe-title').value.trim();
        const ingredients = document.getElementById('recipe-ingredients').value.trim();
        const steps = document.getElementById('recipe-steps').value.trim();
        const time = document.getElementById('recipe-time').value.trim();
        const imgInput = document.getElementById('recipe-img');

        if (title && ingredients && steps) {
            if (imgInput.files && imgInput.files[0]) {
                if (imgInput.files[0].size > 500 * 1024) {
                    showAlert('图片太大了！请上传小于 500KB 的图片。', 'warning');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    const success = addUserRecipe({
                        title, ingredients, steps, time: time || '30',
                        image: e.target.result
                    });
                    if(success) {
                        resetUploadForm();
                        bootstrap.Modal.getInstance(document.getElementById('uploadRecipeModal')).hide();
                    }
                };
                reader.readAsDataURL(imgInput.files[0]);
            } else {
                const success = addUserRecipe({
                    title, ingredients, steps, time: time || '30',
                    image: `https://picsum.photos/id/${Date.now() % 100}/400/300`
                });
                if(success) {
                    resetUploadForm();
                    bootstrap.Modal.getInstance(document.getElementById('uploadRecipeModal')).hide();
                }
            }
        } else {
            showAlert('请填写完整信息', 'warning');
        }
    });

    const submitPostBtn = document.getElementById('submit-post-btn');
    if (submitPostBtn) {
        submitPostBtn.addEventListener('click', () => {
            const title = document.getElementById('post-title').value.trim();
            const category = document.getElementById('post-category').value;
            const content = document.getElementById('post-content').value.trim();
            const imgInput = document.getElementById('post-img');
            
            if (!title || !content) { showAlert('请填写标题和内容', 'warning'); return; }

            const savePost = (imgUrl) => {
                const posts = JSON.parse(localStorage.getItem('communityPosts') || '[]');
                posts.unshift({
                    title, category, content, 
                    image: imgUrl || `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/400/300`,
                    author: getUserData().currentUser || '匿名用户',
                    time: new Date().toLocaleString()
                });
                try {
                    localStorage.setItem('communityPosts', JSON.stringify(posts));
                    showAlert('帖子发布成功！', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('publishPostModal')).hide();
                } catch(e) {
                    showAlert('发布失败，图片可能太大了！', 'warning');
                }
            };

            if (imgInput.files && imgInput.files[0]) {
                if (imgInput.files[0].size > 500 * 1024) {
                    showAlert('图片太大啦！请上传小于 500KB 的图片', 'warning');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => savePost(e.target.result);
                reader.readAsDataURL(imgInput.files[0]);
            } else {
                savePost(null);
            }
        });
    }

    document.getElementById('myRecipesModal').addEventListener('show.bs.modal', renderMyRecipesList);
    document.getElementById('collectModal').addEventListener('show.bs.modal', renderCollectList);
    
    const aiRecipeLink = document.querySelector('a[href="#ai-robot-section"]');
    if (aiRecipeLink) {
        aiRecipeLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleAiRecipeClick();
        });
    }

    fetchRecipes("Chicken");

    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) { navbar.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; navbar.style.padding = '0.5rem 0'; }
        else { navbar.style.boxShadow = '0 2px 15px rgba(0,0,0,0.05)'; navbar.style.padding = '1rem 0'; }
    });
    
    function adjustLayout() {
        const width = window.innerWidth;
        if (width < 992) recipeContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
        else recipeContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        if (width < 576) recipeContainer.style.gridTemplateColumns = '1fr';
    }
    window.addEventListener('resize', adjustLayout);
    adjustLayout();

    const heroSection = document.querySelector('.hero-section');
    if(heroSection) {
        heroSection.style.opacity = '0'; heroSection.style.transform = 'translateY(20px)';
        setTimeout(() => { heroSection.style.transition = 'all 0.8s ease'; heroSection.style.opacity = '1'; heroSection.style.transform = 'translateY(0)'; }, 300);
    }
});

// ========== 和风天气 API 配置 ==========
const WEATHER_API_KEY = "893f42b0056b4d84811dbe54d9bad433";
const API_BASE = "https://m37p42qcx2.re.qweatherapi.com";

const GEO_API_URL = `${API_BASE}/geo/v2/city/lookup`;
const WEATHER_NOW_API_URL = `${API_BASE}/v7/weather/now`;

// ========== 天气图标映射 ==========
const weatherIconMap = {
    '晴': 'bi-brightness-high',
    '多云': 'bi-cloud',
    '阴': 'bi-clouds',
    '小雨': 'bi-cloud-drizzle',
    '中雨': 'bi-cloud-rain',
    '大雨': 'bi-cloud-rain-heavy',
    '雷阵雨': 'bi-cloud-lightning-rain',
    '雪': 'bi-snow',
    '雾': 'bi-cloud-haze',
    '风': 'bi-wind'
};

// ========== 1. 获取当前位置 ==========
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("您的浏览器不支持地理定位"));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                resolve(coords);
            },
            (error) => {
                let errorMsg = "无法获取您的位置：";
                switch(error.code) {
                    case 1: errorMsg += "用户拒绝了定位请求"; break;
                    case 2: errorMsg += "位置信息不可用"; break;
                    case 3: errorMsg += "定位请求超时"; break;
                }
                reject(new Error(errorMsg));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// ========== 2. 用经纬度查询天气 ==========
async function fetchWeatherByCoords(lat, lon) {
    try {
        const geoUrl = `${GEO_API_URL}?key=${WEATHER_API_KEY}&location=${lon},${lat}`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        if (geoData.code === "200" && geoData.location.length > 0) {
            const locationId = geoData.location[0].id;
            const cityName = geoData.location[0].name;
            
            const weatherUrl = `${WEATHER_NOW_API_URL}?key=${WEATHER_API_KEY}&location=${locationId}`;
            const weatherResponse = await fetch(weatherUrl);
            const weatherData = await weatherResponse.json();
            
            if (weatherData.code === "200") {
                return {
                    weather: weatherData.now,
                    city: cityName
                };
            }
        }
        throw new Error("无法获取该位置的天气");
    } catch (error) {
        throw error;
    }
}

// ========== 3. 用城市名查询天气 ==========
async function getLocationId(cityName) {
    const url = `${GEO_API_URL}?key=${WEATHER_API_KEY}&location=${encodeURIComponent(cityName)}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.code === "200" && data.location && data.location.length > 0) {
            return data.location[0].id;
        } else {
            throw new Error(data.msg || "未找到该城市");
        }
    } catch (error) {
        throw new Error("获取城市信息失败");
    }
}

async function fetchWeather(cityName) {
    try {
        const locationId = await getLocationId(cityName);
        const url = `${WEATHER_NOW_API_URL}?key=${WEATHER_API_KEY}&location=${locationId}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.code === "200") {
            return data.now;
        } else {
            throw new Error(data.msg || "天气查询失败");
        }
    } catch (error) {
        throw error;
    }
}



// ========== 4. 更新天气显示 ==========

// 根据天气返回推荐文案
// 根据天气和温度，生成中文推荐文案
// [修改] 根据天气和温度，生成推荐文案 (增加 cnKeyword)
function getWeatherFoodRecommendation(temp, text) {
    const t = parseFloat(temp);
    
    // 1. 天气现象
    if (text.includes('雨') || text.includes('雷')) {
        return { msg: "下雨天，煮个热汤暖暖身子吧 🥘", keywordEn: "Soup", keywordCn: "汤" };
    }
    if (text.includes('雪')) {
        return { msg: "外面下雪了，炖肉最适合这种天气 ❄️", keywordEn: "Beef", keywordCn: "炖肉" };
    }
    if (text.includes('雾') || text.includes('霾')) {
        return { msg: "空气一般，吃点清爽的沙拉吧 🥬", keywordEn: "Salad", keywordCn: "凉菜" };
    }

    // 2. 温度判断
    if (t >= 30) {
        return { msg: "天太热了，来份冰淇淋降降温 🍦", keywordEn: "Ice Cream", keywordCn: "凉拌" };
    } 
    else if (t >= 20) {
        return { msg: "天气不错，来份意面怎么样？🍝", keywordEn: "Pasta", keywordCn: "面" };
    } 
    else if (t >= 10) {
        return { msg: "微凉的天气，吃点鸡肉补充能量 🍗", keywordEn: "Chicken", keywordCn: "鸡肉" };
    } 
    else {
        return { msg: "天冷了，必须吃点牛肉御寒了 🥩", keywordEn: "Beef", keywordCn: "牛肉" };
    }
}

function updateWeatherDisplay(weatherData, cityName) {
    const weatherResult = document.getElementById('weather-result');
    const locationEl = document.getElementById('weather-location');
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const humidityEl = document.getElementById('weather-humidity');
    const windEl = document.getElementById('weather-humidity'); // 注意：你原代码这里windEl获取的是humidity ID，建议改为 'weather-wind'
    const feelslikeEl = document.getElementById('weather-feelslike');
    const updateTimeEl = document.getElementById('weather-update-time');
    const iconEl = document.getElementById('weather-icon-container');

    // --- 原有逻辑开始 ---
    locationEl.textContent = cityName;
    tempEl.textContent = `${weatherData.temp}°C`;
    descEl.textContent = weatherData.text;
    humidityEl.textContent = `${weatherData.humidity}%`;
    
    // 如果你HTML里有 id="weather-wind"，请把下面这行前面的windEl获取id修正一下
    if(document.getElementById('weather-wind')) {
        document.getElementById('weather-wind').textContent = `${weatherData.windScale || '--'}级`;
    }
    
    feelslikeEl.textContent = `${weatherData.feelsLike || weatherData.temp}°C`;
    updateTimeEl.textContent = `更新于 ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const iconClass = weatherIconMap[weatherData.text] || 'bi-cloud';
    iconEl.innerHTML = `<i class="bi ${iconClass} text-warning"></i>`;

    weatherResult.classList.remove('weather-sunny-bg', 'weather-rainy-bg', 'weather-snowy-bg');
    
    if (weatherData.text.includes('晴')) {
        weatherResult.classList.add('weather-sunny-bg');
    } else if (weatherData.text.includes('雨')) {
        weatherResult.classList.add('weather-rainy-bg');
    } else if (weatherData.text.includes('雪')) {
        weatherResult.classList.add('weather-snowy-bg');
    }
    // --- 原有逻辑结束 ---

    // ========== 新增：显示美食推荐 ==========
    // ... 前面的代码不变 ...

    // ========== 修改：显示美食推荐 (适配双语) ==========
    
    // 1. 获取推荐内容
    const rec = getWeatherFoodRecommendation(weatherData.temp, weatherData.text);
    
    // 2. 清除旧推荐
    const existingRec = document.getElementById('weather-food-rec');
    if (existingRec) existingRec.remove();

    // 3. 创建新推荐块
    const recDiv = document.createElement('div');
    recDiv.id = 'weather-food-rec';
    recDiv.className = 'mt-3 pt-3 border-top border-secondary-subtle';
    
    // 4. 插入HTML：点击按钮时，同时传入英文和中文词，由函数内部决定用哪个
    recDiv.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
            <span class="small text-dark fw-bold">
                <i class="bi bi-lightbulb-fill text-warning me-1"></i> ${rec.msg}
            </span>
            <button class="btn btn-sm btn-outline-warning" style="font-size: 12px;" 
                onclick="handleWeatherSearch('${rec.keywordEn}', '${rec.keywordCn}')">
                去看看
            </button>
        </div>
    `;
    
    weatherResult.appendChild(recDiv);
    weatherResult.classList.remove('d-none');
    
    // 5. 添加到天气卡片里
    weatherResult.appendChild(recDiv);
    // =====================================

    weatherResult.classList.remove('d-none');
}

// ========== 5. 自动定位函数 ==========
async function autoDetectLocation() {
    const switchEl = document.getElementById('auto-location-switch');
    if (switchEl && !switchEl.checked) {
        console.log('用户关闭了自动定位');
        return; 
    }
    
    try {
        showAlert('正在获取您的位置...', 'info');
        
        const coords = await getCurrentLocation();
        const result = await fetchWeatherByCoords(coords.lat, coords.lon);
        
        updateWeatherDisplay(result.weather, result.city);
        document.getElementById('city-input').value = result.city;
        showAlert(`已显示 ${result.city} 的天气`, 'success');
        
    } catch (error) {
        console.warn('自动定位失败:', error.message);
        const defaultCity = '北京';
        try {
            const weatherData = await fetchWeather(defaultCity);
            updateWeatherDisplay(weatherData, defaultCity);
            document.getElementById('city-input').value = defaultCity;
            showAlert(`已显示默认城市 ${defaultCity} 的天气`, 'info');
        } catch (fallbackError) {
            showAlert(`自动定位失败，请手动输入城市`, 'warning');
        }
    }
}

// ========== 6. 手动查询函数 ==========
async function handleWeatherQuery() {
    const cityInput = document.getElementById('city-input');
    const city = cityInput.value.trim();
    
    if (!city) {
        showAlert('请输入城市名称', 'warning');
        return;
    }
    
    const weatherBtn = document.getElementById('weather-btn');
    const originalText = weatherBtn.innerHTML;
    weatherBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> 查询中...';
    weatherBtn.disabled = true;
    
    try {
        const weatherData = await fetchWeather(city);
        updateWeatherDisplay(weatherData, city);
        showAlert(`已获取 ${city} 的天气信息`, 'success');
    } catch (error) {
        showAlert(`查询失败：${error.message}`, 'error');
        document.getElementById('weather-result').classList.add('d-none');
    } finally {
        weatherBtn.innerHTML = originalText;
        weatherBtn.disabled = false;
    }
}

// ========== 7. 刷新按钮事件 ==========
document.getElementById('weather-refresh-btn')?.addEventListener('click', async () => {
    const cityInput = document.getElementById('city-input');
    const city = cityInput.value.trim();
    
    if (!city) {
        showAlert('请输入城市名称', 'warning');
        return;
    }
    
    const refreshBtn = document.getElementById('weather-refresh-btn');
    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise weather-spin-icon"></i>';
    
    try {
        const weatherData = await fetchWeather(city);
        updateWeatherDisplay(weatherData, city);
        showAlert(`已刷新 ${city} 的天气`, 'success');
    } catch (error) {
        showAlert(`刷新失败：${error.message}`, 'error');
    } finally {
        setTimeout(() => {
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
        }, 500);
    }
});

// ========== 8. 页面初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('weather-btn').addEventListener('click', handleWeatherQuery);
    
    document.getElementById('city-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleWeatherQuery();
        }
    });
    
    document.getElementById('auto-location-switch')?.addEventListener('change', function() {
        if (this.checked) {
            showAlert('已开启自动定位', 'info');
            if (document.getElementById('weather-result').classList.contains('d-none')) {
                setTimeout(() => autoDetectLocation(), 1000);
            }
        } else {
            showAlert('已关闭自动定位', 'info');
        }
    });
    
    setTimeout(() => {
        autoDetectLocation();
    }, 3000);
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


// ========== [新增] 中式收藏详情查看 ==========
window.viewCollectedTianRecipe = function(collectionId) {
    const data = getUserData();
    const user = data.users.find(u => u.username === data.currentUser);
    const item = user.collections.find(c => c.idMeal === collectionId);
    
    if (!item) return;

    // 提取原始ID (去掉 cn_ 前缀)
    const originalId = item.id; // 在保存时我们存了原始id

    // 重新构建缓存格式 (模拟 displayTianRecipes 的逻辑)
    // 这样 showTianDetails 就能直接读取了
    let ingredientsArr = [];
    if (item.yuanliao) ingredientsArr = ingredientsArr.concat(item.yuanliao.split(/；|;/).filter(i => i.trim()));
    if (item.tiaoliao) ingredientsArr = ingredientsArr.concat(item.tiaoliao.split(/；|;/).filter(i => i.trim()));
    
    let formattedSteps = item.zuofa || "暂无步骤描述";
    // 如果还没格式化过（没有HTML标签），则进行格式化
    if (!formattedSteps.includes('<br>')) {
        formattedSteps = formattedSteps.replace(/(\d+\.)/g, '<br><br><strong>$1</strong>');
        if(formattedSteps.startsWith('<br><br>')) formattedSteps = formattedSteps.substring(8);
    }

    // 写入缓存
    recipeCache.set(originalId, {
        id: originalId,
        title: item.cp_name,
        image: null,
        ingredients: ingredientsArr,
        instructions: formattedSteps,
        tags: item.type_name,
        desc: item.texing || item.tishi,
        hasImage: false
    });

    // 打开详情页
    // 需要先关闭收藏模态框，否则双重模态框体验不好
    collectModal.hide();
    showTianDetails(originalId);
};