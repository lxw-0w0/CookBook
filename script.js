// ========== 1. 核心配置与词典 (完全保留原版数据) ==========
const DEEPSEEK_KEY = "sk-0188270c22224ddda38db93e589937dd";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const RECIPE_API = "https://www.themealdb.com/api/json/v1/1/";
const BMI_API = "https://apis.tianapi.com/bmi/index";
const TIAN_KEY = "9872eff67fe095ca78fa1d18228d4502";

// 单位表 
const UNIT_MAP = {
    // 汤匙相关
    "tblsp": "汤匙", "tablespoon": "汤匙", "tablespoons": "汤匙", 
    "tbsp": "汤匙", "tbsps": "汤匙", "tbs": "汤匙", "tb": "汤匙",
    "dessert spoon": "甜点匙", "dessert spoons": "甜点匙",
    
    // 茶匙相关
    "teaspoon": "茶匙", "teaspoons": "茶匙", "tsp": "茶匙", 
    "tsps": "茶匙", "t": "茶匙", "ts": "茶匙", "metric teaspoon": "公制茶匙",
    
    // 杯相关
    "cup": "杯", "cups": "杯", "c": "杯", "metric cup": "公制杯",
    "coffee cup": "咖啡杯", "tea cup": "茶杯",
    
    // 液体单位
    "fluid ounce": "液盎司", "fl oz": "液盎司", "fluid oz": "液盎司",
    "pint": "品脱", "pints": "品脱", "pt": "品脱", "fluid pint": "液品脱",
    "quart": "夸脱", "quarts": "夸脱", "qt": "夸脱", "fluid quart": "液夸脱",
    "gallon": "加仑", "gallons": "加仑", "gal": "加仑", "fluid gallon": "液加仑",
    "ml": "毫升", "milliliter": "毫升", "milliliters": "毫升", "cc": "毫升",
    "l": "升", "liter": "升", "liters": "升", "litre": "升", "litres": "升",
    "dl": "分升", "deciliter": "分升", "cl": "厘升", "centiliter": "厘升",
    
    // 重量单位
    "oz": "盎司", "ounce": "盎司", "ounces": "盎司", 
    "lb": "磅", "lbs": "磅", "pound": "磅", "pounds": "磅",
    "oz wt": "盎司(重)", "net wt": "净重",
    "g": "克", "gram": "克", "grams": "克",
    "kg": "千克", "kilogram": "千克", "kilograms": "千克",
    "mg": "毫克", "milligram": "毫克",
    
    // 少量单位
    "pinch": "少许", "pinches": "少许", 
    "dash": "少量", "dashes": "少量",
    "sprinkle": "撒少许", "sprinkles": "撒少许",
    "drop": "滴", "drops": "滴", "dash or two": "一两滴",
    
    // 数量单位
    "piece": "块", "pieces": "块", "pc": "块",
    "slice": "片", "slices": "片",
    "clove": "瓣", "cloves": "瓣",
    "stalk": "根", "stalks": "根",
    "head": "颗", "heads": "颗",
    "leaf": "片", "leaves": "片",
    "stick": "根", "sticks": "根",
    "cube": "块", "cubes": "块",
    "ball": "个", "balls": "个",
    "can": "罐", "cans": "罐",
    "jar": "瓶", "jars": "瓶",
    "package": "包", "packages": "包",
    "packet": "小包", "packets": "小包",
    "box": "盒", "boxes": "盒",
    "bag": "袋", "bags": "袋",
    "bottle": "瓶", "bottles": "瓶",
    "container": "容器", "containers": "容器",
    
    // 模糊量度
    "to taste": "适量", "tt": "适量",
    "handful": "一把", "handfuls": "一把",
    "bunch": "束", "bunches": "束",
    "sprig": "小枝", "sprigs": "小枝",
    "dollop": "一勺", "dollops": "一勺",
    "splash": "一溅", "splashes": "一溅",
    "scoop": "一勺", "scoops": "一勺",
    "heaping": "满勺", "heaped": "满勺",
    "level": "平勺", "rounded": "圆勺",
    
    // 特殊食材单位
    "ear": "穗", "ears": "穗", // 用于玉米等
    "clove": "瓣", "cloves": "瓣", // 用于大蒜等
    "bulb": "头", "bulbs": "头", // 用于洋葱等
    "root": "根", "roots": "根", // 用于萝卜等
    "cube": "块", "cubes": "块", // 用于糖等
    "bar": "条", "bars": "条", // 用于巧克力等
    "sheet": "张", "sheets": "张", // 用于海苔等
    "pat": "小块", "pats": "小块" // 用于黄油等
};


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
            // 基本汉字范围
            if (charCode >= 0x4e00 && charCode <= 0x9fa5) {
                // 这里使用简化的拼音首字母映射（完整版本需要更大的映射表）
                firstLetters.push('a'); // 实际应用中需要替换为正确的首字母映射
            } else {
                firstLetters.push(str[i].toLowerCase());
            }
        }
        return firstLetters;
    }
};

// 简化版拼音字典（仅示例，实际需扩展）
const pinyinDictionary = {
    27721: 'hong', // 红
    28165: 'shao', // 烧
    29399: 'rou',  // 肉
    39321: 'yu',   // 鱼
    33647: 'shu',  // 蔬
    31881: 'cai',  // 菜
    32599: 'niu',  // 牛
    32844: 'rou',  // 肉
    38271: 'ji',   // 鸡
    32933: 'dan',  // 蛋
    31639: 'mian', // 面
    32929: 'fen'   // 粉
};



let searchInput, searchBtn, recipeContainer, recipeModal, collectModal;
let customAlert, alertText, collectList, modalTitle, modalImg, modalIngredients, modalInstructions;
let bmiHeight, bmiWeight, bmiBtn, bmiResult, aiInput, aiBtn, chatHistory;

// ========== 2. 翻译与工具函数 ==========
async function translateText(text) {
    if (!text) return "";
    try {
        const response = await fetch(DEEPSEEK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_KEY}` },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{ role: "system", content: "翻译成中文。保留 '|||' 和 '|'。将度量单位翻译成中文。不要解释。" }, { role: "user", content: text.slice(0, 3000) }],
                temperature: 0.1
            })
        });
        const data = await response.json();
        if (data.choices && data.choices.length > 0) return data.choices[0].message.content.trim();
    } catch (e) { }
    
    let fallbackText = text;
    for (let key in DICTIONARY) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        fallbackText = fallbackText.replace(regex, DICTIONARY[key]);
    }
    return fallbackText;
}

function formatMeasure(measure) {
    if (!measure) return "";
    let res = measure.trim(); // 先去除首尾空格，避免空格影响匹配
    
    // 1. 替换单位（使用UNIT_MAP）
    // 按单位长度倒序处理，避免短单位先匹配导致长单位无法匹配（如tbs不会被tb先匹配）
    const sortedUnits = Object.keys(UNIT_MAP).sort((a, b) => b.length - a.length);
    
    sortedUnits.forEach(key => {
        // 使用正则确保匹配完整单词，避免部分匹配（如tbs不会匹配tablespoon）
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        if (regex.test(res)) {
            res = res.replace(regex, UNIT_MAP[key]);
        }
    });
    
    // 2. 处理数字与单位之间的空格（如"1 汤匙"→"1汤匙"）
    res = res.replace(/(\d+)\s+([^\d\s])/g, '$1$2');
    
    // 3. 处理可能的残留英文复数形式（如"汤匙s"→"汤匙"）
    res = res.replace(/汤匙s/g, '汤匙')
             .replace(/茶匙s/g, '茶匙')
             .replace(/杯s/g, '杯');
             
    return res;
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
    // 简单的颜色区分
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
        throw e; // 中断后续逻辑
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

// ========== 4. 菜谱上传与展示 (核心修复：图片大小检测) ==========
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
        saveUserData(data); // 这里可能会因为图片大而报错
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
        div.className = 'collect-item'; // 样式类名已恢复
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
function toggleCollection(btn, item) {
    const data = getUserData();
    if (!data.currentUser) { new bootstrap.Modal(document.getElementById('loginModal')).show(); return; }
    const user = data.users.find(u => u.username === data.currentUser);
    const idx = user.collections.findIndex(c => c.idMeal === item.idMeal);
    if (idx > -1) { 
        user.collections.splice(idx, 1); 
        btn.classList.remove('active'); 
        showAlert('已取消收藏'); 
    } else { 
        user.collections.push(item); 
        btn.classList.add('active'); 
        showAlert('收藏成功'); 
    }
    saveUserData(data); 
    renderCollectList();
}

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
    
    // 收集所有需要翻译的标题
    const titles = user.collections.map(item => item.strMeal).join(" ||| ");
    let cnTitlesStr = titles;
    
    // 批量翻译标题
    try {
        translateText(titles).then(translated => {
            if (translated && translated.includes("|||")) {
                cnTitlesStr = translated;
            }
            renderWithTranslations(user.collections, cnTitlesStr.split("|||"));
        }).catch(() => {
            // 翻译失败时使用原标题
            renderWithTranslations(user.collections, user.collections.map(item => item.strMeal));
        });
    } catch (e) {
        renderWithTranslations(user.collections, user.collections.map(item => item.strMeal));
    }
    
    // 带翻译的渲染函数
    function renderWithTranslations(collections, translatedTitles) {
        list.innerHTML = '<div class="collect-list"></div>';
        const container = list.querySelector('.collect-list');
        
        collections.forEach((item, index) => {
            // 使用翻译后的标题
            let displayTitle = translatedTitles[index] ? translatedTitles[index].trim() : item.strMeal;
            displayTitle = displayTitle.replace(/^\|/, '').trim();
            
            const div = document.createElement('div');
            div.className = 'collect-item'; 
            div.innerHTML = `
                <img src="${item.strMealThumb}" class="collect-item-img">
                <div class="collect-item-info">
                    <h5 class="collect-item-title">${displayTitle}</h5>
                    <div class="collect-item-actions">
                        <button class="collect-item-btn btn-view" onclick="viewCollectedRecipe('${item.idMeal}')"><i class="bi bi-eye"></i> 详情</button>
                        <button class="collect-item-btn btn-remove" onclick="toggleCollection(this, {idMeal:'${item.idMeal}'})"><i class="bi bi-trash"></i> 删除</button>
                    </div>
                </div>`;
            container.appendChild(div);
        });
    }
}

function isRecipeCollected(id) {
    const data = getUserData(); 
    if (!data.currentUser) return false;
    const user = data.users.find(u => u.username === data.currentUser);
    return user ? user.collections.some(c => c.idMeal === id) : false;
}

// ========== 6. 搜索与详情页 (已修复翻译与单位) ==========

async function fetchRecipes(query) {
    // 清空容器并显示加载状态
    recipeContainer.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-warning" style="width: 3rem; height: 3rem;"></div><p class="mt-3 text-muted">正在搜索并翻译...</p></div>`;
    
    try {
        let searchQuery = query.trim();
        
        // 中文关键词处理逻辑
        if (/[\u4e00-\u9fa5]/.test(searchQuery)) {
            // 1. 优先使用精确映射
            if (SMART_MAP[searchQuery]) {
                searchQuery = SMART_MAP[searchQuery];
            } 
            // 2. 尝试DeepSeek翻译API转换
            else {
                try {
                    const translated = await translateText(`将"${searchQuery}"翻译成对应的英文食物名称，仅返回单词或短语，不要解释`);
                    if (translated && translated.trim()) {
                        searchQuery = translated.trim();
                    }
                } catch (e) {
                    console.log("翻译API调用失败，使用备选方案");
                    // 3. 备选方案：使用拼音首字母（需要pinyinUtil支持）
                    searchQuery = pinyinUtil.getFirstLetter(searchQuery).join('');
                }
            }
        }

        // 第一次搜索
        const response = await fetch(`${RECIPE_API}search.php?s=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();

        // 搜索结果处理
        if (!data.meals || data.meals.length === 0) {
            // 尝试更宽泛的搜索（取第一个单词）
            const broadQuery = searchQuery.split(' ')[0];
            if (broadQuery && broadQuery !== searchQuery) {
                const broadResponse = await fetch(`${RECIPE_API}search.php?s=${encodeURIComponent(broadQuery)}`);
                const broadData = await broadResponse.json();
                if (broadData.meals && broadData.meals.length > 0) {
                    showAlert(`未找到"${query}"的精确结果，为您展示相关食谱`, 'info');
                    await displayRecipes(broadData.meals);
                    return;
                }
            }
            // 完全无结果
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

        // 展示搜索结果
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
    // 限制最多显示12条结果
    const limitedList = list.slice(0, 12);
    const titles = limitedList.map(item => item.strMeal).join(" ||| ");
    let cnTitlesStr = titles;

    // 批量翻译菜谱标题
    try {
        const res = await translateText(titles);
        if (res && res.includes("|||")) {
            cnTitlesStr = res;
        }
    } catch (e) {
        console.log("标题翻译失败，使用原标题");
    }
    const cnTitles = cnTitlesStr.split("|||");

    // 生成菜谱卡片
    recipeContainer.innerHTML = "";
    limitedList.forEach((item, index) => {
        const isCollected = isRecipeCollected(item.idMeal);
        // 处理翻译后的标题
        let displayTitle = cnTitles[index] ? cnTitles[index].trim() : item.strMeal;
        displayTitle = displayTitle.replace(/^\|/, '').trim();
        // 截断过长标题
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

    // 如果结果为空显示提示
    if (limitedList.length === 0) {
        recipeContainer.innerHTML = `<div class="col-12 text-center py-5"><h4>暂无相关菜谱</h4></div>`;
    }
}

window.showDetails = async function(id) {
    // 显示加载状态
    modalTitle.innerText = "加载中...";
    modalInstructions.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-warning"></div>
            <br><span class="text-muted">正在请求数据并汉化...</span>
        </div>`;
    modalIngredients.innerHTML = "";
    modalImg.src = "";

    try {
        // 获取详情数据
        const response = await fetch(`${RECIPE_API}lookup.php?i=${id}`);
        const data = await response.json();
        if (!data.meals || data.meals.length === 0) {
            throw new Error("未找到菜谱详情");
        }
        const item = data.meals[0];
        modalImg.src = item.strMealThumb || 'default-recipe.jpg';
        modalImg.onerror = () => modalImg.src = 'default-recipe.jpg';

        // 提取食材和用量
        let ingredientsList = [];
        let measuresList = [];
        for (let i = 1; i <= 20; i++) {
            const ing = item[`strIngredient${i}`];
            const measure = item[`strMeasure${i}`];
            if (ing && ing.trim()) {
                ingredientsList.push(ing.trim());
                measuresList.push(formatMeasure(measure || ''));
            }
        }

        // 准备翻译内容
        const ingString = ingredientsList.join(" | ");
        const bigText = `${item.strMeal} ||| ${ingString} ||| ${item.strInstructions}`;
        let translatedText = bigText;

        // 调用翻译API
        try {
            const apiRes = await translateText(bigText);
            if (apiRes && apiRes.length > 10) {
                translatedText = apiRes;
            }
        } catch (e) {
            console.log("详情翻译失败，使用原文");
            showAlert("翻译服务暂时不可用，显示原文", 'warning');
        }

        // 处理翻译结果
        const parts = translatedText.split("|||");
        modalTitle.innerText = parts[0] ? parts[0].trim() : item.strMeal;
        
        // 处理食材列表
        const cnIngString = parts[1] ? parts[1].trim() : ingString;
        const cnIngredients = cnIngString.split("|"); 
        
        let ingredientsHtml = "";
        for (let i = 0; i < ingredientsList.length; i++) {
            let name = cnIngredients[i] ? cnIngredients[i].trim() : ingredientsList[i];
            name = name.replace(/^[|·\s]+/, ''); 
            let measure = measuresList[i] || "";
            ingredientsHtml += `
                <li class="d-flex justify-content-between py-2 border-bottom border-light">
                    <span><i class="bi bi-dot text-warning"></i> ${name}</span>
                    <span class="text-secondary small">${measure}</span>
                </li>`;
        }
        modalIngredients.innerHTML = ingredientsHtml;

        // 处理烹饪步骤
        const cnIns = parts[2] ? parts[2].trim() : item.strInstructions;
        modalInstructions.innerHTML = cnIns
            .replace(/\r\n/g, "<br>")
            .replace(/\n/g, "<br><br>")
            .replace(/Step \d+:/g, match => `<strong>${match}</strong>`);

        // 显示模态框
        recipeModal.show();

    } catch (e) {
        console.error("详情加载失败:", e);
        modalInstructions.innerHTML = `
            <div class="text-center p-5 text-danger">
                <i class="bi bi-exclamation-circle fs-3 mb-2"></i>
                <p>加载失败，请稍后重试</p>
                <button class="btn btn-sm btn-warning mt-2" onclick="showDetails('${id}')">重新加载</button>
            </div>`;
    }
}

// 辅助函数：处理计量单位
function formatMeasure(measure) {
    if (!measure) return "";
    // 转换常见英文计量单位为中文
    const measureMap = {
        'tbsp': '汤匙',
        'tsp': '茶匙',
        'cup': '杯',
        'oz': '盎司',
        'lb': '磅',
        'g': '克',
        'kg': '千克',
        'ml': '毫升',
        'l': '升'
    };
    let result = measure.trim();
    for (const [en, cn] of Object.entries(measureMap)) {
        result = result.replace(new RegExp(en, 'gi'), cn);
    }
    return result;
}


// ========== 7. 页面初始化 (含发布帖子与所有功能) ==========
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

    // 搜索特效
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

    // AI
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

    // BMI
    bmiBtn.addEventListener('click', () => {
        const h = parseFloat(bmiHeight.value)/100; const w = parseFloat(bmiWeight.value);
        if(h&&w) { 
            const bmi=(w/(h*h)).toFixed(1); 
            bmiResult.innerHTML = `<h3 class="text-${bmi<18.5?'info':(bmi>24?'danger':'success')}">${bmi}</h3>`; 
            bmiResult.classList.remove('d-none');
        }
    });

    // 监听器
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
    
    // 菜谱上传 (含图片大小检测)
    document.getElementById('submit-recipe-btn').addEventListener('click', () => {
        const title = document.getElementById('recipe-title').value.trim();
        const ingredients = document.getElementById('recipe-ingredients').value.trim();
        const steps = document.getElementById('recipe-steps').value.trim();
        const time = document.getElementById('recipe-time').value.trim();
        const imgInput = document.getElementById('recipe-img');

        if (title && ingredients && steps) {
            if (imgInput.files && imgInput.files[0]) {
                // 🛑 限制图片大小为 500KB，防止崩溃
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

    // 社区发布帖子 (为你补充的功能！)
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

// 全局暴露
window.toggleCollection = toggleCollection;
window.removeCollection = toggleCollection;
window.viewCollectedRecipe = (id) => { showDetails(id); collectModal.hide(); };
window.viewMyRecipe = viewMyRecipe;
window.deleteUserRecipe = deleteUserRecipe;
window.fetchRecipes = fetchRecipes;
window.showDetails = showDetails;
window.handleAiRecipeClick = handleAiRecipeClick;

// ========== 和风天气 API 配置 ==========
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
        // 用经纬度获取LocationID
        const geoUrl = `${GEO_API_URL}?key=${WEATHER_API_KEY}&location=${lon},${lat}`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        if (geoData.code === "200" && geoData.location.length > 0) {
            const locationId = geoData.location[0].id;
            const cityName = geoData.location[0].name;
            
            // 用LocationID查询天气
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
function updateWeatherDisplay(weatherData, cityName) {
    const weatherResult = document.getElementById('weather-result');
    const locationEl = document.getElementById('weather-location');
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const humidityEl = document.getElementById('weather-humidity');
    const windEl = document.getElementById('weather-wind');
    const feelslikeEl = document.getElementById('weather-feelslike');
    const updateTimeEl = document.getElementById('weather-update-time');
    const iconEl = document.getElementById('weather-icon-container');

    // 更新基本信息
    locationEl.textContent = cityName;
    tempEl.textContent = `${weatherData.temp}°C`;
    descEl.textContent = weatherData.text;
    humidityEl.textContent = `${weatherData.humidity}%`;
    windEl.textContent = `${weatherData.windScale || '--'}级`;
    feelslikeEl.textContent = `${weatherData.feelsLike || weatherData.temp}°C`;
    updateTimeEl.textContent = `更新于 ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // 更新动态图标
    const iconClass = weatherIconMap[weatherData.text] || 'bi-cloud';
    iconEl.innerHTML = `<i class="bi ${iconClass} text-warning"></i>`;

    // 根据天气类型设置背景类
    weatherResult.classList.remove('weather-sunny-bg', 'weather-rainy-bg', 'weather-snowy-bg');
    
    if (weatherData.text.includes('晴')) {
        weatherResult.classList.add('weather-sunny-bg');
    } else if (weatherData.text.includes('雨')) {
        weatherResult.classList.add('weather-rainy-bg');
    } else if (weatherData.text.includes('雪')) {
        weatherResult.classList.add('weather-snowy-bg');
    }

    // 显示卡片
    weatherResult.classList.remove('d-none');
}

// ========== 5. 自动定位函数 ==========
async function autoDetectLocation() {
    const switchEl = document.getElementById('auto-location-switch');
    if (switchEl && !switchEl.checked) {
        console.log('用户关闭了自动定位');
        return; // 用户关闭了自动定位
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
        // 失败后使用默认城市
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
    // 手动查询按钮事件
    document.getElementById('weather-btn').addEventListener('click', handleWeatherQuery);
    
    // 按Enter键查询
    document.getElementById('city-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleWeatherQuery();
        }
    });
    
    // 自动定位开关变化事件
    document.getElementById('auto-location-switch')?.addEventListener('change', function() {
        if (this.checked) {
            showAlert('已开启自动定位', 'info');
            // 如果当前没有天气数据，立即尝试定位
            if (document.getElementById('weather-result').classList.contains('d-none')) {
                setTimeout(() => autoDetectLocation(), 1000);
            }
        } else {
            showAlert('已关闭自动定位', 'info');
        }
    });
    
    // 页面加载后尝试自动定位（延迟3秒）
    setTimeout(() => {
        autoDetectLocation();
    }, 3000);
});