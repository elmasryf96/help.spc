// ⚡ تم تعطيل صفحة اللوجن مؤقتاً والتحويل المباشر للداشبورد
document.addEventListener("DOMContentLoaded", () => {
    // التوجيه المباشر للصفحة الرئيسية
    navigateTo('home-page');

    const datalist = document.getElementById("towersList");
    const nocSelect = document.getElementById("nocTowerSelect");

    if (datalist || nocSelect) {
        Object.keys(towersData).sort().forEach(tower => {
            if (datalist) {
                let option = document.createElement("option");
                option.value = tower;
                datalist.appendChild(option);
            }
            if (nocSelect) {
                let opt = document.createElement("option");
                opt.value = tower;
                opt.textContent = tower;
                nocSelect.appendChild(opt);
            }
        });
    }
});

function handleLogin(event) {
    if (event) event.preventDefault();
    navigateTo('home-page');
}

function handleLogout() {
    // عند الضغط على Logout يرجعك للداشبورد برضه طالما اللوجن معطل
    navigateTo('home-page');
}

function navigateTo(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active-page');
        page.classList.add('hidden-page');
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden-page');
        targetPage.classList.add('active-page');
    }
}
